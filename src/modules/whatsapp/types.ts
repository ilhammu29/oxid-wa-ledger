export type WhatsAppConnectionStatus =
  | "connected"
  | "disconnected"
  | "pending_verification"
  | "rate_limited";

export interface WhatsAppConnection {
  id: string;
  businessId: string; // Tenant boundary
  phoneNumberId: string; // Meta Cloud API Phone Number ID or Provider Channel ID
  phoneNumber: string; // E.164 formatted number (e.g. +6281234567890)
  displayName?: string;
  provider: "meta_cloud_api" | "baileys" | "waba";
  status: WhatsAppConnectionStatus;
  webhookVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterWhatsAppConnectionDTO {
  businessId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayName?: string;
  provider: WhatsAppConnection["provider"];
}
