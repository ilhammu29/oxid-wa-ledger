"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { recordSale, cancelLastSale, setDailyStatus, setDefaultProduct } from "@/modules/transactions";
import { normalizeProductTerm } from "@/modules/products";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Records a manual sale transaction from the web dashboard.
 * Price is resolved strictly from database product configuration.
 * Client-submitted totals or arbitrary unit prices are never accepted.
 */
export async function createManualSaleAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid atau belum terdaftar." };
  }

  const productId = (formData.get("productId") as string) || undefined;
  const quantityStr = (formData.get("quantity") as string) || "";
  const quantity = parseFloat(quantityStr.replace(",", "."));

  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "Jumlah (kuantitas) harus lebih besar dari 0." };
  }

  const supabase = await createClient();

  try {
    const result = await recordSale(
      supabase,
      {
        businessId: session.business.id,
        authenticatedUserId: session.user.id,
        source: "dashboard",
      },
      {
        quantity,
        productId,
        rawMessage: `Manual input dashboard: ${quantity}`,
      }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return {
      success: true,
      data: {
        transactionId: result.transactionId,
        productName: result.productName,
        quantity: result.quantity,
        unit: result.unit,
        unitPrice: result.unitPrice,
        totalAmount: result.totalAmount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("DAY_STATUS_CONFLICT")) {
      return { success: false, error: "Hari ini telah ditandai TUTUP / TIDAK ADA PENJUALAN. Penjualan tidak dapat dicatat." };
    }
    if (msg.includes("PRODUCT_NOT_FOUND")) {
      return { success: false, error: "Produk yang dipilih tidak ditemukan atau sedang nonaktif." };
    }
    if (msg.includes("DEFAULT_PRODUCT_NOT_CONFIGURED")) {
      return { success: false, error: "Bisnis belum memiliki produk default yang aktif. Silakan atur produk di menu Produk." };
    }
    return { success: false, error: "Gagal mencatat transaksi penjualan. Silakan coba kembali." };
  }
}

/**
 * Cancels the most recent confirmed sale for the business.
 */
export async function cancelLastSaleAction(): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  const supabase = await createClient();

  try {
    const result = await cancelLastSale(supabase, {
      businessId: session.business.id,
      authenticatedUserId: session.user.id,
      source: "dashboard",
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NO_TRANSACTION_TO_CANCEL")) {
      return { success: false, error: "Tidak ada transaksi aktif yang dapat dibatalkan." };
    }
    return { success: false, error: "Gagal membatalkan transaksi." };
  }
}

/**
 * Sets daily status (NO_SALE or CLOSED) for today.
 */
export async function setDailyStatusAction(
  status: "NO_SALE" | "CLOSED",
  note?: string
): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengatur status harian." };
  }

  const supabase = await createClient();

  try {
    const result = await setDailyStatus(
      supabase,
      {
        businessId: session.business.id,
        authenticatedUserId: session.user.id,
        source: "dashboard",
      },
      status,
      note
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/status");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("DAY_STATUS_HAS_SALES")) {
      return { success: false, error: "Tidak dapat mengubah status menjadi Libur / Tanpa Penjualan karena sudah terdapat transaksi penjualan terkonfirmasi hari ini." };
    }
    if (msg.includes("DAY_STATUS_CONFLICT")) {
      return { success: false, error: "Hari ini sudah memiliki status yang berbeda." };
    }
    return { success: false, error: "Gagal memperbarui status harian." };
  }
}

/**
 * Adds a new product to the business catalog.
 */
export async function addProductAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat menambah produk." };
  }

  const name = (formData.get("name") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim()?.toLowerCase() || "kg";
  const priceStr = formData.get("price") as string;
  const isDefault = formData.get("isDefault") === "true";
  const defaultPrice = parseInt(priceStr, 10);

  if (!name) {
    return { success: false, error: "Nama produk wajib diisi." };
  }
  if (isNaN(defaultPrice) || defaultPrice < 0) {
    return { success: false, error: "Harga produk harus berupa angka bulat dan tidak boleh negatif." };
  }

  const supabase = await createClient();

  try {
    // If marked default, unset others first or insert then set default
    const { data: newProd, error: insertError } = await supabase
      .from("products")
      .insert({
        business_id: session.business.id,
        name,
        unit,
        default_price: defaultPrice,
        active: true,
        is_default: false,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    if (isDefault && newProd?.id) {
      await setDefaultProduct(supabase, session.business.id, newProd.id);
    }

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal menambah produk: ${msg}` };
  }
}

/**
 * Updates product details (name, unit, price, active status).
 */
export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengubah produk." };
  }

  const name = (formData.get("name") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim()?.toLowerCase() || "kg";
  const priceStr = formData.get("price") as string;
  const active = formData.get("active") === "true";
  const defaultPrice = parseInt(priceStr, 10);

  if (!name) {
    return { success: false, error: "Nama produk wajib diisi." };
  }
  if (isNaN(defaultPrice) || defaultPrice < 0) {
    return { success: false, error: "Harga produk tidak valid." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("products")
      .update({
        name,
        unit,
        default_price: defaultPrice,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("business_id", session.business.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal memperbarui produk: ${msg}` };
  }
}

/**
 * Atomically designates a product as default for the business.
 */
export async function setDefaultProductAction(productId: string): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengatur produk default." };
  }

  const supabase = await createClient();

  try {
    await setDefaultProduct(supabase, session.business.id, productId);
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal mengatur produk default: ${msg}` };
  }
}

/**
 * Adds an alias for an existing product within the authenticated tenant.
 */
export async function addProductAliasAction(
  productId: string,
  alias: string
): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat menambah alias produk." };
  }

  const trimmedAlias = (alias || "").trim();
  if (!trimmedAlias || trimmedAlias.length < 2) {
    return { success: false, error: "Nama alias minimal 2 karakter." };
  }

  const normalized = normalizeProductTerm(trimmedAlias);
  if (!normalized) {
    return { success: false, error: "Format alias tidak valid." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.from("product_aliases").insert({
      business_id: session.business.id,
      product_id: productId,
      alias: trimmedAlias,
      normalized_alias: normalized,
      active: true,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Alias tersebut sudah digunakan di produk lain." };
      }
      throw error;
    }

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal menambah alias: ${msg}` };
  }
}

/**
 * Removes an alias for a product within the authenticated tenant.
 */
export async function deleteProductAliasAction(aliasId: string): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat menghapus alias produk." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("product_aliases")
      .delete()
      .eq("id", aliasId)
      .eq("business_id", session.business.id);

    if (error) throw error;

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal menghapus alias: ${msg}` };
  }
}

/**
 * Marks a conversation failure as reviewed by an owner or admin.
 */
export async function markFailureReviewedAction(failureId: string): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat meninjau pesan." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("conversation_failures")
      .update({
        review_status: "reviewed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.id,
      })
      .eq("id", failureId)
      .eq("business_id", session.business.id);

    if (error) throw error;

    revalidatePath("/dashboard/monitoring");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal meninjau pesan: ${msg}` };
  }
}

/**
 * Saves reminder settings and updates designated recipient operators.
 */
export async function saveReminderSettingsAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengubah pengaturan pengingat." };
  }

  const enabled = formData.get("enabled") === "true";
  const reminderTime = (formData.get("reminderTime") as string) || "18:00";
  const daysOfWeek = formData.getAll("daysOfWeek").map(Number);
  const selectedRecipients = formData.getAll("recipients").map(String);

  if (enabled && selectedRecipients.length === 0) {
    return {
      success: false,
      error: "Pilih minimal satu operator penerima sebelum mengaktifkan pengingat.",
    };
  }

  const supabase = await createClient();

  try {
    // 1. Update telegram_authorized_users recipient flags
    // First, clear receive_reminders for this business
    await supabase
      .from("telegram_authorized_users")
      .update({ receive_reminders: false })
      .eq("business_id", session.business.id);

    // Then enable for selected recipients
    if (selectedRecipients.length > 0) {
      await supabase
        .from("telegram_authorized_users")
        .update({ receive_reminders: true })
        .eq("business_id", session.business.id)
        .in("id", selectedRecipients);
    }

    // 2. Upsert reminder settings
    const { error: settingsErr } = await supabase
      .from("business_reminder_settings")
      .upsert({
        business_id: session.business.id,
        enabled,
        reminder_time: reminderTime,
        days_of_week: daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5, 6, 0],
        channel: "telegram",
        timezone: session.business.timezone || "Asia/Jakarta",
        updated_at: new Date().toISOString(),
        updated_by: session.user.id,
      });

    if (settingsErr) throw settingsErr;

    revalidatePath("/dashboard/settings/reminders");
    revalidatePath("/dashboard/monitoring");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal menyimpan pengaturan: ${msg}` };
  }
}

/**
 * Sends a harmless test reminder to a designated Telegram operator.
 */
export async function sendTestReminderAction(recipientTelegramUserId: number): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengirim pesan uji coba." };
  }

  const supabase = await createClient();
  const { sendTestReminder } = await import("@/modules/reminders");

  const result = await sendTestReminder(supabase, {
    businessId: session.business.id,
    telegramUserId: recipientTelegramUserId,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Gagal mengirim pesan uji coba." };
  }

  return { success: true };
}

/**
 * Saves channel switch settings with WhatsApp readiness and reminder blocks.
 */
export async function saveChannelSettingsAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengubah pengaturan channel." };
  }

  const telegramEnabled = formData.get("telegramEnabled") === "true";
  const whatsappEnabled = formData.get("whatsappEnabled") === "true";
  const primaryChannel = (formData.get("primaryChannel") as "telegram" | "whatsapp") || "telegram";
  const reminderChannel = (formData.get("reminderChannel") as "telegram" | "whatsapp") || "telegram";

  const supabase = await createClient();
  const { updateBusinessChannelSettings } = await import("@/modules/channels");

  const result = await updateBusinessChannelSettings(
    supabase,
    session.business.id,
    {
      telegramEnabled,
      whatsappEnabled,
      primaryChannel,
      reminderChannel,
    },
    session.user.id
  );

  if (!result.success) {
    return { success: false, error: result.error || "Gagal menyimpan pengaturan channel." };
  }

  revalidatePath("/dashboard/settings/channels");
  revalidatePath("/dashboard/monitoring");
  return { success: true };
}

/**
 * Tests connection to a Google Spreadsheet using service account credentials.
 */
export async function testGoogleSheetsConnectionAction(
  spreadsheetInput: string
): Promise<ActionResult<{ spreadsheetTitle?: string; spreadsheetId?: string }>> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  const { parseSpreadsheetId } = await import("@/modules/google-sheets/url-parser");
  const parsed = parseSpreadsheetId(spreadsheetInput);
  if (!parsed.success || !parsed.spreadsheetId) {
    return { success: false, error: parsed.error || "Spreadsheet URL atau ID tidak valid." };
  }

  const { testSpreadsheetConnection } = await import("@/modules/google-sheets/client");
  const testRes = await testSpreadsheetConnection(parsed.spreadsheetId);

  if (!testRes.success) {
    return {
      success: false,
      error: testRes.errorMessage || "Koneksi ke Google Sheets gagal.",
    };
  }

  return {
    success: true,
    data: {
      spreadsheetId: parsed.spreadsheetId,
      spreadsheetTitle: testRes.spreadsheetTitle,
    },
  };
}

/**
 * Saves Google Sheets connection settings for the authenticated business.
 */
export async function saveGoogleSheetsConnectionAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return { success: false, error: "Hanya pemilik atau admin yang dapat mengubah pengaturan Google Sheets." };
  }

  const enabled = formData.get("enabled") === "true";
  const spreadsheetInput = (formData.get("spreadsheetInput") as string) || "";
  const syncInterval = parseInt((formData.get("syncIntervalMinutes") as string) || "5", 10);
  const syncIntervalMinutes = isNaN(syncInterval) || syncInterval < 5 ? 5 : Math.min(syncInterval, 1440);

  const supabase = await createClient();
  let spreadsheetId: string | null = null;
  let spreadsheetTitle: string | null = null;

  if (enabled || spreadsheetInput.trim().length > 0) {
    const { parseSpreadsheetId } = await import("@/modules/google-sheets/url-parser");
    const parsed = parseSpreadsheetId(spreadsheetInput);
    if (!parsed.success || !parsed.spreadsheetId) {
      return { success: false, error: parsed.error || "Spreadsheet URL atau ID tidak valid." };
    }
    spreadsheetId = parsed.spreadsheetId;

    // Requirement 37: Ensure one spreadsheet belongs to exactly one business
    const { data: existingOther } = await supabase
      .from("google_sheets_connections")
      .select("business_id")
      .eq("spreadsheet_id", spreadsheetId)
      .neq("business_id", session.business.id)
      .limit(1);

    if (existingOther && existingOther.length > 0) {
      return {
        success: false,
        error: "Spreadsheet ID ini sudah terhubung ke bisnis lain. Gunakan spreadsheet terpisah untuk setiap bisnis.",
      };
    }

    // Try fetching title
    const { getSpreadsheetMetadata } = await import("@/modules/google-sheets/client");
    const meta = await getSpreadsheetMetadata(spreadsheetId).catch(() => null);
    if (meta?.title) {
      spreadsheetTitle = meta.title;
    }
  }

  const { error: upsertErr } = await supabase
    .from("google_sheets_connections")
    .upsert({
      business_id: session.business.id,
      enabled,
      spreadsheet_id: spreadsheetId,
      spreadsheet_title: spreadsheetTitle,
      sync_interval_minutes: syncIntervalMinutes,
      updated_at: new Date().toISOString(),
      updated_by: session.user.id,
    });

  if (upsertErr) {
    return { success: false, error: `Gagal menyimpan konfigurasi: ${upsertErr.message}` };
  }

  // Requirement 22: Enqueue initial full sync when enabled
  if (enabled && spreadsheetId) {
    const { enqueueSync } = await import("@/modules/google-sheets/queue");
    await enqueueSync(supabase, session.business.id, "INITIAL_SYNC");
  }

  revalidatePath("/dashboard/settings/google-sheets");
  revalidatePath("/dashboard/monitoring");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Triggers an immediate asynchronous synchronization queue entry.
 * (Requirement 32: Non-blocking; does not run synchronous sync in browser request).
 */
export async function triggerManualSyncAction(): Promise<ActionResult<{ message: string }>> {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    return { success: false, error: "Akses bisnis tidak valid." };
  }

  const supabase = await createClient();
  const { data: conn } = await supabase
    .from("google_sheets_connections")
    .select("enabled, spreadsheet_id")
    .eq("business_id", session.business.id)
    .single();

  if (!conn || !conn.enabled || !conn.spreadsheet_id) {
    return {
      success: false,
      error: "Koneksi Google Sheets belum aktif atau belum memiliki Spreadsheet ID.",
    };
  }

  const { enqueueSync } = await import("@/modules/google-sheets/queue");
  const enqueued = await enqueueSync(supabase, session.business.id, "MANUAL_SYNC");

  if (!enqueued) {
    return { success: false, error: "Gagal menjadwalkan sinkronisasi." };
  }

  revalidatePath("/dashboard/settings/google-sheets");
  return {
    success: true,
    data: { message: "Sinkronisasi dijadwalkan." },
  };
}

/**
 * Signs out the currently authenticated user and redirects to login.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}


