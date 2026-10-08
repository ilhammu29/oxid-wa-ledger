import { SupabaseClient } from "@supabase/supabase-js";
import {
  AnalyticsPeriod,
  FullAnalyticsData,
  RevenueTrendPoint,
  ProfitTrendPoint,
  NetProfitTrendPoint,
  ExpenseBreakdownItem,
  TopProductItem,
  SalesVolumePoint,
  CashBankTrendPoint,
  ReceivablePayableSnapshot,
  InventoryAnalytics,
  TransactionActivity,
  AnalyticsOverviewKPIs,
} from "./types";
import { getBusinessTimezone } from "../transactions/service";
import { getBusinessLocalDate, localToUtc } from "../transactions/timezone";

const INDONESIAN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const INDONESIAN_DAYS = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];

/**
 * Formats YYYY-MM-DD into short Indonesian display date e.g. "08 Okt".
 */
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || parts[1];
  return `${day} ${monthName}`;
}

/**
 * Computes start and end dates based on selected period and business timezone.
 */
export function getAnalyticsPeriodDates(
  period: AnalyticsPeriod,
  now: Date,
  timeZone: string
): { startDate: string; endDate: string; periodLabel: string } {
  const todayLocal = getBusinessLocalDate(now, timeZone);
  const [yStr, mStr, dStr] = todayLocal.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (period === "7d") {
    const startRef = new Date(Date.UTC(year, month - 1, day - 6));
    const startStr = startRef.toISOString().slice(0, 10);
    return {
      startDate: startStr,
      endDate: todayLocal,
      periodLabel: "7 Hari Terakhir",
    };
  }

  if (period === "this_month") {
    const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
    return {
      startDate: startStr,
      endDate: todayLocal,
      periodLabel: `Bulan Ini (${INDONESIAN_MONTHS[month - 1]} ${year})`,
    };
  }

  if (period === "last_month") {
    let lastMonthYear = year;
    let lastMonth = month - 1;
    if (lastMonth < 1) {
      lastMonth = 12;
      lastMonthYear -= 1;
    }
    const daysInLastMonth = new Date(Date.UTC(lastMonthYear, lastMonth, 0)).getUTCDate();
    const startStr = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;
    const endStr = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-${String(daysInLastMonth).padStart(2, "0")}`;
    return {
      startDate: startStr,
      endDate: endStr,
      periodLabel: `Bulan Lalu (${INDONESIAN_MONTHS[lastMonth - 1]} ${lastMonthYear})`,
    };
  }

  if (period === "12m") {
    const startRef = new Date(Date.UTC(year - 1, month - 1, 1));
    const startStr = startRef.toISOString().slice(0, 10);
    return {
      startDate: startStr,
      endDate: todayLocal,
      periodLabel: "12 Bulan Terakhir",
    };
  }

  // Default: 30d
  const startRef = new Date(Date.UTC(year, month - 1, day - 29));
  const startStr = startRef.toISOString().slice(0, 10);
  return {
    startDate: startStr,
    endDate: todayLocal,
    periodLabel: "30 Hari Terakhir",
  };
}

/**
 * Generates an array of all continuous YYYY-MM-DD date strings between start and end inclusive.
 */
function generateDateRangeArray(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);

  const current = new Date(Date.UTC(sY, sM - 1, sD));
  const end = new Date(Date.UTC(eY, eM - 1, eD));

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Fetches and computes the authoritative analytics dataset for a specific business.
 * Fully tenant-isolated and backed by real double-entry accounting and transaction records.
 */
export async function getFullAnalyticsData(
  client: SupabaseClient,
  businessId: string,
  period: AnalyticsPeriod = "30d",
  customRange?: { startDate: string; endDate: string }
): Promise<FullAnalyticsData> {
  const timezone = await getBusinessTimezone(client, businessId);
  const now = new Date();
  const { startDate, endDate, periodLabel } = customRange
    ? {
        startDate: customRange.startDate,
        endDate: customRange.endDate,
        periodLabel: (customRange as { periodLabel?: string }).periodLabel || "Kustom",
      }
    : getAnalyticsPeriodDates(period, now, timezone);

  // Generate date series for zero-filling charts
  const dateSeries = generateDateRangeArray(startDate, endDate);

  // Convert local boundaries to UTC ISO timestamps for transaction filtering
  const [sY, sM, sD] = startDate.split("-").map(Number);
  const [eY, eM, eD] = endDate.split("-").map(Number);
  const startUtc = localToUtc(sY, sM, sD, 0, 0, 0, 0, timezone).toISOString();
  const endUtc = localToUtc(eY, eM, eD, 23, 59, 59, 999, timezone).toISOString();

  // Run all authoritative queries in parallel
  const [
    transactionsRes,
    productsRes,
    journalLinesRes,
    receivablesRes,
    payablesRes,
    inventoryMovementsRes,
  ] = await Promise.all([
    // 1. Confirmed Transactions
    client
      .from("transactions")
      .select("id, product_id, transaction_at, source, quantity, unit, unit_price, total_amount, status")
      .eq("business_id", businessId)
      .eq("status", "confirmed")
      .gte("transaction_at", startUtc)
      .lte("transaction_at", endUtc),

    // 2. Active Products
    client
      .from("products")
      .select("id, name, unit, default_price, unit_cost, stock, active")
      .eq("business_id", businessId),

    // 3. Posted Journal Lines in date range
    client
      .from("journal_lines")
      .select(`
        debit,
        credit,
        account_id,
        chart_of_accounts!inner (
          code,
          name,
          type
        ),
        journal_entries!inner (
          business_id,
          journal_date,
          status
        )
      `)
      .eq("journal_entries.business_id", businessId)
      .neq("journal_entries.status", "draft")
      .gte("journal_entries.journal_date", startDate)
      .lte("journal_entries.journal_date", endDate),

    // 4. Receivables
    client
      .from("receivables")
      .select("id, customer_name, total_amount, paid_amount, status, due_date")
      .eq("business_id", businessId),

    // 5. Payables
    client
      .from("payables")
      .select("id, supplier_name, total_amount, paid_amount, status, due_date")
      .eq("business_id", businessId),

    // 6. Inventory Movements
    client
      .from("inventory_movements")
      .select("id, product_id, quantity, unit_cost, total_cost, movement_type, movement_at")
      .eq("business_id", businessId)
      .gte("movement_at", startUtc)
      .lte("movement_at", endUtc),
  ]);

  const transactions = transactionsRes.data || [];
  const products = productsRes.data || [];
  const journalRows = (journalLinesRes.data || []) as unknown as Array<{
    debit: number | string;
    credit: number | string;
    chart_of_accounts: { code: string; name: string; type: string };
    journal_entries: { journal_date: string };
  }>;
  const receivables = receivablesRes.data || [];
  const payables = payablesRes.data || [];
  const movements = inventoryMovementsRes.data || [];

  // Map products
  const productMap = new Map<string, { name: string; unit: string; unitCost: number; defaultPrice: number }>();
  for (const p of products) {
    productMap.set(p.id, {
      name: p.name,
      unit: p.unit || "kg",
      unitCost: Number(p.unit_cost || 0),
      defaultPrice: Number(p.default_price || 0),
    });
  }

  // --- 1. REVENUE TREND & SALES VOLUME (Aggregated by local date) ---
  const revenueByDate = new Map<string, { revenue: number; transactions: number; quantity: number }>();
  for (const d of dateSeries) {
    revenueByDate.set(d, { revenue: 0, transactions: 0, quantity: 0 });
  }

  // Transaction distribution by Hour and Day-of-week
  const hourCounts = new Array(24).fill(0).map(() => ({ count: 0, revenue: 0 }));
  const dayOfWeekCounts = new Array(7).fill(0).map(() => ({ count: 0, revenue: 0 }));
  const sourceCounts: Record<string, number> = {
    telegram: 0,
    whatsapp: 0,
    dashboard: 0,
    manual: 0,
    other: 0,
  };

  // Product ranking map
  const productSalesMap = new Map<string, { revenue: number; quantity: number; count: number }>();

  let totalTxRevenue = 0;
  let totalTxQuantity = 0;
  let totalTxCount = 0;

  for (const tx of transactions) {
    const txDateLocal = getBusinessLocalDate(new Date(tx.transaction_at), timezone);
    const amount = Number(tx.total_amount || 0);
    const qty = Number(tx.quantity || 0);

    totalTxRevenue += amount;
    totalTxQuantity += qty;
    totalTxCount += 1;

    // Daily bucket
    const currentDay = revenueByDate.get(txDateLocal);
    if (currentDay) {
      currentDay.revenue += amount;
      currentDay.transactions += 1;
      currentDay.quantity += qty;
    }

    // Product bucket
    const prodId = tx.product_id || "default";
    const currentProd = productSalesMap.get(prodId) || { revenue: 0, quantity: 0, count: 0 };
    currentProd.revenue += amount;
    currentProd.quantity += qty;
    currentProd.count += 1;
    productSalesMap.set(prodId, currentProd);

    // Hour distribution (local time)
    try {
      const txLocalHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "numeric",
          hour12: false,
        }).format(new Date(tx.transaction_at)),
        10
      );
      if (txLocalHour >= 0 && txLocalHour < 24) {
        hourCounts[txLocalHour].count += 1;
        hourCounts[txLocalHour].revenue += amount;
      }
    } catch {
      // ignore parsing error
    }

    // Day of week distribution (local)
    try {
      const localDayStr = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
      }).format(new Date(tx.transaction_at));
      // Map Mon-Sun
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const dayIdx = dayMap[localDayStr] ?? 0;
      dayOfWeekCounts[dayIdx].count += 1;
      dayOfWeekCounts[dayIdx].revenue += amount;
    } catch {
      // ignore
    }

    // Source distribution
    const src = (tx.source || "other").toLowerCase();
    if (src in sourceCounts) {
      sourceCounts[src] += 1;
    } else {
      sourceCounts.other += 1;
    }
  }

  const revenueTrend: RevenueTrendPoint[] = dateSeries.map((d) => {
    const item = revenueByDate.get(d) || { revenue: 0, transactions: 0, quantity: 0 };
    return {
      date: d,
      displayDate: formatShortDate(d),
      revenue: item.revenue,
      transactions: item.transactions,
    };
  });

  const salesVolume: SalesVolumePoint[] = dateSeries.map((d) => {
    const item = revenueByDate.get(d) || { revenue: 0, transactions: 0, quantity: 0 };
    return {
      date: d,
      displayDate: formatShortDate(d),
      quantity: Number(item.quantity.toFixed(2)),
      unit: "kg",
    };
  });

  // Top Products
  const topProducts: TopProductItem[] = Array.from(productSalesMap.entries())
    .map(([prodId, data]) => {
      const meta = productMap.get(prodId);
      const productName = meta?.name || (prodId === "default" ? "Produk Umum" : "Produk");
      const unit = meta?.unit || "kg";
      const percentage = totalTxRevenue > 0 ? (data.revenue / totalTxRevenue) * 100 : 0;
      return {
        productId: prodId,
        productName,
        unit,
        totalRevenue: data.revenue,
        totalQuantity: Number(data.quantity.toFixed(2)),
        transactionCount: data.count,
        percentage: Number(percentage.toFixed(1)),
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 8);

  // --- 2. DOUBLE-ENTRY ACCOUNTING: PROFIT, EXPENSES, COGS, CASH & BANK ---
  const dailyAccounting = new Map<string, { revenue: number; cogs: number; expenses: number; cashDelta: number; bankDelta: number }>();
  for (const d of dateSeries) {
    dailyAccounting.set(d, { revenue: 0, cogs: 0, expenses: 0, cashDelta: 0, bankDelta: 0 });
  }

  const expenseAccountMap = new Map<string, { code: string; name: string; amount: number }>();
  let totalAccountingRevenue = 0;
  let totalCogs = 0;
  let totalOperatingExpenses = 0;

  for (const row of journalRows) {
    const jDate = row.journal_entries.journal_date;
    const coa = row.chart_of_accounts;
    const debit = Number(row.debit || 0);
    const credit = Number(row.credit || 0);
    const code = coa.code;
    const type = coa.type;

    const dayObj = dailyAccounting.get(jDate);

    // Revenue (4100, 4200, 4300, 4400)
    if (code === "4100" || code === "4200") {
      const rev = credit - debit;
      totalAccountingRevenue += rev;
      if (dayObj) dayObj.revenue += rev;
    } else if (code === "4300" || code === "4400") {
      const reduction = debit - credit;
      totalAccountingRevenue -= reduction;
      if (dayObj) dayObj.revenue -= reduction;
    }
    // COGS (5100 or type COGS)
    else if (code === "5100" || type === "COGS") {
      const cogsVal = debit - credit;
      totalCogs += cogsVal;
      if (dayObj) dayObj.cogs += cogsVal;
    }
    // Operating Expenses (6100..6999 or type EXPENSE)
    else if (type === "EXPENSE" || (code.startsWith("6") && code !== "6950")) {
      const expVal = debit - credit;
      totalOperatingExpenses += expVal;
      if (dayObj) dayObj.expenses += expVal;

      const curr = expenseAccountMap.get(code) || { code, name: coa.name, amount: 0 };
      curr.amount += expVal;
      expenseAccountMap.set(code, curr);
    }
    // Cash (1100)
    else if (code === "1100") {
      const delta = debit - credit;
      if (dayObj) dayObj.cashDelta += delta;
    }
    // Bank (1200)
    else if (code === "1200") {
      const delta = debit - credit;
      if (dayObj) dayObj.bankDelta += delta;
    }
  }

  // If accounting revenue is 0 (e.g. no backfill yet), fall back gracefully to transaction revenue
  const effectiveRevenue = totalAccountingRevenue > 0 ? totalAccountingRevenue : totalTxRevenue;
  const grossProfit = effectiveRevenue - totalCogs;
  const netProfit = grossProfit - totalOperatingExpenses;
  const grossMarginPercent = effectiveRevenue > 0 ? (grossProfit / effectiveRevenue) * 100 : 0;
  const netMarginPercent = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;

  // Profit Trend (Revenue vs HPP vs Gross Profit)
  const profitTrend: ProfitTrendPoint[] = dateSeries.map((d) => {
    const acc = dailyAccounting.get(d) || { revenue: 0, cogs: 0, expenses: 0, cashDelta: 0, bankDelta: 0 };
    const tx = revenueByDate.get(d);
    const dayRev = acc.revenue > 0 ? acc.revenue : (tx?.revenue || 0);
    const dayCogs = acc.cogs;
    const dayGross = dayRev - dayCogs;
    return {
      date: d,
      displayDate: formatShortDate(d),
      revenue: dayRev,
      cogs: dayCogs,
      grossProfit: dayGross,
    };
  });

  // Net Profit Trend
  const netProfitTrend: NetProfitTrendPoint[] = dateSeries.map((d) => {
    const acc = dailyAccounting.get(d) || { revenue: 0, cogs: 0, expenses: 0, cashDelta: 0, bankDelta: 0 };
    const tx = revenueByDate.get(d);
    const dayRev = acc.revenue > 0 ? acc.revenue : (tx?.revenue || 0);
    const dayGross = dayRev - acc.cogs;
    const dayExp = acc.expenses;
    const dayNet = dayGross - dayExp;
    return {
      date: d,
      displayDate: formatShortDate(d),
      grossProfit: dayGross,
      operatingExpenses: dayExp,
      netProfit: dayNet,
    };
  });

  // Expense Breakdown
  const expenseBreakdown: ExpenseBreakdownItem[] = Array.from(expenseAccountMap.values())
    .map((e) => ({
      accountCode: e.code,
      accountName: e.name,
      amount: Math.max(0, e.amount),
      percentage: totalOperatingExpenses > 0 ? Number(((e.amount / totalOperatingExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Cash & Bank Trend (cumulative running balance)
  let runningCash = 0;
  let runningBank = 0;
  const cashBankTrend: CashBankTrendPoint[] = dateSeries.map((d) => {
    const acc = dailyAccounting.get(d) || { revenue: 0, cogs: 0, expenses: 0, cashDelta: 0, bankDelta: 0 };
    runningCash += acc.cashDelta;
    runningBank += acc.bankDelta;
    return {
      date: d,
      displayDate: formatShortDate(d),
      cash: runningCash,
      bank: runningBank,
      totalLiquidity: runningCash + runningBank,
    };
  });

  // --- 3. RECEIVABLES & PAYABLES SNAPSHOT ---
  let totalReceivables = 0;
  let totalPayables = 0;
  const receivablesList = receivables.map((r) => {
    const tot = Number(r.total_amount || 0);
    const paid = Number(r.paid_amount || 0);
    const remaining = Math.max(0, tot - paid);
    if (r.status !== "paid") totalReceivables += remaining;
    return {
      id: r.id,
      contactName: r.customer_name || "Pelanggan",
      totalAmount: tot,
      paidAmount: paid,
      remainingAmount: remaining,
      dueDate: r.due_date || null,
      status: r.status,
    };
  });

  const payablesList = payables.map((p) => {
    const tot = Number(p.total_amount || 0);
    const paid = Number(p.paid_amount || 0);
    const remaining = Math.max(0, tot - paid);
    if (p.status !== "paid") totalPayables += remaining;
    return {
      id: p.id,
      contactName: p.supplier_name || "Pemasok",
      totalAmount: tot,
      paidAmount: paid,
      remainingAmount: remaining,
      dueDate: p.due_date || null,
      status: p.status,
    };
  });

  const receivablesPayables: ReceivablePayableSnapshot = {
    totalReceivables,
    totalPayables,
    netPosition: totalReceivables - totalPayables,
    receivablesCount: receivablesList.filter((r) => r.remainingAmount > 0).length,
    payablesCount: payablesList.filter((p) => p.remainingAmount > 0).length,
    receivablesList: receivablesList.slice(0, 10),
    payablesList: payablesList.slice(0, 10),
  };

  // --- 4. INVENTORY ANALYTICS ---
  let totalInventoryValue = 0;
  const inventoryItems = products.map((p) => {
    const stock = Number(p.stock || 0);
    const unitCost = Number(p.unit_cost || 0);
    const val = stock * unitCost;
    totalInventoryValue += val;
    return {
      id: p.id,
      name: p.name,
      stock,
      unit: p.unit || "kg",
      unitCost,
      totalValue: val,
      isLowStock: stock <= 10,
    };
  });

  let totalInQty = 0;
  let totalOutQty = 0;
  let totalInCost = 0;
  let totalOutCost = 0;

  for (const m of movements) {
    const q = Number(m.quantity || 0);
    const cost = Number(m.total_cost || 0);
    if (["purchase", "opening_stock", "adjustment_in"].includes(m.movement_type)) {
      totalInQty += q;
      totalInCost += cost;
    } else {
      totalOutQty += q;
      totalOutCost += cost;
    }
  }

  const inventory: InventoryAnalytics = {
    totalInventoryValue,
    totalItemsCount: products.length,
    items: inventoryItems,
    movementsSummary: {
      totalInQty,
      totalOutQty,
      totalInCost,
      totalOutCost,
    },
  };

  // --- 5. TRANSACTION ACTIVITY ---
  const transactionActivity: TransactionActivity = {
    byHour: hourCounts.map((h, i) => ({
      hour: i,
      label: `${String(i).padStart(2, "0")}:00`,
      count: h.count,
      revenue: h.revenue,
    })),
    byDayOfWeek: INDONESIAN_DAYS.map((dayName, idx) => ({
      day: dayName,
      count: dayOfWeekCounts[idx].count,
      revenue: dayOfWeekCounts[idx].revenue,
    })),
    bySource: [
      {
        source: "telegram" as const,
        label: "Bot Telegram",
        count: sourceCounts.telegram,
        percentage: totalTxCount > 0 ? Number(((sourceCounts.telegram / totalTxCount) * 100).toFixed(1)) : 0,
      },
      {
        source: "whatsapp" as const,
        label: "Bot WhatsApp",
        count: sourceCounts.whatsapp,
        percentage: totalTxCount > 0 ? Number(((sourceCounts.whatsapp / totalTxCount) * 100).toFixed(1)) : 0,
      },
      {
        source: "dashboard" as const,
        label: "Web Dashboard",
        count: sourceCounts.dashboard,
        percentage: totalTxCount > 0 ? Number(((sourceCounts.dashboard / totalTxCount) * 100).toFixed(1)) : 0,
      },
      {
        source: "manual" as const,
        label: "Manual / Kasir",
        count: sourceCounts.manual,
        percentage: totalTxCount > 0 ? Number(((sourceCounts.manual / totalTxCount) * 100).toFixed(1)) : 0,
      },
    ].filter((s) => s.count > 0 || totalTxCount === 0),
  };

  // --- 6. OVERVIEW KPIS ---
  const averageOrderValue = totalTxCount > 0 ? Math.round(effectiveRevenue / totalTxCount) : 0;
  const currentTotalLiquidity = runningCash + runningBank;

  const kpis: AnalyticsOverviewKPIs = {
    periodLabel,
    startDate,
    endDate,
    totalRevenue: effectiveRevenue,
    totalCogs,
    grossProfit,
    grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
    totalExpenses: totalOperatingExpenses,
    netProfit,
    netMarginPercent: Number(netMarginPercent.toFixed(1)),
    totalQuantity: Number(totalTxQuantity.toFixed(2)),
    totalTransactions: totalTxCount,
    averageOrderValue,
    totalCashBank: currentTotalLiquidity,
    totalReceivables,
    totalPayables,
    totalInventoryValue,
  };

  return {
    kpis,
    revenueTrend,
    profitTrend,
    netProfitTrend,
    expenseBreakdown,
    topProducts,
    salesVolume,
    cashBankTrend,
    receivablesPayables,
    inventory,
    transactionActivity,
  };
}
