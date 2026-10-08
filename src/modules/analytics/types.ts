/**
 * Authoritative Types for OXID Ledger Analytics & Charts Engine.
 * Step 11: Real double-entry accounting & operational sales analytics.
 */

export type AnalyticsPeriod = "7d" | "30d" | "this_month" | "last_month" | "12m";

export interface RevenueTrendPoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // "01 Okt"
  revenue: number;
  transactions: number;
}

export interface ProfitTrendPoint {
  date: string;
  displayDate: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
}

export interface NetProfitTrendPoint {
  date: string;
  displayDate: string;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
}

export interface ExpenseBreakdownItem {
  accountCode: string;
  accountName: string;
  amount: number;
  percentage: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  unit: string;
  totalRevenue: number;
  totalQuantity: number;
  transactionCount: number;
  percentage: number;
}

export interface SalesVolumePoint {
  date: string;
  displayDate: string;
  quantity: number;
  unit: string;
}

export interface CashBankTrendPoint {
  date: string;
  displayDate: string;
  cash: number;
  bank: number;
  totalLiquidity: number;
}

export interface ReceivablePayableSnapshot {
  totalReceivables: number;
  totalPayables: number;
  netPosition: number; // totalReceivables - totalPayables
  receivablesCount: number;
  payablesCount: number;
  receivablesList: Array<{
    id: string;
    contactName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: string | null;
    status: string;
  }>;
  payablesList: Array<{
    id: string;
    contactName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    dueDate: string | null;
    status: string;
  }>;
}

export interface InventoryAnalytics {
  totalInventoryValue: number;
  totalItemsCount: number;
  items: Array<{
    id: string;
    name: string;
    stock: number;
    unit: string;
    unitCost: number;
    totalValue: number;
    isLowStock: boolean;
  }>;
  movementsSummary: {
    totalInQty: number;
    totalOutQty: number;
    totalInCost: number;
    totalOutCost: number;
  };
}

export interface TransactionActivity {
  byHour: Array<{
    hour: number;
    label: string; // "08:00"
    count: number;
    revenue: number;
  }>;
  byDayOfWeek: Array<{
    day: string; // "Senin", "Selasa", etc.
    count: number;
    revenue: number;
  }>;
  bySource: Array<{
    source: "telegram" | "whatsapp" | "dashboard" | "manual" | "other";
    label: string;
    count: number;
    percentage: number;
  }>;
}

export interface AnalyticsOverviewKPIs {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  totalQuantity: number;
  totalTransactions: number;
  averageOrderValue: number;
  totalCashBank: number;
  totalReceivables: number;
  totalPayables: number;
  totalInventoryValue: number;
}

export interface FullAnalyticsData {
  kpis: AnalyticsOverviewKPIs;
  revenueTrend: RevenueTrendPoint[];
  profitTrend: ProfitTrendPoint[];
  netProfitTrend: NetProfitTrendPoint[];
  expenseBreakdown: ExpenseBreakdownItem[];
  topProducts: TopProductItem[];
  salesVolume: SalesVolumePoint[];
  cashBankTrend: CashBankTrendPoint[];
  receivablesPayables: ReceivablePayableSnapshot;
  inventory: InventoryAnalytics;
  transactionActivity: TransactionActivity;
}
