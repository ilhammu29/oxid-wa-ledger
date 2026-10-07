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

    case "EXPENSE": {
      action = "RECORD_EXPENSE";
      requiresConfirmation = false;
      break;
    }

    case "CAPITAL_IN": {
      action = "RECORD_CAPITAL_IN";
      requiresConfirmation = false;
      break;
    }

    case "OWNER_DRAW": {
      action = "RECORD_OWNER_DRAW";
      requiresConfirmation = false;
      break;
    }

    case "PURCHASE": {
      action = "RECORD_PURCHASE";
      requiresConfirmation = false;
      break;
    }

    case "PAY_RECEIVABLE": {
      action = "RECORD_PAY_RECEIVABLE";
      requiresConfirmation = false;
      break;
    }

    case "PAY_PAYABLE": {
      action = "RECORD_PAY_PAYABLE";
      requiresConfirmation = false;
      break;
    }

    case "CASH_BALANCE": {
      action = "SHOW_CASH_BALANCE";
      requiresConfirmation = false;
      break;
    }

    case "PROFIT_LOSS": {
      action = "SHOW_PROFIT_LOSS";
      requiresConfirmation = false;
      break;
    }

    case "BALANCE_SHEET": {
      action = "SHOW_BALANCE_SHEET";
      requiresConfirmation = false;
      break;
    }

    case "CASH_FLOW": {
      action = "SHOW_CASH_FLOW";
      requiresConfirmation = false;
      break;
    }

    case "TRIAL_BALANCE": {
      action = "SHOW_TRIAL_BALANCE";
      requiresConfirmation = false;
      break;
    }

    case "GENERAL_LEDGER": {
      action = "SHOW_GENERAL_LEDGER";
      requiresConfirmation = false;
      break;
    }

    case "INVENTORY_STATUS": {
      action = "SHOW_INVENTORY_STATUS";
      requiresConfirmation = false;
      break;
    }

    case "RECEIVABLE_STATUS": {
      action = "SHOW_RECEIVABLE_STATUS";
      requiresConfirmation = false;
      break;
    }

    case "PAYABLE_STATUS": {
      action = "SHOW_PAYABLE_STATUS";
      requiresConfirmation = false;
      break;
    }

    case "EXPORT_REPORT": {
      action = "EXECUTE_EXPORT_REPORT";
      requiresConfirmation = false;
      break;
    }

    case "AMBIGUOUS_FINANCIAL": {
      action = "ASK_AMBIGUITY_CLARIFICATION";
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
