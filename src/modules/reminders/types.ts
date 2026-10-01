export interface BusinessReminderSettings {
  businessId: string;
  enabled: boolean;
  reminderTime: string; // e.g. "18:00"
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  channel: "telegram" | "whatsapp";
  timezone: string;
  updatedAt: string;
  updatedBy: string | null;
}

export type ReminderIneligibilityReason =
  | "DISABLED"
  | "WRONG_WEEKDAY"
  | "BEFORE_SCHEDULED_TIME"
  | "OUTSIDE_GRACE_WINDOW"
  | "HAS_CONFIRMED_SALES"
  | "HAS_DAILY_STATUS"
  | "NO_ACTIVE_RECIPIENTS"
  | "WHATSAPP_TEMPLATE_NOT_READY"
  | "ALREADY_SENT_TODAY";

export interface ReminderRecipient {
  telegramUserId?: number;
  phone?: string;
  displayLabel: string | null;
}

export interface ReminderEligibilityResult {
  eligible: boolean;
  reason?: ReminderIneligibilityReason;
  businessId: string;
  localDate: string;
  reminderTime?: string;
  channel?: "telegram" | "whatsapp";
  phoneNumberId?: string;
  templateName?: string;
  templateLanguage?: string;
  recipients?: ReminderRecipient[];
}

export interface ReminderRunSummary {
  jobId: string;
  startedAt: string;
  finishedAt: string;
  status: "completed" | "failed";
  businessesChecked: number;
  notificationsSent: number;
  notificationsFailed: number;
  details: Array<{
    businessId: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
  }>;
}
