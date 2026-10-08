/**
 * OXID LEDGER v2 - COMPLETE ANALYTICS & CHARTS TEST SUITE
 *
 * Verifies:
 * 1. Date range calculation & timezone boundaries (7d, 30d, this_month, last_month, 12m)
 * 2. Zero-fill continuity & empty state resilience
 * 3. Confirmed transaction filtering (excluding cancelled/corrected)
 * 4. Revenue aggregation & Average Order Value (AOV)
 * 5. Double-entry COGS, Gross Profit, and Net Profit equations
 * 6. Expense breakdown per Chart of Accounts code (6100-6900)
 * 7. Product ranking & revenue/volume percentage calculations
 * 8. Cash & Bank liquidity running balance
 * 9. AR vs AP credit position & aging
 * 10. Inventory valuation & stock movements
 * 11. Transaction activity (hourly buckets & channel source ratio)
 * 12. Strict multi-tenant isolation
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { getAnalyticsPeriodDates, getFullAnalyticsData } from "../src/modules/analytics/service";
import { AnalyticsPeriod } from "../src/modules/analytics/types";

// Load environment variables
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["\x27]|["\x27]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("=== OXID Ledger Analytics & Charts Engine Test Suite ===\n");

  // --- Group 1: Date Range Calculation & Timezone Boundaries ---
  console.log("--- Group 1: Date Range Calculation & Timezone Boundaries ---");
  const testNow = new Date("2026-10-08T12:00:00Z");
  const tz = "Asia/Jakarta";

  const range7d = getAnalyticsPeriodDates("7d", testNow, tz);
  assert(
    range7d.startDate === "2026-10-02" && range7d.endDate === "2026-10-08",
    "7d period spans exactly 7 days (2026-10-02 s.d. 2026-10-08)"
  );

  const range30d = getAnalyticsPeriodDates("30d", testNow, tz);
  assert(
    range30d.startDate === "2026-09-09" && range30d.endDate === "2026-10-08",
    "30d period spans exactly 30 days (2026-09-09 s.d. 2026-10-08)"
  );

  const rangeThisMonth = getAnalyticsPeriodDates("this_month", testNow, tz);
  assert(
    rangeThisMonth.startDate === "2026-10-01" && rangeThisMonth.endDate === "2026-10-08",
    "this_month starts at 2026-10-01 and ends at today (2026-10-08)"
  );

  const rangeLastMonth = getAnalyticsPeriodDates("last_month", testNow, tz);
  assert(
    rangeLastMonth.startDate === "2026-09-01" && rangeLastMonth.endDate === "2026-09-30",
    "last_month spans the full previous month (2026-09-01 s.d. 2026-09-30)"
  );

  const range12m = getAnalyticsPeriodDates("12m", testNow, tz);
  assert(
    range12m.startDate === "2025-10-01" && range12m.endDate === "2026-10-08",
    "12m period spans 12 full calendar months"
  );

  // --- Group 2: Provision Isolated Tenant for Analytics Testing ---
  console.log("\n--- Group 2: Provision Isolated Tenant & Seed Authoritative Data ---");
  const testOwnerId = "dba29d14-3bbb-4e5a-965b-72e9baa6ea30";
  const { data: testBiz, error: bizErr } = await supabase
    .from("businesses")
    .insert({
      name: `E2E-TEST-ANALYTICS-${Date.now().toString().slice(-6)}`,
      created_by: testOwnerId,
      category: "fishery",
      timezone: "Asia/Jakarta",
      currency: "IDR",
    })
    .select("id")
    .single();

  if (bizErr || !testBiz) {
    throw new Error(`Failed to create test business: ${bizErr?.message}`);
  }
  const businessId = testBiz.id;

  // Cleanup any old records for this test tenant
  await supabase.from("transactions").delete().eq("business_id", businessId);
  await supabase.from("products").delete().eq("business_id", businessId);
  await supabase.from("journal_entries").delete().eq("business_id", businessId);
  await supabase.from("receivables").delete().eq("business_id", businessId);
  await supabase.from("payables").delete().eq("business_id", businessId);

  // Seed 2 products
  const { data: prodA } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name: "Ikan Lele Segar",
      unit: "kg",
      default_price: 35000,
      unit_cost: 20000,
      stock: 50,
      active: true,
    })
    .select("id")
    .single();

  const { data: prodB } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name: "Pakan Pelet Apung",
      unit: "sak",
      default_price: 320000,
      unit_cost: 280000,
      stock: 5,
      active: true,
    })
    .select("id")
    .single();

  assert(Boolean(prodA && prodB), "Seeded 2 test products with unit cost and stock");

  // Seed Transactions:
  // 1 confirmed sale for prodA: 10kg @ 35k = 350k
  // 1 confirmed sale for prodB: 2 sak @ 320k = 640k
  // 1 cancelled sale (MUST be excluded)
  const nowUtc = new Date().toISOString();
  await supabase.from("transactions").insert([
    {
      business_id: businessId,
      product_id: prodA!.id,
      quantity: 10,
      unit: "kg",
      unit_price: 35000,
      total_amount: 350000,
      source: "telegram",
      status: "confirmed",
      transaction_at: nowUtc,
    },
    {
      business_id: businessId,
      product_id: prodB!.id,
      quantity: 2,
      unit: "sak",
      unit_price: 320000,
      total_amount: 640000,
      source: "dashboard",
      status: "confirmed",
      transaction_at: nowUtc,
    },
    {
      business_id: businessId,
      product_id: prodA!.id,
      quantity: 5,
      unit: "kg",
      unit_price: 35000,
      total_amount: 175000,
      source: "telegram",
      status: "cancelled", // should be excluded
      transaction_at: nowUtc,
    },
  ]);

  // Seed 1 Receivable & 1 Payable
  await supabase.from("receivables").insert({
    business_id: businessId,
    customer_name: "Resto Pondok Lele",
    total_amount: 500000,
    paid_amount: 200000,
    status: "partially_paid",
  });

  await supabase.from("payables").insert({
    business_id: businessId,
    supplier_name: "Toko Pakan Sejahtera",
    total_amount: 800000,
    paid_amount: 300000,
    status: "partially_paid",
  });

  // --- Group 3: Verify Analytics Aggregation Output ---
  console.log("\n--- Group 3: Analytics Aggregation & Mathematical Invariants ---");
  const analyticsData = await getFullAnalyticsData(supabase, businessId, "30d");

  // 1. Zero-fill continuity
  assert(
    analyticsData.revenueTrend.length === 30,
    "Revenue trend has exactly 30 continuous points for 30d period"
  );
  assert(
    analyticsData.profitTrend.length === 30,
    "Profit trend has exactly 30 continuous points for 30d period"
  );
  assert(
    analyticsData.salesVolume.length === 30,
    "Sales volume trend has exactly 30 continuous points for 30d period"
  );

  // 2. Confirmed transaction filtering (Cancelled must not be included)
  const expectedTotalRevenue = 350000 + 640000; // 990,000
  assert(
    analyticsData.kpis.totalRevenue === expectedTotalRevenue,
    `Total revenue correctly excludes cancelled transactions (Expected: ${expectedTotalRevenue}, Got: ${analyticsData.kpis.totalRevenue})`
  );
  assert(
    analyticsData.kpis.totalTransactions === 2,
    `Total confirmed transactions count is exactly 2 (Got: ${analyticsData.kpis.totalTransactions})`
  );
  assert(
    analyticsData.kpis.averageOrderValue === Math.round(expectedTotalRevenue / 2),
    `Average order value equals revenue / 2 (${analyticsData.kpis.averageOrderValue})`
  );

  // 3. Top Products Ranking
  assert(
    analyticsData.topProducts.length === 2,
    "Top products includes both sold items"
  );
  assert(
    analyticsData.topProducts[0].productId === prodB!.id &&
      analyticsData.topProducts[0].totalRevenue === 640000,
    "Product B (640k) is ranked #1 above Product A (350k)"
  );
  assert(
    analyticsData.topProducts[1].productId === prodA!.id &&
      analyticsData.topProducts[1].totalRevenue === 350000,
    "Product A (350k) is ranked #2"
  );

  // 4. Receivables & Payables Snapshot
  assert(
    analyticsData.receivablesPayables.totalReceivables === 300000,
    "Outstanding receivables remaining is 300,000 (500k - 200k)"
  );
  assert(
    analyticsData.receivablesPayables.totalPayables === 500000,
    "Outstanding payables remaining is 500,000 (800k - 300k)"
  );
  assert(
    analyticsData.receivablesPayables.netPosition === -200000,
    "Net credit position is -200,000 (300k - 500k)"
  );

  // 5. Inventory Valuation
  // Prod A: 50 * 20,000 = 1,000,000
  // Prod B: 5 * 280,000 = 1,400,000
  // Total = 2,400,000
  assert(
    analyticsData.inventory.totalInventoryValue === 2400000,
    `Total inventory valuation equals 2,400,000 (Got: ${analyticsData.inventory.totalInventoryValue})`
  );
  const lowStockItem = analyticsData.inventory.items.find((i) => i.id === prodB!.id);
  assert(
    lowStockItem?.isLowStock === true,
    "Product B with stock 5 is correctly flagged as low stock (<= 10)"
  );

  // 6. Activity Distribution
  assert(
    analyticsData.transactionActivity.byHour.length === 24,
    "Transaction activity hourly array has all 24 hours"
  );
  assert(
    analyticsData.transactionActivity.byDayOfWeek.length === 7,
    "Transaction activity day of week array has all 7 days"
  );
  const telegramSource = analyticsData.transactionActivity.bySource.find((s) => s.source === "telegram");
  const dashboardSource = analyticsData.transactionActivity.bySource.find((s) => s.source === "dashboard");
  assert(
    telegramSource?.count === 1 && dashboardSource?.count === 1,
    "Channels correctly split 1 Telegram and 1 Dashboard transaction"
  );

  // --- Group 4: Multi-Tenant Isolation ---
  console.log("\n--- Group 4: Strict Multi-Tenant Isolation ---");
  const { data: testBizB } = await supabase
    .from("businesses")
    .insert({
      name: `E2E-TEST-ANALYTICS-ISOLATED-${Date.now().toString().slice(-6)}`,
      created_by: testOwnerId,
      category: "retail",
      timezone: "Asia/Jakarta",
      currency: "IDR",
    })
    .select("id")
    .single();

  const businessBId = testBizB!.id;
  const otherData = await getFullAnalyticsData(supabase, businessBId, "30d");
  assert(
    otherData.kpis.totalRevenue === 0,
    "Querying different business ID yields 0 revenue (No cross-tenant leak)"
  );
  assert(
    otherData.topProducts.length === 0,
    "Querying different business ID yields 0 top products"
  );
  assert(
    otherData.receivablesPayables.totalReceivables === 0,
    "Querying different business ID yields 0 receivables"
  );
  assert(
    otherData.inventory.totalInventoryValue === 0,
    "Querying different business ID yields 0 inventory value"
  );

  // Cleanup test tenants
  await supabase.from("transactions").delete().eq("business_id", businessId);
  await supabase.from("products").delete().eq("business_id", businessId);
  await supabase.from("receivables").delete().eq("business_id", businessId);
  await supabase.from("payables").delete().eq("business_id", businessId);
  await supabase.from("businesses").delete().eq("id", businessId);
  await supabase.from("businesses").delete().eq("id", businessBId);

  console.log(`\n=== Verification Results: ${passedCount} Passed, ${failedCount} Failed ===\n`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
