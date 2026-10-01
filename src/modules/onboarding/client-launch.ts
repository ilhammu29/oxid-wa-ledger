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
    const isValidUuid = (val?: string): boolean =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    // Get current auth state if available
    let authUser: { id: string; email_confirmed_at?: string | null; confirmed_at?: string | null } | null = null;
    if (client.auth?.getUser) {
      const { data: authData } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
      authUser = authData?.user || null;
    }

    const resolvedUserId = isValidUuid(userId) ? userId : authUser?.id && isValidUuid(authUser.id) ? authUser.id : null;

    if (!resolvedUserId) {
      return {
        success: false,
        error: "Sesi Anda tidak valid. Silakan masuk kembali.",
      };
    }

    // 0. Verification check: unverified users cannot provision a business unless internal bypass is active
    if (process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP !== "true" && authUser) {
      if (!authUser.email_confirmed_at && !authUser.confirmed_at) {
        return {
          success: false,
          error: "Email belum diverifikasi. Verifikasi email diperlukan sebelum membuat bisnis.",
        };
      }
    }

    // 1. Authoritative provisioning via PostgreSQL SECURITY DEFINER RPC
    // Eliminates circular RLS dependencies between businesses and business_users
    const { data: rpcRes, error: rpcErr } = await client.rpc("create_business_for_authenticated_user", {
      p_name: name,
      p_category: category,
      p_owner_name: ownerName,
      p_timezone: timezone,
      p_currency: currency,
      p_default_unit: defaultUnit,
      p_owner_user_id: resolvedUserId,
    });

    if (rpcErr) {
      console.error("[createBusinessForUser] RPC execution error:", rpcErr.message);
      if (rpcErr.message.includes("UNAUTHORIZED") || rpcErr.code === "42501") {
        return {
          success: false,
          error: "Sesi Anda tidak valid. Silakan masuk kembali.",
        };
      }
      return {
        success: false,
        error: "Profil usaha belum dapat dibuat. Silakan coba lagi.",
      };
    }

    const rpcResult = rpcRes as {
      success?: boolean;
      business_id?: string;
      error?: string;
      message?: string;
    } | null;

    if (!rpcResult?.success || !rpcResult.business_id) {
      const safeErrorMsg =
        rpcResult?.message ||
        (rpcResult?.error === "UNAUTHORIZED"
          ? "Sesi Anda tidak valid. Silakan masuk kembali."
          : rpcResult?.error === "EMAIL_NOT_VERIFIED"
          ? "Email belum diverifikasi. Verifikasi email diperlukan sebelum membuat bisnis."
          : rpcResult?.error === "INVALID_NAME"
          ? "Nama usaha minimal 2 karakter."
          : "Profil usaha belum dapat dibuat. Silakan coba lagi.");

      return {
        success: false,
        error: safeErrorMsg,
      };
    }

    return { success: true, businessId: rpcResult.business_id };
  } catch (err: unknown) {
    console.error("[createBusinessForUser] Unexpected exception:", err);
    return { success: false, error: "Profil usaha belum dapat dibuat. Silakan coba lagi." };
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
    const isValidUuid = (val?: string): boolean =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    let authUser: { id: string } | null = null;
    if (client.auth?.getUser) {
      const { data: authData } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
      authUser = authData?.user || null;
    }

    const resolvedUserId = isValidUuid(userId) ? userId : authUser?.id && isValidUuid(authUser.id) ? authUser.id : null;

    if (!resolvedUserId) {
      return {
        success: false,
        error: "Sesi Anda tidak valid. Silakan masuk kembali.",
      };
    }

    const aliases = (input.aliases || [])
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0 && a !== name.toLowerCase());

    const allAliases = Array.from(new Set([name.toLowerCase(), ...aliases]));

    const { data: rpcRes, error: rpcErr } = await client.rpc("create_or_bootstrap_product", {
      p_business_id: input.businessId,
      p_name: name,
      p_unit: unit,
      p_price: price,
      p_aliases: allAliases,
      p_is_onboarding: true,
      p_set_as_default: true,
      p_user_id: resolvedUserId,
    });

    if (rpcErr) {
      console.error("[addFirstProductForBusiness] RPC error:", rpcErr.message);
      if (rpcErr.message.includes("idx_products_unique_default") || rpcErr.message.includes("DEFAULT_CONFLICT")) {
        return {
          success: false,
          error: "Produk berhasil disimpan, tetapi status produk default tidak dapat diperbarui.",
        };
      }
      return {
        success: false,
        error: "Produk belum dapat dibuat. Silakan coba lagi.",
      };
    }

    const res = rpcRes as {
      success?: boolean;
      product_id?: string;
      error?: string;
      message?: string;
      idempotent?: boolean;
    } | null;

    if (!res?.success || !res.product_id) {
      const safeError =
        res?.message ||
        (res?.error === "INVALID_NAME"
          ? "Nama produk minimal 2 karakter."
          : res?.error === "INVALID_PRICE"
          ? "Harga produk tidak valid."
          : res?.error === "UNAUTHORIZED"
          ? "Hanya pemilik atau admin yang dapat menambahkan produk."
          : "Produk belum dapat dibuat. Silakan coba lagi.");

      return { success: false, error: safeError };
    }

    return { success: true, productId: res.product_id };
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
