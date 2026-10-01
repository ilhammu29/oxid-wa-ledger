export interface BusinessChannelSettings {
  businessId: string;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  primaryChannel: "telegram" | "whatsapp";
  reminderChannel: "telegram" | "whatsapp";
  updatedAt: string;
  updatedBy: string | null;
}

export type WhatsAppConnectionStatus =
  | "NOT CONFIGURED"
  | "CONFIGURING"
  | "READY"
  | "ACTIVE"
  | "ERROR";

export interface WhatsAppConnectionDetails {
  phoneNumber: string;
  maskedPhoneNumber: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  phoneNumberId: string;
  maskedPhoneNumberId: string;
  wabaId?: string | null;
  status: string;
  reminderTemplateName?: string | null;
  reminderTemplateLanguage?: string | null;
  reminderTemplateStatus?: "unconfigured" | "pending" | "approved" | "rejected" | string;
}

export interface WhatsAppReadiness {
  ready: boolean;
  status: WhatsAppConnectionStatus;
  hasActiveConnection: boolean;
  hasPhoneNumberId: boolean;
  hasWabaId: boolean;
  hasAuthorizedSenders: boolean;
  hasApprovedTemplate: boolean;
  isTokenConfigured: boolean;
  authorizedSendersCount: number;
  connection?: WhatsAppConnectionDetails | null;
  missingRequirements: string[];
}

export interface UpdateChannelSettingsInput {
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  primaryChannel: "telegram" | "whatsapp";
  reminderChannel: "telegram" | "whatsapp";
}

