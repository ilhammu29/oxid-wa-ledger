"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { recordSale, cancelLastSale, setDailyStatus, setDefaultProduct } from "@/modules/transactions";
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
 * Signs out the currently authenticated user and redirects to login.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
