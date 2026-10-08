/**
 * OXID Ledger - Plan Entitlements Automated Test Suite
 * Verifies PlanFeature authorization, matrix definitions, Telegram bot report gating,
 * and accounting export route protection across Pilot, Basic, and Pro tiers.
 */

import {
  PlanFeature,
  SubscriptionPlanCode,
} from "../src/modules/subscriptions/types";
import {
  hasPlanFeature,
  getPlanFeatureMatrix,
  PLAN_FEATURE_MATRIX,
} from "../src/modules/subscriptions/plans";
import {
  requirePlanFeature,
  PlanFeatureNotAvailableError,
} from "../src/modules/subscriptions/service";

const ALL_PLAN_FEATURES = Object.keys(PLAN_FEATURE_MATRIX.pro) as PlanFeature[];
import { executeConversationAction } from "../src/modules/conversation/executor";
import { formatHelp } from "../src/modules/conversation/response-formatter";
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

// ----------------------------------------------------------------------------
// Mock Supabase Client for Multi-Tenant Entitlement Testing
// ----------------------------------------------------------------------------
function createMockClient(basicBusinessId: string, proBusinessId: string, pilotBusinessId: string) {
  const tables: Record<string, any[]> = {
    businesses: [
      { id: basicBusinessId, name: "Warung Lele Basic", timezone: "Asia/Jakarta", currency: "IDR" },
      { id: proBusinessId, name: "Resto Lele Pro", timezone: "Asia/Jakarta", currency: "IDR" },
      { id: pilotBusinessId, name: "Kedai Pilot", timezone: "Asia/Jakarta", currency: "IDR" },
    ],
    business_subscriptions: [
      {
        id: "sub-basic",
        business_id: basicBusinessId,
        status: "active",
        plan_code: "basic",
        trial_ends_at: null,
        current_period_end: new Date(Date.now() + 864000000).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "sub-pro",
        business_id: proBusinessId,
        status: "active",
        plan_code: "pro",
        trial_ends_at: null,
        current_period_end: new Date(Date.now() + 864000000).toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "sub-pilot",
        business_id: pilotBusinessId,
        status: "trialing",
        plan_code: "pilot",
        trial_ends_at: new Date(Date.now() + 864000000).toISOString(),
        current_period_end: new Date(Date.now() + 864000000).toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    products: [
      { id: "prod-1", business_id: basicBusinessId, name: "Lele", unit: "kg", default_price: 25000, is_default: true, active: true },
      { id: "prod-2", business_id: proBusinessId, name: "Lele", unit: "kg", default_price: 25000, is_default: true, active: true },
    ],
    chart_of_accounts: [
      ...DEFAULT_COA_DEFINITIONS.map((c) => ({
        id: `coa-basic-${c.code}`,
        business_id: basicBusinessId,
        code: c.code,
        name: c.name,
        category: c.category,
        normal_balance: c.normal_balance,
        active: true,
      })),
      ...DEFAULT_COA_DEFINITIONS.map((c) => ({
        id: `coa-pro-${c.code}`,
        business_id: proBusinessId,
        code: c.code,
        name: c.name,
        category: c.category,
        normal_balance: c.normal_balance,
        active: true,
      })),
    ],
    journal_entries: [],
    journal_lines: [],
    transactions: [],
  };

  const client = {
    from(tableName: string) {
      const createBuilder = (currentRows: any[]) => {
        const builder: any = {
          data: currentRows,
          error: null,
          select: () => builder,
          insert: async () => ({ data: null, error: null }),
          update: async () => ({ data: null, error: null }),
          delete: async () => ({ data: null, error: null }),
          eq: (col: string, val: any) => createBuilder(currentRows.filter((r) => r[col] === val)),
          neq: (col: string, val: any) => createBuilder(currentRows.filter((r) => r[col] !== val)),
          lte: () => builder,
          gte: () => builder,
          in: () => builder,
          order: () => builder,
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

  return client as unknown as SupabaseClient;
}

async function runPlanEntitlementsSuite() {
  console.log("================================================================================");
  console.log("OXID LEDGER - PLAN ENTITLEMENTS AUTOMATED VERIFICATION SUITE");
  console.log("================================================================================\n");

  const BASIC_BUS_ID = "bus-entitlement-basic";
  const PRO_BUS_ID = "bus-entitlement-pro";
  const PILOT_BUS_ID = "bus-entitlement-pilot";
  const mockClient = createMockClient(BASIC_BUS_ID, PRO_BUS_ID, PILOT_BUS_ID);

  // --------------------------------------------------------------------------
  // SECTION 1: Plan Feature Matrix Definitions
  // --------------------------------------------------------------------------
  console.log("▶ 1. Plan Feature Matrix Definitions & Guarantees");

  assert(ALL_PLAN_FEATURES.length === 18, "Total 18 plan features defined in authoritative union");

  // Pilot guarantees
  const pilotMatrix = getPlanFeatureMatrix("pilot");
  const pilotAllAllowed = ALL_PLAN_FEATURES.every((f) => pilotMatrix[f] === true);
  assert(pilotAllAllowed, "Pilot Trial has all 18 features active (18/18)");

  // Pro guarantees
  const proMatrix = getPlanFeatureMatrix("pro");
  const proAllAllowed = ALL_PLAN_FEATURES.every((f) => proMatrix[f] === true);
  assert(proAllAllowed, "Pro plan has all 18 features active (18/18)");

  // Basic guarantees: 4 operational allowed, 14 accounting/advanced locked
  const basicMatrix = getPlanFeatureMatrix("basic");
  assert(basicMatrix.recording === true, "Basic plan allows operational recording");
  assert(basicMatrix.telegram === true, "Basic plan allows Telegram bot integration");
  assert(basicMatrix.google_sheets === true, "Basic plan allows Google Sheets sync");
  assert(basicMatrix.sales_reports === true, "Basic plan allows basic sales reports");

  const lockedForBasic: PlanFeature[] = [
    "accounting",
    "profit_loss",
    "balance_sheet",
    "cash_flow",
    "trial_balance",
    "general_ledger",
    "ar_ap",
    "inventory_accounting",
    "fixed_assets",
    "loans",
    "accounting_excel",
    "accounting_analytics",
    "multi_operator",
    "audit_trail",
  ];

  const basicLockedCorrectly = lockedForBasic.every((f) => basicMatrix[f] === false);
  assert(basicLockedCorrectly, "Basic plan locks all 14 accounting, analytics, and multi-operator features");

  // hasPlanFeature helper checks
  assert(hasPlanFeature("basic", "recording") === true, "hasPlanFeature('basic', 'recording') is true");
  assert(hasPlanFeature("basic", "profit_loss") === false, "hasPlanFeature('basic', 'profit_loss') is false");
  assert(hasPlanFeature("basic", "accounting_excel") === false, "hasPlanFeature('basic', 'accounting_excel') is false");
  assert(hasPlanFeature("basic", "general_ledger") === false, "hasPlanFeature('basic', 'general_ledger') is false");
  assert(hasPlanFeature("pro", "profit_loss") === true, "hasPlanFeature('pro', 'profit_loss') is true");
  assert(hasPlanFeature("pro", "accounting_excel") === true, "hasPlanFeature('pro', 'accounting_excel') is true");
  assert(hasPlanFeature("pilot", "general_ledger") === true, "hasPlanFeature('pilot', 'general_ledger') is true");

  // --------------------------------------------------------------------------
  // SECTION 2: requirePlanFeature Service Invariant Enforcement
  // --------------------------------------------------------------------------
  console.log("\n▶ 2. requirePlanFeature Authoritative Service Gate");

  // Pro business should resolve requirePlanFeature with allowed: true
  const proPnlGate = await requirePlanFeature(mockClient, PRO_BUS_ID, "profit_loss");
  assert(proPnlGate.allowed === true, "requirePlanFeature(PRO, 'profit_loss') returns allowed: true");

  // Basic business allowed feature
  const basicOpGate = await requirePlanFeature(mockClient, BASIC_BUS_ID, "recording");
  assert(basicOpGate.allowed === true, "requirePlanFeature(BASIC, 'recording') returns allowed: true");

  // Basic business locked features should return allowed: false
  const basicPnlGate = await requirePlanFeature(mockClient, BASIC_BUS_ID, "profit_loss");
  assert(basicPnlGate.allowed === false, "requirePlanFeature(BASIC, 'profit_loss') returns allowed: false");

  const basicExcelGate = await requirePlanFeature(mockClient, BASIC_BUS_ID, "accounting_excel");
  assert(basicExcelGate.allowed === false, "requirePlanFeature(BASIC, 'accounting_excel') returns allowed: false");

  const basicGlGate = await requirePlanFeature(mockClient, BASIC_BUS_ID, "general_ledger");
  assert(basicGlGate.allowed === false, "requirePlanFeature(BASIC, 'general_ledger') returns allowed: false");

  // --------------------------------------------------------------------------
  // SECTION 3: Telegram Executor Plan Entitlement Guards
  // --------------------------------------------------------------------------
  console.log("\n▶ 3. Telegram Executor Pro Gating & Basic Rejection");

  const basicContext = {
    businessId: BASIC_BUS_ID,
    source: "telegram" as const,
    userId: "user-basic-1",
  };

  const proContext = {
    businessId: PRO_BUS_ID,
    source: "telegram" as const,
    userId: "user-pro-1",
  };

  // Basic /laba -> rejected with friendly upgrade prompt
  const basicLabaRes = await executeConversationAction(mockClient, basicContext, "laba rugi");
  assert(
    basicLabaRes.status === "SUCCESS" && basicLabaRes.replyText.startsWith("🔒") && basicLabaRes.replyText.includes("Paket Pro"),
    "Basic user /laba returns friendly upgrade prompt with lock indicator"
  );
  assert(
    basicLabaRes.replyText.includes("/dashboard/subscription"),
    "Basic user /laba prompt includes direct dashboard subscription upgrade link"
  );

  // Basic /neraca -> rejected with friendly upgrade prompt
  const basicNeracaRes = await executeConversationAction(mockClient, basicContext, "neraca");
  assert(
    basicNeracaRes.replyText.startsWith("🔒") && basicNeracaRes.replyText.includes("Laporan Neraca"),
    "Basic user /neraca returns friendly upgrade prompt for Neraca"
  );

  // Basic /aruskas -> rejected with friendly upgrade prompt
  const basicArusKasRes = await executeConversationAction(mockClient, basicContext, "arus kas");
  assert(
    basicArusKasRes.replyText.startsWith("🔒") && basicArusKasRes.replyText.includes("Laporan Arus Kas"),
    "Basic user /aruskas returns friendly upgrade prompt for Arus Kas"
  );

  // Basic /neracasaldo -> rejected with friendly upgrade prompt
  const basicTbRes = await executeConversationAction(mockClient, basicContext, "/neracasaldo");
  assert(
    basicTbRes.replyText.startsWith("🔒") && basicTbRes.replyText.includes("Neraca Saldo"),
    "Basic user /neracasaldo returns friendly upgrade prompt for Neraca Saldo"
  );

  // Basic /bukubesar -> rejected with friendly upgrade prompt
  const basicGlRes = await executeConversationAction(mockClient, basicContext, "/bukubesar");
  assert(
    basicGlRes.replyText.startsWith("🔒") && basicGlRes.replyText.includes("Buku Besar"),
    "Basic user /bukubesar returns friendly upgrade prompt for Buku Besar"
  );

  // Basic /export -> rejected with friendly upgrade prompt
  const basicExportRes = await executeConversationAction(mockClient, basicContext, "/export");
  assert(
    basicExportRes.replyText.startsWith("🔒") && basicExportRes.replyText.includes("Ekspor Excel"),
    "Basic user /export returns friendly upgrade prompt for Excel workbook"
  );

  // Basic operational checks must remain fully functional
  const basicSaldoRes = await executeConversationAction(mockClient, basicContext, "/saldo");
  assert(
    basicSaldoRes.status === "SUCCESS" && !basicSaldoRes.replyText.startsWith("🔒") && basicSaldoRes.replyText.includes("Kas & Bank"),
    "Basic user /saldo succeeds (operational cash check allowed for Basic)"
  );

  const basicStokRes = await executeConversationAction(mockClient, basicContext, "/stok");
  assert(
    basicStokRes.status === "SUCCESS" && !basicStokRes.replyText.startsWith("🔒"),
    "Basic user /stok succeeds (operational stock check allowed for Basic)"
  );

  // Pro /export -> returns standard preparation message (no lock indicator)
  const proExportRes = await executeConversationAction(mockClient, proContext, "/export");
  assert(
    proExportRes.status === "SUCCESS" && !proExportRes.replyText.startsWith("🔒") && proExportRes.replyText.includes("Excel"),
    "Pro user /export generates standard success response without lock"
  );

  // --------------------------------------------------------------------------
  // SECTION 4: Telegram /help Guide Verification
  // --------------------------------------------------------------------------
  console.log("\n▶ 4. Telegram /help Guide Completeness");

  const helpText = formatHelp(["Lele"]);
  assert(helpText.includes("Panduan Operator OXID Ledger"), "Help header contains clear operator title");
  assert(helpText.includes("Kejual lele 10kg"), "Help includes sale example: Kejual lele 10kg");
  assert(helpText.includes("Listrik 150rb"), "Help includes expense example: Listrik 150rb");
  assert(helpText.includes("Beli stok lele 50kg 1jt"), "Help includes purchase example: Beli stok lele 50kg 1jt");
  assert(helpText.includes("Modal masuk 5jt"), "Help includes capital example: Modal masuk 5jt");
  assert(helpText.includes("Prive 500rb"), "Help includes prive example: Prive 500rb");
  assert(helpText.includes("/saldo"), "Help includes /saldo");
  assert(helpText.includes("/stok"), "Help includes /stok");
  assert(helpText.includes("/piutang"), "Help includes /piutang");
  assert(helpText.includes("/hutang"), "Help includes /hutang");
  assert(helpText.includes("/laba"), "Help includes /laba (Paket Pro)");
  assert(helpText.includes("/neraca"), "Help includes /neraca (Paket Pro)");
  assert(helpText.includes("/aruskas"), "Help includes /aruskas (Paket Pro)");
  assert(helpText.includes("/bukubesar"), "Help includes /bukubesar (Paket Pro)");
  assert(helpText.includes("/neracasaldo"), "Help includes /neracasaldo (Paket Pro)");
  assert(helpText.includes("/export"), "Help includes /export (Paket Pro)");
  assert(helpText.includes("Batal terakhir"), "Help includes Batal terakhir");
  assert(helpText.includes("Ubah terakhir"), "Help includes Ubah terakhir");
  assert(helpText.includes("Gak ada penjualan hari ini"), "Help includes Gak ada penjualan hari ini");
  assert(helpText.includes("Hari ini libur"), "Help includes Hari ini libur");
  assert(helpText.includes("Tips Operator:"), "Help includes operator best-practice tips");

  // --------------------------------------------------------------------------
  // RESULTS SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;
  console.log(`PLAN ENTITLEMENTS SUITE RESULTS: ${passed}/${total} PASS (${failed} FAIL)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPlanEntitlementsSuite().catch((err) => {
  console.error("FATAL ERROR in Plan Entitlements test suite:", err);
  process.exit(1);
});
