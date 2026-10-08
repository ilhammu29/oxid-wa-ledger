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
  getBusinessTimezone,
} from "../transactions/service";
import {
  getMonthUtcRange,
} from "../transactions/timezone";
import {
  formatSaleSuccess,
  formatDailyReport,
  formatPeriodReport,
  formatHelp,
  formatFriendlyError,
  formatCancelSuccess,
  formatCorrectSuccess,
  formatConfirmationInquiry,
  formatExpenseSuccess,
  formatCapitalSuccess,
  formatPurchaseSuccess,
  formatReceivablePaymentSuccess,
  formatPayablePaymentSuccess,
  formatCashBalance,
  formatProfitLossSummary,
  formatBalanceSheetSummary,
  formatCashFlowSummary,
  formatAmbiguityInquiry,
} from "./response-formatter";
import { formatRupiah } from "../transactions/money";
import {
  canCreateFinancialMutation,
  getBusinessSubscriptionState,
  hasPlanFeature,
  PlanFeature,
} from "../subscriptions";
import {
  postExpenseToAccounting,
  postCapitalMovementToAccounting,
  postPurchaseToAccounting,
  postReceivablePaymentToAccounting,
  postPayablePaymentToAccounting,
  getProfitAndLoss,
  getBalanceSheet,
  getCashFlowStatement,
  getTrialBalance,
} from "../accounting";
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
    // Subscription Gate: Enforce server-side guard on financial mutations
    // ------------------------------------------------------------------------
    const isMutationAction =
      evaluated.action === "CREATE_SALE" ||
      parsed.intent === "SALE" ||
      evaluated.action === "MARK_NO_SALE" ||
      evaluated.action === "MARK_CLOSED" ||
      evaluated.action === "REQUEST_CANCEL_LAST" ||
      evaluated.action === "REQUEST_CORRECT_LAST" ||
      evaluated.action === "RECORD_EXPENSE" ||
      evaluated.action === "RECORD_CAPITAL_IN" ||
      evaluated.action === "RECORD_OWNER_DRAW" ||
      evaluated.action === "RECORD_PURCHASE" ||
      evaluated.action === "RECORD_PAY_RECEIVABLE" ||
      evaluated.action === "RECORD_PAY_PAYABLE";

    if (isMutationAction) {
      const gate = await canCreateFinancialMutation(client, context.businessId);
      if (!gate.allowed) {
        return {
          action: "SHOW_UNKNOWN_HELP",
          status: "ERROR",
          replyText:
            gate.replyText ||
            "Pencatatan transaksi dibatasi karena status langganan bisnis ini sedang tidak aktif atau kedaluwarsa. Silakan periksa menu Langganan di dashboard.",
          errorCode: gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
          parsed,
          data: null,
        };
      }
    }

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
    // Accounting: RECORD_EXPENSE
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_EXPENSE") {
      const amount = parsed.moneyAmount || 0;
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal pengeluaran tidak terdeteksi atau tidak valid.");
      }
      const category = parsed.category || "operasional";
      await postExpenseToAccounting(client, {
        businessId: context.businessId,
        amount,
        category,
        description: rawMessage,
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_EXPENSE",
        status: "SUCCESS",
        replyText: formatExpenseSuccess({ category, amount, description: rawMessage }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Accounting: RECORD_CAPITAL_IN
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_CAPITAL_IN") {
      const amount = parsed.moneyAmount || 0;
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal setoran modal tidak terdeteksi atau tidak valid.");
      }
      await postCapitalMovementToAccounting(client, {
        businessId: context.businessId,
        type: "CAPITAL_IN",
        amount,
        description: rawMessage,
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_CAPITAL_IN",
        status: "SUCCESS",
        replyText: formatCapitalSuccess({ type: "CAPITAL_ADDITION", amount }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Accounting: RECORD_OWNER_DRAW
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_OWNER_DRAW") {
      const amount = parsed.moneyAmount || 0;
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal penarikan prive tidak terdeteksi atau tidak valid.");
      }
      await postCapitalMovementToAccounting(client, {
        businessId: context.businessId,
        type: "OWNER_DRAW",
        amount,
        description: rawMessage,
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_OWNER_DRAW",
        status: "SUCCESS",
        replyText: formatCapitalSuccess({ type: "OWNER_DRAW", amount }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Accounting: RECORD_PURCHASE
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_PURCHASE") {
      const amount = parsed.moneyAmount || 0;
      const quantity = parsed.rawQuantity || (parsed.quantity ? Number(parsed.quantity) : 1);
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal pembelian tidak terdeteksi atau tidak valid.");
      }
      const unitCost = Math.round(amount / (quantity || 1));
      await postPurchaseToAccounting(client, {
        businessId: context.businessId,
        totalAmount: amount,
        quantity,
        unitCost,
        unit: parsed.unit || "kg",
        supplierName: parsed.counterpartyName || "Supplier",
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_PURCHASE",
        status: "SUCCESS",
        replyText: formatPurchaseSuccess({
          amount,
          itemName: parsed.productName || "Persediaan",
          quantity,
          unit: parsed.unit || "kg",
        }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Accounting: RECORD_PAY_RECEIVABLE
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_PAY_RECEIVABLE") {
      const amount = parsed.moneyAmount || 0;
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal pelunasan piutang tidak terdeteksi atau tidak valid.");
      }
      const customer = parsed.counterpartyName || "Pelanggan";
      let targetRecvId: string = "";
      const { data: recvs } = await client
        .from("receivables")
        .select("id, customer_name")
        .eq("business_id", context.businessId)
        .neq("status", "paid")
        .order("created_at", { ascending: false });

      const matchedRecv = (recvs || []).find((r) => r.customer_name?.toLowerCase().includes(customer.toLowerCase()));
      targetRecvId = matchedRecv?.id || recvs?.[0]?.id || "";

      if (!targetRecvId) {
        const { data: newRecv } = await client
          .from("receivables")
          .insert({
            business_id: context.businessId,
            customer_name: customer,
            total_amount: amount,
            paid_amount: 0,
            status: "open",
          })
          .select("id")
          .single();
        targetRecvId = newRecv?.id || "";
      }

      await postReceivablePaymentToAccounting(client, {
        businessId: context.businessId,
        receivableId: targetRecvId,
        amount,
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_PAY_RECEIVABLE",
        status: "SUCCESS",
        replyText: formatReceivablePaymentSuccess({ customerName: customer, amount }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Accounting: RECORD_PAY_PAYABLE
    // ------------------------------------------------------------------------
    if (evaluated.action === "RECORD_PAY_PAYABLE") {
      const amount = parsed.moneyAmount || 0;
      if (amount <= 0) {
        throw new DomainError("INVALID_QUANTITY", "Nominal pembayaran hutang tidak terdeteksi atau tidak valid.");
      }
      const supplier = parsed.counterpartyName || "Supplier";
      let targetPayId: string = "";
      const { data: pays } = await client
        .from("payables")
        .select("id, supplier_name")
        .eq("business_id", context.businessId)
        .neq("status", "paid")
        .order("created_at", { ascending: false });

      const matchedPay = (pays || []).find((p) => p.supplier_name?.toLowerCase().includes(supplier.toLowerCase()));
      targetPayId = matchedPay?.id || pays?.[0]?.id || "";

      if (!targetPayId) {
        const { data: newPay } = await client
          .from("payables")
          .insert({
            business_id: context.businessId,
            supplier_name: supplier,
            total_amount: amount,
            paid_amount: 0,
            status: "open",
          })
          .select("id")
          .single();
        targetPayId = newPay?.id || "";
      }

      await postPayablePaymentToAccounting(client, {
        businessId: context.businessId,
        payableId: targetPayId,
        amount,
        actorUserId: context.authenticatedUserId,
      });
      return {
        action: "RECORD_PAY_PAYABLE",
        status: "SUCCESS",
        replyText: formatPayablePaymentSuccess({ supplierName: supplier, amount }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_CASH_BALANCE
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_CASH_BALANCE") {
      const bs = await getBalanceSheet(client, {
        businessId: context.businessId,
        asOfDate: new Date().toISOString().slice(0, 10),
      });
      const cash = bs.currentAssets.cash;
      const bank = bs.currentAssets.bank;
      return {
        action: "SHOW_CASH_BALANCE",
        status: "SUCCESS",
        replyText: formatCashBalance({ cash, bank, totalLiquidity: cash + bank }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Plan Entitlement Guard for Pro Accounting Reports
    // ------------------------------------------------------------------------
    const PRO_ACCOUNTING_INTENTS: Record<string, { feature: PlanFeature; label: string }> = {
      SHOW_PROFIT_LOSS: { feature: "profit_loss", label: "Laporan Laba Rugi" },
      SHOW_BALANCE_SHEET: { feature: "balance_sheet", label: "Laporan Neraca" },
      SHOW_CASH_FLOW: { feature: "cash_flow", label: "Laporan Arus Kas" },
      SHOW_TRIAL_BALANCE: { feature: "trial_balance", label: "Neraca Saldo" },
      SHOW_GENERAL_LEDGER: { feature: "general_ledger", label: "Buku Besar" },
      EXECUTE_EXPORT_REPORT: { feature: "accounting_excel", label: "Ekspor Excel 14 Sheet" },
    };

    if (evaluated.action in PRO_ACCOUNTING_INTENTS) {
      const guard = PRO_ACCOUNTING_INTENTS[evaluated.action];
      const subState = await getBusinessSubscriptionState(client, context.businessId);
      if (!hasPlanFeature(subState.plan.code, guard.feature)) {
        return {
          action: evaluated.action,
          status: "SUCCESS",
          replyText:
            `🔒 Fitur ${guard.label} adalah bagian dari Paket Pro.\n\n` +
            `Paket Basic Anda saat ini fokus pada pencatatan transaksi & sync Google Sheets.\n\n` +
            `Untuk membuka Laporan Akuntansi lengkap (Laba Rugi, Neraca, Arus Kas, Buku Besar, dan Ekspor Excel 14 Sheet), silakan upgrade ke Paket Pro di web dashboard:\n` +
            `👉 https://oxid-wa-ledger.vercel.app/dashboard/subscription`,
          parsed,
          data: null,
        };
      }
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_PROFIT_LOSS
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_PROFIT_LOSS") {
      const timezone = await getBusinessTimezone(client, context.businessId);
      const refDate = context.now || new Date();
      const range = getMonthUtcRange(refDate, timezone);
      const pnl = await getProfitAndLoss(client, {
        businessId: context.businessId,
        startDate: range.startAt.toISOString().slice(0, 10),
        endDate: range.endAt.toISOString().slice(0, 10),
      });
      return {
        action: "SHOW_PROFIT_LOSS",
        status: "SUCCESS",
        replyText: formatProfitLossSummary({
          revenue: pnl.netRevenue,
          cogs: pnl.cogs,
          grossProfit: pnl.grossProfit,
          expenses: pnl.totalOperatingExpenses,
          netProfit: pnl.netProfit,
          periodLabel: "Bulan Ini",
        }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_BALANCE_SHEET
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_BALANCE_SHEET") {
      const bs = await getBalanceSheet(client, {
        businessId: context.businessId,
        asOfDate: new Date().toISOString().slice(0, 10),
      });
      return {
        action: "SHOW_BALANCE_SHEET",
        status: "SUCCESS",
        replyText: formatBalanceSheetSummary({
          assets: bs.totalAssets,
          liabilities: bs.totalLiabilities,
          equity: bs.equity.totalEquity,
          isBalanced: bs.isBalanced,
        }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_CASH_FLOW
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_CASH_FLOW") {
      const timezone = await getBusinessTimezone(client, context.businessId);
      const refDate = context.now || new Date();
      const range = getMonthUtcRange(refDate, timezone);
      const cf = await getCashFlowStatement(client, {
        businessId: context.businessId,
        startDate: range.startAt.toISOString().slice(0, 10),
        endDate: range.endAt.toISOString().slice(0, 10),
      });
      return {
        action: "SHOW_CASH_FLOW",
        status: "SUCCESS",
        replyText: formatCashFlowSummary({
          operatingCashFlow: cf.netOperatingCashFlow,
          investingCashFlow: cf.netInvestingCashFlow,
          financingCashFlow: cf.netFinancingCashFlow,
          netChange: cf.netCashChange,
          endingCash: cf.endingCashAndBank,
        }),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_TRIAL_BALANCE
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_TRIAL_BALANCE") {
      const tb = await getTrialBalance(client, {
        businessId: context.businessId,
        asOfDate: new Date().toISOString().slice(0, 10),
      });
      const statusIcon = tb.isBalanced ? "✅ Seimbang" : "⚠️ Tidak Seimbang";
      return {
        action: "SHOW_TRIAL_BALANCE",
        status: "SUCCESS",
        replyText:
          `⚖️ Neraca Saldo (Bulan Ini)\n\n` +
          `Total Debit: ${formatRupiah(tb.totalDebit)}\n` +
          `Total Kredit: ${formatRupiah(tb.totalCredit)}\n` +
          `Status: ${statusIcon}\n` +
          `Akun Terlibat: ${tb.items.length}`,
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Reports: SHOW_GENERAL_LEDGER
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_GENERAL_LEDGER") {
      return {
        action: "SHOW_GENERAL_LEDGER",
        status: "SUCCESS",
        replyText: "Buku besar dapat diakses secara detail melalui Web Dashboard menu Pembukuan / Buku Besar atau via Export Excel.",
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Status Checks: Inventory / Receivables / Payables
    // ------------------------------------------------------------------------
    if (evaluated.action === "SHOW_INVENTORY_STATUS") {
      const [prodsRes, movesRes] = await Promise.all([
        client
          .from("products")
          .select("id, name, unit, unit_cost")
          .eq("business_id", context.businessId),
        client
          .from("inventory_movements")
          .select("product_id, quantity")
          .eq("business_id", context.businessId),
      ]);
      const stockMap = new Map<string, number>();
      (movesRes.data || []).forEach((m: { product_id: string; quantity: number | string }) => {
        stockMap.set(m.product_id, (stockMap.get(m.product_id) || 0) + Number(m.quantity));
      });
      const lines = (prodsRes.data || []).map(
        (p: { id: string; name: string; unit?: string | null }) =>
          `• ${p.name}: ${stockMap.get(p.id) ?? 0} ${p.unit || "kg"}`
      );
      return {
        action: "SHOW_INVENTORY_STATUS",
        status: "SUCCESS",
        replyText: `📦 Status Stok Persediaan:\n\n${lines.length > 0 ? lines.join("\n") : "Belum ada produk aktif."}`,
        parsed,
        data: null,
      };
    }

    if (evaluated.action === "SHOW_RECEIVABLE_STATUS") {
      const { data: recvData } = await client
        .from("receivables")
        .select("customer_name, total_amount, paid_amount, status")
        .eq("business_id", context.businessId)
        .in("status", ["unpaid", "partially_paid"]);
      const lines = (recvData || []).map(
        (r: { customer_name: string; total_amount: number | string; paid_amount: number | string }) => `• ${r.customer_name}: sisa ${formatRupiah(Number(r.total_amount) - Number(r.paid_amount))}`
      );
      return {
        action: "SHOW_RECEIVABLE_STATUS",
        status: "SUCCESS",
        replyText: `📋 Daftar Piutang Belum Lunas:\n\n${lines.length > 0 ? lines.join("\n") : "Tidak ada piutang outstanding."}`,
        parsed,
        data: null,
      };
    }

    if (evaluated.action === "SHOW_PAYABLE_STATUS") {
      const { data: payData } = await client
        .from("payables")
        .select("supplier_name, total_amount, paid_amount, status")
        .eq("business_id", context.businessId)
        .in("status", ["unpaid", "partially_paid"]);
      const lines = (payData || []).map(
        (p: { supplier_name: string; total_amount: number | string; paid_amount: number | string }) => `• ${p.supplier_name}: sisa ${formatRupiah(Number(p.total_amount) - Number(p.paid_amount))}`
      );
      return {
        action: "SHOW_PAYABLE_STATUS",
        status: "SUCCESS",
        replyText: `📋 Daftar Hutang Belum Lunas:\n\n${lines.length > 0 ? lines.join("\n") : "Tidak ada hutang outstanding."}`,
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Financial Ambiguity Clarification
    // ------------------------------------------------------------------------
    if (evaluated.action === "ASK_AMBIGUITY_CLARIFICATION") {
      return {
        action: "ASK_AMBIGUITY_CLARIFICATION",
        status: "CONFIRMATION_REQUIRED",
        replyText: formatAmbiguityInquiry(parsed),
        parsed,
        data: null,
      };
    }

    // ------------------------------------------------------------------------
    // Export Report Command
    // ------------------------------------------------------------------------
    if (evaluated.action === "EXECUTE_EXPORT_REPORT") {
      return {
        action: "EXECUTE_EXPORT_REPORT",
        status: "SUCCESS",
        replyText: "📄 Menyiapkan berkas Excel laporan pembukuan lengkap...",
        parsed,
        data: null,
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
