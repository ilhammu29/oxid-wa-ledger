import { SupabaseClient } from "@supabase/supabase-js";
import { recordSubscriptionAudit } from "./service";
import { sendTelegramText } from "../telegram";

export interface LifecycleTransitionResult {
  businessId: string;
  subscriptionId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

export interface ExpiryNotificationResult {
  businessId: string;
  recipientCount: number;
  stage: string;
  daysRemaining: number;
}

/**
 * Runs the subscription lifecycle state machine.
 * Evaluates expirations and transitions subscriptions safely and idempotently.
 */
export async function runSubscriptionLifecycle(
  client: SupabaseClient,
  now: Date = new Date()
): Promise<LifecycleTransitionResult[]> {
  const transitions: LifecycleTransitionResult[] = [];
  const nowIso = now.toISOString();

  // 1. Process Trialing Expirations
  const { data: expiredTrials } = await client
    .from("business_subscriptions")
    .select("id, business_id, status, trial_ends_at, grace_period_ends_at")
    .eq("status", "trialing")
    .lt("trial_ends_at", nowIso);

  for (const sub of expiredTrials || []) {
    const hasGrace = sub.grace_period_ends_at && new Date(sub.grace_period_ends_at) > now;
    const newStatus = hasGrace ? "grace_period" : "suspended";

    await client
      .from("business_subscriptions")
      .update({
        status: newStatus,
        suspended_at: newStatus === "suspended" ? nowIso : null,
      })
      .eq("id", sub.id);

    await recordSubscriptionAudit(client, {
      businessId: sub.business_id,
      subscriptionId: sub.id,
      action: "AUTO_LIFECYCLE_TRIAL_EXPIRED",
      previousStatus: "trialing",
      newStatus,
      notes: `Masa uji coba pilot 14 hari berakhir pada ${sub.trial_ends_at}. Dialihkan ke ${newStatus}.`,
    });

    transitions.push({
      businessId: sub.business_id,
      subscriptionId: sub.id,
      previousStatus: "trialing",
      newStatus,
      reason: "TRIAL_EXPIRED",
    });
  }

  // 2. Process Active Subscriptions Expiration
  const { data: expiredActives } = await client
    .from("business_subscriptions")
    .select("id, business_id, status, current_period_end, grace_period_ends_at")
    .eq("status", "active")
    .lt("current_period_end", nowIso);

  for (const sub of expiredActives || []) {
    const hasGrace = sub.grace_period_ends_at && new Date(sub.grace_period_ends_at) > now;
    const newStatus = hasGrace ? "grace_period" : "suspended";

    await client
      .from("business_subscriptions")
      .update({
        status: newStatus,
        suspended_at: newStatus === "suspended" ? nowIso : null,
      })
      .eq("id", sub.id);

    await recordSubscriptionAudit(client, {
      businessId: sub.business_id,
      subscriptionId: sub.id,
      action: "AUTO_LIFECYCLE_PERIOD_EXPIRED",
      previousStatus: "active",
      newStatus,
      notes: `Masa langganan aktif berakhir pada ${sub.current_period_end}. Dialihkan ke ${newStatus}.`,
    });

    transitions.push({
      businessId: sub.business_id,
      subscriptionId: sub.id,
      previousStatus: "active",
      newStatus,
      reason: "PERIOD_EXPIRED",
    });
  }

  // 3. Process Grace Period Expirations -> Suspended
  const { data: expiredGrace } = await client
    .from("business_subscriptions")
    .select("id, business_id, status, grace_period_ends_at")
    .eq("status", "grace_period")
    .lt("grace_period_ends_at", nowIso);

  for (const sub of expiredGrace || []) {
    await client
      .from("business_subscriptions")
      .update({
        status: "suspended",
        suspended_at: nowIso,
      })
      .eq("id", sub.id);

    await recordSubscriptionAudit(client, {
      businessId: sub.business_id,
      subscriptionId: sub.id,
      action: "AUTO_LIFECYCLE_GRACE_EXPIRED",
      previousStatus: "grace_period",
      newStatus: "suspended",
      notes: `Masa tenggang berakhir pada ${sub.grace_period_ends_at}. Status ditangguhkan.`,
    });

    transitions.push({
      businessId: sub.business_id,
      subscriptionId: sub.id,
      previousStatus: "grace_period",
      newStatus: "suspended",
      reason: "GRACE_EXPIRED",
    });
  }

  // 4. Record Job Run in system_job_runs
  await client.from("system_job_runs").insert({
    job_name: "subscription_lifecycle",
    status: "success",
    started_at: nowIso,
    finished_at: new Date().toISOString(),
    metrics: {
      transitionsCount: transitions.length,
      trialsExpired: (expiredTrials || []).length,
      activesExpired: (expiredActives || []).length,
      graceExpired: (expiredGrace || []).length,
    },
  });

  return transitions;
}

/**
 * Evaluates and delivers subscription expiry warning notifications via Telegram.
 * Enforces stage-based idempotency via notification_logs (7d, 3d, 1d, 0d).
 */
export async function sendSubscriptionExpiryNotifications(
  client: SupabaseClient,
  now: Date = new Date(),
  options?: {
    telegramSender?: (opts: { chatId: number | string; text: string }) => Promise<{ success: boolean }>;
  }
): Promise<ExpiryNotificationResult[]> {
  const sender = options?.telegramSender || sendTelegramText;
  const results: ExpiryNotificationResult[] = [];
  const localDate = now.toISOString().slice(0, 10);

  // Fetch all trialing and active subscriptions
  const { data: subs, error: subsError } = await client
    .from("business_subscriptions")
    .select("id, business_id, plan_code, status, trial_ends_at, current_period_end")
    .in("status", ["trialing", "active"]);

  if (subsError) {
    console.error("[sendSubscriptionExpiryNotifications] Error fetching subs:", subsError);
    return [];
  }

  if (!subs || subs.length === 0) {
    return [];
  }

  for (const sub of subs) {
    const isTrial = sub.status === "trialing";
    const targetDate = isTrial ? new Date(sub.trial_ends_at) : new Date(sub.current_period_end);
    const diffMs = targetDate.getTime() - now.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Valid warning stages: 7, 3, 1, 0
    let stage: string | null = null;
    if (daysRemaining === 7) stage = "7d";
    else if (daysRemaining === 3) stage = "3d";
    else if (daysRemaining === 1) stage = "1d";
    else if (daysRemaining === 0) stage = "0d";

    if (!stage) continue;

    const notifType = `subscription_expiry_${stage}`;

    // 1. Idempotency Check in notification_logs
    const { data: existingLog } = await client
      .from("notification_logs")
      .select("id")
      .eq("business_id", sub.business_id)
      .eq("notification_type", notifType)
      .eq("local_date", localDate)
      .maybeSingle();

    if (existingLog) {
      continue; // Already notified for this stage today
    }

    // 2. Fetch active Telegram operators
    const { data: operators } = await client
      .from("telegram_authorized_users")
      .select("telegram_user_id, display_label")
      .eq("business_id", sub.business_id)
      .eq("active", true)
      .eq("receive_reminders", true);

    if (!operators || operators.length === 0) {
      continue;
    }

    const { data: bizData } = await client
      .from("businesses")
      .select("name")
      .eq("id", sub.business_id)
      .maybeSingle();

    const bizName = bizData?.name || "Usaha Anda";

    let messageText = "";
    if (stage === "7d") {
      messageText = `📢 *Pemberitahuan OXID Ledger*\n\n` +
        `Halo pengelola *${bizName}*,\n` +
        `Masa aktif langganan Anda tersisa *7 hari lagi*.\n\n` +
        `Silakan buka dashboard untuk memperpanjang paket langganan Anda agar pencatatan penjualan via bot tetap lancar.`;
    } else if (stage === "3d") {
      messageText = `⚠️ *Pengingat Langganan OXID Ledger*\n\n` +
        `Masa aktif langganan *${bizName}* tersisa *3 hari lagi*.\n\n` +
        `Segera lakukan perpanjangan di dashboard sebelum masa aktif berakhir.`;
    } else if (stage === "1d") {
      messageText = `🚨 *PENTING: Langganan Berakhir Besok*\n\n` +
        `Masa aktif langganan *${bizName}* berakhir *BESOK*.\n\n` +
        `Lakukan konfirmasi perpanjangan hari ini untuk mencegah pembatasan pencatatan transaksi.`;
    } else if (stage === "0d") {
      messageText = `⏳ *Masa Langganan Berakhir Hari Ini*\n\n` +
        `Hari ini adalah hari terakhir masa aktif langganan *${bizName}*.\n\n` +
        `Setelah hari ini, akun akan memasuki masa tenggang dan pencatatan transaksi baru akan dibatasi.`;
    }

    let sentCount = 0;
    for (const op of operators) {
      try {
        const sendRes = await sender({
          chatId: op.telegram_user_id,
          text: messageText,
        });
        if (sendRes.success) {
          sentCount++;
        }
      } catch (sendErr) {
        console.error(`[ExpiryNotification] Error sending to ${op.telegram_user_id}:`, sendErr);
      }
    }

    // Record notification log to prevent duplicate notifications
    const { error: insertError } = await client.from("notification_logs").insert({
      business_id: sub.business_id,
      notification_type: notifType,
      channel: "telegram",
      status: sentCount > 0 ? "sent" : "failed",
      local_date: localDate,
      sent_at: sentCount > 0 ? new Date().toISOString() : null,
    });

    if (insertError) {
      console.error("[sendSubscriptionExpiryNotifications] Failed to log notification:", insertError);
    }

    results.push({
      businessId: sub.business_id,
      recipientCount: sentCount,
      stage,
      daysRemaining,
    });
  }

  return results;
}
