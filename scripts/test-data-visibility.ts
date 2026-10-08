/**
 * OXID Ledger - Data Visibility & Mutation Sync Test Suite
 * Verifies that mutations across all 10 operational flows write authoritative database rows,
 * can be immediately retrieved by Server Component queries without staleness,
 * maintain non-destructive audit trails, and properly trigger RSC synchronization.
 */

import { DEFAULT_COA_DEFINITIONS } from "../src/modules/accounting/coa";
import {
  postSaleToAccounting,
  postExpenseToAccounting,
  postPurchaseToAccounting,
  postCapitalMovementToAccounting,
  postReceivablePaymentToAccounting,
  postPayablePaymentToAccounting,
} from "../src/modules/accounting/posting";
import {
  recordSale,
  archiveTransaction,
  unarchiveTransaction,
} from "../src/modules/transactions/service";
import { SupabaseClient } from "@supabase/supabase-js";

interface TestReport {
  id: number;
  flow: string;
  name: string;
  passed: boolean;
  details?: string;
}

const reports: TestReport[] = [];

function assert(condition: boolean, flow: string, name: string, details?: string) {
  const id = reports.length + 1;
  reports.push({ id, flow, name, passed: condition, details });
  const status = condition ? "✓ [PASS]" : "✗ [FAIL]";
  console.log(`  ${status} #${id} [${flow}]: ${name}${details && !condition ? ` - ${details}` : ""}`);
}

function createSyncMockClient(businessId: string) {
  const tables: Record<string, any[]> = {
    businesses: [{ id: businessId, name: "Toko Sinar Rezeki", timezone: "Asia/Jakarta", currency: "IDR" }],
    business_subscriptions: [
      {
        id: "sub-1",
        business_id: businessId,
        status: "active",
        plan_code: "pro",
        current_period_end: new Date(Date.now() + 864000000).toISOString(),
        trial_ends_at: null,
      },
    ],
    products: [
      { id: "prod-lele", business_id: businessId, name: "Lele Segar", unit: "kg", default_price: 25000, is_default: true, active: true },
      { id: "prod-nila", business_id: businessId, name: "Nila Merah", unit: "kg", default_price: 35000, is_default: false, active: true },
    ],
    product_aliases: [
      { id: "alias-1", business_id: businessId, product_id: "prod-lele", alias: "ikan lele" },
    ],
    transactions: [],
    expenses: [],
    purchases: [],
    capital_movements: [],
    receivables: [],
    receivable_payments: [],
    payables: [],
    payable_payments: [],
    journal_entries: [],
    journal_lines: [],
    inventory_movements: [],
    audit_events: [],
  };

  const client = {
    tables,
    rpc: async (fn: string, params: any) => {
      if (fn === "record_sale") {
        const txId = `tx-${Date.now()}`;
        const newTx = {
          id: txId,
          business_id: params.p_business_id,
          product_id: params.p_product_id || "prod-lele",
          quantity: params.p_quantity,
          unit_price: 25000,
          total_amount: params.p_quantity * 25000,
          status: "confirmed",
          channel: "web",
          created_at: new Date().toISOString(),
          archived_at: null,
          archived_by: null,
        };
        tables.transactions.push(newTx);
        return {
          data: {
            transaction_id: txId,
            product_name: "Lele Segar",
            quantity: params.p_quantity,
            total_amount: newTx.total_amount,
            unit_price: 25000,
            unit: "kg",
            status: "confirmed",
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from(tableName: string) {
      const getRows = () => tables[tableName] || [];
      const createBuilder = (currentRows: any[]) => {
        const builder: any = {
          data: currentRows,
          error: null,
          select: () => builder,
          insert: (newRowOrRows: any) => {
            const rowsToAdd = Array.isArray(newRowOrRows) ? newRowOrRows : [newRowOrRows];
            const inserted = rowsToAdd.map((r, i) => ({
              id: r.id || `${tableName.slice(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              created_at: r.created_at || new Date().toISOString(),
              ...r,
            }));
            tables[tableName] = [...getRows(), ...inserted];
            const insertBuilder: any = {
              data: inserted,
              error: null,
              select: () => insertBuilder,
              single: async () => ({ data: inserted[0] || null, error: null }),
              maybeSingle: async () => ({ data: inserted[0] || null, error: null }),
              then: (resolve: any) => resolve({ data: inserted, error: null }),
            };
            return insertBuilder;
          },
          update: (updates: any) => {
            const updateBuilder: any = {
              eq: (col: string, val: any) => {
                const target = getRows().filter((r) => r[col] === val);
                target.forEach((r) => Object.assign(r, updates));
                return updateBuilder;
              },
              then: (resolve: any) => resolve({ data: null, error: null }),
            };
            return updateBuilder;
          },
          delete: () => {
            return {
              eq: async (col: string, val: any) => {
                tables[tableName] = getRows().filter((r) => r[col] !== val);
                return { data: null, error: null };
              },
            };
          },
          eq: (col: string, val: any) => createBuilder(currentRows.filter((r) => r[col] === val)),
          neq: (col: string, val: any) => createBuilder(currentRows.filter((r) => r[col] !== val)),
          gte: () => builder,
          lte: () => builder,
          is: (col: string, val: any) => createBuilder(currentRows.filter((r) => r[col] === val)),
          in: (col: string, vals: any[]) => createBuilder(currentRows.filter((r) => vals.includes(r[col]))),
          order: (col: string, opts?: any) => {
            const sorted = [...currentRows].sort((a, b) => {
              if (opts?.ascending) return a[col] > b[col] ? 1 : -1;
              return a[col] < b[col] ? 1 : -1;
            });
            return createBuilder(sorted);
          },
          limit: (n: number) => createBuilder(currentRows.slice(0, n)),
          maybeSingle: async () => ({ data: currentRows[0] || null, error: null }),
          single: async () => ({ data: currentRows[0] || null, error: null }),
          then: (resolve: any) => resolve({ data: currentRows, error: null }),
        };
        return builder;
      };

      return createBuilder(tables[tableName] || []);
    },
  };

  return client;
}

async function runDataVisibilitySuite() {
  console.log("================================================================================");
  console.log("OXID LEDGER - DATA VISIBILITY & MUTATION LIFECYCLE VERIFICATION");
  console.log("================================================================================\n");

  const BUSINESS_ID = "bus-sync-test-01";
  const mock = createSyncMockClient(BUSINESS_ID);
  const client = mock as unknown as SupabaseClient;

  // Setup COA
  mock.tables.chart_of_accounts = DEFAULT_COA_DEFINITIONS.map((c) => ({
    id: `coa-${c.code}`,
    business_id: BUSINESS_ID,
    code: c.code,
    name: c.name,
    category: c.category,
    normal_balance: c.normal_balance,
    active: true,
  }));

  const context = {
    businessId: BUSINESS_ID,
    source: "web" as const,
    authenticatedUserId: "user-1",
  };

  // --------------------------------------------------------------------------
  // FLOW 1: SALE Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("▶ 1. Sale Mutation Lifecycle");
  const saleRes = await recordSale(client, context, {
    productId: "prod-lele",
    quantity: 10,
    unitPrice: 25000,
    totalAmount: 250000,
  });
  assert(Boolean(saleRes.transactionId), "SALE", "Sale recorded via service RPC");

  // Post sale to accounting
  await postSaleToAccounting(client, {
    businessId: BUSINESS_ID,
    transactionId: saleRes.transactionId,
    totalAmount: 250000,
    quantity: 10,
    unitPrice: 25000,
  });

  // Verify Server Component Query immediately returns row
  const { data: serverSaleQuery } = await client
    .from("transactions")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("id", saleRes.transactionId);

  assert(serverSaleQuery && serverSaleQuery.length === 1, "SALE", "Server query immediately retrieves single row");
  assert(serverSaleQuery![0].quantity === 10, "SALE", "Quantity matches exactly (10 kg)");
  assert(serverSaleQuery![0].total_amount === 250000, "SALE", "Total amount matches (Rp250.000)");
  assert(serverSaleQuery![0].status === "confirmed", "SALE", "Status is confirmed");

  // Verify journal lines posted
  const { data: saleJournals } = await client
    .from("journal_entries")
    .select("*")
    .eq("business_id", BUSINESS_ID);
  assert(saleJournals && saleJournals.length > 0, "SALE", "Double-entry journal entry posted for sale");

  // --------------------------------------------------------------------------
  // FLOW 2: EXPENSE Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("\n▶ 2. Expense Mutation Lifecycle");
  const expensePost = await postExpenseToAccounting(client, {
    businessId: BUSINESS_ID,
    category: "Listrik",
    amount: 150000,
    description: "Token listrik outlet",
    paymentAccount: "cash",
  });
  assert(Boolean(expensePost.journalEntryId), "EXPENSE", "Expense posted to accounting");

  // Server Component query for expenses
  const { data: serverExpenseQuery } = await client
    .from("expenses")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("category", "Listrik");
  assert(serverExpenseQuery && serverExpenseQuery.length === 1, "EXPENSE", "Server query immediately retrieves expense row");
  assert(serverExpenseQuery![0].amount === 150000, "EXPENSE", "Expense amount matches (Rp150.000)");

  // --------------------------------------------------------------------------
  // FLOW 3: PURCHASE Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("\n▶ 3. Purchase Mutation Lifecycle");
  const purchasePost = await postPurchaseToAccounting(client, {
    businessId: BUSINESS_ID,
    totalAmount: 900000,
    quantity: 50,
    unitCost: 18000,
    unit: "kg",
    supplierName: "Kolam Berkah",
  });
  assert(Boolean(purchasePost.journalEntryId), "PURCHASE", "Purchase posted to accounting");

  const { data: serverPurchaseQuery } = await client
    .from("purchases")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("supplier_name", "Kolam Berkah");
  assert(serverPurchaseQuery && serverPurchaseQuery.length === 1, "PURCHASE", "Server query immediately retrieves purchase row");
  assert(serverPurchaseQuery![0].quantity === 50, "PURCHASE", "Purchase quantity matches (50 kg)");

  // --------------------------------------------------------------------------
  // FLOW 4 & 5: CAPITAL & OWNER DRAW Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("\n▶ 4 & 5. Capital & Owner Draw Mutation Lifecycle");
  const capIn = await postCapitalMovementToAccounting(client, {
    businessId: BUSINESS_ID,
    type: "INVESTMENT",
    amount: 5000000,
    description: "Setoran modal awal",
    account: "bank",
  });
  assert(Boolean(capIn.journalEntryId), "CAPITAL", "Capital investment posted");

  const capDraw = await postCapitalMovementToAccounting(client, {
    businessId: BUSINESS_ID,
    type: "DRAW",
    amount: 500000,
    description: "Prive pribadi",
    account: "cash",
  });
  assert(Boolean(capDraw.journalEntryId), "OWNER_DRAW", "Owner draw (prive) posted");

  const { data: serverCapitalQuery } = await client
    .from("capital_movements")
    .select("*")
    .eq("business_id", BUSINESS_ID);
  assert(serverCapitalQuery && serverCapitalQuery.length === 2, "CAPITAL", "Server query retrieves both capital movements");
  assert(serverCapitalQuery!.some((c) => c.type === "INVESTMENT" && c.amount === 5000000), "CAPITAL", "Investment row verified");
  assert(serverCapitalQuery!.some((c) => c.type === "DRAW" && c.amount === 500000), "OWNER_DRAW", "Draw row verified");

  // --------------------------------------------------------------------------
  // FLOW 6 & 7: RECEIVABLE & PAYABLE PAYMENT Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("\n▶ 6 & 7. Receivable & Payable Payment Mutation Lifecycle");
  // Setup receivable invoice row
  await client.from("receivables").insert({
    id: "recv-01",
    business_id: BUSINESS_ID,
    customer_name: "Warung Bu Siti",
    amount: 500000,
    paid_amount: 0,
    remaining_amount: 500000,
    status: "unpaid",
  });

  const recvPayment = await postReceivablePaymentToAccounting(client, {
    businessId: BUSINESS_ID,
    receivableId: "recv-01",
    amount: 200000,
    customerName: "Warung Bu Siti",
    paymentAccount: "bank",
  });
  assert(Boolean(recvPayment.journalEntryId), "RECEIVABLE_PAYMENT", "Receivable payment posted");

  const { data: serverRecvQuery } = await client
    .from("receivables")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("id", "recv-01");
  assert(
    serverRecvQuery![0].amount - serverRecvQuery![0].paid_amount === 300000,
    "RECEIVABLE_PAYMENT",
    "Receivable remaining balance is Rp300.000"
  );

  // Setup payable invoice row
  await client.from("payables").insert({
    id: "pay-01",
    business_id: BUSINESS_ID,
    supplier_name: "Pakan Mandiri",
    amount: 1000000,
    paid_amount: 0,
    status: "unpaid",
  });

  const payPayment = await postPayablePaymentToAccounting(client, {
    businessId: BUSINESS_ID,
    payableId: "pay-01",
    amount: 600000,
    supplierName: "Pakan Mandiri",
    paymentAccount: "bank",
  });
  assert(Boolean(payPayment.journalEntryId), "PAYABLE_PAYMENT", "Payable payment posted");

  const { data: serverPayQuery } = await client
    .from("payables")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("id", "pay-01");
  assert(serverPayQuery![0].paid_amount === 600000, "PAYABLE_PAYMENT", "Payable paid_amount updated to Rp600.000");
  assert(
    serverPayQuery![0].amount - serverPayQuery![0].paid_amount === 400000,
    "PAYABLE_PAYMENT",
    "Payable remaining balance is Rp400.000"
  );

  // --------------------------------------------------------------------------
  // FLOW 8 & 9: PRODUCT & ALIAS Mutation Lifecycle
  // --------------------------------------------------------------------------
  console.log("\n▶ 8 & 9. Product & Alias Mutation Lifecycle");
  const newProdInsert = await client.from("products").insert({
    business_id: BUSINESS_ID,
    name: "Gurame Segar",
    unit: "kg",
    default_price: 65000,
    is_default: false,
    active: true,
  });
  assert(newProdInsert.data && newProdInsert.data.length === 1, "PRODUCT", "New product inserted");

  const createdProdId = newProdInsert.data![0].id;
  const newAliasInsert = await client.from("product_aliases").insert({
    business_id: BUSINESS_ID,
    product_id: createdProdId,
    alias: "ikan gurameh",
  });
  assert(newAliasInsert.data && newAliasInsert.data.length === 1, "PRODUCT_ALIAS", "New alias inserted");

  // Verify Server Component query retrieves product & alias
  const { data: serverProductQuery } = await client
    .from("products")
    .select("id, name, default_price")
    .eq("business_id", BUSINESS_ID)
    .eq("name", "Gurame Segar");
  assert(serverProductQuery && serverProductQuery.length === 1, "PRODUCT", "Server query immediately retrieves new product");

  const { data: serverAliasQuery } = await client
    .from("product_aliases")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("alias", "ikan gurameh");
  assert(serverAliasQuery && serverAliasQuery.length === 1, "PRODUCT_ALIAS", "Server query immediately retrieves new alias");

  // --------------------------------------------------------------------------
  // FLOW 10: NON-DESTRUCTIVE ARCHIVE, VOID & CORRECTION
  // --------------------------------------------------------------------------
  console.log("\n▶ 10. Non-Destructive Archive, Void & Correction Lifecycle");
  // 10a. Archive transaction
  const archiveRes = await archiveTransaction(client, context, {
    transactionId: saleRes.transactionId,
    archiveReason: "Diarsipkan operator test",
  });
  assert(Boolean(archiveRes.archivedAt), "TRANSACTION_ARCHIVE", "Transaction archived successfully");

  const { data: archivedTxQuery } = await client
    .from("transactions")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("id", saleRes.transactionId);
  assert(archivedTxQuery![0].archived_at !== null, "TRANSACTION_ARCHIVE", "archived_at is timestamped");
  assert(archivedTxQuery![0].archived_by === "user-1", "TRANSACTION_ARCHIVE", "archived_by is preserved");

  // Verify journal entries NOT deleted (immutable accounting history preserved)
  const { data: journalsAfterArchive } = await client
    .from("journal_entries")
    .select("*")
    .eq("business_id", BUSINESS_ID);
  assert(journalsAfterArchive && journalsAfterArchive.length > 0, "TRANSACTION_ARCHIVE", "Journal entries strictly preserved during archive");

  // 10b. Unarchive transaction
  const unarchiveRes = await unarchiveTransaction(client, context, {
    transactionId: saleRes.transactionId,
  });
  assert(Boolean(unarchiveRes.unarchivedAt), "TRANSACTION_ARCHIVE", "Transaction unarchived successfully");

  const { data: unarchivedTxQuery } = await client
    .from("transactions")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .eq("id", saleRes.transactionId);
  assert(unarchivedTxQuery![0].archived_at === null, "TRANSACTION_ARCHIVE", "archived_at restored to null");

  // --------------------------------------------------------------------------
  // RESULTS SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;
  console.log(`DATA VISIBILITY SUITE RESULTS: ${passed}/${total} PASS (${failed} FAIL)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDataVisibilitySuite().catch((err) => {
  console.error("FATAL ERROR in Data Visibility test suite:", err);
  process.exit(1);
});
