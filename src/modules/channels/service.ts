import { SupabaseClient } from "@supabase/supabase-js";
import {
  BusinessChannelSettings,
  WhatsAppReadiness,
  WhatsAppConnectionStatus,
  WhatsAppConnectionDetails,
  UpdateChannelSettingsInput,
} from "./types";
import { maskPhoneNumber } from "../whatsapp/phone";

/**
 * Checks WhatsApp operational readiness for a business without exposing secrets.
 */
export async function checkWhatsAppReadiness(
  client: SupabaseClient,
  businessId: string
): Promise<WhatsAppReadiness> {
  const missingRequirements: string[] = [];

  // 1. Fetch connection record
  const { data: anyConnection } = await client
    .from("whatsapp_connections")
    .select("id, status, phone_number, display_phone_number, verified_name, phone_number_id, waba_id, reminder_template_name, reminder_template_language, reminder_template_status")
    .eq("business_id", businessId)
    .maybeSingle();

  const hasActiveConnection = Boolean(
    anyConnection && (anyConnection.status === "connected" || anyConnection.status === "active")
  );

  const hasPhoneNumberId = Boolean(
    anyConnection?.phone_number_id && anyConnection.phone_number_id.trim().length > 0
  );

  const hasWabaId = Boolean(
    anyConnection?.waba_id && anyConnection.waba_id.trim().length > 0
  );

  const isTokenConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);

  if (!anyConnection) {
    missingRequirements.push("Koneksi WhatsApp belum terdaftar.");
  } else if (!hasActiveConnection) {
    missingRequirements.push("Koneksi WhatsApp belum aktif atau terputus.");
  }

  if (!hasPhoneNumberId) {
    missingRequirements.push("Phone Number ID belum terdaftar di koneksi WhatsApp.");
  }

  if (!isTokenConfigured) {
    missingRequirements.push("WHATSAPP_ACCESS_TOKEN belum terkonfigurasi di server runtime.");
  }

  // 2. Fetch authorized operators
  const { data: senders } = await client
    .from("whatsapp_authorized_senders")
    .select("id, phone_number, display_label, active, receive_reminders")
    .eq("business_id", businessId)
    .eq("active", true);

  const authorizedSendersCount = senders?.length || 0;
  const hasAuthorizedSenders = authorizedSendersCount > 0;
  if (!hasAuthorizedSenders) {
    missingRequirements.push("Minimal satu operator/nomor WhatsApp yang diizinkan harus terdaftar.");
  }

  // 3. Template status
  const hasApprovedTemplate = Boolean(
    anyConnection?.reminder_template_name &&
    anyConnection?.reminder_template_status === "approved"
  );

  const ready = hasActiveConnection && hasPhoneNumberId && hasAuthorizedSenders && isTokenConfigured;

  // 4. Compute status state
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("whatsapp_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  const whatsappEnabled = Boolean(channelSettings?.whatsapp_enabled);

  let status: WhatsAppConnectionStatus = "NOT CONFIGURED";
  if (!anyConnection) {
    status = "NOT CONFIGURED";
  } else if (anyConnection.status === "rate_limited") {
    status = "ERROR";
  } else if (!ready) {
    status = "CONFIGURING";
  } else if (whatsappEnabled) {
    status = "ACTIVE";
  } else {
    status = "READY";
  }

  const connectionDetails: WhatsAppConnectionDetails | null = anyConnection
    ? {
        phoneNumber: anyConnection.phone_number,
        maskedPhoneNumber: maskPhoneNumber(anyConnection.phone_number),
        displayPhoneNumber: anyConnection.display_phone_number || anyConnection.phone_number,
        verifiedName: anyConnection.verified_name || null,
        phoneNumberId: anyConnection.phone_number_id,
        maskedPhoneNumberId: anyConnection.phone_number_id
          ? `...${anyConnection.phone_number_id.slice(-4)}`
          : "",
        wabaId: anyConnection.waba_id || null,
        status: anyConnection.status,
        reminderTemplateName: anyConnection.reminder_template_name || null,
        reminderTemplateLanguage: anyConnection.reminder_template_language || "id",
        reminderTemplateStatus: anyConnection.reminder_template_status || "unconfigured",
      }
    : null;

  return {
    ready,
    status,
    hasActiveConnection,
    hasPhoneNumberId,
    hasWabaId,
    hasAuthorizedSenders,
    hasApprovedTemplate,
    isTokenConfigured,
    authorizedSendersCount,
    connection: connectionDetails,
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
  // 1. Guard: WhatsApp automatic reminders require production readiness and approved template
  if (input.reminderChannel === "whatsapp") {
    const readiness = await checkWhatsAppReadiness(client, businessId);
    if (!readiness.ready) {
      return {
        success: false,
        error: `Reminder WhatsApp belum tersedia / diblokir: Koneksi WhatsApp belum siap (${readiness.missingRequirements.join(", ")}).`,
      };
    }
    if (!readiness.hasApprovedTemplate) {
      const templateStatus = readiness.connection?.reminderTemplateStatus || "unconfigured";
      return {
        success: false,
        error: `Reminder WhatsApp belum tersedia / diblokir: Template pengingat Meta belum berstatus approved (status saat ini: ${templateStatus}). Daftarkan template di Meta Business Manager terlebih dahulu.`,
      };
    }
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

