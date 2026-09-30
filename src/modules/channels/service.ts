import { SupabaseClient } from "@supabase/supabase-js";
import {
  BusinessChannelSettings,
  WhatsAppReadiness,
  UpdateChannelSettingsInput,
} from "./types";

/**
 * Checks WhatsApp operational readiness for a business without exposing secrets.
 */
export async function checkWhatsAppReadiness(
  client: SupabaseClient,
  businessId: string
): Promise<WhatsAppReadiness> {
  const missingRequirements: string[] = [];

  const { data: connections } = await client
    .from("whatsapp_connections")
    .select("id, status, phone_number_id")
    .eq("business_id", businessId)
    .eq("status", "active");

  const hasActiveConnection = Boolean(connections && connections.length > 0);
  const hasPhoneNumberId = Boolean(hasActiveConnection && connections?.[0]?.phone_number_id);

  if (!hasActiveConnection) {
    missingRequirements.push("Koneksi WhatsApp belum aktif.");
  }
  if (!hasPhoneNumberId) {
    missingRequirements.push("Phone Number ID belum terdaftar di koneksi WhatsApp.");
  }

  const { data: senders } = await client
    .from("whatsapp_authorized_senders")
    .select("id")
    .eq("business_id", businessId)
    .eq("active", true);

  const hasAuthorizedSenders = Boolean(senders && senders.length > 0);
  if (!hasAuthorizedSenders) {
    missingRequirements.push("Minimal satu operator/nomor WhatsApp yang diizinkan harus terdaftar.");
  }

  return {
    ready: hasActiveConnection && hasPhoneNumberId && hasAuthorizedSenders,
    hasActiveConnection,
    hasPhoneNumberId,
    hasAuthorizedSenders,
    missingRequirements,
  };
}

/**
 * Retrieves the channel settings for a business, with fallback defaults if unset.
 */
export async function getBusinessChannelSettings(
  client: SupabaseClient,
  businessId: string
): Promise<BusinessChannelSettings> {
  const { data, error } = await client
    .from("business_channel_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    return {
      businessId,
      telegramEnabled: true,
      whatsappEnabled: false,
      primaryChannel: "telegram",
      reminderChannel: "telegram",
      updatedAt: new Date().toISOString(),
      updatedBy: null,
    };
  }

  return {
    businessId: data.business_id,
    telegramEnabled: data.telegram_enabled,
    whatsappEnabled: data.whatsapp_enabled,
    primaryChannel: data.primary_channel as "telegram" | "whatsapp",
    reminderChannel: data.reminder_channel as "telegram" | "whatsapp",
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
}

/**
 * Updates channel settings with strict readiness and template guard checks.
 */
export async function updateBusinessChannelSettings(
  client: SupabaseClient,
  businessId: string,
  input: UpdateChannelSettingsInput,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Guard: WhatsApp automatic reminders are strictly blocked in Step 7
  if (input.reminderChannel === "whatsapp") {
    return {
      success: false,
      error: "Reminder WhatsApp belum tersedia sampai konfigurasi template production selesai.",
    };
  }

  // 2. Guard: Primary or enabled WhatsApp requires verified readiness
  if (input.whatsappEnabled || input.primaryChannel === "whatsapp") {
    const readiness = await checkWhatsAppReadiness(client, businessId);
    if (!readiness.ready) {
      return {
        success: false,
        error: `Aktivasi WhatsApp diblokir karena konfigurasi belum lengkap: ${readiness.missingRequirements.join(" ")}`,
      };
    }
  }

  const { error } = await client
    .from("business_channel_settings")
    .upsert({
      business_id: businessId,
      telegram_enabled: input.telegramEnabled,
      whatsapp_enabled: input.whatsappEnabled,
      primary_channel: input.primaryChannel,
      reminder_channel: input.reminderChannel,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
