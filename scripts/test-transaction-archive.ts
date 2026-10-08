/**
 * OXID Ledger - Transaction Archive & Non-Destructive Delete Test Suite
 * Verifies that operational archiving hides transactions without altering
 * double-entry accounting balances, journal lines, or audit histories.
 */

import {
  archiveTransaction,
  unarchiveTransaction,
  voidTransaction,
  correctTransaction,
} from "../src/modules/transactions/service";
import { postSaleToAccounting } from "../src/modules/accounting/posting";
import { DEFAULT_COA_DEFINITIONS } from "../src/modules/accounting/coa";
import { SupabaseClient } from "@supabase/supabase-js";

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const reports: TestReport[] = [];

function assert(condition: boolean, name: string, details?: string) {
  const id = reports.length + 1;
  reports.push({ id, name, passed: condition, details });
  const status = condition ? "✓ [PASS]" : "✗ [FAIL]";
  console.log(`  ${status} #${id}: ${name}${details && !condition ? ` - ${details}` : ""}`);
}

function createMockClient(businessAId: string, businessBId: string) {
  const tables: Record<string, any[]> = {
    businesses: [
      { id: businessAId, name: "Bisnis A", is_active: true },
      { id: businessBId, name: "Bisnis B", is_active: true },
    ],
    subscriptions: [
      { id: "sub-a", business_id: businessAId, status: "active", plan: "pro" },
      { id: "sub-b", business_id: businessBId, status: "active", plan: "pro" },
    ],
    products: [
      {
        id: "prod-001",
        business_id: businessAId,
        name: "Lele Segar",
        unit: "kg",
        unit_cost: 18000,
        default_price: 25000,
        stock: 100,
        active: true,
      },
    ],
    chart_of_accounts: [
      ...DEFAULT_COA_DEFINITIONS.map((a) => ({
        id: `acc-a-${a.code}`,
        business_id: businessAId,
        code: a.code,
        name: a.name,
        type: a.type,
        normal_balance: a.normal_balance,
      })),
      ...DEFAULT_COA_DEFINITIONS.map((a) => ({
        id: `acc-b-${a.code}`,
        business_id: businessBId,
        code: a.code,
        name: a.name,
        type: a.type,
        normal_balance: a.normal_balance,
      })),
    ],
    transactions: [],
    transaction_events: [],
    journal_entries: [],
    journal_lines: [],
    accounting_audit_logs: [],
    inventory_movements: [],
  };

  const client = {
    rpc: async () => ({ data: null, error: null }),
    from: (tableName: string) => {
      let currentTable = tables[tableName] || (tables[tableName] = []);
      let filters: Array<(row: any) => boolean> = [];
      let updates: any = null;
      let inserts: any = null;
      let isSingle = false;

      const queryBuilder: any = {
        select: (_cols?: string) => queryBuilder,
        insert: (data: any) => {
          inserts = Array.isArray(data) ? data : [data];
          inserts.forEach((d: any) => {
            if (!d.id) d.id = `mock-${tableName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            if (!d.created_at) d.created_at = new Date().toISOString();
            if (tableName === "journal_entries" && !d.entry_number) d.entry_number = `JE-${Date.now()}`;
            currentTable.push(d);
          });
          return queryBuilder;
        },
        update: (data: any) => {
          updates = data;
          return queryBuilder;
        },
        delete: () => queryBuilder,
        eq: (col: string, val: any) => {
          filters.push((row: any) => row[col] === val);
          return queryBuilder;
        },
        neq: (col: string, val: any) => {
          filters.push((row: any) => row[col] !== val);
          return queryBuilder;
        },
        is: (col: string, val: any) => {
          filters.push((row: any) => row[col] === val);
          return queryBuilder;
        },
        not: (col: string, op: string, val: any) => {
          if (op === "is") {
            filters.push((row: any) => row[col] !== val);
          }
          return queryBuilder;
        },
        order: () => queryBuilder,
        limit: () => queryBuilder,
        single: () => {
          isSingle = true;
          return queryBuilder;
        },
        maybeSingle: () => {
          isSingle = true;
          return queryBuilder;
        },
        then: (resolve: any) => {
          let rows = inserts && filters.length === 0 ? [...inserts] : currentTable.filter((r: any) => filters.every((f) => f(r)));
          if (updates) {
            rows.forEach((r: any) => {
              Object.assign(r, updates);
            });
          }
          if (tableName === "journal_entries") {
            rows = rows.map((r: any) => ({
              ...r,
              journal_lines: tables.journal_lines.filter((l: any) => l.journal_entry_id === r.id || l.entry_id === r.id),
            }));
          }
          if (tableName === "transactions") {
            rows = rows.map((r: any) => ({
              ...r,
              products: tables.products.find((p: any) => p.id === r.product_id) || null,
            }));
          }
          if (isSingle) {
            resolve({ data: rows[0] || null, error: null });
          } else {
            resolve({ data: rows, error: null });
          }
        },
      };

      return queryBuilder;
    },
    tables,
  };

  return client as unknown as SupabaseClient & { tables: Record<string, any[]> };
}

async function runTransactionArchiveTests() {
  console.log("=== OXID Ledger: Transaction Archive & UX Refinement Test Suite ===\n");

  const businessA = "biz-corp-a";
  const businessB = "biz-corp-b";
  const actorUserA = "user-owner-a";
  const actorUserB = "user-owner-b";

  const mockClient = createMockClient(businessA, businessB);

  // Seed a sale transaction for Business A with posted accounting journal
  const tx1Id = "tx-sample-001";
  mockClient.tables.transactions.push({
    id: tx1Id,
    business_id: businessA,
    product_id: "prod-001",
    quantity: 10,
    unit: "kg",
    unit_price: 25000,
    total_amount: 250000,
    status: "confirmed",
    source: "dashboard",
    transaction_at: new Date().toISOString(),
    archived_at: null,
    archived_by: null,
    archive_reason: null,
  });

  // Post sale to accounting
  await postSaleToAccounting(mockClient, {
    businessId: businessA,
    transactionId: tx1Id,
    totalAmount: 250000,
    unitCost: 18000,
    quantity: 10,
    actorUserId: actorUserA,
  });

  assert(mockClient.tables.journal_entries.length > 0, "Initial transaction posted to general ledger");

  const initialJournalCount = mockClient.tables.journal_entries.length;
  const initialLinesCount = mockClient.tables.journal_lines.length;
  const initialTotalDebit = mockClient.tables.journal_lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const initialTotalCredit = mockClient.tables.journal_lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

  // -------------------------------------------------------------------------
  // 1. Basic Non-Destructive Archive (Hapus)
  // -------------------------------------------------------------------------
  console.log("\n--- 1. Non-Destructive Archive Execution ---");

  const archiveRes = await archiveTransaction(
    mockClient,
    { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
    { transactionId: tx1Id, archiveReason: "Salah entri dobel" }
  );

  assert(archiveRes.transactionId === tx1Id, "archiveTransaction returns transactionId");
  assert(Boolean(archiveRes.archivedAt), "archiveTransaction records timestamp");

  const txRow = mockClient.tables.transactions.find((t) => t.id === tx1Id);
  assert(txRow?.archived_at === archiveRes.archivedAt, "Transaction row has archived_at timestamp populated");
  assert(txRow?.archived_by === actorUserA, "Transaction row has archived_by actor populated");
  assert(txRow?.archive_reason === "Salah entri dobel", "Transaction row has archive_reason saved");

  // -------------------------------------------------------------------------
  // 2. Accounting Invariant Zero-Mutation Guarantee
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Accounting Invariant Zero-Mutation Guarantee ---");

  const afterJournalCount = mockClient.tables.journal_entries.length;
  const afterLinesCount = mockClient.tables.journal_lines.length;
  const afterTotalDebit = mockClient.tables.journal_lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const afterTotalCredit = mockClient.tables.journal_lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

  assert(afterJournalCount === initialJournalCount, "Archive does NOT delete or create any journal entry");
  assert(afterLinesCount === initialLinesCount, "Archive does NOT alter journal lines count");
  assert(afterTotalDebit === initialTotalDebit, "Total debit across ledger remains 100% unchanged (250k + 180k)");
  assert(afterTotalCredit === initialTotalCredit, "Total credit across ledger remains 100% unchanged (250k + 180k)");

  // -------------------------------------------------------------------------
  // 3. Operational Filter: Default Hides Archived, 'archived' View Exposes
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Operational List Visibility Filter ---");

  // Default query (active only)
  let activeQuery = mockClient.tables.transactions.filter(
    (t) => t.business_id === businessA && t.archived_at === null
  );
  assert(activeQuery.length === 0, "Default operational query excludes archived transactions");

  // Archived query (archived only)
  let archivedQuery = mockClient.tables.transactions.filter(
    (t) => t.business_id === businessA && t.archived_at !== null
  );
  assert(archivedQuery.length === 1 && archivedQuery[0].id === tx1Id, "Archived filter query includes archived transaction");

  // -------------------------------------------------------------------------
  // 4. Archive Idempotency & Re-archive Rejection
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Idempotency & Re-archive Guard ---");

  let doubleArchiveThrew = false;
  try {
    await archiveTransaction(
      mockClient,
      { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
      { transactionId: tx1Id }
    );
  } catch (err: any) {
    if (err.code === "TRANSACTION_ALREADY_ARCHIVED") doubleArchiveThrew = true;
  }
  assert(doubleArchiveThrew, "Re-archiving an already archived transaction throws TRANSACTION_ALREADY_ARCHIVED");

  // -------------------------------------------------------------------------
  // 5. Multi-Tenant Isolation
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Multi-Tenant Isolation ---");

  let crossTenantThrew = false;
  try {
    await archiveTransaction(
      mockClient,
      { businessId: businessB, authenticatedUserId: actorUserB, source: "dashboard" },
      { transactionId: tx1Id } // Belongs to business A
    );
  } catch (err: any) {
    if (err.code === "TRANSACTION_NOT_FOUND") crossTenantThrew = true;
  }
  assert(crossTenantThrew, "Cross-tenant archive attempt throws TRANSACTION_NOT_FOUND");

  // -------------------------------------------------------------------------
  // 6. Audit Trail Retention in accounting_audit_logs
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Audit Trail Retention ---");

  const auditLog = mockClient.tables.accounting_audit_logs.find(
    (l) => l.action === "TRANSACTION_ARCHIVE" && l.entity_id === tx1Id
  );
  assert(Boolean(auditLog), "TRANSACTION_ARCHIVE event recorded in accounting_audit_logs");
  assert(auditLog?.actor_user_id === actorUserA, "Audit log correctly records actor_user_id");

  // -------------------------------------------------------------------------
  // 7. Restoring / Unarchiving Transaction
  // -------------------------------------------------------------------------
  console.log("\n--- 7. Unarchive / Restore Execution ---");

  const unarchiveRes = await unarchiveTransaction(
    mockClient,
    { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
    { transactionId: tx1Id }
  );
  assert(unarchiveRes.transactionId === tx1Id, "unarchiveTransaction returns transactionId");
  assert(txRow?.archived_at === null, "Transaction row archived_at is reset to null");

  // Re-checking active query
  activeQuery = mockClient.tables.transactions.filter(
    (t) => t.business_id === businessA && t.archived_at === null
  );
  assert(activeQuery.length === 1, "Restored transaction reappears in active operational query");

  // -------------------------------------------------------------------------
  // 8. Archived Transaction Can Still Be Voided / Reconciled
  // -------------------------------------------------------------------------
  console.log("\n--- 8. Reversal & Void on Archived Transaction ---");

  // Re-archive it first
  await archiveTransaction(
    mockClient,
    { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
    { transactionId: tx1Id, archiveReason: "Arsip sebelum pembatalan" }
  );

  // Now void the archived transaction
  await voidTransaction(
    mockClient,
    { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
    { transactionId: tx1Id, voidReason: "Dibatalkan saat sudah terarsip" }
  );

  assert(txRow?.status === "cancelled", "Archived transaction can be safely cancelled/voided");
  const reversalEntry = mockClient.tables.journal_entries.find(
    (je) => je.source_type === "VOID_REVERSAL"
  );
  assert(Boolean(reversalEntry), "Void on archived transaction creates symmetric reversal journal entry");

  // -------------------------------------------------------------------------
  // 9. State Transition Guards: Cancelled vs Corrected
  // -------------------------------------------------------------------------
  console.log("\n--- 9. State Transition Invariants ---");

  // Cannot correct a cancelled transaction
  let correctCancelledThrew = false;
  try {
    await correctTransaction(
      mockClient,
      { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
      { transactionId: tx1Id, correctedQuantity: 12, reason: "Ubah jumlah" }
    );
  } catch (err: any) {
    if (err.code === "CANNOT_CORRECT_CANCELLED") correctCancelledThrew = true;
  }
  assert(correctCancelledThrew, "Correcting a cancelled transaction is strictly rejected (CANNOT_CORRECT_CANCELLED)");

  // Create another confirmed transaction, correct it, then test cannot cancel corrected
  const tx2Id = "tx-sample-002";
  mockClient.tables.transactions.push({
    id: tx2Id,
    business_id: businessA,
    product_id: "prod-001",
    quantity: 5,
    unit: "kg",
    unit_price: 25000,
    total_amount: 125000,
    status: "confirmed",
    source: "dashboard",
    transaction_at: new Date().toISOString(),
    archived_at: null,
  });

  await correctTransaction(
    mockClient,
    { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
    { transactionId: tx2Id, correctedQuantity: 8, reason: "Koreksi jumlah" }
  );

  let cancelCorrectedThrew = false;
  try {
    await voidTransaction(
      mockClient,
      { businessId: businessA, authenticatedUserId: actorUserA, source: "dashboard" },
      { transactionId: tx2Id, voidReason: "Coba batal yang sudah koreksi" }
    );
  } catch (err: any) {
    if (err.code === "CANNOT_CANCEL_CORRECTED") cancelCorrectedThrew = true;
  }
  assert(cancelCorrectedThrew, "Cancelling an already corrected transaction is strictly rejected (CANNOT_CANCEL_CORRECTED)");

  console.log("\n=== Transaction Archive & UX Refinement Tests Complete ===");
  const passedCount = reports.filter((r) => r.passed).length;
  console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${reports.length - passedCount}`);

  if (passedCount < reports.length) {
    process.exit(1);
  }
}

runTransactionArchiveTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
