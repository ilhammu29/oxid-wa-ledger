import { ExecutionResultDTO } from "../transactions/types";

// ============================================================================
// Official Telegram Bot API Types (Update, Message, User, Chat)
// https://core.telegram.org/bots/api
// ============================================================================

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: unknown[];
  sticker?: unknown;
  video?: unknown;
  audio?: unknown;
  voice?: unknown;
  document?: unknown;
  caption?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: unknown;
  channel_post?: unknown;
  edited_channel_post?: unknown;
  inline_query?: unknown;
  chosen_inline_result?: unknown;
  callback_query?: unknown;
  shipping_query?: unknown;
  pre_checkout_query?: unknown;
  poll?: unknown;
  poll_answer?: unknown;
  my_chat_member?: unknown;
  chat_member?: unknown;
  chat_join_request?: unknown;
}

// ============================================================================
// Domain Types for Telegram Adapter & Idempotency
// ============================================================================

export interface TelegramAuthorizedUser {
  id: string;
  businessId: string;
  telegramUserId: number | string;
  displayLabel?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface TelegramWebhookProcessingResult {
  acknowledged: boolean;
  type:
    | "message_processed"
    | "unauthorized_user"
    | "ambiguous_business_mapping"
    | "duplicate_ignored"
    | "unsupported_update"
    | "unsupported_chat_type"
    | "unsupported_message_type"
    | "malformed_update"
    | "internal_error";
  updateId?: number;
  businessId?: string;
  telegramUserId?: string;
  action?: string;
  executionResult?: ExecutionResultDTO;
  sendResult?: TelegramSendResult;
  reason?: string;
}
