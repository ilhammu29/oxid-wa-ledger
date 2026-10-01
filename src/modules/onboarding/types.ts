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

export type BusinessCategory =
  | "F&B"
  | "Perikanan"
  | "Peternakan"
  | "Reseller"
  | "Toko"
  | "Distributor"
  | "Lainnya";

export interface CreateBusinessInput {
  name: string;
  category?: string;
  ownerName?: string;
  timezone?: string;
  currency?: string;
  defaultUnit?: string;
}

export interface FirstProductInput {
  businessId: string;
  name: string;
  unit: string;
  priceIdr: number;
  aliases?: string[];
}

export interface BusinessOnboardingProgress {
  id: string;
  businessId: string;
  currentStep: number;
  profileCompleted: boolean;
  productCompleted: boolean;
  telegramCompleted: boolean;
  firstTransactionCompleted: boolean;
  googleSheetsCompleted: boolean;
  googleSheetsSkipped: boolean;
  completedAt: string | null;
  percentage: number;
}

export interface TelegramPairingTokenResult {
  code: string;
  expiresAt: string;
  expiresInSeconds: number;
  botUsername: string;
  deepLink: string;
}

