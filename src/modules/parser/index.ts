/**
 * OXID WA Ledger - Deterministic Message Parser & Conversation Module
 * Step 3: Pure domain engine for natural Indonesian business messages.
 */

import { ConversationActionResult } from "./types";
import { parseMessage } from "./intent";
import { evaluateConversationAction } from "./conversation";

/**
 * High-level unified handler for incoming conversation text.
 * Parses the raw message and evaluates the corresponding conversation action.
 */
export function handleConversationMessage(rawInput: string): ConversationActionResult {
  const parsed = parseMessage(rawInput);
  return evaluateConversationAction(parsed);
}

// Re-export core functions and types
export { parseMessage } from "./intent";
export { evaluateConversationAction } from "./conversation";
export { normalizeIndonesianText, MAX_INPUT_LENGTH } from "./normalizer";
export { extractQuantities, formatToDbNumeric } from "./quantity";
export { formatActionResponse } from "./formatter";

export * from "./types";
export * from "./keywords";
