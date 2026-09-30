import { ExecutionResultDTO } from "../transactions/types";

export type WhatsAppConnectionStatus =
  | "connected"
  | "disconnected"
  | "pending_verification"
  | "rate_limited";

export interface WhatsAppConnection {
  id: string;
  businessId: string;
  phoneNumberId: string;
  phoneNumber: string;
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

// ============================================================================
// Meta WhatsApp Cloud API Webhook Event Types
// ============================================================================

export interface MetaWebhookMetadata {
  display_phone_number?: string;
  phone_number_id: string;
}

export interface MetaWebhookContact {
  profile?: {
    name?: string;
  };
  wa_id: string;
}

export interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: unknown;
  audio?: unknown;
  video?: unknown;
  document?: unknown;
  location?: unknown;
  contacts?: unknown;
}

export interface MetaWebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: unknown[];
}

export interface MetaWebhookValue {
  messaging_product: string;
  metadata: MetaWebhookMetadata;
  contacts?: MetaWebhookContact[];
  messages?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
}

export interface MetaWebhookChange {
  field: string;
  value: MetaWebhookValue;
}

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  object: string;
  entry?: MetaWebhookEntry[];
}

// ============================================================================
// Domain Types for Webhook Processing
// ============================================================================

export interface ExtractedWhatsAppMessage {
  messageId: string;
  fromPhone: string;
  phoneNumberId: string;
  messageType: string;
  textBody?: string;
  timestamp: string;
}

export interface WhatsAppAuthorizedSender {
  id: string;
  businessId: string;
  phoneNumber: string;
  displayLabel?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookProcessingResult {
  acknowledged: boolean;
  type:
    | "status_event"
    | "unsupported_message_type"
    | "unknown_connection"
    | "unauthorized_sender"
    | "duplicate_ignored"
    | "message_processed"
    | "malformed_payload"
    | "verification_succeeded"
    | "verification_failed";
  messageId?: string;
  businessId?: string;
  senderPhone?: string;
  action?: string;
  executionResult?: ExecutionResultDTO;
  sendResult?: MetaSendResult;
  reason?: string;
}
