import { SupabaseClient } from "@supabase/supabase-js";
import {
  BusinessSubscription,
  SubscriptionPayment,
  SubscriptionStateResult,
  MutationGateResult,
  SubscriptionStatus,
  BillingPaymentSetting,
} from "./types";
import { getPlan } from "./plans";

/**
 * Fetches the raw subscription record for a business.
 */
export async function getBusinessSubscription(
  client: SupabaseClient,
  businessId: string
): Promise<BusinessSubscription | null> {
  const { data, error } = await client
    .from("business_subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    businessId: data.business_id,
    planCode: data.plan_code,
    status: data.status,
    trialStartedAt: data.trial_started_at,
    trialEndsAt: data.trial_ends_at,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    gracePeriodEndsAt: data.grace_period_ends_at,
    activatedAt: data.activated_at,
    suspendedAt: data.suspended_at,
    cancelledAt: data.cancelled_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Evaluates the full subscription state, remaining days, and permission gates.
 */
export async function getBusinessSubscriptionState(
  client: SupabaseClient,
  businessId: string,
  now: Date = new Date()
): Promise<SubscriptionStateResult> {
  const sub = await getBusinessSubscription(client, businessId);

  // Fallback for businesses without explicit subscription (e.g. legacy/testing)
  if (!sub) {
    const defaultPlan = getPlan("pilot");
    return {
      subscription: null,
      plan: defaultPlan,
      status: "active",
      isTrial: false,
      isActive: true,
      isGracePeriod: false,
      isSuspended: false,
      isCancelled: false,
      remainingDays: 999,
      currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      gracePeriodEndsAt: new Date(now.getTime() + 368 * 24 * 60 * 60 * 1000).toISOString(),
      canCreateMutations: true,
      canUseLedger: true,
      warningMessage: null,
    };
  }

  const plan = getPlan(sub.planCode);
  const status: SubscriptionStatus = sub.status;
  const isTrial = status === "trialing";
  const isActive = status === "active";
  const isGracePeriod = status === "grace_period";
  const isSuspended = status === "suspended";
  const isCancelled = status === "cancelled";

  // Calculate target expiration timestamp based on status
  const targetEnd = isTrial ? new Date(sub.trialEndsAt) : new Date(sub.currentPeriodEnd);
  const diffMs = targetEnd.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let canCreateMutations = false;
  let warningMessage: string | null = null;

  if (isSuspended) {
    canCreateMutations = false;
    warningMessage = "Langganan bisnis ini sedang ditangguhkan. Silakan lakukan pembayaran perpanjangan untuk mengaktifkan kembali pencatatan transaksi.";
  } else if (isCancelled) {
    canCreateMutations = false;
    warningMessage = "Langganan bisnis ini telah dibatalkan. Riwayat data Anda tetap tersimpan dengan aman.";
  } else if (isGracePeriod) {
    canCreateMutations = false;
    const graceEnd = new Date(sub.gracePeriodEndsAt);
    const graceDiffMs = graceEnd.getTime() - now.getTime();
    const graceDays = Math.max(0, Math.ceil(graceDiffMs / (1000 * 60 * 60 * 24)));
    warningMessage = `Masa langganan telah berakhir. Bisnis Anda berada dalam masa tenggang (${graceDays} hari tersisa). Segera lakukan perpanjangan sebelum ditangguhkan sepenuhnya.`;
  } else if (isTrial) {
    if (now.getTime() > targetEnd.getTime()) {
      canCreateMutations = false;
      warningMessage = "Masa uji coba pilot 14 hari telah habis. Silakan pilih paket langganan untuk melanjutkan pencatatan penjualan.";
    } else {
      canCreateMutations = true;
      if (remainingDays <= 3) {
        warningMessage = `Masa uji coba Anda tersisa ${remainingDays} hari lagi. Lakukan perpanjangan agar operasional tidak terhenti.`;
      }
    }
  } else if (isActive) {
    if (now.getTime() > targetEnd.getTime()) {
      canCreateMutations = false;
      warningMessage = "Masa aktif langganan telah terlewati. Sistem sedang menunggu pembaharuan siklus penagihan.";
    } else {
      canCreateMutations = true;
      if (remainingDays <= 7) {
        warningMessage = `Langganan aktif Anda akan berakhir dalam ${remainingDays} hari. Silakan perpanjang untuk menjaga kelancaran usaha.`;
      }
    }
  }

  return {
    subscription: sub,
    plan,
    status,
    isTrial,
    isActive,
    isGracePeriod,
    isSuspended,
    isCancelled,
    remainingDays,
    currentPeriodEnd: sub.currentPeriodEnd,
    gracePeriodEndsAt: sub.gracePeriodEndsAt,
    canCreateMutations,
    canUseLedger: true, // Always allow dashboard read and historical audit
    warningMessage,
  };
}

/**
 * Gate check: Can this business view ledger / dashboard?
 * All businesses (even suspended/cancelled) preserve read access to their ledger history.
 */
export async function canUseLedger(
  client: SupabaseClient,
  businessId: string,
  now?: Date
): Promise<boolean> {
  const state = await getBusinessSubscriptionState(client, businessId, now);
  return state.canUseLedger;
}

/**
 * Gate check: Can this business record/mutate financial transactions?
 * Strictly enforces that trial or active periods are unexpired, and not in grace/suspended/cancelled.
 */
export async function canCreateFinancialMutation(
  client: SupabaseClient,
  businessId: string,
  now: Date = new Date()
): Promise<MutationGateResult> {
  const state = await getBusinessSubscriptionState(client, businessId, now);

  if (state.canCreateMutations) {
    return { allowed: true, status: state.status };
  }

  let reason: MutationGateResult["reason"] = "SUBSCRIPTION_PERIOD_EXPIRED";
  let replyText = "Pencatatan penjualan dibatasi karena masa langganan bisnis telah berakhir. Silakan perpanjang langganan melalui dashboard OXID.";

  if (state.isSuspended) {
    reason = "SUBSCRIPTION_SUSPENDED";
    replyText = "Pencatatan transaksi dibatasi karena langganan OXID Ledger untuk usaha ini sedang ditangguhkan. Silakan perpanjang langganan di menu Langganan atau hubungi admin OXID.";
  } else if (state.isCancelled) {
    reason = "SUBSCRIPTION_CANCELLED";
    replyText = "Pencatatan transaksi dibatasi karena langganan telah dibatalkan. Riwayat data tetap aman tersimpan.";
  } else if (state.isGracePeriod) {
    reason = "SUBSCRIPTION_GRACE_PERIOD";
    replyText = "Pencatatan transaksi dibatasi karena masa aktif telah habis dan akun berada dalam masa tenggang. Silakan perpanjang paket langganan Anda.";
  } else if (state.isTrial && state.remainingDays <= 0) {
    reason = "SUBSCRIPTION_TRIAL_EXPIRED";
    replyText = "Masa uji coba pilot 14 hari telah habis. Silakan aktifkan paket langganan melalui dashboard OXID untuk melanjutkan.";
  }

  return {
    allowed: false,
    reason,
    replyText,
    status: state.status,
  };
}

/**
 * Creates a new manual payment record submitted by business owner.
 */
export async function createPaymentRecord(
  client: SupabaseClient,
  params: {
    businessId: string;
    subscriptionId: string;
    amountIdr: number;
    paymentMethod?: string;
    reference?: string | null;
    paidAt?: string | null;
  }
): Promise<SubscriptionPayment> {
  const { data, error } = await client
    .from("subscription_payments")
    .insert({
      business_id: params.businessId,
      subscription_id: params.subscriptionId,
      amount_idr: Math.round(params.amountIdr),
      payment_method: params.paymentMethod || "manual_transfer",
      status: "pending",
      reference: params.reference || null,
      paid_at: params.paidAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create payment record: ${error?.message || "Unknown error"}`);
  }

  return {
    id: data.id,
    businessId: data.business_id,
    subscriptionId: data.subscription_id,
    amountIdr: Number(data.amount_idr),
    paymentMethod: data.payment_method,
    status: data.status,
    reference: data.reference,
    paidAt: data.paid_at,
    confirmedAt: data.confirmed_at,
    confirmedBy: data.confirmed_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Fetches payment history for a business.
 */
export async function getBusinessPayments(
  client: SupabaseClient,
  businessId: string
): Promise<SubscriptionPayment[]> {
  const { data, error } = await client
    .from("subscription_payments")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((d) => ({
    id: d.id,
    businessId: d.business_id,
    subscriptionId: d.subscription_id,
    amountIdr: Number(d.amount_idr),
    paymentMethod: d.payment_method,
    status: d.status,
    reference: d.reference,
    paidAt: d.paid_at,
    confirmedAt: d.confirmed_at,
    confirmedBy: d.confirmed_by,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

/**
 * Records an immutable audit log entry for subscription state changes.
 */
export async function recordSubscriptionAudit(
  client: SupabaseClient,
  params: {
    businessId: string;
    subscriptionId?: string | null;
    actorUserId?: string | null;
    actorEmail?: string | null;
    action: string;
    previousStatus?: string | null;
    newStatus: string;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await client.from("subscription_audit_logs").insert({
    business_id: params.businessId,
    subscription_id: params.subscriptionId || null,
    actor_user_id: params.actorUserId || null,
    actor_email: params.actorEmail || null,
    action: params.action,
    previous_status: params.previousStatus || null,
    new_status: params.newStatus,
    notes: params.notes || null,
    metadata: params.metadata || {},
  });
}

/**
 * Fetches active payment settings for bank transfers.
 * Returns empty array if none are configured or active.
 */
export async function getBillingPaymentSettings(
  client: SupabaseClient
): Promise<BillingPaymentSetting[]> {
  try {
    const { data, error } = await client
      .from("billing_payment_settings")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      bankName: d.bank_name,
      accountName: d.account_name,
      maskedAccountNumber: d.masked_account_number,
      paymentInstructions: d.payment_instructions,
      active: d.active,
    }));
  } catch {
    return [];
  }
}
