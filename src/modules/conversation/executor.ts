/**
 * Conversation Action Executor for OXID WA Ledger.
 * Step 6C: Coordinates intent decisions, dynamic tenant product resolution,
 * and atomic database execution with standardized Indonesian conversational copy.
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
  formatSaleSuccess,
  formatDailyReport,
  formatPeriodReport,
  formatHelp,
  formatFriendlyError,
  formatCancelSuccess,
  formatCorrectSuccess,
  formatConfirmationInquiry,
} from "./response-formatter";
import { resolveProductForSale, getActiveProductNames } from "../products";

/**
 * Safely fetches breakdown of today's sales by product in a single query.
 */
async function getSalesBreakdownByProduct(
  client: SupabaseClient,
  businessId: string,
  startAt: string,
  endAt: string
): Promise<Array<{ productName: string; quantity: number; unit: string }>> {
  try {
    const { data: txData, error: txErr } = await client
      .from("transactions")
      .select("quantity, unit, product_id")
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .gte("transaction_at", startAt)
      .lte("transaction_at", endAt);

    if (txErr || !txData || txData.length === 0) return [];

    const { data: prodData } = await client
      .from("products")
      .select("id, name")
      .eq("business_id", businessId);

    const nameMap = new Map<string, string>();
    (prodData || []).forEach((p: { id: string; name: string }) => nameMap.set(p.id, p.name));

    const map = new Map<string, { productName: string; quantity: number; unit: string }>();
    for (const row of txData as Array<{ quantity: number | string; unit?: string | null; product_id?: string | null }>) {
      const prodName = (row.product_id && nameMap.get(row.product_id)) || "Lainnya";
      const existing = map.get(prodName) || {
        productName: prodName,
        quantity: 0,
        unit: row.unit || "kg",
      };
      existing.quantity += Number(row.quantity);
      map.set(prodName, existing);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

/**
 * Executes a conversational command against business domain services.
 *
 * CRITICAL SAFETY INVARIANTS:
 * - Ambiguous sales, low/medium confidence messages, or multi-quantity messages
 *   are strictly BLOCKED from performing financial writes.
 * - Multi-product messages ("lele 10kg dan nila 5kg") are strictly BLOCKED from writes.
 * - Explicit unknown products ("Kejual mujair 10kg") NEVER silently fall back to default product.
 * - Product prices come strictly from database configuration.
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
      replyText: formatFriendlyError("UNAUTHORIZED"),
      errorCode: "UNAUTHORIZED",
      errorMessage: "Missing businessId in execution context",
      parsed: parseMessage(rawMessage),
    };
  }

  const parsed = parseMessage(rawMessage);
  const evaluated = evaluateConversationAction(parsed);

  try {
    // ------------------------------------------------------------------------
    // Intent: SALE Execution with Dynamic Product Resolution
    // ------------------------------------------------------------------------
    if (evaluated.action === "CREATE_SALE" || parsed.intent === "SALE") {
      // 1. Dynamic Product Resolution (Section 1, 5, 6, 7, 9)
      const resolution = await resolveProductForSale(
        client,
        context.businessId,
        rawMessage
      );

      // Handle Multi-Product Rejection (Section 9) before generic confirmation inquiry!
      if (resolution.status === "MULTI_PRODUCT_DETECTED") {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText: resolution.replyText!,
          errorCode: "MULTI_PRODUCT_DETECTED",
          parsed,
          data: null,
        };
      }

      // 2. Ambiguous Quantity or Low Confidence Protection
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

      // Handle Other Non-Resolvable Product Cases (ZERO financial writes)
      if (resolution.status === "AMBIGUOUS_PRODUCT") {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText: resolution.replyText!,
          errorCode: "AMBIGUOUS_PRODUCT",
          parsed,
          data: null,
        };
      }

      if (resolution.status === "UNKNOWN_PRODUCT") {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText: resolution.replyText!,
          errorCode: "UNKNOWN_PRODUCT",
          parsed,
          data: null,
        };
      }

      if (resolution.status === "NO_DEFAULT_CONFIGURED") {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText: resolution.replyText!,
          errorCode: "DEFAULT_PRODUCT_NOT_CONFIGURED",
          parsed,
          data: null,
        };
      }

      if (resolution.status === "NO_ACTIVE_PRODUCTS") {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText: resolution.replyText!,
          errorCode: "NO_ACTIVE_PRODUCTS",
          parsed,
          data: null,
        };
      }

      // 3. Product Resolved (Single active product or authorized default fallback)
      const isDefaultUsed = resolution.status === "DEFAULT_USED";
      const resolvedProductId = resolution.product?.id || null;

      const saleResult = await recordSale(client, context, {
        quantity: parsed.quantity!,
        unit: parsed.unit || "kg",
        rawMessage,
        productId: resolvedProductId,
        transactionAt: context.now,
      });

      const replyText = formatSaleSuccess({
        product: {
          name: saleResult.productName,
          unitPrice: saleResult.unitPrice,
          unit: saleResult.unit,
          isDefaultUsed,
        },
        quantity: saleResult.quantity,
        totalAmount: saleResult.totalAmount,
        todaySummary: {
          totalRevenue: saleResult.todaySummary.totalRevenue,
          totalQuantity: saleResult.todaySummary.totalQuantity,
          transactionCount: saleResult.todaySummary.transactionCount,
        },
      });

      return {
        action: "CREATE_SALE",
        status: "SUCCESS",
        replyText,
        parsed: {
          ...parsed,
          productId: saleResult.productId,
          productName: saleResult.productName,
          isDefaultProductUsed: isDefaultUsed,
        },
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
    // Reports (Today, Week, Month)
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_REPORT_TODAY") {
      const report = await getSalesReport(client, context, "today");
      const breakdown = await getSalesBreakdownByProduct(
        client,
        context.businessId,
        report.startAt,
        report.endAt
      );
      return {
        action: "SHOW_REPORT_TODAY",
        status: "SUCCESS",
        replyText: formatDailyReport(report, breakdown),
        parsed,
        data: report,
      };
    }

    if (evaluated.action === "SHOW_REPORT_WEEK") {
      const report = await getSalesReport(client, context, "week");
      return {
        action: "SHOW_REPORT_WEEK",
        status: "SUCCESS",
        replyText: formatPeriodReport("week", report),
        parsed,
        data: report,
      };
    }

    if (evaluated.action === "SHOW_REPORT_MONTH") {
      const report = await getSalesReport(client, context, "month");
      return {
        action: "SHOW_REPORT_MONTH",
        status: "SUCCESS",
        replyText: formatPeriodReport("month", report),
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
        replyText: formatCancelSuccess(cancelResult),
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
        replyText: formatCorrectSuccess(correctResult),
        parsed,
        data: correctResult,
      };
    }

    // ------------------------------------------------------------------------
    // Help Command
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_HELP") {
      const activeProducts = await getActiveProductNames(client, context.businessId);
      return {
        action: "SHOW_HELP",
        status: "SUCCESS",
        replyText: formatHelp(activeProducts),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Unknown Command
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
        replyText: formatFriendlyError(err.code, err.userMessage),
        errorCode: err.code,
        errorMessage: err.message,
        parsed,
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return {
      action: evaluated.action,
      status: "ERROR",
      replyText: formatFriendlyError("DATABASE_OPERATION_FAILED"),
      errorCode: "DATABASE_OPERATION_FAILED",
      errorMessage: msg,
      parsed,
    };
  }
}
