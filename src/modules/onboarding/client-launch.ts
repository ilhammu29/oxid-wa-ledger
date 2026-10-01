import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreateBusinessInput,
  FirstProductInput,
  BusinessOnboardingProgress,
  TelegramPairingTokenResult,
} from "./types";

// Re-export pairing crypto utilities from central module
export {
  generatePairingCode,
  generatePairingCode as generateRandomPairingCode,
  derivePairingTokenHash,
  derivePairingTokenHash as hashPairingToken,
  normalizePairingCode,
  isValidPairingCodeFormat,
} from "../telegram/pairing-crypto";
import {
  generatePairingCode,
  derivePairingTokenHash,
} from "../telegram/pairing-crypto";

/**
 * Sanitizes metadata for audit logs, ensuring zero secret or credential leakage.
 */
function sanitizeAuditMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const forbiddenPatterns = ["token", "secret", "password", "key", "authorization", "private_key", "cookie"];

  for (const [k, v] of Object.entries(meta)) {
    const lower = k.toLowerCase();
    const isSensitive = forbiddenPatterns.some((pattern) => lower.includes(pattern));
    if (isSensitive) {
      sanitized[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      sanitized[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}

/**
 * Logs a structured onboarding or lifecycle event into public.subscription_audit_logs.
 */
export async function logOnboardingEvent(
  client: SupabaseClient,
  businessId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  actorId?: string
): Promise<void> {
  try {
    const cleanMeta = sanitizeAuditMetadata(metadata);
    await client.from("subscription_audit_logs").insert({
      business_id: businessId,
      actor_user_id: actorId || null,
      action,
      new_status: "trialing",
      metadata: cleanMeta,
    });
  } catch (err) {
    console.warn(`[OnboardingEvent] Failed to log event ${action}:`, err);
  }
}

/**
 * Creates a new business profile for an authenticated user and initializes trial subscription.
 */
export async function createBusinessForUser(
  client: SupabaseClient,
  userId: string,
  input: CreateBusinessInput
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, error: "Nama usaha minimal 2 karakter." };
  }

  const validTimezones = ["Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"];
  const timezone = validTimezones.includes(input.timezone || "") ? input.timezone! : "Asia/Pontianak";
  const currency = input.currency?.trim() || "IDR";
  const defaultUnit = input.defaultUnit?.trim() || "kg";
  const category = input.category?.trim() || "Lainnya";
  const ownerName = input.ownerName?.trim() || null;

  try {
    // 0. Verification check: unverified users cannot provision a business unless internal bypass is active
    if (process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP !== "true" && client.auth?.getUser) {
      const { data: authData } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
      if (authData?.user && !authData.user.email_confirmed_at && !authData.user.confirmed_at) {
        return {
          success: false,
          error: "Email belum diverifikasi. Verifikasi email diperlukan sebelum membuat bisnis.",
        };
      }
    }

    // 0.1 Idempotency guard: check if user already has an active incomplete business (prevents duplicate provisioning on retry/refresh)
    const { data: incompleteBiz } = await client
      .from("businesses")
      .select("id, onboarding_completed_at")
      .eq("created_by", userId)
      .is("onboarding_completed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (incompleteBiz?.id) {
      // Ensure onboarding progress is initialized for existing business
      await client.from("business_onboarding_progress").upsert(
        {
          business_id: incompleteBiz.id,
          current_step: 2,
          profile_completed: true,
        },
        { onConflict: "business_id" }
      );

      return { success: true, businessId: incompleteBiz.id };
    }

    // 1. Create Business (DB Trigger trg_business_subscription_init automatically creates 14-day trial)
    const { data: bizData, error: bizError } = await client
      .from("businesses")
      .insert({
        name,
        category,
        owner_name: ownerName,
        timezone,
        currency,
        default_unit: defaultUnit,
        created_by: userId,
        status: "active",
      })
      .select("id, name")
      .single();

    if (bizError || !bizData) {
      return { success: false, error: bizError?.message || "Gagal membuat profil bisnis." };
    }

    const businessId = bizData.id;

    // 2. Insert owner membership in business_users
    const { error: memError } = await client.from("business_users").insert({
      business_id: businessId,
      user_id: userId,
      role: "owner",
    });

    if (memError) {
      return { success: false, error: memError.message };
    }

    // 3. Ensure channel settings exist
    await client.from("business_channel_settings").insert({
      business_id: businessId,
      telegram_enabled: true,
      whatsapp_enabled: false,
      primary_channel: "telegram",
    });

    // 4. Ensure reminder settings exist
    await client.from("business_reminder_settings").insert({
      business_id: businessId,
      enabled: true,
      reminder_time: "18:00",
      days_of_week: [1, 2, 3, 4, 5, 6, 0],
    });

    // 5. Ensure onboarding progress is initialized
    await client.from("business_onboarding_progress").upsert(
      {
        business_id: businessId,
        current_step: 2,
        profile_completed: true,
      },
      { onConflict: "business_id" }
    );

    // 6. Log event
    await logOnboardingEvent(client, businessId, "business_created", {
      name,
      category,
      timezone,
    }, userId);

    return { success: true, businessId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
    return { success: false, error: msg };
  }
}

/**
 * Computes authoritative onboarding state dynamically from PostgreSQL records.
 */
export async function getBusinessOnboardingState(
  client: SupabaseClient,
  businessId: string
): Promise<BusinessOnboardingProgress> {
  // Query progress record
  const { data: progress } = await client
    .from("business_onboarding_progress")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  // Query actual data states for verification
  const [productsRes, telegramRes, txRes, sheetsRes] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    client.from("telegram_authorized_users").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    client.from("transactions").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "confirmed"),
    client.from("google_sheets_connections").select("id, enabled").eq("business_id", businessId).maybeSingle(),
  ]);

  const hasProducts = (productsRes.count || 0) > 0;
  const hasTelegram = (telegramRes.count || 0) > 0;
  const hasFirstTx = (txRes.count || 0) > 0;
  const hasSheets = Boolean(sheetsRes.data?.enabled);
  const isSheetsSkipped = Boolean(progress?.google_sheets_skipped);

  const profileCompleted = true;
  const productCompleted = hasProducts || Boolean(progress?.product_completed);
  const telegramCompleted = hasTelegram || Boolean(progress?.telegram_completed);
  const firstTxCompleted = hasFirstTx || Boolean(progress?.first_transaction_completed);
  const sheetsCompleted = hasSheets || isSheetsSkipped || Boolean(progress?.google_sheets_completed);

  // Calculate current step
  let currentStep = 1;
  if (!productCompleted) {
    currentStep = 2;
  } else if (!telegramCompleted) {
    currentStep = 3;
  } else if (!firstTxCompleted) {
    currentStep = 4;
  } else if (!sheetsCompleted) {
    currentStep = 5;
  } else {
    currentStep = 6;
  }

  // Calculate percentage
  let percentage = 20;
  if (productCompleted) percentage += 20;
  if (telegramCompleted) percentage += 20;
  if (firstTxCompleted) percentage += 20;
  if (sheetsCompleted) percentage += 20;

  const isComplete = percentage >= 100;
  const completedAt = isComplete ? (progress?.completed_at || new Date().toISOString()) : null;

  // Sync to database if state shifted
  if (
    progress &&
    (progress.product_completed !== productCompleted ||
      progress.telegram_completed !== telegramCompleted ||
      progress.first_transaction_completed !== firstTxCompleted ||
      progress.google_sheets_completed !== sheetsCompleted ||
      progress.completed_at !== completedAt ||
      progress.current_step !== currentStep)
  ) {
    await client
      .from("business_onboarding_progress")
      .update({
        product_completed: productCompleted,
        telegram_completed: telegramCompleted,
        first_transaction_completed: firstTxCompleted,
        google_sheets_completed: sheetsCompleted,
        completed_at: completedAt,
        current_step: currentStep,
      })
      .eq("business_id", businessId);

    if (isComplete && !progress.completed_at) {
      await client
        .from("businesses")
        .update({ onboarding_completed_at: completedAt })
        .eq("id", businessId);

      await logOnboardingEvent(client, businessId, "onboarding_completed", {
        completed_at: completedAt,
      });
    }
  }

  return {
    id: progress?.id || "",
    businessId,
    currentStep,
    profileCompleted,
    productCompleted,
    telegramCompleted,
    firstTransactionCompleted: firstTxCompleted,
    googleSheetsCompleted: sheetsCompleted,
    googleSheetsSkipped: isSheetsSkipped,
    completedAt,
    percentage,
  };
}

/**
 * Adds the first product with aliases during onboarding.
 */
export async function addFirstProductForBusiness(
  client: SupabaseClient,
  userId: string,
  input: FirstProductInput
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const name = input.name?.trim();
  const unit = input.unit?.trim() || "kg";
  const price = Math.round(Number(input.priceIdr) || 0);

  if (!name || name.length < 2) {
    return { success: false, error: "Nama produk minimal 2 karakter." };
  }

  if (price < 0) {
    return { success: false, error: "Harga produk tidak valid." };
  }

  try {
    // 1. Insert product
    const { data: product, error: prodErr } = await client
      .from("products")
      .insert({
        business_id: input.businessId,
        name,
        unit,
        default_price: price,
        is_default: true,
        active: true,
      })
      .select("id")
      .single();

    if (prodErr || !product) {
      return { success: false, error: prodErr?.message || "Gagal menyimpan produk." };
    }

    const productId = product.id;

    // 2. Insert aliases
    const aliases = (input.aliases || [])
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0 && a !== name.toLowerCase());

    // Always include product's own name as default alias
    const allAliases = Array.from(new Set([name.toLowerCase(), ...aliases]));

    if (allAliases.length > 0) {
      for (const alias of allAliases) {
        const normalizedAlias = alias.trim().toLowerCase().replace(/\s+/g, " ");
        try {
          await client.from("product_aliases").insert({
            business_id: input.businessId,
            product_id: productId,
            alias,
            normalized_alias: normalizedAlias,
          });
        } catch {
          // Skip duplicates silently
        }
      }
    }

    // 3. Advance onboarding progress
    await client
      .from("business_onboarding_progress")
      .update({
        product_completed: true,
        current_step: 3,
      })
      .eq("business_id", input.businessId);

    // 4. Log event
    await logOnboardingEvent(client, input.businessId, "product_created", {
      product_id: productId,
      name,
      unit,
      price,
      aliases_count: allAliases.length,
    }, userId);

    return { success: true, productId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambahkan produk.";
    return { success: false, error: msg };
  }
}

/**
 * Generates a short-lived, single-use Telegram pairing code.
 */
export async function generateTelegramPairingToken(
  client: SupabaseClient,
  businessId: string,
  userId?: string
): Promise<{
  success: boolean;
  result?: TelegramPairingTokenResult;
  data?: TelegramPairingTokenResult;
  error?: string;
}> {
  try {
    // Invalidate existing unused tokens for this business
    await client
      .from("telegram_pairing_tokens")
      .delete()
      .eq("business_id", businessId)
      .is("used_at", null);

    const code = generatePairingCode();
    const tokenHash = derivePairingTokenHash(code);
    const expiresInSeconds = 600; // 10 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const { data: inserted, error } = await client
      .from("telegram_pairing_tokens")
      .insert({
        business_id: businessId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: userId || null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { success: false, error: error?.message || "Gagal menyimpan token verifikasi." };
    }

    const botUsername =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      process.env.TELEGRAM_BOT_USERNAME ||
      "catfish_ledger_bot";

    const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`;

    const tokenResult: TelegramPairingTokenResult = {
      pairingId: inserted.id,
      code,
      expiresAt,
      expiresInSeconds,
      botUsername,
      deepLink,
    };

    return {
      success: true,
      result: tokenResult,
      data: tokenResult,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat kode pairing.";
    return { success: false, error: msg };
  }
}

/**
 * Checks whether an active Telegram operator is connected for a business.
 */
export async function checkTelegramConnectionStatus(
  client: SupabaseClient,
  businessId: string
): Promise<{ connected: boolean; operatorLabel?: string; telegramUserId?: number }> {
  const { data } = await client
    .from("telegram_authorized_users")
    .select("telegram_user_id, display_label, active")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      connected: true,
      operatorLabel: data.display_label || "Operator Telegram",
      telegramUserId: Number(data.telegram_user_id),
    };
  }

  return { connected: false };
}

/**
 * Checks whether the first transaction has been recorded in PostgreSQL.
 */
export async function checkFirstTransactionStatus(
  client: SupabaseClient,
  businessId: string
): Promise<{
  recorded: boolean;
  transaction?: {
    id: string;
    productName: string;
    quantity: number;
    unit: string;
    totalAmountIdr: number;
    transactionAt: string;
  };
}> {
  const { data: tx } = await client
    .from("transactions")
    .select("id, product_id, quantity, unit, total_amount, transaction_at")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .order("transaction_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tx) {
    return { recorded: false };
  }

  // Fetch product name
  let productName = "Produk";
  if (tx.product_id) {
    const { data: prod } = await client
      .from("products")
      .select("name")
      .eq("id", tx.product_id)
      .maybeSingle();
    if (prod?.name) productName = prod.name;
  }

  // Update onboarding progress
  await client
    .from("business_onboarding_progress")
    .update({
      first_transaction_completed: true,
      current_step: 5,
    })
    .eq("business_id", businessId);

  return {
    recorded: true,
    transaction: {
      id: tx.id,
      productName,
      quantity: Number(tx.quantity),
      unit: tx.unit,
      totalAmountIdr: Number(tx.total_amount),
      transactionAt: tx.transaction_at,
    },
  };
}

/**
 * Skips or finishes Google Sheets onboarding step.
 */
export async function skipOrCompleteGoogleSheets(
  client: SupabaseClient,
  businessId: string,
  skipped: boolean,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const completedAt = new Date().toISOString();

    await client
      .from("business_onboarding_progress")
      .update({
        google_sheets_completed: !skipped,
        google_sheets_skipped: skipped,
        completed_at: completedAt,
        current_step: 6,
      })
      .eq("business_id", businessId);

    await client
      .from("businesses")
      .update({ onboarding_completed_at: completedAt })
      .eq("id", businessId);

    await logOnboardingEvent(client, businessId, skipped ? "onboarding_completed" : "google_sheets_connected", {
      google_sheets_skipped: skipped,
      completed_at: completedAt,
    }, userId);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyelesaikan tahap ini.";
    return { success: false, error: msg };
  }
}
