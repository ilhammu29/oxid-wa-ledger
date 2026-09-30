export interface ClientInvite {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  createdBy: string;
  active: boolean;
}

export interface OnboardingWizardState {
  businessName: string;
  timezone: string;
  currency: string;
  productName: string;
  productUnit: string;
  productPrice: number;
  channel: "telegram" | "whatsapp";
  telegramUserId?: number;
  enableReminder: boolean;
  reminderTime: string;
  reminderDays: number[];
}

export interface CompleteOnboardingInput extends OnboardingWizardState {
  inviteToken: string;
}
