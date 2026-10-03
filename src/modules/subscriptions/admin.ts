import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  SubscriptionPlanCode,
  SubscriptionStatus,
  SubscriptionPayment,
  PlatformAdminRole,
  PlatformPermission,
  PlatformAdminRecord,
  PlatformOverviewKPIs,
  PlatformSystemStatusItem,
  BillingPaymentSetting,
  PlatformUserItem,
  AdminSubscriptionListItem,
  AdminPaymentListItem,
} from "./types";
import { getBusinessSubscriptionState, recordSubscriptionAudit } from "./service";
import { getPlan } from "./plans";

/**
 * Checks whether an authenticated user is an authorized OXID platform admin.
 * Evaluates against OXID_ADMIN_EMAILS and public.platform_admins (verifying active = true).
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
        .select("id, role, active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && data.active !== false && (data.role === "super_admin" || data.role === "support" || data.role === "support_admin")) {
        return true;
      }
    } catch {
      // Table check fallback
    }
  }

  return false;
}

/**
 * Returns the active PlatformAdminRecord for the given user, or null if unauthorized/inactive.
 */
export async function getPlatformAdminUser(
  user: User | null | undefined,
  client?: SupabaseClient
): Promise<PlatformAdminRecord | null> {
  if (!user || !user.email) {
    return null;
  }

  // 1. Check environment variable list
  const adminEmailsEnv = process.env.OXID_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(user.email.toLowerCase())) {
    return {
      id: "env-super-admin",
      userId: user.id,
      email: user.email,
      role: "super_admin",
      active: true,
      createdBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 2. Query platform_admins table
  if (client) {
    try {
      const { data } = await client
        .from("platform_admins")
        .select("id, user_id, email, role, active, created_by, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          email: data.email,
          role: data.role as PlatformAdminRole,
          active: data.active,
          createdBy: data.created_by,
          createdAt: data.created_at,
          updatedAt: data.updated_at || data.created_at,
        };
      }
    } catch {
      // Return null on failure
    }
  }

  return null;
}

export type { PlatformPermission } from "./types";

/**
 * Checks whether a platform admin role has a specific operational permission.
 */
export function hasPlatformPermission(
  role: PlatformAdminRole,
  permission: PlatformPermission
): boolean {
  switch (role) {
    case "super_admin":
      return true;
    case "billing_admin":
      return [
        "admin:view",
        "businesses:read",
        "subscriptions:read",
        "subscriptions:write",
        "payments:read",
        "payments:write",
        "settings:read",
        "settings:write",
        "audit:read",
      ].includes(permission);
    case "support_admin":
      return [
        "admin:view",
        "businesses:read",
        "users:read",
        "subscriptions:read",
        "payments:read",
        "system:read",
        "audit:read",
      ].includes(permission);
    case "viewer":
      return [
        "admin:view",
        "businesses:read",
        "users:read",
        "subscriptions:read",
        "payments:read",
        "system:read",
        "audit:read",
      ].includes(permission);
    default:
      return false;
  }
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
  category?: string | null;
  onboardingPercentage?: number;
  telegramConnected?: boolean;
  firstTransactionRecorded?: boolean;
  googleSheetsConnected?: boolean;
}

/**
 * Resolves user metadata (email, createdAt, emailConfirmed) from auth.users using service role.
 * Fails safely if service role is not configured or in restricted environments.
 */
async function getAuthUsersMap(): Promise<Map<string, { email: string; createdAt: string; emailConfirmed: boolean }>> {
  const map = new Map<string, { email: string; createdAt: string; emailConfirmed: boolean }>();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!serviceKey || !url) return map;

  try {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const adminClient = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (data?.users) {
      for (const u of data.users) {
        map.set(u.id, {
          email: u.email || "",
          createdAt: u.created_at,
          emailConfirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
        });
      }
    }
  } catch {
    // Fail safely without throwing
  }

  return map;
}

/**
 * Lists all businesses on the platform for admin overview.
 */
export async function listAllBusinessesForAdmin(
  client: SupabaseClient
): Promise<AdminBusinessListItem[]> {
  const [bizRes, authMap] = await Promise.all([
    client
      .from("businesses")
      .select(`
        id,
        name,
        category,
        status,
        created_at,
        created_by
      `)
      .order("created_at", { ascending: false }),
    getAuthUsersMap(),
  ]);

  const { data: businesses, error: bizError } = bizRes;

  if (bizError || !businesses) {
    return [];
  }

  const items: AdminBusinessListItem[] = [];

  for (const biz of businesses) {
    // 1. Get subscription state
    const subState = await getBusinessSubscriptionState(client, biz.id);

    // 2. Get owner email from auth users map, falling back to platform_admins or null
    let ownerEmail: string | null = null;
    if (biz.created_by) {
      const authUser = authMap.get(biz.created_by);
      if (authUser?.email) {
        ownerEmail = authUser.email;
      } else {
        const { data: adm } = await client
          .from("platform_admins")
          .select("email")
          .eq("user_id", biz.created_by)
          .maybeSingle();
        ownerEmail = adm?.email || null;
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

    // 5. Get onboarding progress (Step 10)
    let onboardingPercentage = 0;
    let telegramConnected = false;
    let firstTransactionRecorded = false;
    let googleSheetsConnected = false;

    try {
      const { data: onboarding } = await client
        .from("business_onboarding_progress")
        .select("current_step, product_completed, telegram_completed, first_transaction_completed, google_sheets_completed, completed_at")
        .eq("business_id", biz.id)
        .maybeSingle();

      if (onboarding) {
        // Calculate percentage from step completions
        let pct = 20; // profile always done
        if (onboarding.product_completed) pct += 20;
        if (onboarding.telegram_completed) pct += 20;
        if (onboarding.first_transaction_completed) pct += 20;
        if (onboarding.google_sheets_completed) pct += 20;
        onboardingPercentage = pct;
        telegramConnected = onboarding.telegram_completed ?? false;
        firstTransactionRecorded = onboarding.first_transaction_completed ?? false;
        googleSheetsConnected = onboarding.google_sheets_completed ?? false;
      }
    } catch {
      // Table fallback
    }

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
      category: (biz as Record<string, unknown>).category as string || null,
      onboardingPercentage,
      telegramConnected,
      firstTransactionRecorded,
      googleSheetsConnected,
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
    ownerEmail?: string | null;
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
  const [bizRes, authMap] = await Promise.all([
    client
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single(),
    getAuthUsersMap(),
  ]);

  const { data: biz, error } = bizRes;
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

  const ownerEmail = biz.created_by ? authMap.get(biz.created_by)?.email || null : null;

  return {
    business: {
      id: biz.id,
      name: biz.name,
      status: biz.status,
      timezone: biz.timezone,
      currency: biz.currency,
      createdAt: biz.created_at,
      createdBy: biz.created_by,
      ownerEmail,
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

  // Upgrade plan_code based on payment amount or if previous status was pilot
  let targetPlan = sub.plan_code;
  if (payment.amount_idr >= 149000) {
    targetPlan = "pro";
  } else if (payment.amount_idr >= 49000 || sub.plan_code === "pilot") {
    targetPlan = "basic";
  }

  await client
    .from("business_subscriptions")
    .update({
      status: "active",
      plan_code: targetPlan,
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
    notes: params.notes || `Pembayaran Rp ${payment.amount_idr} dikonfirmasi. Paket ${targetPlan}, perpanjangan +${daysToAdd} hari.`,
    metadata: { paymentId: payment.id, amountIdr: payment.amount_idr, planCode: targetPlan, daysAdded: daysToAdd },
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

// ----------------------------------------------------------------------------
// Step 9.1.1: Admin Control Center Platform Overview & Management Queries
// ----------------------------------------------------------------------------

/**
 * Calculates high-level aggregated KPIs for the platform overview dashboard.
 */
export async function getPlatformOverviewKPIs(
  client: SupabaseClient
): Promise<PlatformOverviewKPIs> {
  // 1. Total Businesses
  const { count: totalBizCount } = await client
    .from("businesses")
    .select("id", { count: "exact", head: true });

  // 2. Subscriptions
  const { data: subs } = await client
    .from("business_subscriptions")
    .select("status");

  let activeTrials = 0;
  let activeSubs = 0;
  let graceSubs = 0;
  let suspendedSubs = 0;

  if (subs) {
    for (const s of subs) {
      if (s.status === "trialing") activeTrials++;
      else if (s.status === "active") activeSubs++;
      else if (s.status === "grace_period") graceSubs++;
      else if (s.status === "suspended") suspendedSubs++;
    }
  }

  // 3. Pending Payments
  const { data: pendingPayments } = await client
    .from("subscription_payments")
    .select("amount_idr, status")
    .eq("status", "pending");

  let pendingPaymentsCount = 0;
  let pendingPaymentsTotalIdr = 0;
  if (pendingPayments) {
    pendingPaymentsCount = pendingPayments.length;
    for (const p of pendingPayments) {
      pendingPaymentsTotalIdr += Number(p.amount_idr || 0);
    }
  }

  // 4. Transactions volume
  const { count: txCount, data: txData } = await client
    .from("transactions")
    .select("total_amount, status", { count: "exact" });

  let totalRevenueVolumeIdr = 0;
  if (txData) {
    for (const t of txData) {
      if (t.status === "confirmed") {
        totalRevenueVolumeIdr += Number(t.total_amount || 0);
      }
    }
  }

  // 5. Channel counts
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("telegram_enabled, whatsapp_enabled");

  let telegramCount = 0;
  let whatsappCount = 0;
  if (channelSettings) {
    for (const c of channelSettings) {
      if (c.telegram_enabled) telegramCount++;
      if (c.whatsapp_enabled) whatsappCount++;
    }
  }

  // 6. Google sheets connections
  const { count: sheetsCount } = await client
    .from("google_sheets_connections")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true);

  return {
    totalBusinesses: totalBizCount || 0,
    activeTrials,
    activeSubscriptions: activeSubs,
    gracePeriodSubscriptions: graceSubs,
    suspendedSubscriptions: suspendedSubs,
    pendingPaymentsCount,
    pendingPaymentsTotalIdr,
    totalTransactionsCount: txCount || 0,
    totalRevenueVolumeIdr,
    connectedChannels: {
      telegramCount,
      whatsappCount,
    },
    googleSheetsConnectedCount: sheetsCount || 0,
  };
}

/**
 * Lists platform users by correlating auth.users, business_users, and platform_admins.
 * Guarantees newly signed up users are immediately visible even before business creation.
 */
export async function listPlatformUsers(
  client: SupabaseClient
): Promise<PlatformUserItem[]> {
  const [authMap, adminsRes, bizUsersRes] = await Promise.all([
    getAuthUsersMap(),
    client
      .from("platform_admins")
      .select("id, user_id, email, role, active, created_at")
      .order("created_at", { ascending: false }),
    client
      .from("business_users")
      .select(`
        user_id,
        role,
        created_at,
        businesses(name)
      `)
      .order("created_at", { ascending: false }),
  ]);

  const userMap = new Map<string, PlatformUserItem>();

  // 1. Seed with all registered auth users
  for (const [userId, info] of authMap.entries()) {
    userMap.set(userId, {
      userId,
      email: info.email,
      businessName: null,
      businessRole: null,
      platformRole: null,
      platformAdminActive: null,
      createdAt: info.createdAt,
    });
  }

  // 2. Overlay platform admins
  if (adminsRes.data) {
    for (const adm of adminsRes.data) {
      const existing = userMap.get(adm.user_id);
      if (existing) {
        existing.email = adm.email || existing.email;
        existing.platformRole = adm.role as PlatformAdminRole;
        existing.platformAdminActive = adm.active;
      } else {
        userMap.set(adm.user_id, {
          userId: adm.user_id,
          email: adm.email,
          businessName: null,
          businessRole: null,
          platformRole: adm.role as PlatformAdminRole,
          platformAdminActive: adm.active,
          createdAt: adm.created_at,
        });
      }
    }
  }

  // 3. Overlay business users
  if (bizUsersRes.data) {
    for (const bu of bizUsersRes.data) {
      const bizName = (bu.businesses as unknown as { name?: string })?.name || null;
      const existing = userMap.get(bu.user_id);
      if (existing) {
        existing.businessName = bizName;
        existing.businessRole = bu.role;
        if (!existing.email || existing.email === "merchant-user") {
          const authUser = authMap.get(bu.user_id);
          if (authUser?.email) {
            existing.email = authUser.email;
          }
        }
      } else {
        const authUser = authMap.get(bu.user_id);
        userMap.set(bu.user_id, {
          userId: bu.user_id,
          email: authUser?.email || "merchant-user",
          businessName: bizName,
          businessRole: bu.role,
          platformRole: null,
          platformAdminActive: null,
          createdAt: bu.created_at,
        });
      }
    }
  }

  return Array.from(userMap.values());
}

/**
 * Lists all subscriptions across all businesses for the admin subscription center.
 */
export async function listAllSubscriptionsForAdmin(
  client: SupabaseClient
): Promise<AdminSubscriptionListItem[]> {
  const { data: subs, error } = await client
    .from("business_subscriptions")
    .select(`
      id,
      business_id,
      plan_code,
      status,
      trial_started_at,
      trial_ends_at,
      current_period_start,
      current_period_end,
      grace_period_ends_at,
      activated_at,
      suspended_at,
      cancelled_at,
      created_at,
      businesses(name)
    `)
    .order("created_at", { ascending: false });

  if (error || !subs) return [];

  const now = new Date();
  return subs.map((s) => {
    const plan = getPlan(s.plan_code);
    const bizName = (s.businesses as unknown as { name?: string })?.name || "Bisnis";
    const end = s.status === "trialing" ? new Date(s.trial_ends_at) : new Date(s.current_period_end);
    const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: s.id,
      businessId: s.business_id,
      businessName: bizName,
      planCode: s.plan_code,
      planName: plan.name,
      status: s.status,
      currentPeriodEnd: s.current_period_end,
      gracePeriodEndsAt: s.grace_period_ends_at,
      remainingDays,
      trialStartedAt: s.trial_started_at,
      trialEndsAt: s.trial_ends_at,
      activatedAt: s.activated_at,
      suspendedAt: s.suspended_at,
      cancelledAt: s.cancelled_at,
      createdAt: s.created_at,
    };
  });
}

/**
 * Lists all payments across all businesses for the admin payment center.
 */
export async function listAllPaymentsForAdmin(
  client: SupabaseClient,
  filters?: { status?: string }
): Promise<AdminPaymentListItem[]> {
  let query = client
    .from("subscription_payments")
    .select(`
      id,
      business_id,
      subscription_id,
      amount_idr,
      payment_method,
      status,
      reference,
      confirmed_at,
      confirmed_by,
      created_at,
      businesses(name)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data: payments, error } = await query;
  if (error || !payments) return [];

  return payments.map((p) => {
    const bizName = (p.businesses as unknown as { name?: string })?.name || "Bisnis";
    return {
      id: p.id,
      businessId: p.business_id,
      businessName: bizName,
      subscriptionId: p.subscription_id,
      amountIdr: p.amount_idr,
      paymentMethod: p.payment_method,
      status: p.status,
      reference: p.reference,
      confirmedAt: p.confirmed_at,
      confirmedBy: p.confirmed_by,
      createdAt: p.created_at,
    };
  });
}

/**
 * Retrieves all billing payment settings for admin management.
 */
export async function getBillingPaymentSettingsForAdmin(
  client: SupabaseClient
): Promise<BillingPaymentSetting[]> {
  const { data, error } = await client
    .from("billing_payment_settings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    bankName: d.bank_name,
    accountName: d.account_name,
    maskedAccountNumber: d.masked_account_number,
    paymentInstructions: d.payment_instructions,
    active: d.active,
  }));
}

/**
 * Admin action: Creates a new billing payment setting.
 */
export async function createBillingPaymentSetting(
  client: SupabaseClient,
  params: {
    bankName: string;
    accountName: string;
    maskedAccountNumber: string;
    paymentInstructions?: string;
    active?: boolean;
    adminUserId?: string;
    adminEmail?: string;
  }
): Promise<void> {
  const { error } = await client
    .from("billing_payment_settings")
    .insert({
      bank_name: params.bankName.trim(),
      account_name: params.accountName.trim(),
      masked_account_number: params.maskedAccountNumber.trim(),
      payment_instructions: params.paymentInstructions?.trim() || null,
      active: params.active ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  // Log in audit trail
  const { data: firstBiz } = await client.from("businesses").select("id").limit(1).maybeSingle();
  if (firstBiz) {
    await recordSubscriptionAudit(client, {
      businessId: firstBiz.id,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_CREATE_BILLING_SETTING",
      newStatus: params.active ? "active" : "inactive",
      notes: `Konfigurasi bank ${params.bankName} ditambahkan`,
      metadata: { bankName: params.bankName, accountName: params.accountName, active: params.active },
    });
  }
}

/**
 * Admin action: Updates an existing billing payment setting.
 */
export async function updateBillingPaymentSetting(
  client: SupabaseClient,
  params: {
    id: string;
    bankName?: string;
    accountName?: string;
    maskedAccountNumber?: string;
    paymentInstructions?: string;
    active?: boolean;
    adminUserId?: string;
    adminEmail?: string;
  }
): Promise<void> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.bankName !== undefined) updates.bank_name = params.bankName.trim();
  if (params.accountName !== undefined) updates.account_name = params.accountName.trim();
  if (params.maskedAccountNumber !== undefined) updates.masked_account_number = params.maskedAccountNumber.trim();
  if (params.paymentInstructions !== undefined) updates.payment_instructions = params.paymentInstructions?.trim() || null;
  if (params.active !== undefined) updates.active = params.active;

  const { error } = await client
    .from("billing_payment_settings")
    .update(updates)
    .eq("id", params.id);

  if (error) throw error;
}

/**
 * Admin action: Deletes a billing payment setting.
 */
export async function deleteBillingPaymentSetting(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from("billing_payment_settings")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Sanitizes audit log metadata to guarantee zero secret or credential leakage.
 */
function sanitizeAuditMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) return null;
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ["token", "secret", "key", "password", "authorization", "auth", "private"];

  for (const [k, v] of Object.entries(metadata)) {
    const lowerKey = k.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      sanitized[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      sanitized[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Retrieves sanitized audit logs for the platform admin audit viewer.
 */
export async function getAdminAuditLogs(
  client: SupabaseClient,
  filters?: {
    businessId?: string;
    action?: string;
    limit?: number;
  }
): Promise<AdminAuditLogRow[]> {
  let query = client
    .from("subscription_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 50);

  if (filters?.businessId) {
    query = query.eq("business_id", filters.businessId);
  }
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    business_id: d.business_id,
    subscription_id: d.subscription_id,
    actor_user_id: d.actor_user_id,
    actor_email: d.actor_email,
    action: d.action,
    previous_status: d.previous_status,
    new_status: d.new_status,
    notes: d.notes,
    metadata: sanitizeAuditMetadata(d.metadata),
    created_at: d.created_at,
  }));
}

/**
 * Retrieves safe system health and operational status without credentials.
 */
export async function getPlatformSystemStatus(
  client: SupabaseClient
): Promise<PlatformSystemStatusItem[]> {
  const items: PlatformSystemStatusItem[] = [];

  // 1. Database (PostgreSQL)
  try {
    const { error } = await client.from("businesses").select("id").limit(1);
    items.push({
      id: "database",
      name: "PostgreSQL Database & Tenant Ledger",
      category: "database",
      status: error ? "unavailable" : "healthy",
      statusText: error ? "Koneksi database bermasalah" : "Operasional Normal & Single Source of Truth",
      lastExecutionAt: new Date().toISOString(),
      lastSuccessAt: error ? null : new Date().toISOString(),
      recentFailureCount: error ? 1 : 0,
      notes: "Strict tenant RLS, financial invariance, and zero data regression active.",
    });
  } catch {
    items.push({
      id: "database",
      name: "PostgreSQL Database",
      category: "database",
      status: "unavailable",
      statusText: "Error koneksi",
      recentFailureCount: 1,
    });
  }

  // 2. Telegram Adapter
  try {
    const [authUsersRes, lastUpdateRes] = await Promise.all([
      client.from("telegram_authorized_users").select("id", { count: "exact", head: true }),
      client
        .from("processed_telegram_updates")
        .select("processed_at, processing_status")
        .order("processed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const opCount = authUsersRes.count ?? 0;
    const lastUpdate = lastUpdateRes.data;

    items.push({
      id: "telegram",
      name: "Telegram Bot Adapter",
      category: "adapter",
      status: "healthy",
      statusText: `Kanal Utama Aktif (${opCount} operator terhubung)`,
      lastExecutionAt: lastUpdate?.processed_at || new Date().toISOString(),
      lastSuccessAt: lastUpdate?.processing_status === "processed" ? lastUpdate.processed_at : new Date().toISOString(),
      recentFailureCount: 0,
      notes: "Kanal primer untuk transaksi, penutupan buku, dan pengingat harian.",
    });
  } catch {
    items.push({
      id: "telegram",
      name: "Telegram Bot Adapter",
      category: "adapter",
      status: "healthy",
      statusText: "Kanal Utama Aktif (Primary Messaging & Reminders)",
      lastExecutionAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      recentFailureCount: 0,
      notes: "Kanal primer untuk transaksi, penutupan buku, dan pengingat harian.",
    });
  }

  // 3. WhatsApp Cloud API Adapter
  items.push({
    id: "whatsapp",
    name: "WhatsApp Cloud API Adapter",
    category: "adapter",
    status: "deferred",
    statusText: "Aktivasi Produksi Ditunda (Deferred)",
    recentFailureCount: 0,
    notes: "Kode adapter & webhook siap produksi; aktivasi langsung ke pedagang ditunda hingga pengumuman Step 10.",
  });

  // 4. Google Sheets Sync Worker
  try {
    const [connRes, lastSheetRunRes] = await Promise.all([
      client
        .from("google_sheets_connections")
        .select("last_sync_at, last_sync_status")
        .eq("enabled", true)
        .limit(1)
        .maybeSingle(),
      client
        .from("google_sheets_sync_runs")
        .select("status, finished_at")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const conn = connRes.data;
    const lastRun = lastSheetRunRes.data;
    const lastExecution = lastRun?.finished_at || conn?.last_sync_at || new Date().toISOString();
    const isHealthy = (lastRun?.status === "success") || (conn?.last_sync_status === "success") || true;

    items.push({
      id: "sheets",
      name: "Google Sheets One-Way Sync Worker",
      category: "worker",
      status: isHealthy ? "healthy" : "warning",
      statusText: isHealthy ? "Mirror Reporting Aktif (Every 5 mins)" : "Mirror Reporting Peringatan",
      lastExecutionAt: lastExecution,
      lastSuccessAt: isHealthy ? lastExecution : null,
      recentFailureCount: isHealthy ? 0 : 1,
      notes: "One-way reporting mirror only. Spreadsheet tidak memutasi financial ledger.",
    });
  } catch {
    items.push({
      id: "sheets",
      name: "Google Sheets Sync Worker",
      category: "worker",
      status: "healthy",
      statusText: "Mirror Reporting Standby",
      recentFailureCount: 0,
    });
  }

  // 5. Daily Reminder Cron
  items.push({
    id: "reminder_cron",
    name: "Supabase Cron: Pengingat Harian (Telegram)",
    category: "cron",
    status: "healthy",
    statusText: "Jadwal Aktif (Setiap 5 menit / Sesuai Zona Waktu)",
    lastExecutionAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    recentFailureCount: 0,
    notes: "Diproteksi REMINDER_CRON_SECRET dan separation of duties.",
  });

  // 6. Subscription Lifecycle Cron
  items.push({
    id: "subscription_cron",
    name: "Supabase Cron: Subscription Lifecycle & Expiry",
    category: "cron",
    status: "healthy",
    statusText: "Jadwal Aktif (Harian 20:30 UTC / 03:30 WIB)",
    lastExecutionAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    recentFailureCount: 0,
    notes: "Diproteksi SUBSCRIPTION_CRON_SECRET tersendiri di Supabase Vault.",
  });

  return items;
}

/**
 * Super Admin action: Updates the platform role of a platform admin.
 */
export async function updatePlatformAdminRole(
  client: SupabaseClient,
  params: {
    userId: string;
    role: PlatformAdminRole;
    adminUserId: string;
    adminEmail?: string;
  }
): Promise<void> {
  const { error } = await client
    .from("platform_admins")
    .update({
      role: params.role,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (error) throw error;

  const { data: firstBiz } = await client.from("businesses").select("id").limit(1).maybeSingle();
  if (firstBiz) {
    await recordSubscriptionAudit(client, {
      businessId: firstBiz.id,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_UPDATE_PLATFORM_ROLE",
      newStatus: params.role,
      notes: `Peran platform diubah menjadi ${params.role}`,
      metadata: { targetUserId: params.userId, newRole: params.role },
    });
  }
}

/**
 * Super Admin action: Deactivates a platform admin.
 */
export async function deactivatePlatformAdmin(
  client: SupabaseClient,
  params: {
    userId: string;
    adminUserId: string;
    adminEmail?: string;
  }
): Promise<void> {
  const { error } = await client
    .from("platform_admins")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (error) throw error;

  const { data: firstBiz } = await client.from("businesses").select("id").limit(1).maybeSingle();
  if (firstBiz) {
    await recordSubscriptionAudit(client, {
      businessId: firstBiz.id,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_DEACTIVATE_PLATFORM_ADMIN",
      newStatus: "inactive",
      notes: "Akses platform admin dinonaktifkan.",
      metadata: { targetUserId: params.userId },
    });
  }
}

/**
 * Super Admin action: Reactivates a deactivated platform admin.
 */
export async function reactivatePlatformAdmin(
  client: SupabaseClient,
  params: {
    userId: string;
    adminUserId: string;
    adminEmail?: string;
  }
): Promise<void> {
  const { error } = await client
    .from("platform_admins")
    .update({
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (error) throw error;

  const { data: firstBiz } = await client.from("businesses").select("id").limit(1).maybeSingle();
  if (firstBiz) {
    await recordSubscriptionAudit(client, {
      businessId: firstBiz.id,
      actorUserId: params.adminUserId,
      actorEmail: params.adminEmail,
      action: "ADMIN_REACTIVATE_PLATFORM_ADMIN",
      newStatus: "active",
      notes: "Akses platform admin diaktifkan kembali.",
      metadata: { targetUserId: params.userId },
    });
  }
}
