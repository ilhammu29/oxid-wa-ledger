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
import { canCreateFinancialMutation } from "../subscriptions";
import { postSaleToAccounting, voidSaleFromAccounting } from "../accounting";

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
  if (msg.includes("SUBSCRIPTION_MUTATION_BLOCKED")) {
    return new DomainError("SUBSCRIPTION_MUTATION_BLOCKED", msg);
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

  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Pencatatan penjualan dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
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
    p_product_id: params.productId || null,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcSaleResult;

  // Post to double-entry accounting engine (non-blocking)
  try {
    let unitCost = 0;
    if (result.product_id) {
      const { data: prod } = await client
        .from("products")
        .select("unit_cost")
        .eq("id", result.product_id)
        .maybeSingle();
      if (prod?.unit_cost) unitCost = Number(prod.unit_cost);
    }

    await postSaleToAccounting(client, {
      businessId: result.business_id,
      transactionId: result.transaction_id,
      totalAmount: Number(result.total_amount),
      unitCost,
      quantity: Number(result.quantity),
      transactionDate: String(result.transaction_at).slice(0, 10),
      description: `Penjualan ${result.product_name || "Produk"}`,
      actorUserId: context.authenticatedUserId,
    });
  } catch (acctErr) {
    console.warn(`[recordSale] Accounting posting warning: ${acctErr instanceof Error ? acctErr.message : String(acctErr)}`);
  }

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
  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Pembatalan transaksi dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
  }

  const { data, error } = await client.rpc("cancel_last_sale", {
    p_business_id: context.businessId,
    p_actor_user_id: context.authenticatedUserId || null,
    p_source: context.source,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const result = data as unknown as RpcCancelResult;

  // Void from double-entry accounting engine (non-blocking)
  try {
    await voidSaleFromAccounting(client, {
      businessId: context.businessId,
      transactionId: result.transaction_id,
      voidReason: "Dibatalkan oleh pengguna",
      actorUserId: context.authenticatedUserId,
    });
  } catch (acctErr) {
    console.warn(`[cancelLastSale] Accounting void warning: ${acctErr instanceof Error ? acctErr.message : String(acctErr)}`);
  }

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

  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Koreksi transaksi dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
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

  // Void original and post corrected transaction in accounting engine
  try {
    await voidSaleFromAccounting(client, {
      businessId: context.businessId,
      transactionId: result.original_transaction_id,
      voidReason: "Dikoreksi oleh pengguna",
      actorUserId: context.authenticatedUserId,
    });

    const { data: newTx } = await client
      .from("transactions")
      .select("product_id, products(unit_cost, name)")
      .eq("id", result.new_transaction_id)
      .maybeSingle();

    const prodInfo = (newTx?.products as unknown as { unit_cost?: number; name?: string }) || {};
    const unitCost = Number(prodInfo.unit_cost) || 0;
    const prodName = prodInfo.name || "Produk";

    await postSaleToAccounting(client, {
      businessId: context.businessId,
      transactionId: result.new_transaction_id,
      totalAmount: Number(result.new_total_amount),
      unitCost,
      quantity: Number(result.new_quantity),
      transactionDate: String(result.corrected_at).slice(0, 10),
      description: `Koreksi Penjualan ${prodName}`,
      actorUserId: context.authenticatedUserId,
    });
  } catch (acctErr) {
    console.warn(`[correctLastSale] Accounting correction warning: ${acctErr instanceof Error ? acctErr.message : String(acctErr)}`);
  }

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
  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Pengaturan status harian dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
  }

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

export interface OverviewKPIsDTO {
  todayRevenue: number;
  todayQuantity: number;
  todayTransactionCount: number;
  weekRevenue: number;
  monthRevenue: number;
  timezone: string;
}

export interface DailySalesPointDTO {
  date: string;
  revenue: number;
  quantity: number;
  transactionCount: number;
}

/**
 * Retrieves today, week, and month sales aggregates in a single optimized RPC call.
 */
export async function getOverviewKPIs(
  client: SupabaseClient,
  businessId: string
): Promise<OverviewKPIsDTO> {
  const { data, error } = await client.rpc("get_business_overview_kpis", {
    p_business_id: businessId,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const res = data as unknown as {
    today_revenue: number | string;
    today_quantity: number | string;
    today_transaction_count: number | string;
    week_revenue: number | string;
    month_revenue: number | string;
    timezone: string;
  };

  return {
    todayRevenue: Number(res.today_revenue || 0),
    todayQuantity: Number(res.today_quantity || 0),
    todayTransactionCount: Number(res.today_transaction_count || 0),
    weekRevenue: Number(res.week_revenue || 0),
    monthRevenue: Number(res.month_revenue || 0),
    timezone: res.timezone || "Asia/Jakarta",
  };
}

/**
 * Retrieves daily sales time-series (e.g. 14 days) zero-filled for charting and reporting.
 */
export async function getDailySalesSeries(
  client: SupabaseClient,
  businessId: string,
  days: number = 14
): Promise<DailySalesPointDTO[]> {
  const { data, error } = await client.rpc("get_business_daily_sales_series", {
    p_business_id: businessId,
    p_days: days,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  const rows = (data || []) as unknown as {
    local_date: string;
    revenue: number | string;
    quantity: number | string;
    transaction_count: number | string;
  }[];

  return rows.map((r) => ({
    date: r.local_date,
    revenue: Number(r.revenue || 0),
    quantity: Number(r.quantity || 0),
    transactionCount: Number(r.transaction_count || 0),
  }));
}

/**
 * Atomically marks one product as the default for the business, clearing previous default.
 */
export async function setDefaultProduct(
  client: SupabaseClient,
  businessId: string,
  productId: string
): Promise<{ success: boolean; productId: string; businessId: string }> {
  const { data, error } = await client.rpc("set_default_product", {
    p_business_id: businessId,
    p_product_id: productId,
  });

  if (error) {
    throw mapDatabaseError(error);
  }

  return data as { success: boolean; productId: string; businessId: string };
}

/**
 * Atomically voids a specific transaction by ID with full accounting reversal and audit trail.
 */
export async function voidTransaction(
  client: SupabaseClient,
  context: ExecutionContext,
  params: {
    transactionId: string;
    voidReason?: string;
  }
): Promise<CancelResultDTO> {
  const { transactionId, voidReason = "Dibatalkan oleh pengguna" } = params;
  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Pembatalan transaksi dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
  }

  // 1. Fetch target transaction with business isolation
  const { data: tx, error: fetchErr } = await client
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("business_id", context.businessId)
    .single();

  if (fetchErr || !tx) {
    throw new DomainError("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan.");
  }

  if (tx.status === "cancelled") {
    throw new DomainError("TRANSACTION_ALREADY_CANCELLED", "Transaksi ini sudah dibatalkan sebelumnya.");
  }

  if (tx.status === "corrected") {
    throw new DomainError("CANNOT_CANCEL_CORRECTED", "Transaksi historis ini sudah pernah dikoreksi.");
  }

  const nowIso = new Date().toISOString();

  // 2. Mark cancelled
  const { error: updateErr } = await client
    .from("transactions")
    .update({
      status: "cancelled",
      updated_at: nowIso,
    })
    .eq("id", transactionId)
    .eq("business_id", context.businessId);

  if (updateErr) {
    throw mapDatabaseError(updateErr);
  }

  // 3. Insert transaction event audit log
  try {
    await client.from("transaction_events").insert({
      business_id: context.businessId,
      transaction_id: transactionId,
      event_type: "cancelled",
      old_values: {
        status: tx.status,
        quantity: tx.quantity,
        total_amount: tx.total_amount,
      },
      new_values: {
        status: "cancelled",
        reason: voidReason,
      },
      actor_user_id: context.authenticatedUserId || null,
      source: context.source || "dashboard",
    });
  } catch (evErr) {
    console.warn(`[voidTransaction] Audit event warning: ${evErr}`);
  }

  // 4. Void from accounting engine
  try {
    await voidSaleFromAccounting(client, {
      businessId: context.businessId,
      transactionId,
      voidReason,
      actorUserId: context.authenticatedUserId,
    });
  } catch (acctErr) {
    console.warn(`[voidTransaction] Accounting void warning: ${acctErr instanceof Error ? acctErr.message : String(acctErr)}`);
  }

  return {
    transactionId: tx.id,
    businessId: tx.business_id,
    quantity: Number(tx.quantity),
    unit: tx.unit,
    unitPrice: Number(tx.unit_price),
    totalAmount: Number(tx.total_amount),
    status: "cancelled",
    cancelledAt: nowIso,
  };
}

/**
 * Atomically corrects a specific transaction by ID, preserving historical unit price,
 * creating an exact replacement transaction, and executing accounting reversal and re-posting.
 */
export async function correctTransaction(
  client: SupabaseClient,
  context: ExecutionContext,
  params: {
    transactionId: string;
    correctedQuantity: number | string;
    reason?: string;
  }
): Promise<CorrectResultDTO> {
  const { transactionId, reason } = params;
  const rawQty =
    typeof params.correctedQuantity === "number"
      ? params.correctedQuantity
      : parseFloat(params.correctedQuantity);

  if (isNaN(rawQty) || rawQty <= 0) {
    throw new DomainError("INVALID_QUANTITY", "Kuantitas koreksi harus lebih besar dari 0.");
  }

  const gate = await canCreateFinancialMutation(client, context.businessId);
  if (!gate.allowed) {
    throw new DomainError(
      gate.reason || "SUBSCRIPTION_MUTATION_BLOCKED",
      gate.replyText || "Koreksi transaksi dibatasi karena status langganan bisnis tidak aktif atau telah berakhir."
    );
  }

  // 1. Fetch target transaction with business isolation
  const { data: tx, error: fetchErr } = await client
    .from("transactions")
    .select("*, products(name, unit_cost)")
    .eq("id", transactionId)
    .eq("business_id", context.businessId)
    .single();

  if (fetchErr || !tx) {
    throw new DomainError("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan.");
  }

  if (tx.status === "cancelled") {
    throw new DomainError("CANNOT_CORRECT_CANCELLED", "Transaksi yang sudah dibatalkan tidak dapat dikoreksi.");
  }

  if (tx.status === "corrected") {
    throw new DomainError("TRANSACTION_ALREADY_CORRECTED", "Transaksi ini sudah pernah dikoreksi.");
  }

  const nowIso = new Date().toISOString();
  const unitPrice = Number(tx.unit_price);
  const newTotalAmount = Math.round(unitPrice * rawQty);

  // 2. Mark original transaction as corrected
  const { error: origUpdateErr } = await client
    .from("transactions")
    .update({
      status: "corrected",
      updated_at: nowIso,
    })
    .eq("id", transactionId)
    .eq("business_id", context.businessId);

  if (origUpdateErr) throw mapDatabaseError(origUpdateErr);

  // 3. Insert replacement transaction
  const { data: newTx, error: newTxErr } = await client
    .from("transactions")
    .insert({
      business_id: context.businessId,
      product_id: tx.product_id,
      quantity: rawQty,
      unit: tx.unit,
      unit_price: unitPrice,
      total_amount: newTotalAmount,
      status: "confirmed",
      source: context.source || "dashboard",
      raw_message: reason ? `Koreksi: ${reason}` : `Koreksi dari transaksi ${transactionId.slice(0, 8)}`,
      transaction_at: tx.transaction_at,
    })
    .select()
    .single();

  if (newTxErr || !newTx) {
    throw mapDatabaseError(newTxErr || new Error("Gagal membuat transaksi pengganti"));
  }

  // 4. Audit events
  try {
    await client.from("transaction_events").insert([
      {
        business_id: context.businessId,
        transaction_id: transactionId,
        event_type: "corrected",
        old_values: { status: "confirmed", quantity: tx.quantity, total_amount: tx.total_amount },
        new_values: { status: "corrected", replacement_id: newTx.id, reason },
        actor_user_id: context.authenticatedUserId || null,
        source: context.source || "dashboard",
      },
      {
        business_id: context.businessId,
        transaction_id: newTx.id,
        event_type: "created",
        old_values: null,
        new_values: { status: "confirmed", quantity: rawQty, total_amount: newTotalAmount, corrected_from_id: transactionId },
        actor_user_id: context.authenticatedUserId || null,
        source: context.source || "dashboard",
      },
    ]);
  } catch (evErr) {
    console.warn(`[correctTransaction] Audit events warning: ${evErr}`);
  }

  // 5. Accounting: Void original and post replacement
  try {
    await voidSaleFromAccounting(client, {
      businessId: context.businessId,
      transactionId,
      voidReason: reason || "Dikoreksi melalui dashboard",
      actorUserId: context.authenticatedUserId,
    });

    const prodInfo = (tx.products as unknown as { unit_cost?: number; name?: string }) || {};
    const unitCost = Number(prodInfo.unit_cost) || 0;
    const prodName = prodInfo.name || "Produk";

    await postSaleToAccounting(client, {
      businessId: context.businessId,
      transactionId: newTx.id,
      totalAmount: newTotalAmount,
      unitCost,
      quantity: rawQty,
      transactionDate: String(tx.transaction_at).slice(0, 10),
      description: `Koreksi Penjualan ${prodName}`,
      actorUserId: context.authenticatedUserId,
    });
  } catch (acctErr) {
    console.warn(`[correctTransaction] Accounting posting warning: ${acctErr}`);
  }

  return {
    originalTransactionId: transactionId,
    originalQuantity: Number(tx.quantity),
    originalTotalAmount: Number(tx.total_amount),
    newTransactionId: newTx.id,
    newQuantity: rawQty,
    unit: tx.unit,
    unitPrice,
    newTotalAmount,
    correctedAt: nowIso,
  };
}

