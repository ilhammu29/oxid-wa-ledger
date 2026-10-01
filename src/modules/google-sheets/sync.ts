import { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureManagedWorksheets,
  getSpreadsheetMetadata,
  writeManagedSheets,
  GoogleSheetsClientConfig,
  GoogleClientError,
  ManagedSheetName,
} from "./client";
import {
  formatConfigSheet,
  formatDailyStatusSheet,
  formatDashboardSheet,
  formatProductsSheet,
  formatTransactionsSheet,
  ProductRowData,
  TransactionRowData,
  DailyStatusRowData,
  SheetMatrix,
} from "./formatters";
import { getOverviewKPIs, getDailySalesSeries } from "../transactions/service";
import { recordIntegrationEvent } from "../monitoring/telemetry";
import { GoogleSheetsSyncRunSummary } from "./types";

export interface SyncExecutionResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetTitle: string;
  summary: GoogleSheetsSyncRunSummary;
}

/**
 * Fetches all necessary business data from Supabase for a full one-way reconciliation sync.
 */
async function fetchBusinessDataForSync(
  client: SupabaseClient,
  businessId: string
) {
  // 1. Business Info
  const { data: business, error: bizErr } = await client
    .from("businesses")
    .select("id, name, timezone")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    throw new Error(`Bisnis tidak ditemukan: ${bizErr?.message || businessId}`);
  }

  const timezone = business.timezone || "Asia/Jakarta";

  // 2. Channel Settings
  const { data: channelSettings } = await client
    .from("business_channel_settings")
    .select("primary_channel, reminder_channel")
    .eq("business_id", businessId)
    .single();

  // 3. Overview KPIs & 14-Day Series
  const kpis = await getOverviewKPIs(client, businessId).catch(() => ({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayTransactionCount: 0,
    todayQuantity: 0,
    timezone,
  }));

  const dailyPoints = await getDailySalesSeries(client, businessId, 14).catch(() => []);
  const dailySeries = dailyPoints.map((p) => ({
    date: p.date,
    revenue: p.revenue,
    transactionCount: p.transactionCount,
  }));

  // 4. Products & Aliases
  const { data: productsData } = await client
    .from("products")
    .select("id, name, unit, default_price, active, is_default")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  const productsList = productsData || [];
  const productIds = productsList.map((p) => p.id);

  const aliasesByProductId: Record<string, string[]> = {};
  if (productIds.length > 0) {
    const { data: aliasesData } = await client
      .from("product_aliases")
      .select("product_id, alias")
      .eq("business_id", businessId)
      .in("product_id", productIds);

    if (aliasesData) {
      for (const row of aliasesData) {
        if (!aliasesByProductId[row.product_id]) {
          aliasesByProductId[row.product_id] = [];
        }
        aliasesByProductId[row.product_id].push(row.alias);
      }
    }
  }

  const productMap = new Map<string, string>();
  for (const p of productsList) {
    productMap.set(p.id, p.name);
  }

  const productsFormatted: ProductRowData[] = productsList.map((p) => ({
    name: p.name,
    unit: p.unit,
    price: Number(p.default_price || 0),
    isActive: Boolean(p.active),
    isDefault: Boolean(p.is_default),
    aliases: aliasesByProductId[p.id] || [],
  }));

  // 5. Transactions
  const { data: transactionsData } = await client
    .from("transactions")
    .select("id, transaction_time, source, product_id, quantity, unit, unit_price, total_amount, status, raw_message")
    .eq("business_id", businessId)
    .order("transaction_time", { ascending: false });

  const transactionsList = transactionsData || [];
  const transactionsFormatted: TransactionRowData[] = transactionsList.map((tx) => {
    const dt = new Date(tx.transaction_time);
    const dateStr = dt.toLocaleDateString("id-ID", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = dt.toLocaleTimeString("id-ID", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const productName = tx.product_id ? productMap.get(tx.product_id) || "Produk Terhapus" : "Standar";

    return {
      id: tx.id,
      transactionDate: dateStr,
      transactionTime: timeStr,
      productName,
      quantity: Number(tx.quantity || 0),
      unit: tx.unit || "kg",
      unitPrice: Number(tx.unit_price || 0),
      totalAmount: Number(tx.total_amount || 0),
      source: tx.source,
      status: tx.status,
      originalMessage: tx.raw_message,
    };
  });

  // 6. Daily Statuses
  const { data: dailyStatusData } = await client
    .from("business_daily_status")
    .select("local_date, status, source, note")
    .eq("business_id", businessId)
    .order("local_date", { ascending: false });

  const dailyStatusesFormatted: DailyStatusRowData[] = (dailyStatusData || []).map((ds) => ({
    date: ds.local_date,
    status: ds.status,
    source: ds.source,
    notes: ds.note,
  }));

  return {
    business: {
      id: business.id,
      name: business.name,
      timezone,
    },
    channelSettings,
    kpis,
    dailySeries,
    products: productsFormatted,
    transactions: transactionsFormatted,
    dailyStatuses: dailyStatusesFormatted,
  };
}

/**
 * Executes a full one-way synchronization from Supabase to a client's Google Spreadsheet.
 * Supabase is the single source of truth; managed worksheets are reconciled completely.
 */
export async function executeBusinessSync(
  client: SupabaseClient,
  businessId: string,
  options?: {
    config?: GoogleSheetsClientConfig;
  }
): Promise<SyncExecutionResult> {
  const startedAt = new Date().toISOString();

  // 1. Check connection
  const { data: connection, error: connErr } = await client
    .from("google_sheets_connections")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (connErr || !connection) {
    throw new Error(`Koneksi Google Sheets untuk bisnis ini tidak ditemukan.`);
  }

  if (!connection.enabled || !connection.spreadsheet_id) {
    throw new Error(`Koneksi Google Sheets sedang dinonaktifkan atau belum memiliki Spreadsheet ID.`);
  }

  const spreadsheetId = connection.spreadsheet_id;

  // Mark connection status as syncing
  await client
    .from("google_sheets_connections")
    .update({
      last_sync_status: "syncing",
      updated_at: startedAt,
    })
    .eq("business_id", businessId);

  try {
    // 2. Fetch authoritative business state
    const data = await fetchBusinessDataForSync(client, businessId);

    // 3. Build managed sheet data matrices
    const now = new Date();
    const sheetsData: Record<ManagedSheetName, SheetMatrix> = {
      Dashboard: formatDashboardSheet(data.business, data.kpis, data.dailySeries, now),
      Transactions: formatTransactionsSheet(data.transactions),
      Products: formatProductsSheet(data.products),
      Daily_Status: formatDailyStatusSheet(data.dailyStatuses),
      Config: formatConfigSheet({
        businessName: data.business.name,
        timezone: data.business.timezone,
        primaryChannel: data.channelSettings?.primary_channel,
        reminderChannel: data.channelSettings?.reminder_channel,
        syncTimestamp: now,
      }),
    };

    // 4. Ensure managed worksheets exist (preserves any custom client sheets)
    await ensureManagedWorksheets(spreadsheetId, options?.config);

    // 5. Write data in bulk with RAW input option
    await writeManagedSheets(spreadsheetId, sheetsData, options?.config);

    // 6. Get updated spreadsheet title
    const meta = await getSpreadsheetMetadata(spreadsheetId, options?.config).catch(() => ({
      title: connection.spreadsheet_title || "Google Spreadsheet",
    }));

    const finishedAt = new Date().toISOString();

    const summary: GoogleSheetsSyncRunSummary = {
      businessId,
      startedAt,
      finishedAt,
      status: "success",
      rowsTransactions: data.transactions.length,
      rowsProducts: data.products.length,
      rowsDailyStatus: data.dailyStatuses.length,
    };

    // 7. Update connection record
    await client
      .from("google_sheets_connections")
      .update({
        spreadsheet_title: meta.title,
        last_sync_at: finishedAt,
        last_sync_status: "success",
        last_error_code: null,
        last_error_message: null,
        updated_at: finishedAt,
      })
      .eq("business_id", businessId);

    // 8. Log sync run
    await client.from("google_sheets_sync_runs").insert({
      business_id: businessId,
      started_at: startedAt,
      finished_at: finishedAt,
      status: "success",
      rows_transactions: summary.rowsTransactions,
      rows_products: summary.rowsProducts,
      rows_daily_status: summary.rowsDailyStatus,
    });

    // 9. Integration event
    await recordIntegrationEvent(client, {
      businessId,
      channel: "telegram",
      direction: "outbound",
      eventType: "google_sheets.sync.completed",
      status: "success",
      metadata: {
        spreadsheetId,
        rowsTransactions: summary.rowsTransactions,
        rowsProducts: summary.rowsProducts,
      },
    }).catch(() => {});

    return {
      success: true,
      spreadsheetId,
      spreadsheetTitle: meta.title,
      summary,
    };
  } catch (err: unknown) {
    const finishedAt = new Date().toISOString();
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = "Terjadi kegagalan sinkronisasi Google Sheets.";

    if (err instanceof GoogleClientError) {
      errorCode = err.errorCode;
      errorMessage = err.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    // Update connection failure status
    await client
      .from("google_sheets_connections")
      .update({
        last_sync_status: "failed",
        last_error_code: errorCode,
        last_error_message: errorMessage.slice(0, 500),
        updated_at: finishedAt,
      })
      .eq("business_id", businessId);

    // Record failed run
    await client.from("google_sheets_sync_runs").insert({
      business_id: businessId,
      started_at: startedAt,
      finished_at: finishedAt,
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage.slice(0, 500),
    });

    // Integration event
    await recordIntegrationEvent(client, {
      businessId,
      channel: "telegram",
      direction: "outbound",
      eventType: "google_sheets.sync.failed",
      status: "failed",
      errorCode,
      metadata: {
        spreadsheetId,
        errorMessage: errorMessage.slice(0, 200),
      },
    }).catch(() => {});

    throw err;
  }
}
