"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createBusinessForUser,
  addFirstProductForBusiness,
  generateTelegramPairingToken,
  checkTelegramConnectionStatus,
  checkFirstTransactionStatus,
  skipOrCompleteGoogleSheets,
  getBusinessOnboardingState,
} from "@/modules/onboarding/client-launch";
import { executeClientOnboarding } from "@/modules/onboarding/complete";
import { revalidatePath } from "next/cache";

export interface OnboardingActionResult {
  success: boolean;
  businessId?: string;
  error?: string;
}

export async function completeOnboardingAction(
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Sesi pengguna tidak valid. Silakan login terlebih dahulu.",
    };
  }

  const inviteToken = formData.get("inviteToken") as string;
  const businessName = formData.get("businessName") as string;
  const timezone = (formData.get("timezone") as string) || "Asia/Jakarta";
  const currency = (formData.get("currency") as string) || "IDR";
  const productName = (formData.get("productName") as string) || "Produk Utama";
  const productUnit = (formData.get("productUnit") as string) || "kg";
  const productPrice = Number(formData.get("productPrice")) || 28000;
  const channel = (formData.get("channel") as "telegram" | "whatsapp") || "telegram";
  const rawTelegramUserId = formData.get("telegramUserId") as string;
  const telegramUserId = rawTelegramUserId ? Number(rawTelegramUserId) : undefined;
  const enableReminder = formData.get("enableReminder") === "true";
  const reminderTime = (formData.get("reminderTime") as string) || "18:00";
  const reminderDays = formData.getAll("reminderDays").map(Number);

  if (!inviteToken) {
    return { success: false, error: "Token undangan tidak valid." };
  }

  if (!businessName || !businessName.trim()) {
    return { success: false, error: "Nama bisnis wajib diisi." };
  }

  const result = await executeClientOnboarding(supabase, {
    inviteToken,
    businessName,
    timezone,
    currency,
    productName,
    productUnit,
    productPrice,
    channel,
    telegramUserId,
    enableReminder,
    reminderTime,
    reminderDays: reminderDays.length > 0 ? reminderDays : [1, 2, 3, 4, 5, 6, 0],
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Gagal menyelesaikan onboarding.",
    };
  }

  revalidatePath("/dashboard", "layout");
  return {
    success: true,
    businessId: result.businessId,
  };
}

export async function createBusinessAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sesi login tidak valid. Silakan masuk terlebih dahulu." };
  }

  const businessName = formData.get("businessName") as string;
  const category = (formData.get("category") as string) || "Lainnya";
  const ownerName = (formData.get("ownerName") as string) || "";
  const timezone = (formData.get("timezone") as string) || "Asia/Pontianak";
  const defaultUnit = (formData.get("defaultUnit") as string) || "kg";

  const result = await createBusinessForUser(supabase, user.id, {
    name: businessName,
    category,
    ownerName,
    timezone,
    currency: "IDR",
    defaultUnit,
  });

  if (result.success) {
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function addFirstProductAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sesi login tidak valid." };
  }

  const businessId = formData.get("businessId") as string;
  const productName = formData.get("productName") as string;
  const unit = (formData.get("unit") as string) || "kg";
  const priceIdr = Math.round(Number(formData.get("priceIdr")) || 0);
  const rawAliases = (formData.get("aliases") as string) || "";
  const aliases = rawAliases
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!businessId) {
    return { success: false, error: "ID Usaha tidak valid." };
  }

  const result = await addFirstProductForBusiness(supabase, user.id, {
    businessId,
    name: productName,
    unit,
    priceIdr,
    aliases,
  });

  if (result.success) {
    revalidatePath("/onboarding");
    revalidatePath("/dashboard/products");
  }

  return result;
}

export async function generatePairingTokenAction(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sesi login tidak valid." };
  }

  return await generateTelegramPairingToken(supabase, businessId, user.id);
}

export async function checkTelegramStatusAction(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { connected: false };
  }

  const status = await checkTelegramConnectionStatus(supabase, businessId);
  if (status.connected) {
    revalidatePath("/onboarding");
  }
  return status;
}

export async function checkFirstTransactionAction(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { recorded: false };
  }

  const status = await checkFirstTransactionStatus(supabase, businessId);
  if (status.recorded) {
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
  }
  return status;
}

export async function skipGoogleSheetsAction(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sesi login tidak valid." };
  }

  const res = await skipOrCompleteGoogleSheets(supabase, businessId, true, user.id);
  if (res.success) {
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function getOnboardingProgressAction(businessId: string) {
  const supabase = await createClient();
  return await getBusinessOnboardingState(supabase, businessId);
}
