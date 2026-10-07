/**
 * Accounting & Bookkeeping Domain Types for OXID Ledger v2.
 * Step 11: Authoritative double-entry engine, chart of accounts, and financial statements.
 */

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "COGS"
  | "EXPENSE"
  | "OTHER_INCOME"
  | "OTHER_EXPENSE";

export type NormalBalance = "DEBIT" | "CREDIT";

export interface ChartOfAccount {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JournalSourceType =
  | "SALE"
  | "EXPENSE"
  | "PURCHASE"
  | "CAPITAL_IN"
  | "OWNER_DRAW"
  | "PAYMENT_RECEIVABLE"
  | "PAYMENT_PAYABLE"
  | "ASSET_PURCHASE"
  | "DEPRECIATION"
  | "LOAN_IN"
  | "LOAN_PAYMENT"
  | "MANUAL"
  | "VOID_REVERSAL"
  | "OPENING_BALANCE";

export type JournalEntryStatus = "draft" | "posted" | "voided";

export interface JournalLine {
  id?: string;
  journalEntryId?: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string | null;
  lineOrder?: number;
}

export interface JournalEntry {
  id: string;
  businessId: string;
  entryNumber: string;
  journalDate: string; // YYYY-MM-DD
  description: string;
  sourceType: JournalSourceType;
  sourceId: string | null;
  status: JournalEntryStatus;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  postedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  reversalEntryId: string | null;
  lines: JournalLine[];
}

export interface ExpenseRecord {
  id: string;
  businessId: string;
  category: string;
  expenseAccountId: string;
  paymentAccountId: string;
  amount: number;
  description: string;
  expenseDate: string;
  status: "confirmed" | "voided";
  source: string;
  createdByUserId: string | null;
  createdAt: string;
}

export interface CapitalMovement {
  id: string;
  businessId: string;
  type: "CAPITAL_IN" | "OWNER_DRAW";
  accountId: string;
  amount: number;
  description: string;
  movementDate: string;
  status: "confirmed" | "voided";
  source: string;
  createdByUserId: string | null;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  businessId: string;
  productId: string | null;
  productName?: string;
  supplierName: string | null;
  supplierId: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  totalAmount: number;
  paymentMethod: "cash" | "bank" | "credit";
  status: "confirmed" | "voided";
  purchaseDate: string;
  source: string;
  createdAt: string;
}

export type InventoryMovementType =
  | "opening_stock"
  | "purchase"
  | "sale"
  | "sale_void"
  | "purchase_void"
  | "return"
  | "adjustment_in"
  | "adjustment_out"
  | "damaged"
  | "lost";

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  productName?: string;
  quantity: number; // positive = stock in, negative = stock out
  unitCost: number;
  totalCost: number;
  movementType: InventoryMovementType;
  referenceType: string | null;
  referenceId: string | null;
  movementAt: string;
  createdAt: string;
}

export interface Counterparty {
  id: string;
  businessId: string;
  name: string;
  type: "customer" | "supplier" | "both";
  phone: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export interface ReceivableRecord {
  id: string;
  businessId: string;
  customerId: string | null;
  customerName: string;
  sourceTransactionId: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: "unpaid" | "partially_paid" | "paid" | "voided";
  notes: string | null;
  createdAt: string;
}

export interface PayableRecord {
  id: string;
  businessId: string;
  supplierId: string | null;
  supplierName: string;
  purchaseId: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: "unpaid" | "partially_paid" | "paid" | "voided";
  notes: string | null;
  createdAt: string;
}

export interface FixedAssetRecord {
  id: string;
  businessId: string;
  name: string;
  category: string;
  purchaseDate: string;
  acquisitionCost: number;
  usefulLifeMonths: number;
  residualValue: number;
  depreciationMethod: "STRAIGHT_LINE";
  accumulatedDepreciation: number;
  bookValue: number;
  status: "active" | "fully_depreciated" | "sold" | "disposed";
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  businessId: string;
  lenderName: string;
  principalAmount: number;
  remainingPrincipal: number;
  interestRatePercent: number;
  loanDate: string;
  status: "active" | "paid_off" | "voided";
  createdAt: string;
}

// ============================================================================
// FINANCIAL STATEMENTS & REPORTS
// ============================================================================

export interface ProfitAndLossReport {
  businessId: string;
  startDate: string;
  endDate: string;
  // Revenue
  grossSales: number;
  otherRevenue: number;
  salesReturns: number;
  salesDiscounts: number;
  netRevenue: number;
  // COGS
  cogs: number;
  grossProfit: number;
  // Operating Expenses
  operatingExpenses: {
    accountCode: string;
    accountName: string;
    amount: number;
  }[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  // Other Income / Expense
  otherIncome: number;
  otherExpenses: number;
  interestExpense: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  businessId: string;
  asOfDate: string;
  // Assets
  currentAssets: {
    cash: number;
    bank: number;
    accountsReceivable: number;
    inventory: number;
    totalCurrentAssets: number;
  };
  nonCurrentAssets: {
    fixedAssetsCost: number;
    accumulatedDepreciation: number;
    netFixedAssets: number;
  };
  totalAssets: number;
  // Liabilities
  currentLiabilities: {
    accountsPayable: number;
    otherCurrentLiabilities: number;
    totalCurrentLiabilities: number;
  };
  nonCurrentLiabilities: {
    loansPayable: number;
    totalNonCurrentLiabilities: number;
  };
  totalLiabilities: number;
  // Equity
  equity: {
    ownerCapital: number;
    retainedEarnings: number;
    currentPeriodProfit: number;
    ownerDraw: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface CashFlowStatementReport {
  businessId: string;
  startDate: string;
  endDate: string;
  beginningCashAndBank: number;
  // Operating Activities
  cashFromSales: number;
  customerCollections: number;
  cashPaidForExpenses: number;
  cashPaidToSuppliers: number;
  otherOperatingCash: number;
  netOperatingCashFlow: number;
  // Investing Activities
  fixedAssetPurchases: number;
  fixedAssetDisposals: number;
  netInvestingCashFlow: number;
  // Financing Activities
  capitalContributions: number;
  ownerWithdrawals: number;
  loanProceeds: number;
  loanPrincipalRepayments: number;
  netFinancingCashFlow: number;
  // Summary
  netCashChange: number;
  endingCashAndBank: number;
  actualCashAndBankLedger: number;
  isReconciled: boolean;
}

export interface StatementOfChangesInEquityReport {
  businessId: string;
  startDate: string;
  endDate: string;
  beginningEquity: number;
  capitalAdditions: number;
  netProfit: number;
  ownerDraws: number;
  endingEquity: number;
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  businessId: string;
  asOfDate: string;
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface GeneralLedgerLineItem {
  date: string;
  entryNumber: string;
  sourceType: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerAccountReport {
  businessId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  startDate: string;
  endDate: string;
  openingBalance: number;
  items: GeneralLedgerLineItem[];
  closingBalance: number;
}

export interface AccountingReconciliationReport {
  businessId: string;
  timestamp: string;
  overallStatus: "PASS" | "WARNING" | "ERROR";
  checks: {
    name: string;
    status: "PASS" | "WARNING" | "ERROR";
    message: string;
    details?: Record<string, unknown>;
  }[];
}
