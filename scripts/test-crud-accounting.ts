/**
 * OXID Ledger - Accounting CRUD & Reversal Invariant Test Suite
 * Verifies non-destructive voiding, mathematical equilibrium, and audit trail.
 */

import {
  STANDARD_ACCOUNTS,
  DEFAULT_COA_DEFINITIONS,
} from "../src/modules/accounting/coa";
import {
  postExpenseToAccounting,
  voidExpenseFromAccounting,
  postPurchaseToAccounting,
  voidPurchaseFromAccounting,
  postCapitalMovementToAccounting,
  voidCapitalMovementFromAccounting,
  postReceivablePaymentToAccounting,
  voidReceivablePaymentFromAccounting,
  voidSaleFromAccounting,
} from "../src/modules/accounting/posting";
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

function createMockClient(businessId: string) {
  const tables: Record<string, any[]> = {
    chart_of_accounts: DEFAULT_COA_DEFINITIONS.map((a) => ({
      id: `acc-${a.code}`,
      business_id: businessId,
      code: a.code,
      name: a.name,
      type: a.type,
      normal_balance: a.normal_balance,
      is_active: true,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    journal_entries: [],
    journal_lines: [],
    expenses: [],
    purchases: [],
    capital_movements: [],
    receivables: [],
    receivable_payments: [],
    payables: [],
    payable_payments: [],
    transactions: [],
    transaction_events: [],
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
        eq: (col: string, val: any) => {
          filters.push((row: any) => row[col] === val);
          return queryBuilder;
        },
        neq: (col: string, val: any) => {
          filters.push((row: any) => row[col] !== val);
          return queryBuilder;
        },
        delete: () => {
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

async function runCrudAccountingTests() {
  console.log("=== OXID Ledger: Accounting CRUD & Reversal Invariant Test Suite ===\n");

  const businessId = "biz-test-crud";
  const actorId = "user-test-crud";
  const mockClient = createMockClient(businessId);

  // -------------------------------------------------------------------------
  // 1. EXPENSE CRUD & REVERSAL INVARIANT
  // -------------------------------------------------------------------------
  console.log("--- 1. Expense Lifecycle & Reversal ---");

  const postExpRes = await postExpenseToAccounting(mockClient, {
    businessId,
    amount: 150000,
    category: "operasional",
    description: "Beli ATK",
    actorUserId: actorId,
  });

  assert(Boolean(postExpRes.journalEntryId), "Expense successfully posted with journalEntryId");
  const expLines = mockClient.tables.journal_lines.filter(
    (l) => l.journal_entry_id === postExpRes.journalEntryId
  );
  assert(expLines.length === 2, "Expense creates 2 journal lines");
  const expDebit = expLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const expCredit = expLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  assert(expDebit === 150000 && expCredit === 150000, "Expense posting is in equilibrium (DR == CR == 150.000)");

  // Void the expense
  await voidExpenseFromAccounting(mockClient, {
    businessId,
    expenseId: postExpRes.expenseId,
    voidReason: "Salah input nominal",
    actorUserId: actorId,
  });

  const expenseRow = mockClient.tables.expenses.find((e) => e.id === postExpRes.expenseId);
  assert(expenseRow?.status === "voided", "Expense row status is updated to 'voided' (Non-destructive)");

  const origEntry = mockClient.tables.journal_entries.find((je) => je.id === postExpRes.journalEntryId);
  assert(origEntry?.status === "voided", "Original journal entry status is updated to 'voided'");

  const reversalEntry = mockClient.tables.journal_entries.find(
    (je) => je.id === origEntry?.reversal_entry_id
  );
  assert(Boolean(reversalEntry), "Reversal entry was created in general ledger");

  const revLines = mockClient.tables.journal_lines.filter(
    (l) => l.journal_entry_id === reversalEntry?.id
  );
  assert(revLines.length === 2, "Reversal entry creates 2 balanced lines");
  const revExpDebit = revLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const revExpCredit = revLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  assert(revExpDebit === 150000 && revExpCredit === 150000, "Reversal posting is in equilibrium (DR == CR == 150.000)");

  // Net effect on expense account is 0
  const allExpLines = mockClient.tables.journal_lines.filter((l) => l.account_id === "acc-6900" || l.account_id === "acc-6100");
  const netExpense = allExpLines.reduce((acc, l) => acc + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);
  assert(netExpense === 0, "Net expense impact after void is mathematically zero");

  // -------------------------------------------------------------------------
  // 2. PURCHASE CRUD & REVERSAL INVARIANT
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Purchase Lifecycle & Reversal ---");

  const postPurRes = await postPurchaseToAccounting(mockClient, {
    businessId,
    itemName: "Pakan Lele",
    quantity: 10,
    unit: "zak",
    unitCost: 250000,
    totalAmount: 2500000,
    paymentMethod: "cash",
    actorUserId: actorId,
  });

  assert(Boolean(postPurRes.journalEntryId), "Purchase successfully posted to accounting");
  const purLines = mockClient.tables.journal_lines.filter((l) => l.journal_entry_id === postPurRes.journalEntryId);
  const purDebit = purLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const purCredit = purLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  assert(purDebit === 2500000 && purCredit === 2500000, "Purchase posting is balanced (2.500.000)");

  // Void purchase
  await voidPurchaseFromAccounting(mockClient, {
    businessId,
    purchaseId: postPurRes.purchaseId,
    voidReason: "Barang retur ke supplier",
    actorUserId: actorId,
  });

  const purchaseRow = mockClient.tables.purchases.find((p) => p.id === postPurRes.purchaseId);
  assert(purchaseRow?.status === "voided", "Purchase row status is updated to 'voided'");

  const allInvLines = mockClient.tables.journal_lines.filter((l) => l.account_id === "acc-1400");
  const netInventory = allInvLines.reduce((acc, l) => acc + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);
  assert(netInventory === 0, "Net inventory impact after void is mathematically zero");

  // -------------------------------------------------------------------------
  // 3. CAPITAL & PRIVE CRUD & REVERSAL INVARIANT
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Capital & Prive Lifecycle & Reversal ---");

  const postCapRes = await postCapitalMovementToAccounting(mockClient, {
    businessId,
    type: "CAPITAL_IN",
    amount: 10000000,
    description: "Setoran modal awal",
    actorUserId: actorId,
  });

  assert(Boolean(postCapRes.journalEntryId), "Capital addition successfully posted");

  await voidCapitalMovementFromAccounting(mockClient, {
    businessId,
    movementId: postCapRes.movementId,
    voidReason: "Koreksi setoran modal",
    actorUserId: actorId,
  });

  const capRow = mockClient.tables.capital_movements.find((c) => c.id === postCapRes.movementId);
  assert(capRow?.status === "voided", "Capital movement row status marked 'voided'");

  const allEquityLines = mockClient.tables.journal_lines.filter((l) => l.account_id === "acc-3100");
  const netEquity = allEquityLines.reduce((acc, l) => acc + (Number(l.credit) || 0) - (Number(l.debit) || 0), 0);
  assert(netEquity === 0, "Net equity impact after void is mathematically zero");

  // -------------------------------------------------------------------------
  // 4. RECEIVABLE & PAYABLE PAYMENT VOID INVARIANT
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Receivables & Payables Payments ---");

  const recvId = "recv-001";
  mockClient.tables.receivables.push({
    id: recvId,
    business_id: businessId,
    customer_name: "Pak Joko",
    total_amount: 1000000,
    paid_amount: 0,
    status: "unpaid",
  });

  const postRpayRes = await postReceivablePaymentToAccounting(mockClient, {
    businessId,
    receivableId: recvId,
    amount: 500000,
    actorUserId: actorId,
  });

  assert(Boolean(postRpayRes.journalEntryId), "Receivable payment successfully posted");

  await voidReceivablePaymentFromAccounting(mockClient, {
    businessId,
    paymentId: postRpayRes.paymentId,
    voidReason: "Cek giro bilyet tolak",
    actorUserId: actorId,
  });

  const rpayRow = mockClient.tables.receivable_payments.find((p) => p.id === postRpayRes.paymentId);
  assert(rpayRow?.status === "voided", "Receivable payment marked 'voided'");

  // -------------------------------------------------------------------------
  // 5. TRANSACTION SALE VOID & COGS REVERSAL
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Sale Transaction Void & Full COGS Reversal ---");

  const txId = "tx-001";
  mockClient.tables.transactions.push({
    id: txId,
    business_id: businessId,
    total_amount: 500000,
    status: "confirmed",
  });

  const entryId = "entry-tx-001";
  mockClient.tables.journal_entries.push({
    id: entryId,
    entry_number: "JRN-20261008-0001",
    business_id: businessId,
    source_type: "SALE",
    source_id: txId,
    status: "posted",
    description: "Penjualan lele 20kg",
  });
  mockClient.tables.journal_lines.push(
    { journal_entry_id: entryId, account_id: "acc-1100", debit: 500000, credit: 0 },
    { journal_entry_id: entryId, account_id: "acc-4100", debit: 0, credit: 500000 },
    { journal_entry_id: entryId, account_id: "acc-5100", debit: 350000, credit: 0 },
    { journal_entry_id: entryId, account_id: "acc-1400", debit: 0, credit: 350000 }
  );

  await voidSaleFromAccounting(mockClient, {
    businessId,
    transactionId: txId,
    voidReason: "Pembeli batal transaksi",
    actorUserId: actorId,
  });

  const origTxEntry = mockClient.tables.journal_entries.find((je) => je.id === entryId);
  assert(origTxEntry?.status === "voided", "Original sale journal entry status is updated to 'voided'");

  const saleReversalEntry = mockClient.tables.journal_entries.find(
    (je) => je.id === origTxEntry?.reversal_entry_id
  );
  assert(Boolean(saleReversalEntry), "Sale transaction void successfully posted reversal");
  const saleReversalLines = mockClient.tables.journal_lines.filter(
    (l) => l.journal_entry_id === saleReversalEntry?.id
  );
  assert(saleReversalLines.length === 4, "Reversal entry has exact 4 symmetric inverse lines");
  const revDebitTotal = saleReversalLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const revCreditTotal = saleReversalLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  assert(revDebitTotal === 850000 && revCreditTotal === 850000, "Reversal debit == credit == 850.000");

  console.log("\n=== CRUD Accounting Verification Complete ===");
  const passedCount = reports.filter((r) => r.passed).length;
  console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${reports.length - passedCount}`);

  if (passedCount < reports.length) {
    process.exit(1);
  }
}

runCrudAccountingTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
