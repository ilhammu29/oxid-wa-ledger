export interface BusinessSettings {
  businessId: string;
  autoReplyWhatsApp: boolean;
  defaultCurrency: string;
  defaultTimezone: string;
  replyTemplateConfirmed?: string;
  replyTemplateClarification?: string;
  updatedAt: string;
}

export interface UpdateSettingsDTO {
  autoReplyWhatsApp?: boolean;
  defaultCurrency?: string;
  defaultTimezone?: string;
  replyTemplateConfirmed?: string;
  replyTemplateClarification?: string;
}
