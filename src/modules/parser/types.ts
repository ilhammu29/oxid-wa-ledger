/**
 * OXID WA Ledger - Deterministic Message Parser & Conversation Types
 * Step 3: Pure domain contracts for natural Indonesian business messages.
 */

export type ParserIntent =
  | "SALE"
  | "REPORT_TODAY"
  | "REPORT_WEEK"
  | "REPORT_MONTH"
  | "NO_SALE"
  | "CLOSED"
  | "CANCEL_LAST"
  | "CORRECT_LAST"
  | "HELP"
  | "UNKNOWN";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type ConversationActionType =
  | "CREATE_SALE"
  | "SHOW_REPORT_TODAY"
  | "SHOW_REPORT_WEEK"
  | "SHOW_REPORT_MONTH"
  | "MARK_NO_SALE"
  | "MARK_CLOSED"
  | "REQUEST_CANCEL_LAST"
  | "REQUEST_CORRECT_LAST"
  | "SHOW_HELP"
  | "ASK_CONFIRMATION"
  | "SHOW_UNKNOWN_HELP";

export interface ExtractedQuantity {
  /** Normalized decimal string formatted for database NUMERIC(12, 3), e.g. "15.000", "2.500" */
  decimalString: string;
  /** Raw numeric representation, e.g. 15, 2.5 */
  rawNumber: number;
  /** Canonical unit, e.g. "kg" */
  unit: "kg";
  /** Raw matched substring from the normalized text */
  matchedText: string;
}

export interface ParsedMessage {
  /** Detected business intent */
  intent: ParserIntent;
  /** Deterministic confidence level */
  confidence: ConfidenceLevel;
  /** Original untrusted input text before normalization */
  originalText: string;
  /** Normalized lowercase text with standardized spacing, decimals, and units */
  normalizedText: string;
  /** Extracted quantity formatted for DB NUMERIC (e.g. "15.000") or null */
  quantity: string | null;
  /** Raw numeric quantity (e.g. 15) or null */
  rawQuantity: number | null;
  /** Canonical unit (e.g. "kg") or null */
  unit: string | null;
  /** Corrected quantity for CORRECT_LAST intent or null */
  correctedQuantity: string | null;
  /** Raw numeric corrected quantity or null */
  rawCorrectedQuantity: number | null;
  /** Keywords detected that positively indicate this intent */
  matchedKeywords: string[];
  /** Negative/conflicting keywords detected (e.g. stock/inventory terms) */
  negativeKeywords: string[];
  /** Whether the message requires user confirmation before performing actions */
  requiresConfirmation: boolean;
  /** Deterministic explanation of how the intent and confidence were determined */
  reason: string;
  /** Indicates if multiple distinct quantities were detected in a single message */
  multipleQuantitiesDetected: boolean;
}

export interface ConversationActionResult {
  /** The determined next action for the application layer */
  action: ConversationActionType;
  /** The underlying parsed message */
  parsed: ParsedMessage;
  /** Deterministic human-friendly Indonesian reply message */
  replyText: string;
  /** Flag indicating if explicit confirmation is required from the user */
  requiresConfirmation: boolean;
}
