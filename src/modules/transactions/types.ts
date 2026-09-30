/**
 * Transaction Domain & Execution Context Types for OXID WA Ledger.
 * Step 4: Connecting deterministic parser to domain services and Supabase.
 */

import { ParsedMessage, ConversationActionType } from "../parser/types";

export type TransactionStatus = "confirmed" | "cancelled" | "corrected";
export type TransactionSource = "whatsapp" | "telegram" | "dashboard" | "system";

/**
 * Execution context carrying trusted tenant and actor identity.
 * NEVER derived directly from raw message text.
 */
export interface ExecutionContext {
  /** Verified tenant identifier */
  businessId: string;
  /** Authenticated Supabase user ID if originating from dashboard/session */
  authenticatedUserId?: string | null;
  /** Channel or subsystem originating the action */
  source: TransactionSource;
  /** Caller or sender phone number (treated as sensitive operational metadata) */
  senderPhone?: string | null;
  /** Reference timestamp (defaults to current date/time) */
  now?: Date;
}

export interface CreateSaleParams {
  /** Numeric or decimal string quantity (e.g. 15, "15.000", 2.5) */
  quantity: number | string;
  /** Unit of measure (canonical "kg") */
  unit?: string;
  /** Original unparsed message for auditing */
  rawMessage?: string;
  /** Optional specific product ID (defaults to active default product if omitted) */
  productId?: string | null;
  /** Timestamp when the sale occurred */
  transactionAt?: Date | string;
}

export interface TodaySummaryDTO {
  localDate: string;
  transactionCount: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface SaleResultDTO {
  transactionId: string;
  businessId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: "confirmed";
  transactionAt: string;
  todaySummary: TodaySummaryDTO;
}

export interface CancelResultDTO {
  transactionId: string;
  businessId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: "cancelled";
  cancelledAt: string;
}

export interface CorrectResultDTO {
  originalTransactionId: string;
  originalQuantity: number;
  originalTotalAmount: number;
  newTransactionId: string;
  newQuantity: number;
  unit: string;
  unitPrice: number;
  newTotalAmount: number;
  correctedAt: string;
}

export interface DailyStatusDTO {
  id: string;
  businessId: string;
  localDate: string;
  status: "NO_SALE" | "CLOSED" | "ACTIVE";
  isDuplicate: boolean;
}

export interface ReportResultDTO {
  businessId: string;
  period: "today" | "week" | "month";
  startAt: string;
  endAt: string;
  transactionCount: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ExecutionResultDTO {
  action: ConversationActionType;
  status: "SUCCESS" | "CONFIRMATION_REQUIRED" | "ERROR";
  replyText: string;
  parsed: ParsedMessage;
  data?:
    | SaleResultDTO
    | CancelResultDTO
    | CorrectResultDTO
    | DailyStatusDTO
    | ReportResultDTO
    | {
        proposedIntent: string;
        proposedQuantity: string | null;
        proposedUnit: string | null;
        reason?: string;
      }
    | null;
  errorCode?: string;
  errorMessage?: string;
}
