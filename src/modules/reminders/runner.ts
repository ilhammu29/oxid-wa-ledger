import { SupabaseClient } from "@supabase/supabase-js";
import { checkReminderEligibility } from "./eligibility";
import { ReminderRunSummary } from "./types";
import { sendTelegramText } from "../telegram/telegram-client";
import { recordIntegrationEvent } from "../monitoring/telemetry";

export const REMINDER_MESSAGE_TEXT = `Belum ada penjualan yang tercatat hari ini.

Kalau memang tidak ada penjualan, kirim:
'gak ada penjualan hari ini'

Kalau hari ini libur, kirim:
'libur hari ini'`;

export interface RunDueRemindersOptions {
  now?: Date;
  telegramSender?: typeof sendTelegramText;
}

/**
 * Executes due daily sales reminders across all configured businesses.
 * Uses atomic idempotency claims to ensure concurrent scheduler runs NEVER duplicate messages.
 */
export async function runDueReminders(
  client: SupabaseClient,
  options: RunDueRemindersOptions = {}
): Promise<ReminderRunSummary> {
  const now = options.now || new Date();
  const telegramSend = options.telegramSender || sendTelegramText;
  const startedAt = now.toISOString();

  // 1. Create system_job_runs record
  const { data: jobData } = await client
    .from("system_job_runs")
    .insert({
      job_name: "daily_reminder_runner",
      status: "running",
      started_at: startedAt,
      businesses_checked: 0,
      notifications_sent: 0,
      notifications_failed: 0,
    })
    .select("id")
    .single();

  const jobId = jobData?.id || "local-job-run";

  await recordIntegrationEvent(client, {
    channel: "system",
    direction: "internal",
    eventType: "reminder.runner.started",
    status: "success",
    metadata: { jobId },
  });

  // 2. Fetch businesses with enabled reminders
  const { data: enabledSettings, error: fetchErr } = await client
    .from("business_reminder_settings")
    .select("business_id")
    .eq("enabled", true);

  if (fetchErr || !enabledSettings) {
    const errorMsg = fetchErr?.message || "Failed to fetch reminder settings";
    await client
      .from("system_job_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: errorMsg,
      })
      .eq("id", jobId);

    return {
      jobId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      businessesChecked: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      details: [],
    };
  }

  const businessesChecked = enabledSettings.length;
  let notificationsSent = 0;
  let notificationsFailed = 0;
  const details: ReminderRunSummary["details"] = [];

  // 3. Process each business
  for (const row of enabledSettings) {
    const businessId = row.business_id;

    try {
      const eligibility = await checkReminderEligibility(client, businessId, now);

      if (!eligibility.eligible) {
        details.push({
          businessId,
          status: "skipped",
          reason: eligibility.reason,
        });
        continue;
      }

      // 4. Atomic Idempotency Claim via notification_logs
      // (business_id, notification_type, local_date) is uniquely constrained
      const { data: claimInsert, error: claimErr } = await client
        .from("notification_logs")
        .insert({
          business_id: businessId,
          notification_type: "daily_reminder",
          local_date: eligibility.localDate,
          channel: "telegram",
          status: "processing",
        })
        .select("id")
        .maybeSingle();

      if (claimErr || !claimInsert) {
        // Already claimed or sent concurrently
        details.push({
          businessId,
          status: "skipped",
          reason: "ALREADY_CLAIMED_OR_SENT",
        });
        continue;
      }

      const logId = claimInsert.id;
      let businessSendSuccess = true;
      let lastErrorMessage = "";

      // 5. Send reminder to each designated recipient
      for (const recipient of eligibility.recipients || []) {
        const sendRes = await telegramSend({
          chatId: recipient.telegramUserId,
          text: REMINDER_MESSAGE_TEXT,
        });

        if (!sendRes.success) {
          businessSendSuccess = false;
          lastErrorMessage = sendRes.errorCode || "TELEGRAM_SEND_FAILED";
        }
      }

      if (businessSendSuccess) {
        // Mark notification_logs as sent
        await client
          .from("notification_logs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", logId);

        notificationsSent++;
        details.push({ businessId, status: "sent" });

        await recordIntegrationEvent(client, {
          businessId,
          channel: "telegram",
          direction: "outbound",
          eventType: "reminder.sent",
          status: "success",
          metadata: {
            localDate: eligibility.localDate,
            recipientCount: eligibility.recipients?.length || 0,
          },
        });
      } else {
        // Mark notification_logs as failed
        await client
          .from("notification_logs")
          .update({
            status: "failed",
            error_code: lastErrorMessage,
          })
          .eq("id", logId);

        notificationsFailed++;
        details.push({
          businessId,
          status: "failed",
          reason: lastErrorMessage,
        });

        await recordIntegrationEvent(client, {
          businessId,
          channel: "telegram",
          direction: "outbound",
          eventType: "reminder.failed",
          status: "failed",
          errorCode: lastErrorMessage,
          metadata: { localDate: eligibility.localDate },
        });
      }
    } catch (bizErr: unknown) {
      const errMsg = bizErr instanceof Error ? bizErr.message : String(bizErr);
      notificationsFailed++;
      details.push({ businessId, status: "failed", reason: errMsg });
    }
  }

  // 6. Complete system_job_runs
  const finishedAt = new Date().toISOString();
  await client
    .from("system_job_runs")
    .update({
      status: "completed",
      finished_at: finishedAt,
      businesses_checked: businessesChecked,
      notifications_sent: notificationsSent,
      notifications_failed: notificationsFailed,
    })
    .eq("id", jobId);

  await recordIntegrationEvent(client, {
    channel: "system",
    direction: "internal",
    eventType: "reminder.runner.completed",
    status: "success",
    metadata: {
      jobId,
      businessesChecked,
      notificationsSent,
      notificationsFailed,
    },
  });

  return {
    jobId,
    startedAt,
    finishedAt,
    status: "completed",
    businessesChecked,
    notificationsSent,
    notificationsFailed,
    details,
  };
}
