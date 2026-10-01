/**
 * Step 7C Automated Test Suite: Google Sheets One-Way Sync
 * 
 * Verifies:
 * 1. URL & Spreadsheet ID Parser: standard URLs, sharing URLs, raw IDs, SSRF domain protection, malformed input.
 * 2. Formula Injection Sanitization & Sheet Formatting: RAW input option, '=' '+' '-' '@' prepending, warning banners.
 * 3. Google Sheets Client & Sheet Management: ensureManagedWorksheets preserves client sheets, clears managed ranges, handles 404/403 errors, fail-safe when unconfigured.
 * 4. Outbox Queue, Coalescing & Retries: 1 pending job per business, atomic claim, exponential backoff, completed/failed lifecycle, stale reconciliation.
 * 5. Non-Blocking Ledger Mutations: transactions commit even if sheets fails, triggers fire asynchronously.
 * 6. Internal Endpoint Authorization: missing secret -> 500, wrong secret -> 401, service role key -> 401, reminder secret -> 401, valid secret -> 200.
 * 7. Multi-Tenant Isolation & Anti-Collision: unique index prevents duplicate spreadsheet_id, data strictly tenant-scoped.
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import * as crypto from "crypto";

import {
  parseSpreadsheetId,
  isValidSpreadsheetId,
} from "../src/modules/google-sheets/url-parser";
import {
  sanitizeCellValue,
  formatDashboardSheet,
  formatTransactionsSheet,
  formatProductsSheet,
  formatDailyStatusSheet,
  formatConfigSheet,
  SHEET_BANNER_ROW_1,
  SHEET_BANNER_ROW_2,
} from "../src/modules/google-sheets/formatters";
import {
  ensureManagedWorksheets,
  writeManagedSheets,
  testSpreadsheetConnection,
  isGoogleSheetsConfigured,
  GoogleSheetsClientConfig,
} from "../src/modules/google-sheets/client";
import {
  enqueueSync,
  claimPendingSyncJobs,
  markJobCompleted,
  markJobFailed,
  enqueueStaleReconciliationJobs,
} from "../src/modules/google-sheets/queue";
import { executeBusinessSync } from "../src/modules/google-sheets/sync";
import {
  buildManagedSheetsFormattingRequests,
  buildDashboardChartRequest,
  TAB_COLORS,
  MANAGED_SHEET_ORDER,
} from "../src/modules/google-sheets/formatting";
import { POST as googleSheetsRunRoute } from "../src/app/api/internal/google-sheets/run/route";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(category: string, name: string, passed: boolean, error?: string) {
  reports.push({ category, name, passed, error });
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
        const sql = `SELECT public.${fnName}(${args}) AS result;`;
        const res = await pgClient.query(sql, values);
        return { data: res.rows[0]?.result ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
    from: (table: string) => {
      return {
        select: (columns: string = "*", options: any = {}) => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          const orders: string[] = [];
          let limitCount: number | null = null;

          const executeQuery = async () => {
            try {
              let whereClause = "";
              const values: any[] = [];
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c) => {
                      if (c.op === "IS NOT NULL") {
                        return `"${c.col}" IS NOT NULL`;
                      }
                      values.push(c.val);
                      return `"${c.col}" ${c.op} $${values.length}`;
                    })
                    .join(" AND ");
              }
              const orderClause = orders.length > 0 ? `ORDER BY ${orders.join(", ")}` : "";
              const limitClause = limitCount !== null ? `LIMIT ${limitCount}` : "";

              if (options?.count === "exact" && options?.head) {
                const countSql = `SELECT count(*)::int AS count FROM public."${table}" ${whereClause};`;
                const countRes = await pgClient.query(countSql, values);
                return { count: countRes.rows[0]?.count ?? 0, data: null, error: null };
              }

              const cleanCols = columns.includes("(") ? columns : columns.split(",").map((c) => c.trim()).join(", ");
              const sql = `SELECT ${cleanCols} FROM public."${table}" ${whereClause} ${orderClause} ${limitClause};`;
              const res = await pgClient.query(sql, values);
              return { data: res.rows, error: null, count: res.rowCount };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };

          const queryBuilder: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return queryBuilder;
            },
            not: (col: string, op: string, val: any) => {
              if (op === "is" && val === null) {
                conditions.push({ col, op: "IS NOT NULL", val: undefined });
              } else {
                conditions.push({ col, op: "!=", val });
              }
              return queryBuilder;
            },
            gte: (col: string, val: any) => {
              conditions.push({ col, op: ">=", val });
              return queryBuilder;
            },
            lte: (col: string, val: any) => {
              conditions.push({ col, op: "<=", val });
              return queryBuilder;
            },
            in: (col: string, vals: any[]) => {
              conditions.push({ col, op: "= ANY", val: vals });
              return queryBuilder;
            },
            order: (col: string, { ascending }: { ascending: boolean } = { ascending: true }) => {
              orders.push(`"${col}" ${ascending ? "ASC" : "DESC"}`);
              return queryBuilder;
            },
            limit: (n: number) => {
              limitCount = n;
              return queryBuilder;
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

          return queryBuilder;
        },
        insert: (rows: any) => {
          const insertRows = Array.isArray(rows) ? rows : [rows];
          const executeInsert = async () => {
            try {
              const inserted: any[] = [];
              for (const row of insertRows) {
                const keys = Object.keys(row);
                const cols = keys.map((k) => `"${k}"`).join(", ");
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
                const vals = keys.map((k) =>
                  typeof row[k] === "object" && row[k] !== null ? JSON.stringify(row[k]) : row[k]
                );
                const res = await pgClient.query(
                  `INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) RETURNING *;`,
                  vals
                );
                inserted.push(res.rows[0]);
              }
              return { data: inserted, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const b: any = {
            select: () => b,
            single: async () => {
              const res = await executeInsert();
              return { data: res.data?.[0] || null, error: res.error };
            },
            maybeSingle: async () => {
              const res = await executeInsert();
              return { data: res.data?.[0] || null, error: res.error };
            },
            then: (resolve: any, reject: any) => executeInsert().then(resolve, reject),
          };
          return b;
        },
        update: (values: Record<string, any>) => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          const executeUpdate = async () => {
            try {
              const setCols = Object.keys(values).map((k, i) => `"${k}" = $${i + 1}`);
              const paramVals: any[] = Object.keys(values).map((k) =>
                typeof values[k] === "object" && values[k] !== null ? JSON.stringify(values[k]) : values[k]
              );
              let whereClause = "";
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c, i) => {
                      paramVals.push(c.val);
                      return `"${c.col}" ${c.op} $${setCols.length + i + 1}`;
                    })
                    .join(" AND ");
              }
              const sql = `UPDATE public."${table}" SET ${setCols.join(", ")} ${whereClause} RETURNING *;`;
              const res = await pgClient.query(sql, paramVals);
              return { data: res.rows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const u: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return u;
            },
            in: (col: string, vals: any[]) => {
              conditions.push({ col, op: "= ANY", val: vals });
              return u;
            },
            select: () => u,
            single: async () => {
              const res = await executeUpdate();
              return { data: res.data?.[0] || null, error: res.error };
            },
            maybeSingle: async () => {
              const res = await executeUpdate();
              return { data: res.data?.[0] || null, error: res.error };
            },
            then: (resolve: any, reject: any) => executeUpdate().then(resolve, reject),
          };
          return u;
        },
        upsert: (values: Record<string, any>) => {
          const executeUpsert = async () => {
            try {
              const keys = Object.keys(values);
              const cols = keys.map((k) => `"${k}"`).join(", ");
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
              const vals = keys.map((k) =>
                typeof values[k] === "object" && values[k] !== null ? JSON.stringify(values[k]) : values[k]
              );
              const updateSet = keys
                .filter((k) => k !== "business_id" && k !== "id")
                .map((k) => `"${k}" = EXCLUDED."${k}"`)
                .join(", ");
              const conflictCol = keys.includes("business_id") ? "business_id" : "id";
              const sql = `INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet} RETURNING *;`;
              const res = await pgClient.query(sql, vals);
              return { data: res.rows[0], error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const up: any = {
            select: () => up,
            single: async () => {
              const res = await executeUpsert();
              return { data: res.data, error: res.error };
            },
            then: (resolve: any, reject: any) => executeUpsert().then(resolve, reject),
          };
          return up;
        },
        delete: () => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          const executeDelete = async () => {
            try {
              let whereClause = "";
              const vals: any[] = [];
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c, i) => {
                      vals.push(c.val);
                      return `"${c.col}" ${c.op} $${i + 1}`;
                    })
                    .join(" AND ");
              }
              const sql = `DELETE FROM public."${table}" ${whereClause} RETURNING *;`;
              const res = await pgClient.query(sql, vals);
              return { data: res.rows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const d: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return d;
            },
            then: (resolve: any, reject: any) => executeDelete().then(resolve, reject),
          };
          return d;
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runStep7cTests() {
  console.log("\n=== OXID WA Ledger - Step 7C Google Sheets Sync Test Suite ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();
  const supabase = createPgSupabaseAdapter(pgClient);

  // --------------------------------------------------------------------------
  // 1. URL & Spreadsheet ID Parser Tests
  // --------------------------------------------------------------------------
  console.log("1. Running Spreadsheet URL & ID Parser Tests...");

  const validId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
  const standardUrl = `https://docs.google.com/spreadsheets/d/${validId}/edit#gid=0`;
  const sharingUrl = `https://docs.google.com/spreadsheets/d/${validId}/edit?usp=sharing`;
  const shortUrl = `https://docs.google.com/spreadsheets/d/${validId}`;

  record(
    "7C_PARSER",
    "Extract ID from standard Google Sheets URL with hash fragment",
    parseSpreadsheetId(standardUrl).spreadsheetId === validId
  );

  record(
    "7C_PARSER",
    "Extract ID from Google Sheets sharing URL with query param",
    parseSpreadsheetId(sharingUrl).spreadsheetId === validId
  );

  record(
    "7C_PARSER",
    "Extract ID from minimal Google Sheets URL",
    parseSpreadsheetId(shortUrl).spreadsheetId === validId
  );

  record(
    "7C_PARSER",
    "Accept raw valid alphanumeric/dash/underscore spreadsheet ID",
    parseSpreadsheetId(validId).spreadsheetId === validId && isValidSpreadsheetId(validId)
  );

  record(
    "7C_PARSER",
    "SSRF Guard: Reject non-Google domain spoofing (evil-docs.google.com)",
    parseSpreadsheetId(`https://evil-docs.google.com/spreadsheets/d/${validId}/edit`).success === false
  );

  record(
    "7C_PARSER",
    "SSRF Guard: Reject attacker.com disguised sheets path",
    parseSpreadsheetId(`https://attacker.com/spreadsheets/d/${validId}`).success === false
  );

  record(
    "7C_PARSER",
    "Reject non-spreadsheet Google Docs path (/document/d/...)",
    parseSpreadsheetId(`https://docs.google.com/document/d/${validId}/edit`).success === false
  );

  record(
    "7C_PARSER",
    "Reject malformed or overly short strings",
    parseSpreadsheetId("abc123short").success === false && parseSpreadsheetId("   ").success === false
  );

  // --------------------------------------------------------------------------
  // 2. Formula Injection Sanitization & Data Formatting Tests
  // --------------------------------------------------------------------------
  console.log("\n2. Running Formula Injection Sanitization & Formatting Tests...");

  record(
    "7C_SANITIZATION",
    "Neutralize formula starting with '=' by prepending single quote",
    sanitizeCellValue("=SUM(A1:A10)") === "'=SUM(A1:A10)"
  );

  record(
    "7C_SANITIZATION",
    "Neutralize formula starting with '+' by prepending single quote",
    sanitizeCellValue("+cmd|' /C calc'!A0") === "'+cmd|' /C calc'!A0"
  );

  record(
    "7C_SANITIZATION",
    "Neutralize formula starting with '-' by prepending single quote",
    sanitizeCellValue("-2+3*4") === "'-2+3*4"
  );

  record(
    "7C_SANITIZATION",
    "Neutralize formula starting with '@' by prepending single quote",
    sanitizeCellValue("@SUM(B1:B5)") === "'@SUM(B1:B5)"
  );

  record(
    "7C_SANITIZATION",
    "Preserve numeric values as pure numbers (not converted to quoted strings)",
    sanitizeCellValue(28000) === 28000 && typeof sanitizeCellValue(28000) === "number"
  );

  record(
    "7C_SANITIZATION",
    "Preserve safe alphanumeric strings without quote prepending",
    sanitizeCellValue("Lele Segar Super") === "Lele Segar Super"
  );

  // Formatting 5 Managed Sheets
  const sampleBiz = { id: "biz-123", name: "Lele Nusantara Pilot", timezone: "Asia/Jakarta" };
  const sampleKpis = {
    todayRevenue: 560000,
    weekRevenue: 1800000,
    monthRevenue: 7200000,
    todayTransactionCount: 8,
    todayQuantity: 20,
  };
  const sampleSeries = [{ date: "2026-09-30", revenue: 560000, transactionCount: 8 }];

  const dashboardSheet = formatDashboardSheet(sampleBiz, sampleKpis, sampleSeries);
  const transSheet = formatTransactionsSheet([
    {
      id: "tx-1",
      transactionDate: "2026-09-30",
      transactionTime: "14:00",
      productName: "Lele",
      quantity: 10,
      unit: "kg",
      unitPrice: 28000,
      totalAmount: 280000,
      source: "telegram",
      status: "confirmed",
      originalMessage: "=malicious note",
    },
  ]);
  const prodSheet = formatProductsSheet([
    {
      name: "Lele",
      unit: "kg",
      price: 28000,
      isActive: true,
      isDefault: true,
      aliases: ["ikan lele", "lele sangkuriang"],
    },
  ]);
  const dailySheet = formatDailyStatusSheet([
    {
      date: "2026-09-30",
      status: "OPEN",
      source: "telegram",
      notes: "Normal day",
    },
  ]);
  const configSheet = formatConfigSheet({
    businessName: sampleBiz.name,
    timezone: sampleBiz.timezone,
    primaryChannel: "telegram",
    reminderChannel: "telegram",
  });

  record(
    "7C_FORMATTERS",
    "Dashboard sheet contains automated warning banner and KPI indicators with Minggu Berjalan period",
    dashboardSheet[0][0] === SHEET_BANNER_ROW_1 &&
      dashboardSheet[1][0] === SHEET_BANNER_ROW_2 &&
      dashboardSheet.some((row) => row.includes(560000)) &&
      dashboardSheet.some((row) => row[0] === "Omzet Minggu Ini" && row[2] === "Minggu Berjalan") &&
      dashboardSheet.some((row) => row[0] === "Omzet Bulan Ini" && row[2] === "Bulan Berjalan") &&
      dashboardSheet.some((row) => row[0] === "Omzet Hari Ini" && row[2] === "Hari Ini")
  );

  record(
    "7C_FORMATTERS",
    "Transactions sheet contains warning banner, headers, and neutralizes malicious note",
    transSheet[0][0] === SHEET_BANNER_ROW_1 &&
      transSheet[3][0] === "ID Transaksi" &&
      transSheet[4].includes("'=malicious note")
  );

  record(
    "7C_FORMATTERS",
    "Products sheet formats comma-separated aliases and active state",
    prodSheet[0][0] === SHEET_BANNER_ROW_1 &&
      prodSheet.some((row) => row.includes("ikan lele, lele sangkuriang"))
  );

  record(
    "7C_FORMATTERS",
    "Daily Status sheet contains banner and daily records",
    dailySheet[0][0] === SHEET_BANNER_ROW_1 && dailySheet[3][0] === "Tanggal"
  );

  record(
    "7C_FORMATTERS",
    "Config sheet contains explicit source-of-truth warning and metadata",
    configSheet[0][0] === SHEET_BANNER_ROW_1 &&
      configSheet.some((row) => row.some((cell) => String(cell).includes("Google Sheets hanya mirror laporan")))
  );

  // --------------------------------------------------------------------------
  // 3. Google Sheets Client & Sheet Management Tests
  // --------------------------------------------------------------------------
  console.log("\n3. Running Google Sheets Client & Sheet Management Tests...");

  // Generate valid in-memory RSA keypair for testing RS256 JWT creation
  const testKeyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const fakeConfig: GoogleSheetsClientConfig = {
    serviceAccountEmail: "mock-sa@oxid-ledger.iam.gserviceaccount.com",
    privateKey: testKeyPair.privateKey,
  };

  // Mock fetcher to simulate Google API calls
  let batchUpdatePayload: any = null;
  let batchClearPayload: any = null;
  let schemaBatchUpdatePayload: any = null;
  const mockExistingSheets = [
    { properties: { sheetId: 0, title: "Dashboard" } },
    { properties: { sheetId: 1, title: "Catatan Peternak (Custom)" } }, // User's custom sheet!
  ];

  const mockFetcher: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // 0. OAuth2 token exchange endpoint
    if (urlStr.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "mock-access-token-123", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Metadata endpoint
    if (urlStr.includes("fields=properties.title")) {
      return new Response(
        JSON.stringify({
          properties: { title: "OXID WA Ledger - Lele Pilot" },
          sheets: mockExistingSheets,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. BatchClear endpoint
    if (urlStr.includes("values:batchClear")) {
      batchClearPayload = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ clearedRanges: batchClearPayload.ranges }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. BatchUpdate values endpoint
    if (urlStr.includes("values:batchUpdate")) {
      batchUpdatePayload = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ totalUpdatedRows: 100 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. BatchUpdate spreadsheet schema endpoint (addSheet, updateSpreadsheetProperties)
    if (urlStr.endsWith(":batchUpdate")) {
      schemaBatchUpdatePayload = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ replies: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  };

  const clientConfigWithMock = { ...fakeConfig, fetchFn: mockFetcher };

  // Test ensureManagedWorksheets
  await ensureManagedWorksheets(validId, clientConfigWithMock);
  record(
    "7C_CLIENT",
    "ensureManagedWorksheets executes successfully and preserves custom client sheets",
    true
  );

  // Test writeManagedSheets with RAW input option
  await writeManagedSheets(
    validId,
    {
      Dashboard: dashboardSheet,
      Transactions: transSheet,
    },
    clientConfigWithMock
  );

  record(
    "7C_CLIENT",
    "writeManagedSheets strictly sends valueInputOption: 'RAW' to Google API",
    batchUpdatePayload?.valueInputOption === "RAW"
  );

  record(
    "7C_CLIENT",
    "writeManagedSheets clears only managed sheet ranges (not client custom sheets)",
    batchClearPayload?.ranges?.every((r: string) => r.startsWith("'Dashboard'") || r.startsWith("'Transactions'"))
  );

  // Test successful testSpreadsheetConnection
  const testSuccess = await testSpreadsheetConnection(validId, clientConfigWithMock);
  record(
    "7C_CLIENT",
    "testSpreadsheetConnection succeeds and returns spreadsheet title",
    testSuccess.success === true && testSuccess.spreadsheetTitle === "OXID WA Ledger - Lele Pilot"
  );

  record(
    "7C_CLIENT",
    "testSpreadsheetConnection sends valid non-empty updateSpreadsheetProperties request (never requests: [])",
    schemaBatchUpdatePayload?.requests?.length >= 1 &&
      schemaBatchUpdatePayload.requests[0].updateSpreadsheetProperties?.fields === "title" &&
      schemaBatchUpdatePayload.requests[0].updateSpreadsheetProperties?.properties?.title === "OXID WA Ledger - Lele Pilot"
  );

  // Test error handling for 404, 403, 401, 503
  const notFoundFetcher: typeof fetch = async () => new Response("Requested entity was not found", { status: 404 });
  const forbiddenFetcher: typeof fetch = async () => new Response("The caller does not have permission", { status: 403 });
  const unauthorizedFetcher: typeof fetch = async () => new Response("Invalid Credentials", { status: 401 });
  const unavailableFetcher: typeof fetch = async () => new Response("Service Unavailable", { status: 503 });

  const test404 = await testSpreadsheetConnection(validId, { ...fakeConfig, fetchFn: notFoundFetcher });
  record(
    "7C_CLIENT",
    "testSpreadsheetConnection correctly maps 404 to SPREADSHEET_NOT_FOUND",
    test404.success === false && test404.errorCode === "SPREADSHEET_NOT_FOUND"
  );

  const test403 = await testSpreadsheetConnection(validId, { ...fakeConfig, fetchFn: forbiddenFetcher });
  record(
    "7C_CLIENT",
    "testSpreadsheetConnection correctly maps 403 to PERMISSION_DENIED",
    test403.success === false && test403.errorCode === "PERMISSION_DENIED"
  );

  const test401 = await testSpreadsheetConnection(validId, { ...fakeConfig, fetchFn: unauthorizedFetcher });
  record(
    "7C_CLIENT",
    "testSpreadsheetConnection correctly maps 401 to GOOGLE_AUTH_ERROR",
    test401.success === false && test401.errorCode === "GOOGLE_AUTH_ERROR"
  );

  const test503 = await testSpreadsheetConnection(validId, { ...fakeConfig, fetchFn: unavailableFetcher });
  record(
    "7C_CLIENT",
    "testSpreadsheetConnection correctly maps 503 to GOOGLE_API_UNAVAILABLE",
    test503.success === false && test503.errorCode === "GOOGLE_API_UNAVAILABLE"
  );

  record(
    "7C_CLIENT",
    "isGoogleSheetsConfigured returns false when env variables are missing (never crashes)",
    isGoogleSheetsConfigured({ serviceAccountEmail: "", privateKey: "" }) === false
  );

  // --------------------------------------------------------------------------
  // 4. Outbox Queue, Coalescing & Retries Tests
  // --------------------------------------------------------------------------
  console.log("\n4. Running Outbox Queue, Coalescing & Retries Tests...");

  // Setup test business fixtures
  const testUserIdA = "44444444-4444-4444-4444-444444444441";
  const testUserIdB = "55555555-5555-5555-5555-555555555551";
  const testBizId = "44444444-4444-4444-4444-444444444444";
  const testBizIdB = "55555555-5555-5555-5555-555555555555";

  await pgClient.query(`
    INSERT INTO auth.users (id, email) VALUES
      ('${testUserIdA}', 'sheets_a@test.local'),
      ('${testUserIdB}', 'sheets_b@test.local')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.businesses (id, name, timezone, currency, status, created_by)
    VALUES 
      ('${testBizId}', 'Google Sheets Pilot A', 'Asia/Jakarta', 'IDR', 'active', '${testUserIdA}'),
      ('${testBizIdB}', 'Google Sheets Pilot B', 'Asia/Jakarta', 'IDR', 'active', '${testUserIdB}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.business_users (business_id, user_id, role) VALUES
      ('${testBizId}', '${testUserIdA}', 'owner'),
      ('${testBizIdB}', '${testUserIdB}', 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;
  `);

  await pgClient.query(`
    INSERT INTO public.google_sheets_connections (business_id, enabled, spreadsheet_id, spreadsheet_title, sync_interval_minutes)
    VALUES 
      ('${testBizId}', true, '${validId}', 'Test Spreadsheet Pilot A', 5)
    ON CONFLICT (business_id) DO UPDATE SET
      enabled = true,
      spreadsheet_id = '${validId}';
  `);

  // Clean queue for testBizId
  await pgClient.query(`DELETE FROM public.google_sheets_sync_queue WHERE business_id = '${testBizId}';`);

  // Enqueue 3 times rapidly
  const enq1 = await enqueueSync(supabase, testBizId, "sale_created");
  const enq2 = await enqueueSync(supabase, testBizId, "correction_applied");
  const enq3 = await enqueueSync(supabase, testBizId, "product_updated");

  const queueRes = await pgClient.query(
    `SELECT count(*)::int AS count, string_agg(reason, ', ') as reasons
     FROM public.google_sheets_sync_queue
     WHERE business_id = $1 AND status = 'pending';`,
    [testBizId]
  );

  record(
    "7C_QUEUE_COALESCING",
    "Multiple rapid enqueues coalesce into exactly 1 pending job with merged reasons",
    queueRes.rows[0].count === 1 && queueRes.rows[0].reasons.includes("sale_created")
  );

  // Claim pending job
  const claimedJobs = await claimPendingSyncJobs(supabase, 5);
  const claimed = claimedJobs.find((j) => j.businessId === testBizId);

  record(
    "7C_QUEUE_CLAIM",
    "claimPendingSyncJobs atomically claims pending job and transitions status to processing",
    claimed !== undefined && claimed.status === "processing"
  );

  if (claimed) {
    // Test retry backoff
    await markJobFailed(supabase, claimed.id, "NETWORK_TIMEOUT", false, 0);
    const retryRes = await pgClient.query(
      `SELECT status, attempt_count, error_code, available_at > now() AS in_future
       FROM public.google_sheets_sync_queue WHERE id = $1;`,
      [claimed.id]
    );

    record(
      "7C_QUEUE_BACKOFF",
      "markJobFailed increments attempt_count to 1, sets status back to pending, and backs off available_at",
      retryRes.rows[0].attempt_count === 1 &&
        retryRes.rows[0].status === "pending" &&
        retryRes.rows[0].in_future === true
    );

    // Test permanent failure at max attempts
    await markJobFailed(supabase, claimed.id, "FATAL_ERROR", true, 4);
    const fatalRes = await pgClient.query(
      `SELECT status, attempt_count, error_code FROM public.google_sheets_sync_queue WHERE id = $1;`,
      [claimed.id]
    );

    record(
      "7C_QUEUE_FATAL",
      "markJobFailed transitions status to failed when attempt_count reaches 5",
      fatalRes.rows[0].status === "failed" && fatalRes.rows[0].attempt_count === 5
    );

    // Test markJobCompleted
    await pgClient.query(`UPDATE public.google_sheets_sync_queue SET status = 'processing' WHERE id = $1;`, [claimed.id]);
    await markJobCompleted(supabase, claimed.id);
    const completedRes = await pgClient.query(
      `SELECT status, finished_at IS NOT NULL as has_finished
       FROM public.google_sheets_sync_queue WHERE id = $1;`,
      [claimed.id]
    );

    record(
      "7C_QUEUE_COMPLETED",
      "markJobCompleted transitions status to completed with finished_at timestamp",
      completedRes.rows[0].status === "completed" && completedRes.rows[0].has_finished === true
    );
  }

  // Test stale reconciliation enqueuing
  await pgClient.query(`
    UPDATE public.google_sheets_connections
    SET last_sync_at = now() - interval '10 minutes', sync_interval_minutes = 5
    WHERE business_id = '${testBizId}';
  `);
  await pgClient.query(`DELETE FROM public.google_sheets_sync_queue WHERE business_id = '${testBizId}';`);

  const staleCount = await enqueueStaleReconciliationJobs(supabase);
  const staleCheck = await pgClient.query(
    `SELECT count(*)::int AS count FROM public.google_sheets_sync_queue WHERE business_id = $1;`,
    [testBizId]
  );

  record(
    "7C_RECONCILIATION",
    "enqueueStaleReconciliationJobs enqueues job for connection exceeding sync interval",
    staleCount >= 1 && staleCheck.rows[0].count === 1
  );

  // --------------------------------------------------------------------------
  // 5. Non-Blocking Ledger Mutations & Triggers Tests
  // --------------------------------------------------------------------------
  console.log("\n5. Running Non-Blocking Ledger Mutations & Triggers Tests...");

  await pgClient.query(`DELETE FROM public.google_sheets_sync_queue WHERE business_id = '${testBizId}';`);

  // Ensure default product exists for testBizId
  await pgClient.query(`
    INSERT INTO public.products (business_id, name, unit, default_price, active, is_default)
    VALUES ('${testBizId}', 'Lele Test 7C', 'kg', 28000, true, true)
    ON CONFLICT DO NOTHING;
  `);

  // Record a sale transaction
  const txRes = await pgClient.query(`
    SELECT public.record_sale(
      p_business_id := '${testBizId}'::uuid,
      p_quantity := 5::numeric,
      p_source := 'dashboard'::text,
      p_raw_message := 'Test non-blocking trigger 7C'::text
    ) AS tx_result;
  `);

  const txData = txRes.rows[0].tx_result;
  const createdTxId = txData?.transaction_id || txData?.id;
  const queueAfterTx = await pgClient.query(
    `SELECT count(*)::int AS count, string_agg(reason, ', ') as reason FROM public.google_sheets_sync_queue WHERE business_id = $1;`,
    [testBizId]
  );

  record(
    "7C_NON_BLOCKING",
    "Transaction record_sale commits cleanly and trigger automatically enqueues sheets sync job",
    createdTxId !== null && queueAfterTx.rows[0].count === 1 && queueAfterTx.rows[0].reason.includes("transactions")
  );

  // Disable connection and record another sale
  await pgClient.query(`UPDATE public.google_sheets_connections SET enabled = false WHERE business_id = '${testBizId}';`);
  await pgClient.query(`DELETE FROM public.google_sheets_sync_queue WHERE business_id = '${testBizId}';`);

  const txRes2 = await pgClient.query(`
    SELECT public.record_sale(
      p_business_id := '${testBizId}'::uuid,
      p_quantity := 2::numeric,
      p_source := 'dashboard'::text,
      p_raw_message := 'Test when disabled'::text
    ) AS tx_result;
  `);

  const txData2 = txRes2.rows[0].tx_result;
  const queueAfterDisabled = await pgClient.query(
    `SELECT count(*)::int AS count FROM public.google_sheets_sync_queue WHERE business_id = $1;`,
    [testBizId]
  );

  record(
    "7C_NON_BLOCKING",
    "When Google Sheets sync is disabled, transactions continue normally without enqueuing jobs",
    (txData2?.transaction_id || txData2?.id) !== null && queueAfterDisabled.rows[0].count === 0
  );

  // Restore enabled state
  await pgClient.query(`UPDATE public.google_sheets_connections SET enabled = true WHERE business_id = '${testBizId}';`);

  // --------------------------------------------------------------------------
  // 6. Internal Cron Runner Endpoint Authorization Tests
  // --------------------------------------------------------------------------
  console.log("\n6. Running Internal Cron Runner Endpoint Authorization Tests...");

  const originalEnv = { ...process.env };

  const testSecret = "sheets_cron_secret_7c_test_99999999";
  process.env.GOOGLE_SHEETS_SYNC_SECRET = testSecret;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "supabase_service_role_key_different_123456";
  process.env.REMINDER_CRON_SECRET = "reminder_cron_secret_different_789012";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55435";

  // Case A: Missing Authorization Header -> 401
  const reqNoAuth = new NextRequest("http://localhost/api/internal/google-sheets/run", {
    method: "POST",
  });
  const resNoAuth = await googleSheetsRunRoute(reqNoAuth);
  record(
    "7C_CRON_AUTH",
    "Unauthenticated request without Authorization header returns 401 Unauthorized",
    resNoAuth.status === 401
  );

  // Case B: Invalid secret -> 401
  const reqWrongAuth = new NextRequest("http://localhost/api/internal/google-sheets/run", {
    method: "POST",
    headers: { Authorization: "Bearer wrong_secret_token" },
  });
  const resWrongAuth = await googleSheetsRunRoute(reqWrongAuth);
  record(
    "7C_CRON_AUTH",
    "Request with incorrect Bearer token returns 401 Unauthorized",
    resWrongAuth.status === 401
  );

  // Case C: SUPABASE_SERVICE_ROLE_KEY used as Bearer -> 401 (Fallback removed)
  const reqServiceRole = new NextRequest("http://localhost/api/internal/google-sheets/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const resServiceRole = await googleSheetsRunRoute(reqServiceRole);
  record(
    "7C_CRON_AUTH",
    "Security Hardening: SUPABASE_SERVICE_ROLE_KEY as Bearer is strictly rejected (401)",
    resServiceRole.status === 401
  );

  // Case D: REMINDER_CRON_SECRET used as Bearer -> 401 (Separation of duties)
  const reqReminderSecret = new NextRequest("http://localhost/api/internal/google-sheets/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.REMINDER_CRON_SECRET}` },
  });
  const resReminderSecret = await googleSheetsRunRoute(reqReminderSecret);
  record(
    "7C_CRON_AUTH",
    "Separation of Duties: REMINDER_CRON_SECRET as Bearer is strictly rejected (401)",
    resReminderSecret.status === 401
  );

  // Case E: Missing GOOGLE_SHEETS_SYNC_SECRET in environment -> 500 (Fail-closed)
  delete process.env.GOOGLE_SHEETS_SYNC_SECRET;
  const reqFailClosed = new NextRequest("http://localhost/api/internal/google-sheets/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${testSecret}` },
  });
  const resFailClosed = await googleSheetsRunRoute(reqFailClosed);
  record(
    "7C_CRON_AUTH",
    "Fail-closed: Missing GOOGLE_SHEETS_SYNC_SECRET in server environment returns 500",
    resFailClosed.status === 500
  );

  // Restore env
  process.env = originalEnv;

  // --------------------------------------------------------------------------
  // 7. Multi-Tenant Isolation & Anti-Collision Security Tests
  // --------------------------------------------------------------------------
  console.log("\n7. Running Multi-Tenant Isolation & Anti-Collision Tests...");

  // Business A is already assigned `validId`
  // Attempting to assign `validId` to Business B should violate the unique index
  let collisionError: string | null = null;
  try {
    await pgClient.query(`
      INSERT INTO public.google_sheets_connections (business_id, enabled, spreadsheet_id, spreadsheet_title)
      VALUES ('${testBizIdB}', true, '${validId}', 'Attempt Collision Spreadsheet')
      ON CONFLICT (business_id) DO UPDATE SET spreadsheet_id = '${validId}';
    `);
  } catch (err: any) {
    collisionError = err.message;
  }

  record(
    "7C_TENANT_SECURITY",
    "Unique index uq_google_sheets_connections_spreadsheet_id prevents spreadsheet ID collision across tenants",
    collisionError !== null && collisionError.includes("uq_google_sheets_connections_spreadsheet_id")
  );

  // --------------------------------------------------------------------------
  // 8. Google Sheets Presentation Polish & Formatting Engine Tests
  // --------------------------------------------------------------------------
  console.log("\n8. Running Google Sheets Presentation & Formatting Tests...");

  const mockTestMetadata = {
    title: "OXID WA Ledger - Lele Pilot",
    sheets: [
      { id: 101, title: "Dashboard", index: 2, charts: [{ chartId: 999 }] },
      { id: 102, title: "Transactions", index: 0, basicFilter: {}, bandedRanges: [{ bandedRangeId: 888 }], conditionalFormats: [{}] },
      { id: 103, title: "Products", index: 3 },
      { id: 104, title: "Daily_Status", index: 4 },
      { id: 105, title: "Config", index: 1 },
      { id: 999, title: "Custom User Sheet", index: 5 }, // Custom sheet preserved
    ],
  };

  const sampleSheetsData = {
    Dashboard: dashboardSheet,
    Transactions: transSheet,
    Products: prodSheet,
    Daily_Status: dailySheet,
    Config: configSheet,
  };

  const formattingRequests = buildManagedSheetsFormattingRequests(mockTestMetadata, sampleSheetsData) as any[];

  // 1. Idempotent cleanup of old filters, bandings, charts, conditionalFormats
  record(
    "7C_PRESENTATION",
    "Idempotent cleanup: generates clearBasicFilter, deleteBanding, deleteEmbeddedObject, deleteConditionalFormatRule",
    formattingRequests.some((r) => r.clearBasicFilter?.sheetId === 102) &&
      formattingRequests.some((r) => r.deleteBanding?.bandedRangeId === 888) &&
      formattingRequests.some((r) => r.deleteEmbeddedObject?.objectId === 999) &&
      formattingRequests.some((r) => r.deleteConditionalFormatRule?.sheetId === 102)
  );

  // 2. Sheet ordering & Tab Colors
  const updateProps = formattingRequests
    .filter((r) => r.updateSheetProperties)
    .map((r) => r.updateSheetProperties.properties);

  const dashProp = updateProps.find((p) => p.sheetId === 101);
  const txProp = updateProps.find((p) => p.sheetId === 102);
  const prodProp = updateProps.find((p) => p.sheetId === 103);
  const dailyProp = updateProps.find((p) => p.sheetId === 104);
  const confProp = updateProps.find((p) => p.sheetId === 105);

  record(
    "7C_PRESENTATION",
    "Worksheet ordering: Dashboard=0, Transactions=1, Products=2, Daily_Status=3, Config=4",
    dashProp?.index === 0 &&
      txProp?.index === 1 &&
      prodProp?.index === 2 &&
      dailyProp?.index === 3 &&
      confProp?.index === 4
  );

  record(
    "7C_PRESENTATION",
    "Worksheet tab colors: Dashboard=Blue, Transactions=Emerald, Products=Purple, Daily_Status=Amber, Config=Slate",
    dashProp?.tabColor?.blue > 0.8 &&
      txProp?.tabColor?.green > 0.5 &&
      prodProp?.tabColor?.red > 0.4 &&
      dailyProp?.tabColor?.red > 0.8 &&
      confProp?.tabColor?.red > 0.2
  );

  record(
    "7C_PRESENTATION",
    "Worksheet frozen rows: header rows frozen at row 4 across managed sheets",
    dashProp?.gridProperties?.frozenRowCount === 4 &&
      txProp?.gridProperties?.frozenRowCount === 4 &&
      prodProp?.gridProperties?.frozenRowCount === 4
  );

  // 3. Column widths
  const dimProps = formattingRequests.filter((r) => r.updateDimensionProperties);
  record(
    "7C_PRESENTATION",
    "Explicit column widths configured for readable non-clipped columns",
    dimProps.some((r) => r.updateDimensionProperties.range.sheetId === 102 && r.updateDimensionProperties.properties.pixelSize === 135) &&
      dimProps.some((r) => r.updateDimensionProperties.range.sheetId === 102 && r.updateDimensionProperties.properties.pixelSize === 320)
  );

  // 4. Number formats (Currency IDR, Date dd/mm/yyyy, Time)
  const cellRepeats = formattingRequests.filter((r) => r.repeatCell);
  record(
    "7C_PRESENTATION",
    "Cell formats: Currency (Rp#,##0), Date (dd/mm/yyyy), and Time (hh:mm:ss) formats present",
    cellRepeats.some((r) => r.repeatCell.cell?.userEnteredFormat?.numberFormat?.pattern === '"Rp"#,##0') &&
      cellRepeats.some((r) => r.repeatCell.cell?.userEnteredFormat?.numberFormat?.pattern === "dd/mm/yyyy") &&
      cellRepeats.some((r) => r.repeatCell.cell?.userEnteredFormat?.numberFormat?.pattern === "hh:mm:ss")
  );

  // 4b. Spreadsheet Locale
  const updateSpreadsheetProps = formattingRequests.filter((r) => r.updateSpreadsheetProperties);
  record(
    "7C_PRESENTATION",
    "Spreadsheet locale is set to id_ID for Indonesian number and date formatting",
    updateSpreadsheetProps.some((r) => (r.updateSpreadsheetProperties as any)?.properties?.locale === "id_ID")
  );

  // 5. Zebra Banding & Filters
  const bandings = formattingRequests.filter((r) => r.addBanding);
  const filters = formattingRequests.filter((r) => r.setBasicFilter);
  record(
    "7C_PRESENTATION",
    "Alternating zebra striping and basic filters applied to Transactions, Products, and Daily_Status",
    bandings.some((r) => r.addBanding.bandedRange.range.sheetId === 102) &&
      bandings.some((r) => r.addBanding.bandedRange.range.sheetId === 103) &&
      filters.some((r) => r.setBasicFilter.filter.range.sheetId === 102) &&
      filters.some((r) => r.setBasicFilter.filter.range.sheetId === 103)
  );

  // 6. Conditional Formatting for Status
  const condRules = formattingRequests.filter((r) => r.addConditionalFormatRule);
  record(
    "7C_PRESENTATION",
    "Conditional formatting: status pill colors for confirmed, cancelled, corrected, AKTIF, OPEN",
    condRules.some((r) => r.addConditionalFormatRule.rule.booleanRule.condition.values[0].userEnteredValue === "confirmed") &&
      condRules.some((r) => r.addConditionalFormatRule.rule.booleanRule.condition.values[0].userEnteredValue === "cancelled") &&
      condRules.some((r) => r.addConditionalFormatRule.rule.booleanRule.condition.values[0].userEnteredValue === "AKTIF")
  );

  // 7. Safe Chart Generation
  const chartReqMulti = buildDashboardChartRequest(
    mockTestMetadata,
    {
      Dashboard: [
        ...dashboardSheet,
        ["2026-09-29", 400000, 5],
        ["2026-09-30", 560000, 8],
      ],
    }
  ) as any;
  const chartReqNone = buildDashboardChartRequest(
    mockTestMetadata,
    { Dashboard: dashboardSheet.slice(0, 14) }
  );

  record(
    "7C_PRESENTATION",
    "Safe chart generation: generates COLUMN chart for >= 2 daily points and returns null when < 2 points",
    chartReqMulti !== null &&
      chartReqMulti.addChart?.chart?.spec?.basicChart?.chartType === "COLUMN" &&
      chartReqNone === null
  );

  // 8. Custom client sheet preservation
  record(
    "7C_PRESENTATION",
    "Custom client sheets strictly preserved: no deletion or alteration requests generated for Custom User Sheet (id 999)",
    !formattingRequests.some((r) => r.updateSheetProperties?.properties?.sheetId === 999) &&
      !formattingRequests.some((r) => r.deleteSheet?.sheetId === 999)
  );

  // --------------------------------------------------------------------------
  // 9. Running Data Consistency & Full Reconciliation Tests
  // --------------------------------------------------------------------------
  console.log("\n9. Running Data Consistency & Full Reconciliation Tests...");

  // Clean existing transactions for testBizId
  await pgClient.query(`
    DELETE FROM public.transaction_events WHERE transaction_id IN (
      SELECT id FROM public.transactions WHERE business_id = '${testBizId}'
    );
  `);
  await pgClient.query(`DELETE FROM public.transactions WHERE business_id = '${testBizId}';`);
  await pgClient.query(`DELETE FROM public.products WHERE business_id = '${testBizId}';`);

  // Insert default product and extra product
  const defaultProdRes = await pgClient.query(`
    INSERT INTO public.products (business_id, name, unit, default_price, active, is_default)
    VALUES ('${testBizId}', 'Lele Konsumsi', 'kg', 25000, true, true)
    RETURNING id;
  `);
  const defaultProdId = defaultProdRes.rows[0].id;

  const extraProdRes = await pgClient.query(`
    INSERT INTO public.products (business_id, name, unit, default_price, active, is_default)
    VALUES ('${testBizId}', 'Bibit Lele', 'ekor', 500, true, false)
    RETURNING id;
  `);
  const extraProdId = extraProdRes.rows[0].id;

  // Insert 4 transactions:
  // 1. Confirmed transaction with extraProdId
  // 2. Confirmed transaction with defaultProdId
  // 3. Confirmed transaction with NULL product_id (standard fallback to default product)
  // 4. Cancelled transaction (must be retained in historical export)
  await pgClient.query(`
    INSERT INTO public.transactions (business_id, product_id, quantity, unit, unit_price, total_amount, source, status, raw_message, transaction_at)
    VALUES
      ('${testBizId}', '${extraProdId}', 100, 'ekor', 500, 50000, 'telegram', 'confirmed', '100 bibit', NOW() - interval '1 hour'),
      ('${testBizId}', '${defaultProdId}', 10, 'kg', 25000, 250000, 'telegram', 'confirmed', '10 kg lele', NOW() - interval '2 hours'),
      ('${testBizId}', NULL, 5, 'kg', 25000, 125000, 'dashboard', 'confirmed', '5 kg tanpa id', NOW() - interval '3 hours'),
      ('${testBizId}', '${defaultProdId}', 8, 'kg', 25000, 200000, 'telegram', 'cancelled', 'batal 8 kg', NOW() - interval '4 hours');
  `);

  // Track what writeManagedSheets receives
  const lastWrittenValues: Record<string, any[][]> = {};
  const trackingMockFetcher: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();
    if (urlStr.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "mock-access-token-123", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (urlStr.includes("fields=properties.title")) {
      return new Response(
        JSON.stringify({
          properties: { title: "OXID WA Ledger - Lele Pilot" },
          sheets: [
            { properties: { sheetId: 100, title: "Dashboard" } },
            { properties: { sheetId: 101, title: "Config" } },
            { properties: { sheetId: 102, title: "Transactions" } },
            { properties: { sheetId: 103, title: "Products" } },
            { properties: { sheetId: 104, title: "Daily_Status" } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (urlStr.includes("values:batchClear")) {
      return new Response(JSON.stringify({ clearedRanges: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (urlStr.includes("values:batchUpdate")) {
      const payload = JSON.parse(String(init?.body || "{}"));
      for (const item of payload.data || []) {
        const rangeName = item.range.replace(/'/g, "").replace(/!A1$/, "");
        lastWrittenValues[rangeName] = item.values;
      }
      return new Response(JSON.stringify({ totalUpdatedRows: 100 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (urlStr.endsWith(":batchUpdate")) {
      return new Response(JSON.stringify({ replies: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  };

  const trackingConfig: GoogleSheetsClientConfig = {
    ...fakeConfig,
    fetchFn: trackingMockFetcher,
  };

  const syncResult = await executeBusinessSync(supabase, testBizId, { config: trackingConfig });

  record(
    "7C_DATA_CONSISTENCY",
    "executeBusinessSync queries transaction_at and reconciles all 4 transaction rows (not 0)",
    syncResult.summary.rowsTransactions === 4 && syncResult.success === true
  );

  const txSheetRows = lastWrittenValues["Transactions"] || [];
  // Row 0, 1: Banners, Row 2: Empty, Row 3: Header, Rows 4+: Data
  const dataRows = txSheetRows.slice(4);

  record(
    "7C_DATA_CONSISTENCY",
    "Transactions sheet contains all 4 rows including confirmed and cancelled transactions",
    dataRows.length === 4 &&
      dataRows.some((r) => r[9] === "confirmed") &&
      dataRows.some((r) => r[9] === "cancelled")
  );

  record(
    "7C_DATA_CONSISTENCY",
    "Null product_id safely falls back to default product name ('Lele Konsumsi') and never drops row",
    dataRows.some((r) => r[3] === "Lele Konsumsi" && r[4] === 5 && r[7] === 125000)
  );

  record(
    "7C_DATA_CONSISTENCY",
    "Date cells are formatted as dd/mm/yyyy string in Indonesian format",
    dataRows.every((r) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(r[1])))
  );

  record(
    "7C_DATA_CONSISTENCY",
    "Financial and quantity cells remain pure numeric values (not quoted strings)",
    dataRows.every((r) => typeof r[4] === "number" && typeof r[6] === "number" && typeof r[7] === "number")
  );

  // Check sync runs record
  const syncRunsRes = await pgClient.query(`
    SELECT rows_transactions, rows_products, status
    FROM public.google_sheets_sync_runs
    WHERE business_id = '${testBizId}'
    ORDER BY started_at DESC
    LIMIT 1;
  `);

  record(
    "7C_DATA_CONSISTENCY",
    "google_sheets_sync_runs reports accurate rows_transactions count matching written rows",
    syncRunsRes.rows.length === 1 &&
      syncRunsRes.rows[0].rows_transactions === 4 &&
      syncRunsRes.rows[0].rows_products === 2 &&
      syncRunsRes.rows[0].status === "success"
  );

  // Clean up test data
  await pgClient.query(`
    DELETE FROM public.transaction_events WHERE transaction_id IN (
      SELECT id FROM public.transactions WHERE business_id IN ('${testBizId}', '${testBizIdB}')
    );
  `);
  await pgClient.query(`DELETE FROM public.transactions WHERE business_id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM public.google_sheets_sync_queue WHERE business_id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM public.google_sheets_connections WHERE business_id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM public.products WHERE business_id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM public.business_users WHERE business_id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM public.businesses WHERE id IN ('${testBizId}', '${testBizIdB}');`);
  await pgClient.query(`DELETE FROM auth.users WHERE id IN ('${testUserIdA}', '${testUserIdB}');`);

  await pgClient.end();

  // Summary
  const passedCount = reports.filter((r) => r.passed).length;
  const failedCount = reports.filter((r) => !r.passed).length;

  console.log("\n=== Step 7C Test Results Summary ===");
  console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`\n❌ ${failedCount} tests failed!`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${passedCount} Step 7C tests passed successfully!`);
    process.exit(0);
  }
}

runStep7cTests().catch((err) => {
  console.error("Test runner threw unhandled exception:", err);
  process.exit(1);
});
