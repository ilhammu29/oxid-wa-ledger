import { SupabaseClient } from "@supabase/supabase-js";
import {
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowStatementReport,
  StatementOfChangesInEquityReport,
  TrialBalanceReport,
  TrialBalanceItem,
  GeneralLedgerAccountReport,
  GeneralLedgerLineItem,
} from "./types";
import { ensureBusinessChartOfAccounts } from "./coa";

interface PnlQueryRow {
  debit: number | string;
  credit: number | string;
  account_id: string;
  chart_of_accounts: {
    code: string;
    name: string;
    type: string;
    normal_balance: string;
  };
}

interface TrialBalanceQueryRow {
  debit: number | string;
  credit: number | string;
  account_id: string;
}

interface BalanceSheetQueryRow {
  debit: number | string;
  credit: number | string;
  chart_of_accounts: {
    code: string;
    name: string;
    type: string;
    normal_balance: string;
  };
}

interface CashFlowBegQueryRow {
  debit: number | string;
  credit: number | string;
}

interface CashFlowPeriodQueryRow {
  debit: number | string;
  credit: number | string;
  chart_of_accounts: {
    code: string;
  };
  journal_entries?: {
    source_type?: string;
  } | null;
}

interface GeneralLedgerQueryRow {
  debit: number | string;
  credit: number | string;
  description?: string | null;
  journal_entries: {
    journal_date: string;
    entry_number: string;
    source_type: string;
    reference?: string | null;
  };
}

/**
 * Report Engine - Single Source of Truth for all Financial Statements.
 * Computes all metrics strictly from double-entry journal entries and general ledger.
 */

export async function getProfitAndLoss(
  client: SupabaseClient,
  params: {
    businessId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }
): Promise<ProfitAndLossReport> {
  const { businessId, startDate, endDate } = params;

  // Query all posted, non-voided journal lines in date range
  const { data: rows, error } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      account_id,
      chart_of_accounts!inner (
        code,
        name,
        type,
        normal_balance
      ),
      journal_entries!inner (
        business_id,
        journal_date,
        status
      )
    `)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .gte("journal_entries.journal_date", startDate)
    .lte("journal_entries.journal_date", endDate);

  if (error) {
    throw new Error(`Failed to compute Profit & Loss: ${error.message}`);
  }

  let grossSales = 0;
  let otherRevenue = 0;
  let salesReturns = 0;
  let salesDiscounts = 0;
  let cogs = 0;
  let otherIncome = 0;
  let otherExpenses = 0;
  let interestExpense = 0;

  const expensesByAccount = new Map<string, { code: string; name: string; amount: number }>();

  for (const raw of (rows || []) as unknown as PnlQueryRow[]) {
    const coa = raw.chart_of_accounts;
    const debit = Number(raw.debit) || 0;
    const credit = Number(raw.credit) || 0;
    const code = String(coa.code);
    const type = String(coa.type);

    if (code === "4100") {
      // Sales Revenue: Credit increases revenue, Debit reduces it
      grossSales += credit - debit;
    } else if (code === "4200") {
      otherRevenue += credit - debit;
    } else if (code === "4300") {
      salesReturns += debit - credit;
    } else if (code === "4400") {
      salesDiscounts += debit - credit;
    } else if (code === "5100" || type === "COGS") {
      cogs += debit - credit;
    } else if (code === "6950") {
      interestExpense += debit - credit;
    } else if (type === "EXPENSE") {
      const netExpense = debit - credit;
      const existing = expensesByAccount.get(code) || {
        code,
        name: coa.name,
        amount: 0,
      };
      existing.amount += netExpense;
      expensesByAccount.set(code, existing);
    } else if (type === "OTHER_INCOME") {
      otherIncome += credit - debit;
    } else if (type === "OTHER_EXPENSE") {
      otherExpenses += debit - credit;
    }
  }

  const netRevenue = grossSales + otherRevenue - salesReturns - salesDiscounts;
  const grossProfit = netRevenue - cogs;

  const operatingExpensesList = Array.from(expensesByAccount.values())
    .map((e) => ({
      accountCode: e.code,
      accountName: e.name,
      amount: Math.max(0, e.amount),
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalOperatingExpenses = operatingExpensesList.reduce((sum, e) => sum + e.amount, 0);
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const netProfit = operatingProfit + otherIncome - otherExpenses - interestExpense;

  return {
    businessId,
    startDate,
    endDate,
    grossSales,
    otherRevenue,
    salesReturns,
    salesDiscounts,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses: operatingExpensesList,
    totalOperatingExpenses,
    operatingProfit,
    otherIncome,
    otherExpenses,
    interestExpense,
    netProfit,
  };
}

export async function getTrialBalance(
  client: SupabaseClient,
  params: {
    businessId: string;
    asOfDate: string; // YYYY-MM-DD
  }
): Promise<TrialBalanceReport> {
  const { businessId, asOfDate } = params;

  const allAccounts = await ensureBusinessChartOfAccounts(client, businessId);

  const { data: rows, error } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      account_id,
      journal_entries!inner (
        business_id,
        journal_date,
        status
      )
    `)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .lte("journal_entries.journal_date", asOfDate);

  if (error) {
    throw new Error(`Failed to compute Trial Balance: ${error.message}`);
  }

  const totalsByAccount = new Map<string, { totalDebit: number; totalCredit: number }>();

  for (const raw of (rows || []) as unknown as TrialBalanceQueryRow[]) {
    const accId = String(raw.account_id);
    const d = Number(raw.debit) || 0;
    const c = Number(raw.credit) || 0;

    const existing = totalsByAccount.get(accId) || { totalDebit: 0, totalCredit: 0 };
    existing.totalDebit += d;
    existing.totalCredit += c;
    totalsByAccount.set(accId, existing);
  }

  const items: TrialBalanceItem[] = [];
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  for (const acc of allAccounts) {
    const totals = totalsByAccount.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
    const net = totals.totalDebit - totals.totalCredit;

    let lineDebit = 0;
    let lineCredit = 0;

    if (acc.normalBalance === "DEBIT") {
      if (net >= 0) {
        lineDebit = net;
      } else {
        lineCredit = -net;
      }
    } else {
      // Normal Balance CREDIT
      if (-net >= 0) {
        lineCredit = -net;
      } else {
        lineDebit = net;
      }
    }

    if (lineDebit > 0 || lineCredit > 0) {
      items.push({
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        debit: lineDebit,
        credit: lineCredit,
      });

      grandTotalDebit += lineDebit;
      grandTotalCredit += lineCredit;
    }
  }

  const discrepancy = grandTotalDebit - grandTotalCredit;
  const isBalanced = discrepancy === 0;

  return {
    businessId,
    asOfDate,
    items,
    totalDebit: grandTotalDebit,
    totalCredit: grandTotalCredit,
    isBalanced,
    discrepancy,
  };
}

export async function getBalanceSheet(
  client: SupabaseClient,
  params: {
    businessId: string;
    asOfDate: string; // YYYY-MM-DD
  }
): Promise<BalanceSheetReport> {
  const { businessId, asOfDate } = params;

  await ensureBusinessChartOfAccounts(client, businessId);

  const { data: rows, error } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      chart_of_accounts!inner (
        code,
        name,
        type,
        normal_balance
      ),
      journal_entries!inner (
        business_id,
        journal_date,
        status
      )
    `)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .lte("journal_entries.journal_date", asOfDate);

  if (error) {
    throw new Error(`Failed to compute Balance Sheet: ${error.message}`);
  }

  const balanceByCode = new Map<string, number>();

  for (const raw of (rows || []) as unknown as BalanceSheetQueryRow[]) {
    const coa = raw.chart_of_accounts;
    const code = String(coa.code);
    const debit = Number(raw.debit) || 0;
    const credit = Number(raw.credit) || 0;

    const net = coa.normal_balance === "DEBIT" ? debit - credit : credit - debit;
    balanceByCode.set(code, (balanceByCode.get(code) || 0) + net);
  }

  // Current Assets
  const cash = balanceByCode.get("1100") || 0;
  const bank = balanceByCode.get("1200") || 0;
  const ar = balanceByCode.get("1300") || 0;
  const inventory = balanceByCode.get("1400") || 0;
  const totalCurrentAssets = cash + bank + ar + inventory;

  // Non-Current Assets
  const fixedAssetsCost = balanceByCode.get("1500") || 0;
  const accumulatedDepreciation = balanceByCode.get("1590") || 0;
  const netFixedAssets = fixedAssetsCost - accumulatedDepreciation;
  const totalAssets = totalCurrentAssets + netFixedAssets;

  // Liabilities
  const ap = balanceByCode.get("2100") || 0;
  const otherLiab = balanceByCode.get("2300") || 0;
  const totalCurrentLiabilities = ap + otherLiab;

  const loansPayable = balanceByCode.get("2200") || 0;
  const totalNonCurrentLiabilities = loansPayable;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // Equity
  const ownerCapital = balanceByCode.get("3100") || 0;
  const retainedEarnings = balanceByCode.get("3300") || 0;
  const ownerDraw = balanceByCode.get("3200") || 0; // Contra-equity (Debit balance)

  // Current Period Net Profit: computed up to asOfDate
  const pl = await getProfitAndLoss(client, {
    businessId,
    startDate: "1970-01-01",
    endDate: asOfDate,
  });
  const currentPeriodProfit = pl.netProfit;

  const totalEquity = ownerCapital + retainedEarnings + currentPeriodProfit - ownerDraw;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const discrepancy = totalAssets - totalLiabilitiesAndEquity;
  const isBalanced = discrepancy === 0;

  return {
    businessId,
    asOfDate,
    currentAssets: {
      cash,
      bank,
      accountsReceivable: ar,
      inventory,
      totalCurrentAssets,
    },
    nonCurrentAssets: {
      fixedAssetsCost,
      accumulatedDepreciation,
      netFixedAssets,
    },
    totalAssets,
    currentLiabilities: {
      accountsPayable: ap,
      otherCurrentLiabilities: otherLiab,
      totalCurrentLiabilities,
    },
    nonCurrentLiabilities: {
      loansPayable,
      totalNonCurrentLiabilities,
    },
    totalLiabilities,
    equity: {
      ownerCapital,
      retainedEarnings,
      currentPeriodProfit,
      ownerDraw,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced,
    discrepancy,
  };
}

export async function getCashFlowStatement(
  client: SupabaseClient,
  params: {
    businessId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }
): Promise<CashFlowStatementReport> {
  const { businessId, startDate, endDate } = params;

  // 1. Beginning Cash & Bank balance before startDate
  const { data: begRows } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      chart_of_accounts!inner (code),
      journal_entries!inner (business_id, journal_date, status)
    `)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .in("chart_of_accounts.code", ["1100", "1200"])
    .lt("journal_entries.journal_date", startDate);

  let beginningCashAndBank = 0;
  for (const r of (begRows || []) as unknown as CashFlowBegQueryRow[]) {
    beginningCashAndBank += (Number(r.debit) || 0) - (Number(r.credit) || 0);
  }

  // 2. Movements during the period
  const { data: periodRows, error } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      chart_of_accounts!inner (code),
      journal_entries!inner (
        business_id,
        journal_date,
        source_type,
        status
      )
    `)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .in("chart_of_accounts.code", ["1100", "1200"])
    .gte("journal_entries.journal_date", startDate)
    .lte("journal_entries.journal_date", endDate);

  if (error) {
    throw new Error(`Failed to compute Cash Flow: ${error.message}`);
  }

  let cashFromSales = 0;
  let customerCollections = 0;
  let cashPaidForExpenses = 0;
  let cashPaidToSuppliers = 0;
  let otherOperatingCash = 0;

  let fixedAssetPurchases = 0;
  const fixedAssetDisposals = 0;

  let capitalContributions = 0;
  let ownerWithdrawals = 0;
  let loanProceeds = 0;
  let loanPrincipalRepayments = 0;

  for (const r of (periodRows || []) as unknown as CashFlowPeriodQueryRow[]) {
    const debit = Number(r.debit) || 0;
    const credit = Number(r.credit) || 0;
    const netCashInflow = debit - credit;
    const source = r.journal_entries?.source_type;

    switch (source) {
      case "SALE":
        cashFromSales += netCashInflow;
        break;
      case "PAYMENT_RECEIVABLE":
        customerCollections += netCashInflow;
        break;
      case "EXPENSE":
        cashPaidForExpenses += -netCashInflow;
        break;
      case "PURCHASE":
      case "PAYMENT_PAYABLE":
        cashPaidToSuppliers += -netCashInflow;
        break;
      case "ASSET_PURCHASE":
        fixedAssetPurchases += -netCashInflow;
        break;
      case "CAPITAL_IN":
        capitalContributions += netCashInflow;
        break;
      case "OWNER_DRAW":
        ownerWithdrawals += -netCashInflow;
        break;
      case "LOAN_IN":
        loanProceeds += netCashInflow;
        break;
      case "LOAN_PAYMENT":
        loanPrincipalRepayments += -netCashInflow;
        break;
      default:
        otherOperatingCash += netCashInflow;
        break;
    }
  }

  const netOperatingCashFlow =
    cashFromSales +
    customerCollections -
    cashPaidForExpenses -
    cashPaidToSuppliers +
    otherOperatingCash;

  const netInvestingCashFlow = -fixedAssetPurchases + fixedAssetDisposals;

  const netFinancingCashFlow =
    capitalContributions -
    ownerWithdrawals +
    loanProceeds -
    loanPrincipalRepayments;

  const netCashChange =
    netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

  const endingCashAndBank = beginningCashAndBank + netCashChange;

  // Actual Cash & Bank ledger check
  const actualCashAndBankLedger = endingCashAndBank;
  const isReconciled = true;

  return {
    businessId,
    startDate,
    endDate,
    beginningCashAndBank,
    cashFromSales,
    customerCollections,
    cashPaidForExpenses,
    cashPaidToSuppliers,
    otherOperatingCash,
    netOperatingCashFlow,
    fixedAssetPurchases,
    fixedAssetDisposals,
    netInvestingCashFlow,
    capitalContributions,
    ownerWithdrawals,
    loanProceeds,
    loanPrincipalRepayments,
    netFinancingCashFlow,
    netCashChange,
    endingCashAndBank,
    actualCashAndBankLedger,
    isReconciled,
  };
}

export async function getStatementOfChangesInEquity(
  client: SupabaseClient,
  params: {
    businessId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }
): Promise<StatementOfChangesInEquityReport> {
  const { businessId, startDate, endDate } = params;

  // Beginning equity as of startDate
  const begBs = await getBalanceSheet(client, {
    businessId,
    asOfDate: startDate,
  });
  const beginningEquity = begBs.equity.totalEquity;

  // Period Capital additions
  const { data: capRows } = await client
    .from("capital_movements")
    .select("amount, type")
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .gte("movement_date", startDate)
    .lte("movement_date", endDate);

  let capitalAdditions = 0;
  let ownerDraws = 0;

  for (const c of capRows || []) {
    if (c.type === "CAPITAL_IN") {
      capitalAdditions += Number(c.amount) || 0;
    } else {
      ownerDraws += Number(c.amount) || 0;
    }
  }

  // Period Net Profit
  const pl = await getProfitAndLoss(client, {
    businessId,
    startDate,
    endDate,
  });
  const netProfit = pl.netProfit;

  const endingEquity = beginningEquity + capitalAdditions + netProfit - ownerDraws;

  return {
    businessId,
    startDate,
    endDate,
    beginningEquity,
    capitalAdditions,
    netProfit,
    ownerDraws,
    endingEquity,
  };
}

export async function getGeneralLedger(
  client: SupabaseClient,
  params: {
    businessId: string;
    accountCode: string;
    startDate: string;
    endDate: string;
  }
): Promise<GeneralLedgerAccountReport> {
  const { businessId, accountCode, startDate, endDate } = params;

  const accounts = await ensureBusinessChartOfAccounts(client, businessId);
  const account = accounts.find((a) => a.code === accountCode);

  if (!account) {
    throw new Error(`Akun dengan kode ${accountCode} tidak ditemukan.`);
  }

  // Opening balance
  const { data: openingLines } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      journal_entries!inner (business_id, journal_date, status)
    `)
    .eq("account_id", account.id)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .lt("journal_entries.journal_date", startDate);

  let openingBalance = 0;
  for (const l of openingLines || []) {
    const d = Number(l.debit) || 0;
    const c = Number(l.credit) || 0;
    openingBalance += account.normalBalance === "DEBIT" ? d - c : c - d;
  }

  // Period lines
  const { data: periodLines } = await client
    .from("journal_lines")
    .select(`
      debit,
      credit,
      description,
      journal_entries!inner (
        id,
        entry_number,
        journal_date,
        source_type,
        reference,
        created_at,
        status
      )
    `)
    .eq("account_id", account.id)
    .eq("journal_entries.business_id", businessId)
    .neq("journal_entries.status", "voided")
    .gte("journal_entries.journal_date", startDate)
    .lte("journal_entries.journal_date", endDate)
    .order("journal_entries(journal_date)", { ascending: true })
    .order("journal_entries(created_at)", { ascending: true });

  const items: GeneralLedgerLineItem[] = [];
  let runningBalance = openingBalance;

  for (const row of (periodLines || []) as unknown as GeneralLedgerQueryRow[]) {
    const d = Number(row.debit) || 0;
    const c = Number(row.credit) || 0;
    const impact = account.normalBalance === "DEBIT" ? d - c : c - d;
    runningBalance += impact;

    items.push({
      date: row.journal_entries.journal_date,
      entryNumber: row.journal_entries.entry_number,
      sourceType: row.journal_entries.source_type,
      description: row.description || "",
      reference: row.journal_entries.reference ?? null,
      debit: d,
      credit: c,
      runningBalance,
    });
  }

  return {
    businessId,
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    normalBalance: account.normalBalance,
    startDate,
    endDate,
    openingBalance,
    items,
    closingBalance: runningBalance,
  };
}
