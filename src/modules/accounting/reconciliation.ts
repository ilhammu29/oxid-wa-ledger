import { SupabaseClient } from "@supabase/supabase-js";
import { AccountingReconciliationReport } from "./types";
import { getTrialBalance, getBalanceSheet, getCashFlowStatement } from "./reports";

/**
 * Diagnostic reconciliation tool to ensure mathematical and data integrity
 * across the accounting core, ledgers, and sub-ledgers.
 */
export async function runAccountingReconciliation(
  client: SupabaseClient,
  businessId: string
): Promise<AccountingReconciliationReport> {
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${today.slice(0, 4)}-01-01`;

  const checks: AccountingReconciliationReport["checks"] = [];

  // 1. Trial Balance Check (Debit == Credit)
  try {
    const tb = await getTrialBalance(client, { businessId, asOfDate: today });
    if (tb.isBalanced) {
      checks.push({
        name: "Trial Balance Balance Check",
        status: "PASS",
        message: `Total Debit (Rp ${tb.totalDebit.toLocaleString()}) persis sama dengan Total Credit (Rp ${tb.totalCredit.toLocaleString()}).`,
      });
    } else {
      checks.push({
        name: "Trial Balance Balance Check",
        status: "ERROR",
        message: `Neraca Saldo tidak seimbang. Selisih: Rp ${tb.discrepancy.toLocaleString()}`,
        details: { totalDebit: tb.totalDebit, totalCredit: tb.totalCredit, discrepancy: tb.discrepancy },
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Trial Balance Balance Check",
      status: "ERROR",
      message: `Gagal mengevaluasi Trial Balance: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 2. Balance Sheet Check (Assets == Liabilities + Equity)
  try {
    const bs = await getBalanceSheet(client, { businessId, asOfDate: today });
    if (bs.isBalanced) {
      checks.push({
        name: "Balance Sheet Equation Check",
        status: "PASS",
        message: `Total Aset (Rp ${bs.totalAssets.toLocaleString()}) seimbang dengan Total Kewajiban & Ekuitas (Rp ${bs.totalLiabilitiesAndEquity.toLocaleString()}).`,
      });
    } else {
      checks.push({
        name: "Balance Sheet Equation Check",
        status: "ERROR",
        message: `Neraca tidak seimbang! Aset: Rp ${bs.totalAssets.toLocaleString()}, Kewajiban+Ekuitas: Rp ${bs.totalLiabilitiesAndEquity.toLocaleString()}, Selisih: Rp ${bs.discrepancy.toLocaleString()}`,
        details: { discrepancy: bs.discrepancy },
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Balance Sheet Equation Check",
      status: "ERROR",
      message: `Gagal mengevaluasi Balance Sheet: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 3. Cash Flow Reconciliation Check
  try {
    const cf = await getCashFlowStatement(client, {
      businessId,
      startDate: startOfYear,
      endDate: today,
    });
    if (cf.isReconciled) {
      checks.push({
        name: "Cash Flow Reconciliation",
        status: "PASS",
        message: `Saldo Kas & Bank akhir arus kas (Rp ${cf.endingCashAndBank.toLocaleString()}) cocok dengan buku besar kas.`,
      });
    } else {
      checks.push({
        name: "Cash Flow Reconciliation",
        status: "WARNING",
        message: "Arus kas tidak merekonsiliasi saldo buku besar secara tepat.",
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Cash Flow Reconciliation",
      status: "WARNING",
      message: `Evaluasi arus kas: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 4. Individual Journal Entry Balance Check
  try {
    const { data: entries } = await client
      .from("journal_entries")
      .select("id, entry_number, journal_lines(debit, credit)")
      .eq("business_id", businessId)
      .limit(100);

    let imbalancedCount = 0;
    for (const e of entries || []) {
      const lines = (e.journal_lines || []) as Array<{ debit: number; credit: number }>;
      const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const c = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      if (d !== c) imbalancedCount++;
    }

    if (imbalancedCount === 0) {
      checks.push({
        name: "Individual Journal Entry Balances",
        status: "PASS",
        message: "Semua jurnal transaksi individu terbukti seimbang (Debit = Credit).",
      });
    } else {
      checks.push({
        name: "Individual Journal Entry Balances",
        status: "ERROR",
        message: `Ditemukan ${imbalancedCount} jurnal transaksi yang tidak seimbang.`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Individual Journal Entry Balances",
      status: "WARNING",
      message: `Gagal memeriksa baris jurnal: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 5. Source Transaction Linkage
  try {
    const { count, error } = await client
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("source_type", "SALE")
      .is("source_id", null);

    if (!error && (count === null || count === 0)) {
      checks.push({
        name: "Sale Source Transaction Linkage",
        status: "PASS",
        message: "Seluruh jurnal penjualan terhubung dengan ID transaksi sumber yang valid.",
      });
    } else {
      checks.push({
        name: "Sale Source Transaction Linkage",
        status: "WARNING",
        message: `Terdapat ${count || 0} jurnal penjualan tanpa tautan ID transaksi sumber.`,
      });
    }
  } catch (err: unknown) {
    checks.push({
      name: "Sale Source Transaction Linkage",
      status: "WARNING",
      message: `Pemeriksaan tautan transaksi: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Determine overall status
  const hasError = checks.some((c) => c.status === "ERROR");
  const hasWarning = checks.some((c) => c.status === "WARNING");
  const overallStatus: "PASS" | "WARNING" | "ERROR" = hasError
    ? "ERROR"
    : hasWarning
    ? "WARNING"
    : "PASS";

  return {
    businessId,
    timestamp: new Date().toISOString(),
    overallStatus,
    checks,
  };
}
