/**
 * Transaction Domain Services for OXID WA Ledger.
 * Step 4: Atomic financial writes and reporting via Supabase RPCs.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ExecutionContext,
  CreateSaleParams,
  SaleResultDTO,
  CancelResultDTO,
  CorrectResultDTO,
  DailyStatusDTO,
  ReportResultDTO,
} from "./types";
import { DomainError } from "./errors";
import {
  getBusinessLocalDate,
  getTodayUtcRange,
  getWeekUtcRange,
  getMonthUtcRange,
} from "./timezone";

interface RpcSaleResult {
  transaction_id: string;
  business_id: string;
  product_id: string;
  product_name: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total_amount: number | string;
  status: string;
  transaction_at: string;
  today_summary?: {
    local_date: string;
    transaction_count: number | string;
    total_quantity: number | string;
    total_revenue: number | string;
  };
}

interface RpcCancelResult {
  transaction_id: string;
  business_id: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total_amount: number | string;
  status: string;
  cancelled_at: string;
}

interface RpcCorrectResult {
  original_transaction_id: string;
  original_quantity: number | string;
  original_total_amount: number | string;
  new_transaction_id: string;
  new_quantity: number | string;
  unit: string;
  unit_price: number | string;
  new_total_amount: number | string;
  corrected_at: string;
}

interface RpcDailyStatusResult {
  id: string;
  business_id: string;
  local_date: string;
  status: "NO_SALE" | "CLOSED" | "ACTIVE";
  is_duplicate: boolean;
}

interface RpcReportResult {
  business_id: string;
  start_at: string;
  end_at: string;
  transaction_count: number | string;
  total_quantity: number | string;
  total_revenue: number | string;
}

/**
 * Maps raw database / RPC errors to strongly typed DomainErrors.
 */
function mapDatabaseError(err: unknown): DomainError {
  const errorObj = err as { message?: string } | null;
  const msg = errorObj?.message || String(err);

  if (msg.includes("42501") || msg.includes("UNAUTHORIZED")) {
    return new DomainError("UNAUTHORIZED", msg);
  }
  if (msg.includes("BUSINESS_NOT_FOUND")) {
    return new DomainError("BUSINESS_NOT_FOUND", msg);
  }
  if (msg.includes("BUSINESS_INACTIVE")) {
    return new DomainError("BUSINESS_INACTIVE", msg);
  }
  if (msg.includes("DEFAULT_PRODUCT_NOT_CONFIGURED")) {
    return new DomainError("DEFAULT_PRODUCT_NOT_CONFIGURED", msg);
  }
  if (msg.includes("UNIT_MISMATCH")) {
    return new DomainError("UNIT_MISMATCH", msg);
  }
  if (msg.includes("INVALID_QUANTITY")) {
    return new DomainError("INVALID_QUANTITY", msg);
  }
  if (msg.includes("NO_TRANSACTION_TO_CANCEL")) {
    return new DomainError("NO_TRANSACTION_TO_CANCEL", msg);
  }
  if (msg.includes("NO_TRANSACTION_TO_CORRECT")) {
    return new DomainError("NO_TRANSACTION_TO_CORRECT", msg);
  }
  if (msg.includes("DAY_STATUS_HAS_SALES")) {
    return new DomainError("DAY_STATUS_HAS_SALES", msg);
  }
  if (msg.includes("DAY_STATUS_CONFLICT")) {
    return new DomainError("DAY_STATUS_CONFLICT", msg);
  }
  if (msg.includes("DAILY_STATUS_CONFLICT")) {
    return new DomainError("DAILY_STATUS_CONFLICT", msg);
  }

  return new DomainError("DATABASE_OPERATION_FAILED", msg, undefined, err);
}

/**
 * Validates that the business exists and retrieves its configured timezone.
 */
export async function getBusinessTimezone(
  client: SupabaseClient,
  businessId: string
): Promise<string> {
  const { data, error } = await client
    .from("businesses")
    .select("timezone, status")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw mapDatabaseError(error);
  }

  if (!data) {
    throw new DomainError("BUSINESS_NOT_FOUND", `Business ${businessId} not found`);
  }

  if (data.status !== "active") {
    throw new DomainError("BUSINESS_INACTIVE", `Business ${businessId} is ${data.status}`);
  }

  return data.timezone || "Asia/Jakarta";
}

/**
 * Atomically records a sale transaction, audit event, and computes today's summary.
 */
export async function recordSale(
  client: SupabaseClient,
  context: ExecutionContext,
  params: CreateSaleParams
): Promise<SaleResultDTO> {
  const rawQuantity =
    typeof params.quantity === "number"
      ? params.quantity
      : parseFloat(params.quantity);

  if (isNaN(rawQuantity) || rawQuantity <= 0) {
    throw new DomainError("INVALID_QUANTITY", "Quantity must be greater than zero");
  }

  const { data, error } = await client.rpc("record_sale", {
    p_business_id: context.businessId,
    p_quantity: rawQuantity,
    p_unit: (params.unit || "kg").toLowerCase(),
    p_source: context.source,
    p_raw_message: params.rawMessage || null,
    p_sender_phone: context.senderPhone || null,
    p_actor_user_id: context.authenticatedUserId || null,
    p_transaction_at: params.transactionAt ? new Date(params.transactionAt).toISOString() : new Date().toISOString(),
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcSaleResult;

  return {
    transactionId: result.transaction_id,
    businessId: result.business_id,
    productId: result.product_id,
    productName: result.product_name,
    quantity: Number(result.quantity),
    unit: result.unit,
    unitPrice: Number(result.unit_price),
    totalAmount: Number(result.total_amount),
    status: "confirmed",
    transactionAt: result.transaction_at,
    todaySummary: {
      localDate: result.today_summary?.local_date || "",
      transactionCount: Number(result.today_summary?.transaction_count || 0),
      totalQuantity: Number(result.today_summary?.total_quantity || 0),
      totalRevenue: Number(result.today_summary?.total_revenue || 0),
    },
  };
}

/**
 * Atomically cancels the most recent confirmed transaction for this business.
 */
export async function cancelLastSale(
  client: SupabaseClient,
  context: ExecutionContext
): Promise<CancelResultDTO> {
  const { data, error } = await client.rpc("cancel_last_sale", {
    p_business_id: context.businessId,
    p_actor_user_id: context.authenticatedUserId || null,
    p_source: context.source,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcCancelResult;

  return {
    transactionId: result.transaction_id,
    businessId: result.business_id,
    quantity: Number(result.quantity),
    unit: result.unit,
    unitPrice: Number(result.unit_price),
    totalAmount: Number(result.total_amount),
    status: "cancelled",
    cancelledAt: result.cancelled_at,
  };
}

/**
 * Atomically corrects the most recent transaction, preserving historical price.
 */
export async function correctLastSale(
  client: SupabaseClient,
  context: ExecutionContext,
  correctedQuantity: number | string,
  rawMessage?: string
): Promise<CorrectResultDTO> {
  const rawQty =
    typeof correctedQuantity === "number"
      ? correctedQuantity
      : parseFloat(correctedQuantity);

  if (isNaN(rawQty) || rawQty <= 0) {
    throw new DomainError("INVALID_QUANTITY", "Corrected quantity must be greater than zero");
  }

  const { data, error } = await client.rpc("correct_last_sale", {
    p_business_id: context.businessId,
    p_corrected_quantity: rawQty,
    p_actor_user_id: context.authenticatedUserId || null,
    p_source: context.source,
    p_raw_message: rawMessage || null,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcCorrectResult;

  return {
    originalTransactionId: result.original_transaction_id,
    originalQuantity: Number(result.original_quantity),
    originalTotalAmount: Number(result.original_total_amount),
    newTransactionId: result.new_transaction_id,
    newQuantity: Number(result.new_quantity),
    unit: result.unit,
    unitPrice: Number(result.unit_price),
    newTotalAmount: Number(result.new_total_amount),
    correctedAt: result.corrected_at,
  };
}

/**
 * Sets daily status (NO_SALE or CLOSED) idempotently and conflict-safe.
 */
export async function setDailyStatus(
  client: SupabaseClient,
  context: ExecutionContext,
  status: "NO_SALE" | "CLOSED",
  note?: string
): Promise<DailyStatusDTO> {
  const timezone = await getBusinessTimezone(client, context.businessId);
  const localDate = getBusinessLocalDate(context.now || new Date(), timezone);

  const { data, error } = await client.rpc("set_business_daily_status", {
    p_business_id: context.businessId,
    p_local_date: localDate,
    p_status: status,
    p_note: note || null,
    p_source: context.source,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcDailyStatusResult;

  return {
    id: result.id,
    businessId: result.business_id,
    localDate: result.local_date,
    status: result.status,
    isDuplicate: Boolean(result.is_duplicate),
  };
}

/**
 * Generates an aggregated sales report for confirmed transactions in the specified period.
 */
export async function getSalesReport(
  client: SupabaseClient,
  context: ExecutionContext,
  period: "today" | "week" | "month"
): Promise<ReportResultDTO> {
  const timezone = await getBusinessTimezone(client, context.businessId);
  const refDate = context.now || new Date();

  let range: { startAt: Date; endAt: Date };

  switch (period) {
    case "today":
      range = getTodayUtcRange(refDate, timezone);
      break;
    case "week":
      range = getWeekUtcRange(refDate, timezone);
      break;
    case "month":
      range = getMonthUtcRange(refDate, timezone);
      break;
  }

  const { data, error } = await client.rpc("get_business_sales_report", {
    p_business_id: context.businessId,
    p_start_at: range.startAt.toISOString(),
    p_end_at: range.endAt.toISOString(),
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcReportResult;

  return {
    businessId: context.businessId,
    period,
    startAt: range.startAt.toISOString(),
    endAt: range.endAt.toISOString(),
    transactionCount: Number(result.transaction_count || 0),
    totalQuantity: Number(result.total_quantity || 0),
    totalRevenue: Number(result.total_revenue || 0),
  };
}
