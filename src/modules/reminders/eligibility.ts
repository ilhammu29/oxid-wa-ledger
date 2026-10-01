import { SupabaseClient } from "@supabase/supabase-js";
import {
  ReminderEligibilityResult,
  ReminderRecipient,
} from "./types";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Evaluates whether a business is currently eligible to receive a daily sales reminder.
 * Strictly adheres to business timezone and financial ledger semantics.
 */
export async function checkReminderEligibility(
  client: SupabaseClient,
  businessId: string,
  now: Date = new Date()
): Promise<ReminderEligibilityResult> {
  // 1. Fetch reminder settings & business timezone
  const { data: settingsData } = await client
    .from("business_reminder_settings")
    .select("*")
    .eq("business_id", businessId)
    .single();

  const { data: businessData } = await client
    .from("businesses")
    .select("timezone, status")
    .eq("id", businessId)
    .single();

  const timezone = settingsData?.timezone || businessData?.timezone || "Asia/Jakarta";

  // Compute local date, time, and weekday in the business timezone
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  const currentWeekday = WEEKDAY_MAP[weekdayShort] ?? 0;

  // 1. Check enabled
  if (!settingsData || !settingsData.enabled) {
    return {
      eligible: false,
      reason: "DISABLED",
      businessId,
      localDate,
    };
  }

  // 2. Check weekday
  const daysOfWeek = settingsData.days_of_week || [1, 2, 3, 4, 5, 6, 0];
  if (!daysOfWeek.includes(currentWeekday)) {
    return {
      eligible: false,
      reason: "WRONG_WEEKDAY",
      businessId,
      localDate,
    };
  }

  // 3. Check time >= reminder_time
  const scheduledTime = (settingsData.reminder_time || "18:00").slice(0, 5);
  if (localTime < scheduledTime) {
    return {
      eligible: false,
      reason: "BEFORE_SCHEDULED_TIME",
      businessId,
      localDate,
      reminderTime: scheduledTime,
    };
  }

  // 4. Check whether confirmed sales exist today in business timezone
  const { data: daySales } = await client
    .from("transactions")
    .select("id, status, transaction_at")
    .eq("business_id", businessId)
    .eq("status", "confirmed");

  const salesOnLocalDate = (daySales || []).filter((tx) => {
    const txDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
      new Date(tx.transaction_at)
    );
    return txDate === localDate;
  });

  if (salesOnLocalDate.length > 0) {
    return {
      eligible: false,
      reason: "HAS_CONFIRMED_SALES",
      businessId,
      localDate,
    };
  }

  // 5. Check business_daily_status (NO_SALE or CLOSED)
  const { data: dailyStatus } = await client
    .from("business_daily_status")
    .select("status")
    .eq("business_id", businessId)
    .eq("local_date", localDate)
    .maybeSingle();

  if (dailyStatus && (dailyStatus.status === "NO_SALE" || dailyStatus.status === "CLOSED")) {
    return {
      eligible: false,
      reason: "HAS_DAILY_STATUS",
      businessId,
      localDate,
    };
  }

  // 6. Determine reminder channel and fetch active recipients
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("reminder_channel, whatsapp_enabled, telegram_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  const reminderChannel = (channelSettings?.reminder_channel || settingsData?.channel || "telegram") as "telegram" | "whatsapp";

  let recipients: ReminderRecipient[] = [];
  let phoneNumberId: string | undefined;
  let templateName: string | undefined;
  let templateLanguage: string | undefined;

  if (reminderChannel === "whatsapp") {
    // WhatsApp Reminder: Verify connection and approved template
    const { data: waConn } = await client
      .from("whatsapp_connections")
      .select("phone_number_id, status, reminder_template_name, reminder_template_language, reminder_template_status")
      .eq("business_id", businessId)
      .in("status", ["connected", "active"])
      .maybeSingle();

    if (!waConn || !waConn.phone_number_id) {
      return {
        eligible: false,
        reason: "NO_ACTIVE_RECIPIENTS",
        businessId,
        localDate,
      };
    }

    if (!waConn.reminder_template_name || waConn.reminder_template_status !== "approved") {
      return {
        eligible: false,
        reason: "WHATSAPP_TEMPLATE_NOT_READY",
        businessId,
        localDate,
      };
    }

    phoneNumberId = waConn.phone_number_id;
    templateName = waConn.reminder_template_name;
    templateLanguage = waConn.reminder_template_language || "id";

    // Fetch active WhatsApp recipients
    const { data: waSenders } = await client
      .from("whatsapp_authorized_senders")
      .select("phone_number, display_label, receive_reminders")
      .eq("business_id", businessId)
      .eq("active", true);

    const eligibleSenders = (waSenders || []).filter((s) => s.receive_reminders !== false);
    if (eligibleSenders.length === 0) {
      return {
        eligible: false,
        reason: "NO_ACTIVE_RECIPIENTS",
        businessId,
        localDate,
      };
    }

    recipients = eligibleSenders.map((s) => ({
      phone: s.phone_number,
      displayLabel: s.display_label,
    }));
  } else {
    // Telegram Reminder
    const { data: recipientsData } = await client
      .from("telegram_authorized_users")
      .select("telegram_user_id, display_label, receive_reminders, active")
      .eq("business_id", businessId)
      .eq("active", true)
      .eq("receive_reminders", true);

    if (!recipientsData || recipientsData.length === 0) {
      return {
        eligible: false,
        reason: "NO_ACTIVE_RECIPIENTS",
        businessId,
        localDate,
      };
    }

    recipients = recipientsData.map((r) => ({
      telegramUserId: Number(r.telegram_user_id),
      displayLabel: r.display_label,
    }));
  }

  // 7. Check idempotency in notification_logs
  const { data: existingLog } = await client
    .from("notification_logs")
    .select("id, status")
    .eq("business_id", businessId)
    .eq("notification_type", "daily_reminder")
    .eq("local_date", localDate)
    .maybeSingle();

  if (existingLog && (existingLog.status === "sent" || existingLog.status === "processing")) {
    return {
      eligible: false,
      reason: "ALREADY_SENT_TODAY",
      businessId,
      localDate,
    };
  }

  // Eligible!
  return {
    eligible: true,
    businessId,
    localDate,
    reminderTime: scheduledTime,
    channel: reminderChannel,
    phoneNumberId,
    templateName,
    templateLanguage,
    recipients,
  };
}
