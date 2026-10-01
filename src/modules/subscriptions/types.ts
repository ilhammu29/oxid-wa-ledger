/**
 * Subscription & Billing Domain Types for OXID WA Ledger.
 * Step 9: Authoritative subscription lifecycle, plans, and manual billing.
 */

export type SubscriptionPlanCode = "pilot" | "basic" | "pro";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "grace_period"
  | "suspended"
  | "cancelled";

export type PaymentStatus = "pending" | "confirmed" | "rejected";

export type PaymentMethod =
  | "manual_transfer"
  | "bank_transfer"
  | "qris_manual"
  | "cash";

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planCode: SubscriptionPlanCode;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEndsAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPayment {
  id: string;
  businessId: string;
  subscriptionId: string;
  amountIdr: number;
  paymentMethod: PaymentMethod | string;
  status: PaymentStatus;
  reference: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  code: SubscriptionPlanCode;
  name: string;
  description: string;
  priceIdr: number;
  durationDays: number;
  features: string[];
}

export interface SubscriptionStateResult {
  subscription: BusinessSubscription | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isTrial: boolean;
  isActive: boolean;
  isGracePeriod: boolean;
  isSuspended: boolean;
  isCancelled: boolean;
  remainingDays: number;
  currentPeriodEnd: string;
  gracePeriodEndsAt: string;
  canCreateMutations: boolean;
  canUseLedger: boolean;
  warningMessage: string | null;
}

export interface MutationGateResult {
  allowed: boolean;
  reason?:
    | "SUBSCRIPTION_SUSPENDED"
    | "SUBSCRIPTION_CANCELLED"
    | "SUBSCRIPTION_GRACE_PERIOD"
    | "SUBSCRIPTION_TRIAL_EXPIRED"
    | "SUBSCRIPTION_PERIOD_EXPIRED";
  replyText?: string;
  status?: SubscriptionStatus;
}

export interface SubscriptionAuditLog {
  id: string;
  businessId: string;
  subscriptionId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface BillingPaymentSetting {
  id: string;
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
  paymentInstructions?: string | null;
  active: boolean;
}
