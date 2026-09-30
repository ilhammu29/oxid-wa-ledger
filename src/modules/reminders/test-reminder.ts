import { SupabaseClient } from "@supabase/supabase-js";
import { sendTelegramText } from "../telegram/telegram-client";
import { recordIntegrationEvent } from "../monitoring/telemetry";

export const TEST_REMINDER_TEXT = `🔔 [TEST REMINDER]
Ini adalah pesan uji coba pengingat otomatis OXID Ledger.

Jika menerima pesan ini, akun Telegram Anda siap menerima pengingat harian sesuai jadwal yang dikonfigurasi di dashboard.`;

export async function sendTestReminder(
  client: SupabaseClient,
  params: {
    businessId: string;
    telegramUserId: number;
    telegramSender?: typeof sendTelegramText;
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const telegramSend = params.telegramSender || sendTelegramText;

  // Verify recipient is an authorized operator for this business
  const { data: recipient, error: authErr } = await client
    .from("telegram_authorized_users")
    .select("id, active")
    .eq("business_id", params.businessId)
    .eq("telegram_user_id", params.telegramUserId)
    .eq("active", true)
    .maybeSingle();

  if (authErr || !recipient) {
    return {
      success: false,
      error: "Operator Telegram tidak ditemukan atau belum aktif untuk bisnis ini.",
    };
  }

  // Send harmless test message (strictly does not touch financial ledger or daily notification logs)
  const sendRes = await telegramSend({
    chatId: params.telegramUserId,
    text: TEST_REMINDER_TEXT,
  });

  if (!sendRes.success) {
    await recordIntegrationEvent(client, {
      businessId: params.businessId,
      channel: "telegram",
      direction: "outbound",
      eventType: "reminder.test_failed",
      status: "failed",
      errorCode: sendRes.errorCode,
    });

    return {
      success: false,
      error: sendRes.errorCode || "Gagal mengirim pesan uji coba ke Telegram.",
    };
  }

  await recordIntegrationEvent(client, {
    businessId: params.businessId,
    channel: "telegram",
    direction: "outbound",
    eventType: "reminder.test_sent",
    status: "success",
    metadata: { telegramUserId: params.telegramUserId },
  });

  return {
    success: true,
    messageId: sendRes.messageId,
  };
}
