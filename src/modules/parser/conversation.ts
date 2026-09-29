/**
 * Conversation Action Evaluator for OXID WA Ledger.
 * Step 3: Decouples intent understanding from application workflow decisions.
 */

import { ParsedMessage, ConversationActionResult, ConversationActionType } from "./types";
import { formatActionResponse } from "./formatter";

/**
 * Maps a ParsedMessage to a concrete ConversationActionResult.
 *
 * Rules:
 * - High confidence SALE -> CREATE_SALE
 * - Low/Medium confidence SALE or multiple quantities -> ASK_CONFIRMATION
 * - Reports -> SHOW_REPORT_*
 * - Operational status -> MARK_NO_SALE / MARK_CLOSED
 * - Modifiers -> REQUEST_CANCEL_LAST / REQUEST_CORRECT_LAST
 * - Help / Unknown -> SHOW_HELP / SHOW_UNKNOWN_HELP
 */
export function evaluateConversationAction(parsed: ParsedMessage): ConversationActionResult {
  let action: ConversationActionType = "SHOW_UNKNOWN_HELP";
  let requiresConfirmation = false;

  switch (parsed.intent) {
    case "SALE": {
      if (parsed.confidence === "HIGH" && !parsed.requiresConfirmation) {
        action = "CREATE_SALE";
        requiresConfirmation = false;
      } else {
        action = "ASK_CONFIRMATION";
        requiresConfirmation = true;
      }
      break;
    }

    case "REPORT_TODAY": {
      action = "SHOW_REPORT_TODAY";
      requiresConfirmation = false;
      break;
    }

    case "REPORT_WEEK": {
      action = "SHOW_REPORT_WEEK";
      requiresConfirmation = false;
      break;
    }

    case "REPORT_MONTH": {
      action = "SHOW_REPORT_MONTH";
      requiresConfirmation = false;
      break;
    }

    case "NO_SALE": {
      action = "MARK_NO_SALE";
      requiresConfirmation = false;
      break;
    }

    case "CLOSED": {
      action = "MARK_CLOSED";
      requiresConfirmation = false;
      break;
    }

    case "CANCEL_LAST": {
      action = "REQUEST_CANCEL_LAST";
      requiresConfirmation = false;
      break;
    }

    case "CORRECT_LAST": {
      if (parsed.confidence === "HIGH" && parsed.correctedQuantity) {
        action = "REQUEST_CORRECT_LAST";
        requiresConfirmation = false;
      } else {
        action = "SHOW_UNKNOWN_HELP";
        requiresConfirmation = false;
      }
      break;
    }

    case "HELP": {
      action = "SHOW_HELP";
      requiresConfirmation = false;
      break;
    }

    case "UNKNOWN":
    default: {
      action = "SHOW_UNKNOWN_HELP";
      requiresConfirmation = false;
      break;
    }
  }

  const replyText = formatActionResponse(action, parsed);

  return {
    action,
    parsed,
    replyText,
    requiresConfirmation,
  };
}
