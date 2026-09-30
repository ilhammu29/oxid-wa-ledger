export interface BusinessChannelSettings {
  businessId: string;
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  primaryChannel: "telegram" | "whatsapp";
  reminderChannel: "telegram" | "whatsapp";
  updatedAt: string;
  updatedBy: string | null;
}

export interface WhatsAppReadiness {
  ready: boolean;
  hasActiveConnection: boolean;
  hasPhoneNumberId: boolean;
  hasAuthorizedSenders: boolean;
  missingRequirements: string[];
}

export interface UpdateChannelSettingsInput {
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  primaryChannel: "telegram" | "whatsapp";
  reminderChannel: "telegram" | "whatsapp";
}
