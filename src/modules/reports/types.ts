export type ReportInterval = "daily" | "weekly" | "monthly" | "custom";

export interface SalesSummary {
  businessId: string;
  interval: ReportInterval;
  startDate: string;
  endDate: string;
  totalTransactions: number;
  totalRevenueIdr: number;
  totalQuantity: number;
  primaryUnit: string;
}

export interface ProductPerformance {
  productId?: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalRevenueIdr: number;
  transactionCount: number;
}
