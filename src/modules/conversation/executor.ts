/**
 * Conversation Action Executor for OXID WA Ledger.
 * Step 4: Coordinates intent decisions with atomic database execution.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { parseMessage } from "../parser";
import { evaluateConversationAction } from "../parser";
import {
  ExecutionContext,
  ExecutionResultDTO,
} from "../transactions/types";
import { DomainError } from "../transactions/errors";
import {
  recordSale,
  cancelLastSale,
  correctLastSale,
  setDailyStatus,
  getSalesReport,
} from "../transactions/service";
import {
  formatSaleSuccessResponse,
  formatCancelSuccessResponse,
  formatCorrectSuccessResponse,
  formatReportResponse,
  formatConfirmationInquiry,
} from "./formatter";

/**
 * Executes a conversational command against business domain services.
 *
 * CRITICAL SAFETY INVARIANT:
 * - Ambiguous sales, low/medium confidence messages, or multi-quantity messages
 *   are strictly BLOCKED from performing financial writes.
 */
export async function executeConversationAction(
  client: SupabaseClient,
  context: ExecutionContext,
  rawMessage: string
): Promise<ExecutionResultDTO> {
  if (!context?.businessId) {
    return {
      action: "SHOW_UNKNOWN_HELP",
      status: "ERROR",
      replyText: "Konteks bisnis tidak valid atau tidak ditemukan.",
      errorCode: "UNAUTHORIZED",
      errorMessage: "Missing businessId in execution context",
      parsed: parseMessage(rawMessage),
    };
  }

  const parsed = parseMessage(rawMessage);
  const evaluated = evaluateConversationAction(parsed);

  try {
    // ------------------------------------------------------------------------
    // DEFENSE-IN-DEPTH: Ambiguous Sale Protection
    // ------------------------------------------------------------------------
    if (evaluated.action === "CREATE_SALE") {
      if (
        parsed.confidence !== "HIGH" ||
        parsed.requiresConfirmation ||
        parsed.multipleQuantitiesDetected
      ) {
        return {
          action: "ASK_CONFIRMATION",
          status: "CONFIRMATION_REQUIRED",
          replyText: formatConfirmationInquiry(parsed),
          parsed,
          data: {
            proposedIntent: "SALE",
            proposedQuantity: parsed.quantity,
            proposedUnit: parsed.unit,
            reason: parsed.reason,
          },
        };
      }

      // High-confidence sale: execute atomic write
      const saleResult = await recordSale(client, context, {
        quantity: parsed.quantity!,
        unit: parsed.unit || "kg",
        rawMessage,
        transactionAt: context.now,
      });

      return {
        action: "CREATE_SALE",
        status: "SUCCESS",
        replyText: formatSaleSuccessResponse(saleResult),
        parsed,
        data: saleResult,
      };
    }

    // ------------------------------------------------------------------------
    // Explicit Confirmation Requirement
    // ------------------------------------------------------------------------
    if (evaluated.action === "ASK_CONFIRMATION") {
      return {
        action: "ASK_CONFIRMATION",
        status: "CONFIRMATION_REQUIRED",
        replyText: formatConfirmationInquiry(parsed),
        parsed,
        data: {
          proposedIntent: parsed.intent,
          proposedQuantity: parsed.quantity,
          proposedUnit: parsed.unit,
          reason: parsed.reason,
        },
      };
    }

    // ------------------------------------------------------------------------
    // Reports
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_REPORT_TODAY") {
      const report = await getSalesReport(client, context, "today");
      return {
        action: "SHOW_REPORT_TODAY",
        status: "SUCCESS",
        replyText: formatReportResponse(report),
        parsed,
        data: report,
      };
    }

    if (evaluated.action === "SHOW_REPORT_WEEK") {
      const report = await getSalesReport(client, context, "week");
      return {
        action: "SHOW_REPORT_WEEK",
        status: "SUCCESS",
        replyText: formatReportResponse(report),
        parsed,
        data: report,
      };
    }

    if (evaluated.action === "SHOW_REPORT_MONTH") {
      const report = await getSalesReport(client, context, "month");
      return {
        action: "SHOW_REPORT_MONTH",
        status: "SUCCESS",
        replyText: formatReportResponse(report),
        parsed,
        data: report,
      };
    }

    // ------------------------------------------------------------------------
    // Daily Status (NO_SALE / CLOSED)
    // ------------------------------------------------------------------------
    if (evaluated.action === "MARK_NO_SALE") {
      const statusResult = await setDailyStatus(client, context, "NO_SALE");
      return {
        action: "MARK_NO_SALE",
        status: "SUCCESS",
        replyText: "Hari ini dicatat tanpa penjualan.",
        parsed,
        data: statusResult,
      };
    }

    if (evaluated.action === "MARK_CLOSED") {
      const statusResult = await setDailyStatus(client, context, "CLOSED");
      return {
        action: "MARK_CLOSED",
        status: "SUCCESS",
        replyText: "Hari ini ditandai sebagai libur/tutup.",
        parsed,
        data: statusResult,
      };
    }

    // ------------------------------------------------------------------------
    // Transaction Modifiers (Cancel / Correct)
    // ------------------------------------------------------------------------
    if (evaluated.action === "REQUEST_CANCEL_LAST") {
      const cancelResult = await cancelLastSale(client, context);
      return {
        action: "REQUEST_CANCEL_LAST",
        status: "SUCCESS",
        replyText: formatCancelSuccessResponse(cancelResult),
        parsed,
        data: cancelResult,
      };
    }

    if (evaluated.action === "REQUEST_CORRECT_LAST") {
      if (!parsed.correctedQuantity) {
        throw new DomainError("INVALID_QUANTITY", "Missing corrected quantity");
      }
      const correctResult = await correctLastSale(
        client,
        context,
        parsed.correctedQuantity,
        rawMessage
      );
      return {
        action: "REQUEST_CORRECT_LAST",
        status: "SUCCESS",
        replyText: formatCorrectSuccessResponse(correctResult),
        parsed,
        data: correctResult,
      };
    }

    // ------------------------------------------------------------------------
    // Informational / Non-mutating (Help / Unknown)
    // ------------------------------------------------------------------------
    return {
      action: evaluated.action,
      status: "SUCCESS",
      replyText: evaluated.replyText,
      parsed,
      data: null,
    };
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return {
        action: evaluated.action,
        status: "ERROR",
        replyText: err.userMessage,
        errorCode: err.code,
        errorMessage: err.message,
        parsed,
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return {
      action: evaluated.action,
      status: "ERROR",
      replyText: "Terjadi kendala saat memproses permintaan. Silakan coba kembali.",
      errorCode: "DATABASE_OPERATION_FAILED",
      errorMessage: msg,
      parsed,
    };
  }
}
