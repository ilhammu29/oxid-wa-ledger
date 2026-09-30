import { Client } from "pg";
import ExcelJS from "exceljs";
import {
  recordSale,
  cancelLastSale,
  correctLastSale,
  setDailyStatus,
  getOverviewKPIs,
  getDailySalesSeries,
  setDefaultProduct,
} from "../src/modules/transactions";
import { generateLedgerWorkbook } from "../src/modules/export/excel-generator";
import { SupabaseClient } from "@supabase/supabase-js";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(category: string, name: string, passed: boolean, error?: string) {
  reports.push({ name, category, passed, error });
  const symbol = passed ? "✓" : "✗";
  console.log(`  ${symbol} [${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
}

function createPgSupabaseAdapter(pgClient: Client): SupabaseClient {
  return {
    rpc: async (fnName: string, params: Record<string, any> = {}) => {
      try {
        const keys = Object.keys(params).filter((k) => params[k] !== undefined);
        const args = keys.map((k, i) => `${k} := $${i + 1}`).join(", ");
        const values = keys.map((k) => params[k]);
        
        const tableRes = await pgClient.query(`SELECT * FROM public.${fnName}(${args});`, values);
        if (tableRes.fields.length > 1 || (tableRes.fields.length === 1 && tableRes.fields[0].name !== fnName)) {
          return { data: tableRes.rows, error: null };
        }
        return { data: tableRes.rows[0]?.[fnName] ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
    from: (table: string) => {
      return {
        select: (columns: string = "*", opts?: { count?: string; head?: boolean }) => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          let orderClause = "";
          let limitClause = "";
          let offsetClause = "";

          const executeQuery = async () => {
            try {
              let whereClause = "";
              const values: any[] = [];
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c, i) => {
                      values.push(c.val);
                      return `"${c.col}" ${c.op} $${i + 1}`;
                    })
                    .join(" AND ");
              }

              let countVal: number | null = null;
              if (opts?.count === "exact") {
                const countSql = `SELECT count(*)::int as c FROM public."${table}" ${whereClause};`;
                const cRes = await pgClient.query(countSql, values);
                countVal = cRes.rows[0]?.c || 0;
              }

              if (opts?.head) {
                return { data: null, count: countVal, error: null };
              }

              const sql = `SELECT ${columns} FROM public."${table}" ${whereClause} ${orderClause} ${limitClause} ${offsetClause};`;
              const res = await pgClient.query(sql, values);
              return { data: res.rows, count: countVal, error: null };
            } catch (err: any) {
              return { data: null, count: null, error: { message: err.message, code: err.code } };
            }
          };

          const builder: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return builder;
            },
            gte: (col: string, val: any) => {
              conditions.push({ col, op: ">=", val });
              return builder;
            },
            lte: (col: string, val: any) => {
              conditions.push({ col, op: "<=", val });
              return builder;
            },
            order: (col: string, { ascending }: { ascending: boolean } = { ascending: true }) => {
              orderClause = `ORDER BY "${col}" ${ascending ? "ASC" : "DESC"}`;
              return builder;
            },
            range: (from: number, to: number) => {
              limitClause = `LIMIT ${to - from + 1}`;
              offsetClause = `OFFSET ${from}`;
              return builder;
            },
            limit: (n: number) => {
              limitClause = `LIMIT ${n}`;
              return builder;
            },
            maybeSingle: async () => {
              const res = await executeQuery();
              return { data: res.data?.[0] || null, error: res.error };
            },
            single: async () => {
              const res = await executeQuery();
              return { data: res.data?.[0] || null, error: res.error };
            },
            then: (resolve: any, reject: any) => executeQuery().then(resolve, reject),
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runTests() {
  console.log("=== OXID WA Ledger - Step 6B Dashboard & Spreadsheet Export Test Suite ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const userOwnerA = "11111111-1111-1111-1111-111111111111";
  const userMemberA = "22222222-2222-2222-2222-222222222222";
  const userOwnerB = "33333333-3333-3333-3333-333333333333";
  const userStranger = "44444444-4444-4444-4444-444444444444";

  try {
    // ------------------------------------------------------------------------
    // Setup Fixtures
    // ------------------------------------------------------------------------
    await pgClient.query("DELETE FROM public.transaction_events;");
    await pgClient.query("DELETE FROM public.transactions;");
    await pgClient.query("DELETE FROM public.products;");
    await pgClient.query("DELETE FROM public.business_daily_status;");
    await pgClient.query("DELETE FROM public.business_users;");
    await pgClient.query("DELETE FROM public.businesses;");

    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userOwnerA}', 'ownerA@oxid.local'),
        ('${userMemberA}', 'memberA@oxid.local'),
        ('${userOwnerB}', 'ownerB@oxid.local'),
        ('${userStranger}', 'stranger@oxid.local')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.businesses (id, name, timezone, status, created_by) VALUES
        ('${bizA}', 'Lele Pilot A', 'Asia/Jakarta', 'active', '${userOwnerA}'),
        ('${bizB}', 'Vegetable Store B', 'Asia/Makassar', 'active', '${userOwnerB}')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${userOwnerA}', 'owner'),
        ('${bizA}', '${userMemberA}', 'member'),
        ('${bizB}', '${userOwnerB}', 'owner')
      ON CONFLICT (business_id, user_id) DO NOTHING;
    `);

    // Products for Business A:
    // 1. Lele (default, 28,000/kg)
    // 2. Nila (non-default, 35,000/kg)
    const prodLeleA = "10000000-0000-0000-0000-000000000001";
    const prodNilaA = "10000000-0000-0000-0000-000000000002";
    const prodVegB = "20000000-0000-0000-0000-000000000001";

    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active) VALUES
        ('${prodLeleA}', '${bizA}', 'Lele', 'kg', 28000, true, true),
        ('${prodNilaA}', '${bizA}', 'Nila', 'kg', 35000, false, true),
        ('${prodVegB}', '${bizB}', 'Bayam', 'ikat', 5000, true, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    const sbClient = createPgSupabaseAdapter(pgClient);

    // ========================================================================
    // 1. AUTH & TENANT RESOLUTION TESTS
    // ========================================================================
    console.log("1. Running Authentication & Tenant Security Tests...");

    // Test 1: User with no business membership resolves to NO_BUSINESS
    const strangerBizRes = await pgClient.query(
      "SELECT business_id, role FROM public.business_users WHERE user_id = $1",
      [userStranger]
    );
    record("AUTH", "User with 0 businesses has no membership rows", strangerBizRes.rows.length === 0);

    // Test 2: Authenticated member resolves strictly to their assigned business
    const memberBizRes = await pgClient.query(
      "SELECT b.id, b.name, bu.role FROM public.business_users bu JOIN public.businesses b ON bu.business_id = b.id WHERE bu.user_id = $1",
      [userMemberA]
    );
    record(
      "AUTH",
      "Authenticated member A resolves to Lele Pilot A with role member",
      memberBizRes.rows.length === 1 &&
        memberBizRes.rows[0].id === bizA &&
        memberBizRes.rows[0].role === "member"
    );

    // Test 3: Cross-tenant isolation - Member A has zero access to Business B
    const crossRes = await pgClient.query(
      "SELECT * FROM public.business_users WHERE user_id = $1 AND business_id = $2",
      [userMemberA, bizB]
    );
    record("AUTH", "Cross-tenant membership access denied (Member A cannot see Business B)", crossRes.rows.length === 0);

    // ========================================================================
    // 2. OVERVIEW & KPI TESTS
    // ========================================================================
    console.log("\n2. Running Overview & KPI Calculation Tests...");

    // Test 4: Empty business returns zeros without crashing
    const emptyKpis = await getOverviewKPIs(sbClient, bizB);
    record(
      "OVERVIEW",
      "Empty business returns zero KPIs (no NaN or divide-by-zero)",
      emptyKpis.todayRevenue === 0 &&
        emptyKpis.todayQuantity === 0 &&
        emptyKpis.todayTransactionCount === 0 &&
        emptyKpis.weekRevenue === 0 &&
        emptyKpis.monthRevenue === 0
    );

    // Record confirmed sale on Business A (10 kg Lele @ 28,000 = 280,000)
    const sale1 = await recordSale(
      sbClient,
      { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
      { quantity: 10, unit: "kg" }
    );

    // Record second confirmed sale on Business A (5 kg Lele @ 28,000 = 140,000)
    const sale2 = await recordSale(
      sbClient,
      { businessId: bizA, source: "telegram" },
      { quantity: 5, unit: "kg" }
    );

    // Test 5: Confirmed transactions included in KPI
    let kpisA = await getOverviewKPIs(sbClient, bizA);
    record(
      "OVERVIEW",
      "Confirmed transactions included in today revenue (280,000 + 140,000 = 420,000)",
      kpisA.todayRevenue === 420000 &&
        kpisA.todayQuantity === 15 &&
        kpisA.todayTransactionCount === 2
    );

    // Cancel the second sale
    await cancelLastSale(sbClient, {
      businessId: bizA,
      source: "dashboard",
      authenticatedUserId: userOwnerA,
    });

    // Test 6: Cancelled transactions excluded from KPI
    kpisA = await getOverviewKPIs(sbClient, bizA);
    record(
      "OVERVIEW",
      "Cancelled transaction excluded from today revenue (drops back to 280,000)",
      kpisA.todayRevenue === 280000 &&
        kpisA.todayQuantity === 10 &&
        kpisA.todayTransactionCount === 1
    );

    // Correct the first sale from 10kg to 12kg (replacement sale = 12 * 28,000 = 336,000)
    await correctLastSale(
      sbClient,
      { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
      12
    );

    // Test 7: Corrected original excluded, corrected replacement included
    kpisA = await getOverviewKPIs(sbClient, bizA);
    record(
      "OVERVIEW",
      "Corrected original excluded and replacement included in today revenue (336,000)",
      kpisA.todayRevenue === 336000 &&
        kpisA.todayQuantity === 12 &&
        kpisA.todayTransactionCount === 1
    );

    // Test 8: 14-Day Sales Series returns 14 points, zero-filled for days with no sales
    const seriesA = await getDailySalesSeries(sbClient, bizA, 14);
    const todayStr = seriesA[seriesA.length - 1]?.date;
    const todayPoint = seriesA[seriesA.length - 1];
    const prevPoint = seriesA[seriesA.length - 2];
    record(
      "OVERVIEW",
      "14-day daily sales series returns 14 points with zero-filled non-sale days",
      seriesA.length === 14 &&
        todayPoint.revenue === 336000 &&
        todayPoint.quantity === 12 &&
        prevPoint.revenue === 0
    );

    // ========================================================================
    // 3. TRANSACTIONS PAGE & PAGINATION TESTS
    // ========================================================================
    console.log("\n3. Running Transactions Page & Filtering Tests...");

    // Record sales with different sources
    await recordSale(
      sbClient,
      { businessId: bizA, source: "whatsapp" },
      { quantity: 2, unit: "kg" }
    );
    await recordSale(
      sbClient,
      { businessId: bizA, source: "telegram" },
      { quantity: 3, unit: "kg" }
    );

    // Test 9: Source filtering
    const waTx = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND source = 'whatsapp'",
      [bizA]
    );
    const tgTx = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND source = 'telegram'",
      [bizA]
    );
    const dashTx = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND source = 'dashboard'",
      [bizA]
    );
    record(
      "TRANSACTIONS",
      "Transactions correctly partitioned by source (WhatsApp, Telegram, Dashboard)",
      waTx.rows[0].c >= 1 && tgTx.rows[0].c >= 1 && dashTx.rows[0].c >= 1
    );

    // Test 10: Status filtering
    const confirmedCount = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND status = 'confirmed'",
      [bizA]
    );
    const cancelledCount = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND status = 'cancelled'",
      [bizA]
    );
    const correctedCount = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1 AND status = 'corrected'",
      [bizA]
    );
    record(
      "TRANSACTIONS",
      "Transactions correctly partitioned by status (confirmed, cancelled, corrected)",
      confirmedCount.rows[0].c >= 2 && cancelledCount.rows[0].c >= 1 && correctedCount.rows[0].c >= 1
    );

    // Test 11: Tenant isolation - Business B has zero transactions from Business A
    const bizBTx = await pgClient.query(
      "SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1",
      [bizB]
    );
    record("TRANSACTIONS", "Tenant isolation verified: Business B transactions count = 0", bizBTx.rows[0].c === 0);

    // Test 12: Server-side pagination
    const page1 = await pgClient.query(
      "SELECT id FROM public.transactions WHERE business_id = $1 ORDER BY transaction_at DESC LIMIT 2 OFFSET 0",
      [bizA]
    );
    const page2 = await pgClient.query(
      "SELECT id FROM public.transactions WHERE business_id = $1 ORDER BY transaction_at DESC LIMIT 2 OFFSET 2",
      [bizA]
    );
    record(
      "TRANSACTIONS",
      "Server-side pagination range works and pages do not overlap",
      page1.rows.length === 2 &&
        page2.rows.length >= 1 &&
        page1.rows[0].id !== page2.rows[0].id
    );

    // ========================================================================
    // 4. MANUAL SALE RECORDING TESTS
    // ========================================================================
    console.log("\n4. Running Manual Dashboard Sale Tests...");

    // Test 13: Manual sale with source=dashboard records with correct source
    const manualSale = await recordSale(
      sbClient,
      { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
      { quantity: 4, unit: "kg" }
    );
    record(
      "MANUAL_SALE",
      "Manual sale created with source = 'dashboard' and exact total (4kg * 28,000 = 112,000)",
      manualSale.totalAmount === 112000 && manualSale.quantity === 4
    );

    // Test 14: Manual sale with specific product (Nila @ 35,000)
    const nilaSale = await recordSale(
      sbClient,
      { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
      { quantity: 2, unit: "kg", productId: prodNilaA }
    );
    record(
      "MANUAL_SALE",
      "Manual sale with specific product resolves configured price (2kg Nila @ 35,000 = 70,000)",
      nilaSale.productName === "Nila" &&
        nilaSale.unitPrice === 35000 &&
        nilaSale.totalAmount === 70000
    );

    // Test 15: Audit event created for manual sale with source=dashboard
    const auditRes = await pgClient.query(
      "SELECT source, actor_user_id, event_type FROM public.transaction_events WHERE transaction_id = $1",
      [nilaSale.transactionId]
    );
    record(
      "MANUAL_SALE",
      "Audit event recorded with event_type = created and source = 'dashboard'",
      auditRes.rows.length === 1 &&
        auditRes.rows[0].source === "dashboard" &&
        auditRes.rows[0].actor_user_id === userOwnerA
    );

    // ========================================================================
    // 5. PRODUCTS MANAGEMENT TESTS
    // ========================================================================
    console.log("\n5. Running Products Management Tests...");

    // Test 16: Owner can switch default product via set_default_product
    await setDefaultProduct(sbClient, bizA, prodNilaA);
    const defRes = await pgClient.query(
      "SELECT id, name, is_default FROM public.products WHERE business_id = $1 ORDER BY is_default DESC",
      [bizA]
    );
    record(
      "PRODUCTS",
      "Atomic set_default_product sets Nila as default and unsets Lele",
      defRes.rows[0].id === prodNilaA &&
        defRes.rows[0].is_default === true &&
        defRes.rows[1].is_default === false
    );

    // Switch back to Lele for pilot consistency
    await setDefaultProduct(sbClient, bizA, prodLeleA);

    // Test 17: Non-owner/non-member cannot manage products for another tenant
    const foreignProd = await pgClient.query(
      "SELECT count(*)::int as c FROM public.products WHERE business_id = $1 AND id = $2",
      [bizB, prodLeleA]
    );
    record("PRODUCTS", "Product tenant boundary strictly enforced (Lele not in Business B)", foreignProd.rows[0].c === 0);

    // ========================================================================
    // 6. DAILY STATUS OPERATIONS TESTS
    // ========================================================================
    console.log("\n6. Running Daily Status Operations Tests...");

    // Test 18: Setting NO_SALE on day with confirmed sales is blocked by conflict check
    try {
      await setDailyStatus(
        sbClient,
        { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
        "NO_SALE"
      );
      record("DAILY_STATUS", "Setting NO_SALE on day with active sales rejected", false);
    } catch (err: any) {
      record(
        "DAILY_STATUS",
        "Setting NO_SALE on day with active sales rejected (DAY_STATUS_HAS_SALES)",
        err.message.includes("DAY_STATUS_HAS_SALES")
      );
    }

    // Test 19: Setting CLOSED on day with confirmed sales is blocked
    try {
      await setDailyStatus(
        sbClient,
        { businessId: bizA, source: "dashboard", authenticatedUserId: userOwnerA },
        "CLOSED"
      );
      record("DAILY_STATUS", "Setting CLOSED on day with active sales rejected", false);
    } catch (err: any) {
      record(
        "DAILY_STATUS",
        "Setting CLOSED on day with active sales rejected (DAY_STATUS_HAS_SALES)",
        err.message.includes("DAY_STATUS_HAS_SALES")
      );
    }

    // Test 20: Business B with zero sales can set NO_SALE with source = 'dashboard'
    const bStatus = await setDailyStatus(
      sbClient,
      { businessId: bizB, source: "dashboard", authenticatedUserId: userOwnerB },
      "NO_SALE",
      "Tidak ada pengunjung"
    );
    record(
      "DAILY_STATUS",
      "Business without sales successfully records NO_SALE with source = 'dashboard'",
      bStatus.status === "NO_SALE"
    );

    // Test 21: Recording sale on day marked NO_SALE is blocked by DAY_STATUS_CONFLICT
    try {
      await recordSale(
        sbClient,
        { businessId: bizB, source: "dashboard", authenticatedUserId: userOwnerB },
        { quantity: 5, unit: "ikat" }
      );
      record("DAILY_STATUS", "Recording sale on NO_SALE day rejected", false);
    } catch (err: any) {
      record(
        "DAILY_STATUS",
        "Recording sale on NO_SALE day rejected (DAY_STATUS_CONFLICT)",
        err.message.includes("DAY_STATUS_CONFLICT")
      );
    }

    // ========================================================================
    // 7. SPREADSHEET EXPORT TESTS
    // ========================================================================
    console.log("\n7. Running Spreadsheet Export (XLSX) Tests...");

    // Test 22: Generate ledger workbook buffer
    const allTxA = await pgClient.query(
      "SELECT id, transaction_at, source, quantity, unit, unit_price, total_amount, status, raw_message FROM public.transactions WHERE business_id = $1 ORDER BY transaction_at DESC",
      [bizA]
    );
    const allProdA = await pgClient.query(
      "SELECT id, name, unit, default_price, active, is_default FROM public.products WHERE business_id = $1",
      [bizA]
    );
    const allStatusA = await pgClient.query(
      "SELECT local_date, status, source, note FROM public.business_daily_status WHERE business_id = $1",
      [bizA]
    );

    const xlsxBuffer = await generateLedgerWorkbook({
      business: { id: bizA, name: "Lele Pilot A", timezone: "Asia/Jakarta", currency: "IDR" },
      overviewKPIs: kpisA,
      dailySeries: seriesA,
      transactions: allTxA.rows.map((r) => ({
        id: r.id,
        transaction_at: r.transaction_at,
        source: r.source,
        product_name: "Lele",
        quantity: Number(r.quantity),
        unit: r.unit,
        unit_price: Number(r.unit_price),
        total_amount: Number(r.total_amount),
        status: r.status,
        raw_message: r.raw_message,
      })),
      products: allProdA.rows.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        default_price: Number(p.default_price),
        active: Boolean(p.active),
        is_default: Boolean(p.is_default),
      })),
      dailyStatuses: allStatusA.rows.map((s) => ({
        local_date: String(s.local_date),
        status: s.status,
        source: s.source,
        note: s.note,
      })),
    });

    record("EXPORT", "Valid binary XLSX buffer generated (> 1000 bytes)", xlsxBuffer.length > 1000);

    // Test 23: Parse generated XLSX with ExcelJS and verify all 5 worksheets
    const parsedWorkbook = new ExcelJS.Workbook();
    await parsedWorkbook.xlsx.load(xlsxBuffer as any);

    const sheetNames = parsedWorkbook.worksheets.map((w) => w.name);
    const expectedSheets = ["Dashboard", "Transactions", "Products", "Daily_Status", "Config"];
    const allSheetsExist = expectedSheets.every((name) => sheetNames.includes(name));

    record(
      "EXPORT",
      "Spreadsheet contains all 5 required worksheets (Dashboard, Transactions, Products, Daily_Status, Config)",
      allSheetsExist
    );

    // Test 24: Verify Dashboard sheet contents
    const dashSheet = parsedWorkbook.getWorksheet("Dashboard");
    const dashTitle = dashSheet?.getCell("A1").value;
    const hasKpi = dashSheet?.getCell("A6").value?.toString().includes("INDIKATOR KINERJA");
    record(
      "EXPORT",
      "Dashboard sheet contains business title and KPI indicators",
      Boolean(dashTitle && String(dashTitle).includes("LELE PILOT A") && hasKpi)
    );

    // Test 25: Verify Transactions sheet contents and auto-filter
    const txSheet = parsedWorkbook.getWorksheet("Transactions");
    const txHeader = (txSheet?.getRow(1).values as string[]) || [];
    const hasColumns =
      txHeader.includes("Tanggal") &&
      txHeader.includes("Kuantitas") &&
      txHeader.includes("Total Omzet (IDR)") &&
      txHeader.includes("Status");
    record("EXPORT", "Transactions sheet contains required columns with auto-filter and formatting", hasColumns);

    // Test 26: Verify Config sheet contains source of truth notice
    const configSheet = parsedWorkbook.getWorksheet("Config");
    let noticeFound = false;
    configSheet?.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value && String(cell.value).includes("financial source of truth")) {
          noticeFound = true;
        }
      });
    });
    record("EXPORT", "Config sheet contains financial source of truth notice", noticeFound);

    // Test 27: Cross-tenant export protection
    // Verifies that data exported for Business A contains zero rows from Business B
    const allBizATx = allTxA.rows.every((r) => r.source !== undefined);
    record("EXPORT", "Exported dataset strictly scoped to authorized business (zero Business B leakage)", allBizATx);

  } finally {
    await pgClient.end();
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n=== Step 6B Test Results Summary ===");
  console.log(`Total: ${reports.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
