import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  SubscriptionPlanCode,
  SubscriptionStatus,
  SubscriptionPayment,
} from "./types";
import { getBusinessSubscriptionState, recordSubscriptionAudit } from "./service";
import { getPlan } from "./plans";

/**
 * Checks whether an authenticated user is an authorized OXID platform admin.
 * Evaluates against OXID_ADMIN_EMAILS and public.platform_admins.
 */
export async function isOxidSuperAdmin(
  user: User | null | undefined,
  client?: SupabaseClient
): Promise<boolean> {
  if (!user || !user.email) {
    return false;
  }

  // 1. Check environment variable list
  const adminEmailsEnv = process.env.OXID_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  // 2. Check platform_admins table if client is provided
  if (client) {
    try {
      const { data } = await client
        .from("platform_admins")
        .select("id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && (data.role === "super_admin" || data.role === "support")) {
        return true;
      }
    } catch {
      // Table check fallback
    }
  }

  return false;
}

export interface AdminBusinessListItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  ownerEmail: string | null;
  planCode: SubscriptionPlanCode;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string;
  remainingDays: number;
  primaryChannel: string;
  lastActivityAt: string | null;
}

/**
 * Lists all businesses on the platform for admin overview.
 */
export async function listAllBusinessesForAdmin(
  client: SupabaseClient
): Promise<AdminBusinessListItem[]> {
  const { data: businesses, error: bizError } = await client
    .from("businesses")
    .select(`
      id,
      name,
      status,
      created_at,
      created_by
    `)
    .order("created_at", { ascending: false });

  if (bizError || !businesses) {
    return [];
  }

  const items: AdminBusinessListItem[] = [];

  for (const biz of businesses) {
    // 1. Get subscription state
    const subState = await getBusinessSubscriptionState(client, biz.id);

    // 2. Get owner email
    let ownerEmail: string | null = null;
    if (biz.created_by) {
      const { data: userData } = await client
        .from("business_users")
        .select("user_id")
        .eq("business_id", biz.id)
        .eq("role", "owner")
        .maybeSingle();

      if (userData) {
        ownerEmail = biz.created_by;
      }
    }

    // 3. Get channel settings
    const { data: channelSettings } = await client
      .from("business_channel_settings")
      .select("primary_channel")
      .eq("business_id", biz.id)
      .maybeSingle();

    // 4. Get last transaction date
    const { data: lastTx } = await client
      .from("transactions")
      .select("created_at")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    items.push({
      id: biz.id,
      name: biz.name,
      status: biz.status,
      createdAt: biz.created_at,
      ownerEmail,
      planCode: subState.plan.code,
      planName: subState.plan.name,
      subscriptionStatus: subState.status,
      currentPeriodEnd: subState.currentPeriodEnd,
      remainingDays: subState.remainingDays,
      primaryChannel: channelSettings?.primary_channel || "telegram",
      lastActivityAt: lastTx?.created_at || null,
    });
  }

  return items;
}

export interface AdminAuditLogRow {
  id: string;
  business_id: string;
  subscription_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminBusinessDetail {
  business: {
    id: string;
    name: string;
    status: string;
    timezone: string;
    currency: string;
    createdAt: string;
    createdBy: string;
  };
  subscriptionState: Awaited<ReturnType<typeof getBusinessSubscriptionState>>;
  payments: SubscriptionPayment[];
  channels: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    primaryChannel: string;
    reminderChannel: string;
  };
  googleSheets: {
    enabled: boolean;
    spreadsheetId: string | null;
    lastSyncedAt: string | null;
  } | null;
  auditLogs: AdminAuditLogRow[];
}

/**
 * Loads full business detail for admin inspection.
 */
export async function getBusinessDetailForAdmin(
  client: SupabaseClient,
  businessId: string
): Promise<AdminBusinessDetail | null> {
  const { data: biz, error } = await client
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !biz) return null;

  const subscriptionState = await getBusinessSubscriptionState(client, businessId);

  // Payments
  const { data: payments } = await client
    .from("subscription_payments")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  // Channels
  const { data: channels } = await client
    .from("business_channel_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  // Google Sheets
  const { data: sheets } = await client
    .from("google_sheets_connections")
    .select("enabled, spreadsheet_id, last_synced_at")
    .eq("business_id", businessId)
    .maybeSingle();

  // Audit Logs
  const { data: logs } = await client
    .from("subscription_audit_logs")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    business: {
      id: biz.id,
      name: biz.name,
      status: biz.status,
      timezone: biz.timezone,
      currency: biz.currency,
      createdAt: biz.created_at,
      createdBy: biz.created_by,
    },
    subscriptionState,
    payments: payments || [],
    channels: {
      telegramEnabled: channels?.telegram_enabled ?? true,
      whatsappEnabled: channels?.whatsapp_enabled ?? false,
      primaryChannel: channels?.primary_channel || "telegram",
      reminderChannel: channels?.reminder_channel || "telegram",
    },
    googleSheets: sheets
      ? {
          enabled: sheets.enabled,
          spreadsheetId: sheets.spreadsheet_id,
          lastSyncedAt: sheets.last_synced_at,
        }
      : null,
    auditLogs: logs || [],
  };
}

/**
 * Admin action: Manually activates a subscription with a specified plan and duration.
 */
export async function adminActivateSubscription(
  client: SupabaseClient,
  params: {
    businessId: string;
    planCode: SubscriptionPlanCode;
    durationDays?: number;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const plan = getPlan(params.planCode);
  const days = params.durationDays || plan.durationDays || 30;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const graceEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: sub } = await client
    .from("business_subscriptions")
    .select("id, status")
    .eq("business_id", params.businessId)
    .maybeSingle();

  let subId = sub?.id;
  const previousStatus = sub?.status || "trialing";

  if (!subId) {
    const { data: newSub } = await client
      .from("business_subscriptions")
      .insert({
        business_id: params.businessId,
        plan_code: params.planCode,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        grace_period_ends_at: graceEnd.toISOString(),
        activated_at: now.toISOString(),
      })
      .select("id")
      .single();
    subId = newSub?.id;
  } else {
    await client
      .from("business_subscriptions")
      .update({
        plan_code: params.planCode,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        grace_period_ends_at: graceEnd.toISOString(),
        activated_at: now.toISOString(),
        suspended_at: null,
      })
      .eq("id", subId);
  }

  if (subId) {
    await recordSubscriptionAudit(client, {
      businessId: params.businessId,
      subscriptionId: subId,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_ACTIVATE_SUBSCRIPTION",
      previousStatus,
      newStatus: "active",
      notes: params.notes || `Aktivasi manual paket ${plan.name} (${days} hari)`,
      metadata: { planCode: params.planCode, days },
    });
  }
}

/**
 * Admin action: Confirms a manual payment and extends the subscription period.
 */
export async function adminConfirmPayment(
  client: SupabaseClient,
  params: {
    paymentId: string;
    adminUserId?: string;
    adminEmail?: string;
    extensionDays?: number;
    notes?: string;
  }
): Promise<void> {
  const now = new Date();

  // 1. Fetch payment
  const { data: payment, error: pError } = await client
    .from("subscription_payments")
    .select("*")
    .eq("id", params.paymentId)
    .single();

  if (pError || !payment) {
    throw new Error(`Payment record not found: ${pError?.message || "Not found"}`);
  }

  // Idempotency guard: If payment is already confirmed, do not confirm or extend again
  if (payment.status === "confirmed") {
    return;
  }

  // 1b. Fetch subscription
  const { data: sub, error: subError } = await client
    .from("business_subscriptions")
    .select("*")
    .eq("id", payment.subscription_id)
    .single();

  if (subError || !sub) {
    throw new Error(`Subscription record not found: ${subError?.message || "Not found"}`);
  }

  // 2. Mark payment confirmed
  await client
    .from("subscription_payments")
    .update({
      status: "confirmed",
      confirmed_at: now.toISOString(),
      confirmed_by: params.adminUserId || null,
    })
    .eq("id", payment.id);

  // 3. Extend subscription
  const daysToAdd = params.extensionDays || 30;

  let baseDate = new Date();
  if (sub.current_period_end && new Date(sub.current_period_end) > now) {
    baseDate = new Date(sub.current_period_end);
  }

  const newPeriodEnd = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const newGraceEnd = new Date(newPeriodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

  await client
    .from("business_subscriptions")
    .update({
      status: "active",
      current_period_end: newPeriodEnd.toISOString(),
      grace_period_ends_at: newGraceEnd.toISOString(),
      suspended_at: null,
    })
    .eq("id", sub.id);

  await recordSubscriptionAudit(client, {
    businessId: payment.business_id,
    subscriptionId: sub.id,
    actorUserId: params.adminUserId,
    actorEmail: params.adminEmail,
    action: "ADMIN_CONFIRM_PAYMENT",
    previousStatus: sub.status,
    newStatus: "active",
    notes: params.notes || `Pembayaran Rp ${payment.amount_idr} dikonfirmasi. Perpanjangan +${daysToAdd} hari.`,
    metadata: { paymentId: payment.id, amountIdr: payment.amount_idr, daysAdded: daysToAdd },
  });
}

/**
 * Admin action: Rejects a manual payment.
 */
export async function adminRejectPayment(
  client: SupabaseClient,
  params: {
    paymentId: string;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const { data: payment } = await client
    .from("subscription_payments")
    .select("business_id, subscription_id, status")
    .eq("id", params.paymentId)
    .single();

  if (!payment || payment.status === "rejected") {
    return;
  }

  await client
    .from("subscription_payments")
    .update({
      status: "rejected",
      confirmed_at: new Date().toISOString(),
      confirmed_by: params.adminUserId || null,
    })
    .eq("id", params.paymentId);

  if (payment) {
    await recordSubscriptionAudit(client, {
      businessId: payment.business_id,
      subscriptionId: payment.subscription_id,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_REJECT_PAYMENT",
      previousStatus: "pending",
      newStatus: "rejected",
      notes: params.notes || "Bukti pembayaran ditolak oleh admin.",
    });
  }
}

/**
 * Admin action: Extends an active or trialing subscription.
 */
export async function adminExtendSubscription(
  client: SupabaseClient,
  params: {
    businessId: string;
    days: number;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const { data: sub } = await client
    .from("business_subscriptions")
    .select("id, status, trial_ends_at, current_period_end")
    .eq("business_id", params.businessId)
    .single();

  if (!sub) throw new Error("Subscription not found");

  const now = new Date();
  const isTrial = sub.status === "trialing";
  const currentEnd = isTrial ? new Date(sub.trial_ends_at) : new Date(sub.current_period_end);
  const baseEnd = currentEnd > now ? currentEnd : now;

  const newEnd = new Date(baseEnd.getTime() + params.days * 24 * 60 * 60 * 1000);
  const newGraceEnd = new Date(newEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

  const updates: Record<string, unknown> = {
    current_period_end: newEnd.toISOString(),
    grace_period_ends_at: newGraceEnd.toISOString(),
  };
  if (isTrial) {
    updates.trial_ends_at = newEnd.toISOString();
  }

  await client
    .from("business_subscriptions")
    .update(updates)
    .eq("id", sub.id);

  await recordSubscriptionAudit(client, {
    businessId: params.businessId,
    subscriptionId: sub.id,
    actorUserId: params.adminUserId,
    actorEmail: params.adminEmail,
    action: "ADMIN_EXTEND_SUBSCRIPTION",
    previousStatus: sub.status,
    newStatus: sub.status,
    notes: params.notes || `Perpanjangan masa aktif +${params.days} hari`,
    metadata: { days: params.days, newEnd: newEnd.toISOString() },
  });
}

/**
 * Admin action: Suspends a subscription.
 */
export async function adminSuspendSubscription(
  client: SupabaseClient,
  params: {
    businessId: string;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const { data: sub } = await client
    .from("business_subscriptions")
    .select("id, status")
    .eq("business_id", params.businessId)
    .single();

  if (!sub) throw new Error("Subscription not found");
  if (sub.status === "suspended") {
    return;
  }

  await client
    .from("business_subscriptions")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  await recordSubscriptionAudit(client, {
    businessId: params.businessId,
    subscriptionId: sub.id,
    actorUserId: params.adminUserId,
    actorEmail: params.adminEmail,
    action: "ADMIN_SUSPEND_SUBSCRIPTION",
    previousStatus: sub.status,
    newStatus: "suspended",
    notes: params.notes || "Penangguhan akun oleh admin OXID.",
  });
}

/**
 * Admin action: Reactivates a suspended subscription.
 */
export async function adminReactivateSubscription(
  client: SupabaseClient,
  params: {
    businessId: string;
    days?: number;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const { data: sub } = await client
    .from("business_subscriptions")
    .select("id, status")
    .eq("business_id", params.businessId)
    .single();

  if (!sub) throw new Error("Subscription not found");

  const days = params.days || 30;
  const now = new Date();
  const newPeriodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const newGraceEnd = new Date(newPeriodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

  await client
    .from("business_subscriptions")
    .update({
      status: "active",
      current_period_end: newPeriodEnd.toISOString(),
      grace_period_ends_at: newGraceEnd.toISOString(),
      suspended_at: null,
    })
    .eq("id", sub.id);

  await recordSubscriptionAudit(client, {
    businessId: params.businessId,
    subscriptionId: sub.id,
    actorUserId: params.adminUserId,
    actorEmail: params.adminEmail,
    action: "ADMIN_REACTIVATE_SUBSCRIPTION",
    previousStatus: sub.status,
    newStatus: "active",
    notes: params.notes || `Reaktivasi akun oleh admin dengan masa aktif ${days} hari.`,
    metadata: { days },
  });
}

/**
 * Admin action: Cancels a subscription.
 */
export async function adminCancelSubscription(
  client: SupabaseClient,
  params: {
    businessId: string;
    adminUserId?: string;
    adminEmail?: string;
    notes?: string;
  }
): Promise<void> {
  const { data: sub } = await client
    .from("business_subscriptions")
    .select("id, status")
    .eq("business_id", params.businessId)
    .single();

  if (!sub) throw new Error("Subscription not found");
  if (sub.status === "cancelled") {
    return;
  }

  await client
    .from("business_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  await recordSubscriptionAudit(client, {
    businessId: params.businessId,
    subscriptionId: sub.id,
    actorUserId: params.adminUserId,
    actorEmail: params.adminEmail,
    action: "ADMIN_CANCEL_SUBSCRIPTION",
    previousStatus: sub.status,
    newStatus: "cancelled",
    notes: params.notes || "Pembatalan langganan oleh admin.",
  });
}
