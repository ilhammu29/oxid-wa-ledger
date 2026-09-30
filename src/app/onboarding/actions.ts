"use server";

import { createClient } from "@/lib/supabase/server";
import { executeClientOnboarding } from "@/modules/onboarding";
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
