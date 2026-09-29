export type TransactionStatus = "pending" | "confirmed" | "cancelled";
export type TransactionSource = "whatsapp" | "manual" | "api";

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId?: string;
  productName: string; // Snapshotted name at time of sale
  quantity: number; // Supports decimal values (e.g., 2.5 kg, 15.75 kg)
  unit: string; // e.g. "kg", "pcs"
  unitPriceIdr: number; // Integer IDR to prevent float calculation issues
  totalPriceIdr: number; // Integer IDR (quantity * unitPriceIdr rounded/exact)
}

export interface Transaction {
  id: string;
  businessId: string; // Tenant boundary
  whatsappConnectionId?: string; // Optional link to originating connection
  source: TransactionSource;
  status: TransactionStatus;
  customerIdentifier?: string; // e.g. WhatsApp sender phone or customer name
  rawMessage?: string; // Raw input message for auditing & parser optimization
  totalAmountIdr: number; // Integer IDR sum of all items
  notes?: string;
  recordedAt: string; // Transaction timestamp
  createdAt: string;
  updatedAt: string;
  items?: TransactionItem[];
}

export interface CreateTransactionDTO {
  businessId: string;
  whatsappConnectionId?: string;
  source: TransactionSource;
  status?: TransactionStatus;
  customerIdentifier?: string;
  rawMessage?: string;
  recordedAt?: string;
  notes?: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPriceIdr: number;
    totalPriceIdr: number;
  }>;
}
