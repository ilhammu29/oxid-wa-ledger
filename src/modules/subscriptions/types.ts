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
  maxOperators: number;
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

export type PlatformAdminRole =
  | "super_admin"
  | "support_admin"
  | "billing_admin"
  | "viewer";

export type PlatformPermission =
  | "admin:view"
  | "businesses:read"
  | "businesses:write"
  | "users:read"
  | "users:write"
  | "subscriptions:read"
  | "subscriptions:write"
  | "payments:read"
  | "payments:write"
  | "settings:read"
  | "settings:write"
  | "audit:read"
  | "system:read";

export interface PlatformAdminRecord {
  id: string;
  userId: string;
  email: string;
  role: PlatformAdminRole;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOverviewKPIs {
  totalBusinesses: number;
  activeTrials: number;
  activeSubscriptions: number;
  gracePeriodSubscriptions: number;
  suspendedSubscriptions: number;
  pendingPaymentsCount: number;
  pendingPaymentsTotalIdr: number;
  totalTransactionsCount: number;
  totalRevenueVolumeIdr: number;
  connectedChannels: {
    telegramCount: number;
    whatsappCount: number;
  };
  googleSheetsConnectedCount: number;
}

export interface PlatformSystemStatusItem {
  id: string;
  name: string;
  category: "database" | "adapter" | "worker" | "cron";
  status: "healthy" | "warning" | "unavailable" | "deferred";
  statusText: string;
  lastExecutionAt?: string | null;
  lastSuccessAt?: string | null;
  recentFailureCount: number;
  notes?: string;
}

export interface PlatformUserItem {
  userId: string;
  email: string;
  businessName: string | null;
  businessRole: string | null;
  platformRole: PlatformAdminRole | null;
  platformAdminActive: boolean | null;
  createdAt: string;
}

export interface AdminSubscriptionListItem {
  id: string;
  businessId: string;
  businessName: string;
  planCode: SubscriptionPlanCode;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  gracePeriodEndsAt: string;
  remainingDays: number;
  trialStartedAt: string;
  trialEndsAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AdminPaymentListItem {
  id: string;
  businessId: string;
  businessName: string;
  subscriptionId: string;
  amountIdr: number;
  paymentMethod: string;
  status: string;
  reference: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
}
