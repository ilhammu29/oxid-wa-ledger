/**
 * Step 9.1 Automated Test Suite: Subscription Hardening & Verification
 * Covers all 17 security & operational test scenarios:
 * 1. 9.1A Unverified bank details completely absent from source code & UI fallbacks
 * 2. 9.1A billing_payment_settings returns safe fallback when empty
 * 3. 9.1B Plan pricing centralization & integer IDR enforcement
 * 4. 9.1C Admin authorization fail-closed behavior
 * 5. 9.1C Normal business owner blocked from /admin/* actions
 * 6. 9.1E Lifecycle transition: trialing -> grace_period
 * 7. 9.1E Lifecycle transition: active -> grace_period
 * 8. 9.1E Lifecycle transition: grace_period -> suspended
 * 9. 9.1E Terminal state preservation: cancelled never revived by cron
 * 10. 9.1F Financial data invariance: historical transactions untouched across lifecycle
 * 11. 9.1G Mutation gate blocks suspended business
 * 12. 9.1G Mutation gate blocks cancelled business
 * 13. 9.1G Mutation gate blocks grace_period business
 * 14. 9.1G Mutation gate blocks expired trial
 * 15. 9.1G Mutation gate permits active & valid trial
 * 16. 9.1H Admin payment confirmation idempotency (no duplicate days extension)
 * 17. 9.1J Expiry notification generation & idempotency deduplication
 */

import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  getBusinessSubscription,
  getBusinessSubscriptionState,
  canCreateFinancialMutation,
  createPaymentRecord,
  getBillingPaymentSettings,
  runSubscriptionLifecycle,
  sendSubscriptionExpiryNotifications,
  isOxidSuperAdmin,
  adminConfirmPayment,
  getAllPlans,
  getPlan,
  formatIDR,
} from "../src/modules/subscriptions";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(id: number, category: string, name: string, passed: boolean, error?: string) {
  reports.push({ id, category, name, passed, error });
  const symbol = passed ? "✓" : "✗";
  console.log(`  ${symbol} [Test ${id} - ${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
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
                    .map((c, i) => {
                      values.push(c.val);
                      if (c.op === "= ANY") {
                        return `"${c.col}" = ANY ($${i + 1})`;
                      }
                      if (c.op === "@>") {
                        return `"${c.col}"::jsonb @> $${i + 1}::jsonb`;
                      }
                      return `"${c.col}" ${c.op} $${i + 1}`;
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
            neq: (col: string, val: any) => {
              conditions.push({ col, op: "!=", val });
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
            lt: (col: string, val: any) => {
              conditions.push({ col, op: "<", val });
              return queryBuilder;
            },
            gt: (col: string, val: any) => {
              conditions.push({ col, op: ">", val });
              return queryBuilder;
            },
            in: (col: string, vals: any[]) => {
              conditions.push({ col, op: "= ANY", val: vals });
              return queryBuilder;
            },
            contains: (col: string, val: any) => {
              conditions.push({
                col,
                op: "@>",
                val: typeof val === "object" && val !== null ? JSON.stringify(val) : val,
              });
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
                      if (c.op === "= ANY") {
                        return `"${c.col}" = ANY ($${setCols.length + i + 1})`;
                      }
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
          const b: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return b;
            },
            in: (col: string, vals: any[]) => {
              conditions.push({ col, op: "= ANY", val: vals });
              return b;
            },
            then: (resolve: any, reject: any) => executeUpdate().then(resolve, reject),
          };
          return b;
        },
        delete: () => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          const executeDelete = async () => {
            try {
              const paramVals: any[] = [];
              let whereClause = "";
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c, i) => {
                      paramVals.push(c.val);
                      return `"${c.col}" ${c.op} $${i + 1}`;
                    })
                    .join(" AND ");
              }
              const sql = `DELETE FROM public."${table}" ${whereClause};`;
              const res = await pgClient.query(sql, paramVals);
              return { data: null, error: null, count: res.rowCount };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const b: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return b;
            },
            then: (resolve: any, reject: any) => executeDelete().then(resolve, reject),
          };
          return b;
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("OXID LEDGER: STEP 9.1 HARDENING & VERIFICATION SUITE");
  console.log("==================================================");

  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  const supabase = createPgSupabaseAdapter(pg);

  const testBizId = "00000000-9100-0000-0000-000000000001";
  const testBizName = "Toko Step 9.1 Hardening Test";
  const testOwnerId = "00000000-9100-0000-0000-000000000099";

  try {
    // Clean up any test fixtures from previous runs
    await pg.query(`DELETE FROM public.transactions WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.products WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.notification_logs WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.telegram_authorized_users WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.business_channel_settings WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.subscription_payments WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.subscription_audit_logs WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.business_subscriptions WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.businesses WHERE id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.billing_payment_settings;`);

    // Ensure test owner exists in auth.users
    await pg.query(`
      INSERT INTO auth.users (id, email)
      VALUES ('${testOwnerId}', 'owner91@oxid.test')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create fresh test business (triggers automatic 14-day trial)
    await pg.query(
      `INSERT INTO public.businesses (id, name, timezone, currency, status, created_by)
       VALUES ($1, $2, 'Asia/Jakarta', 'IDR', 'active', $3);`,
      [testBizId, testBizName, testOwnerId]
    );

    // =========================================================================
    // Test 1: Unverified bank details completely absent from source code & UI
    // =========================================================================
    const filesToCheck = [
      "src/components/dashboard/subscription-view.tsx",
      "src/components/admin/admin-business-detail-view.tsx",
      "src/modules/subscriptions/plans.ts",
    ];
    let foundUnverifiedBank = false;
    for (const f of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (
        content.includes("8015-2882-91") ||
        content.includes("1370-0291-8821") ||
        content.includes("PT OXID DIGITAL INDONESIA") ||
        content.includes("Bank Central Asia (BCA)") ||
        content.includes("Bank Mandiri") ||
        content.includes("Transfer Bank (BCA / Mandiri)") ||
        content.includes("Contoh: BCA Ref")
      ) {
        foundUnverifiedBank = true;
        break;
      }
    }
    record(
      1,
      "9.1A_NO_FAKE_BANKS",
      "Unverified bank details completely absent from source code & UI fallbacks",
      !foundUnverifiedBank,
      foundUnverifiedBank ? "Found untrusted bank placeholder in source code" : undefined
    );

    // =========================================================================
    // Test 2: billing_payment_settings returns safe fallback when empty
    // =========================================================================
    const emptySettings = await getBillingPaymentSettings(supabase);
    const viewFileContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/dashboard/subscription-view.tsx"),
      "utf-8"
    );
    const fallbackCopyPresent = viewFileContent.includes(
      "Detail pembayaran belum dikonfigurasi. Silakan hubungi admin OXID untuk aktivasi langganan."
    );

    // Test dynamic rendering when setting is present
    await pg.query(`
      INSERT INTO public.billing_payment_settings (bank_name, account_name, masked_account_number, active)
      VALUES ('Bank Syariah Indonesia (BSI)', 'OXID Operational', '7100-XXXX-12', true);
    `);
    const populatedSettings = await getBillingPaymentSettings(supabase);
    await pg.query(`DELETE FROM public.billing_payment_settings;`); // clean up

    const settingOk =
      emptySettings.length === 0 &&
      fallbackCopyPresent &&
      populatedSettings.length === 1 &&
      populatedSettings[0].bankName === "Bank Syariah Indonesia (BSI)";
    record(
      2,
      "9.1A_SAFE_FALLBACK",
      "billing_payment_settings returns safe fallback copy when empty and loads active settings when present",
      settingOk
    );

    // =========================================================================
    // Test 3: Plan pricing centralization & integer IDR enforcement
    // =========================================================================
    const plans = getAllPlans();
    const integerIdrOk =
      plans.length >= 3 &&
      plans.every((p) => Number.isInteger(p.priceIdr) && p.priceIdr >= 0) &&
      getPlan("pilot").priceIdr === 0 &&
      getPlan("basic").priceIdr === 49000 &&
      getPlan("pro").priceIdr === 149000 &&
      formatIDR(49000).includes("49.000") &&
      !formatIDR(49000).includes(",00");
    record(
      3,
      "9.1B_INTEGER_IDR",
      "Plan pricing metadata is centralized with integer IDR money semantics (no fractional currency)",
      integerIdrOk
    );

    // =========================================================================
    // Test 4: Admin authorization fail-closed behavior
    // =========================================================================
    const nullAuth = await isOxidSuperAdmin(null, supabase);
    const undefAuth = await isOxidSuperAdmin(undefined, supabase);
    const emptyEmailAuth = await isOxidSuperAdmin({ id: "fake-1", email: "" } as any, supabase);
    const untrustedAuth = await isOxidSuperAdmin({ id: "fake-2", email: "hacker@evil.com" } as any, supabase);
    const failClosedOk =
      nullAuth === false &&
      undefAuth === false &&
      emptyEmailAuth === false &&
      untrustedAuth === false;
    record(
      4,
      "9.1C_FAIL_CLOSED_AUTH",
      "Admin authorization strictly fails closed on null, undefined, empty, or untrusted user",
      failClosedOk
    );

    // =========================================================================
    // Test 5: Normal business owner blocked from /admin/* actions
    // =========================================================================
    const regularOwnerUser = {
      id: "11111111-2222-3333-4444-555555555555",
      email: "lele_owner@umkm-indonesia.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const regularOwnerBlocked = (await isOxidSuperAdmin(regularOwnerUser as any, supabase)) === false;
    record(
      5,
      "9.1C_MERCHANT_BLOCKED",
      "Normal business owner is strictly blocked from platform administrative actions",
      regularOwnerBlocked
    );

    // =========================================================================
    // Test 6: Lifecycle transition: trialing -> grace_period
    // =========================================================================
    const now = new Date();
    const expiredTrialTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const futureGraceTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'trialing', trial_ends_at = $1, current_period_end = $1, grace_period_ends_at = $2
       WHERE business_id = $3;`,
      [expiredTrialTime, futureGraceTime, testBizId]
    );
    const cycleRes1 = await runSubscriptionLifecycle(supabase, now);
    const subAfterTrialExpire = await getBusinessSubscription(supabase, testBizId);
    const trialToGraceOk =
      cycleRes1.some((t) => t.businessId === testBizId && t.newStatus === "grace_period") &&
      subAfterTrialExpire?.status === "grace_period";
    record(
      6,
      "9.1E_TRIAL_TO_GRACE",
      "Expired trial transitions automatically to grace_period",
      trialToGraceOk
    );

    // =========================================================================
    // Test 7: Lifecycle transition: active -> grace_period
    // =========================================================================
    const expiredActiveTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'active', current_period_end = $1, grace_period_ends_at = $2
       WHERE business_id = $3;`,
      [expiredActiveTime, futureGraceTime, testBizId]
    );
    const cycleRes2 = await runSubscriptionLifecycle(supabase, now);
    const subAfterActiveExpire = await getBusinessSubscription(supabase, testBizId);
    const activeToGraceOk =
      cycleRes2.some((t) => t.businessId === testBizId && t.newStatus === "grace_period") &&
      subAfterActiveExpire?.status === "grace_period";
    record(
      7,
      "9.1E_ACTIVE_TO_GRACE",
      "Expired active subscription transitions automatically to grace_period",
      activeToGraceOk
    );

    // =========================================================================
    // Test 8: Lifecycle transition: grace_period -> suspended
    // =========================================================================
    const expiredGraceTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'grace_period', grace_period_ends_at = $1
       WHERE business_id = $2;`,
      [expiredGraceTime, testBizId]
    );
    const cycleRes3 = await runSubscriptionLifecycle(supabase, now);
    const subAfterGraceExpire = await getBusinessSubscription(supabase, testBizId);
    const graceToSuspendedOk =
      cycleRes3.some((t) => t.businessId === testBizId && t.newStatus === "suspended") &&
      subAfterGraceExpire?.status === "suspended";
    record(
      8,
      "9.1E_GRACE_TO_SUSPENDED",
      "Expired grace period transitions automatically to suspended",
      graceToSuspendedOk
    );

    // =========================================================================
    // Test 9: Terminal state preservation: cancelled never revived by cron
    // =========================================================================
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'cancelled', cancelled_at = now(), current_period_end = $1
       WHERE business_id = $2;`,
      [expiredActiveTime, testBizId]
    );
    await runSubscriptionLifecycle(supabase, now);
    const subAfterCancelledCron = await getBusinessSubscription(supabase, testBizId);
    const cancelledPreserved = subAfterCancelledCron?.status === "cancelled";
    record(
      9,
      "9.1E_TERMINAL_CANCELLED",
      "Terminal state cancelled is never revived or overwritten by lifecycle cron",
      cancelledPreserved
    );

    // =========================================================================
    // Test 10: Financial data invariance: historical transactions untouched
    // =========================================================================
    // Insert a product and a transaction for test business
    const txId = "00000000-9100-0000-0000-000000000002";
    const prodId = "00000000-9100-0000-0000-000000000003";
    await pg.query(`
      INSERT INTO public.products (id, business_id, name, default_price, unit)
      VALUES ('${prodId}', '${testBizId}', 'Lele Hardened', 25000, 'kg')
      ON CONFLICT DO NOTHING;
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount, status, source)
      VALUES ('${txId}', '${testBizId}', '${prodId}', 10, 'kg', 25000, 250000, 'confirmed', 'dashboard')
      ON CONFLICT DO NOTHING;
    `);

    // Run lifecycle multiple times
    await runSubscriptionLifecycle(supabase, now);
    await runSubscriptionLifecycle(supabase, new Date(now.getTime() + 1000));

    // Verify transaction remains 100% intact
    const txCheck = await pg.query(
      `SELECT count(*)::int as count, sum(total_amount)::bigint as sum_rev
       FROM public.transactions WHERE business_id = $1 AND status = 'confirmed';`,
      [testBizId]
    );
    const invarianceOk =
      txCheck.rows[0].count === 1 && Number(txCheck.rows[0].sum_rev) === 250000;
    record(
      10,
      "9.1F_LEDGER_INVARIANCE",
      "Financial ledger history remains strictly invariant across subscription transitions",
      invarianceOk
    );

    // =========================================================================
    // Test 11: Mutation gate blocks suspended business
    // =========================================================================
    await pg.query(
      `UPDATE public.business_subscriptions SET status = 'suspended' WHERE business_id = $1;`,
      [testBizId]
    );
    const gateSuspended = await canCreateFinancialMutation(supabase, testBizId, now);
    const gateSuspendedOk = Boolean(
      gateSuspended.allowed === false &&
      gateSuspended.reason === "SUBSCRIPTION_SUSPENDED" &&
      gateSuspended.replyText?.includes("ditangguhkan")
    );
    record(
      11,
      "9.1G_GATE_SUSPENDED",
      "Mutation gate blocks suspended business with clear Indonesian explanation",
      gateSuspendedOk
    );

    // =========================================================================
    // Test 12: Mutation gate blocks cancelled business
    // =========================================================================
    await pg.query(
      `UPDATE public.business_subscriptions SET status = 'cancelled' WHERE business_id = $1;`,
      [testBizId]
    );
    const gateCancelled = await canCreateFinancialMutation(supabase, testBizId, now);
    const gateCancelledOk = Boolean(
      gateCancelled.allowed === false &&
      gateCancelled.reason === "SUBSCRIPTION_CANCELLED" &&
      gateCancelled.replyText?.includes("dibatalkan")
    );
    record(
      12,
      "9.1G_GATE_CANCELLED",
      "Mutation gate blocks cancelled business with data preservation confirmation",
      gateCancelledOk
    );

    // =========================================================================
    // Test 13: Mutation gate blocks grace_period business
    // =========================================================================
    await pg.query(
      `UPDATE public.business_subscriptions SET status = 'grace_period' WHERE business_id = $1;`,
      [testBizId]
    );
    const gateGrace = await canCreateFinancialMutation(supabase, testBizId, now);
    const gateGraceOk = Boolean(
      gateGrace.allowed === false &&
      gateGrace.reason === "SUBSCRIPTION_GRACE_PERIOD" &&
      gateGrace.replyText?.includes("tenggang")
    );
    record(
      13,
      "9.1G_GATE_GRACE",
      "Mutation gate blocks grace period business with perpanjangan prompt",
      gateGraceOk
    );

    // =========================================================================
    // Test 14: Mutation gate blocks expired trial
    // =========================================================================
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'trialing', trial_ends_at = $1, current_period_end = $1
       WHERE business_id = $2;`,
      [expiredTrialTime, testBizId]
    );
    const gateExpiredTrial = await canCreateFinancialMutation(supabase, testBizId, now);
    const gateExpiredTrialOk = Boolean(
      gateExpiredTrial.allowed === false &&
      gateExpiredTrial.reason === "SUBSCRIPTION_TRIAL_EXPIRED" &&
      gateExpiredTrial.replyText?.includes("uji coba")
    );
    record(
      14,
      "9.1G_GATE_EXPIRED_TRIAL",
      "Mutation gate blocks expired trial business from inserting transactions",
      gateExpiredTrialOk
    );

    // =========================================================================
    // Test 15: Mutation gate permits active & valid trial
    // =========================================================================
    const futureTime = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'trialing', trial_ends_at = $1, current_period_end = $1
       WHERE business_id = $2;`,
      [futureTime, testBizId]
    );
    const gateValidTrial = await canCreateFinancialMutation(supabase, testBizId, now);

    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'active', current_period_end = $1
       WHERE business_id = $2;`,
      [futureTime, testBizId]
    );
    const gateValidActive = await canCreateFinancialMutation(supabase, testBizId, now);

    const gatePermitsOk =
      gateValidTrial.allowed === true && gateValidActive.allowed === true;
    record(
      15,
      "9.1G_GATE_PERMITS_ACTIVE",
      "Mutation gate permits active subscriptions and unexpired trials",
      gatePermitsOk
    );

    // =========================================================================
    // Test 16: Admin payment confirmation idempotency (no duplicate days extension)
    // =========================================================================
    const testSub = await getBusinessSubscription(supabase, testBizId);
    const payment = await createPaymentRecord(supabase, {
      businessId: testBizId,
      subscriptionId: testSub!.id,
      amountIdr: 49000,
      paymentMethod: "manual_transfer",
      reference: "TEST-IDEMPOTENCY-REF-1",
    });

    // Confirm payment for the first time (+30 days)
    await adminConfirmPayment(supabase, {
      paymentId: payment.id,
      extensionDays: 30,
      notes: "First confirmation",
    });

    const subAfterConfirm1 = await getBusinessSubscription(supabase, testBizId);
    const periodEnd1 = subAfterConfirm1?.currentPeriodEnd;

    // Call adminConfirmPayment a SECOND time on the already confirmed payment
    await adminConfirmPayment(supabase, {
      paymentId: payment.id,
      extensionDays: 30,
      notes: "Duplicate confirmation attempt",
    });

    const subAfterConfirm2 = await getBusinessSubscription(supabase, testBizId);
    const periodEnd2 = subAfterConfirm2?.currentPeriodEnd;

    const time1 = periodEnd1 ? new Date(periodEnd1).getTime() : 0;
    const time2 = periodEnd2 ? new Date(periodEnd2).getTime() : 1;

    const idempotencyOk =
      time1 > 0 &&
      time1 === time2 &&
      subAfterConfirm2?.status === "active";
    record(
      16,
      "9.1H_PAYMENT_IDEMPOTENCY",
      "Admin payment confirmation is strictly idempotent (duplicate confirmation does NOT add extra days)",
      idempotencyOk
    );

    // =========================================================================
    // Test 17: Expiry notification generation & idempotency deduplication
    // =========================================================================
    // Set up business for 3-day reminder stage
    const threeDaysFuture = new Date(now.getTime() + (3 * 24 - 2) * 60 * 60 * 1000).toISOString();
    await pg.query(
      `UPDATE public.business_subscriptions
       SET status = 'active', current_period_end = $1
       WHERE business_id = $2;`,
      [threeDaysFuture, testBizId]
    );

    // Add active telegram channel and chat operator
    await pg.query(`
      INSERT INTO public.business_channel_settings (business_id, telegram_enabled, reminder_channel, primary_channel)
      VALUES ('${testBizId}', true, 'telegram', 'telegram')
      ON CONFLICT (business_id) DO UPDATE SET reminder_channel = 'telegram', telegram_enabled = true;
      INSERT INTO public.telegram_authorized_users (business_id, telegram_user_id, active, receive_reminders, display_label)
      VALUES ('${testBizId}', 123456789, true, true, 'Owner Operator')
      ON CONFLICT (business_id, telegram_user_id) DO UPDATE SET active = true, receive_reminders = true;
      DELETE FROM public.notification_logs WHERE business_id = '${testBizId}';
    `);

    // First notification run (mock Telegram sender in test)
    const notifRes1 = await sendSubscriptionExpiryNotifications(supabase, now, {
      telegramSender: async () => ({ success: true }),
    });

    // Second notification run on same day must skip (idempotency check)
    const notifRes2 = await sendSubscriptionExpiryNotifications(supabase, now, {
      telegramSender: async () => ({ success: true }),
    });

    const notifIdempotencyOk =
      notifRes1.some((r) => r.businessId === testBizId && r.stage === "3d") &&
      !notifRes2.some((r) => r.businessId === testBizId);
    record(
      17,
      "9.1J_NOTIFICATION_IDEMPOTENCY",
      "Expiry notification delivery deduplicates idempotently via notification_logs",
      notifIdempotencyOk
    );

    // =========================================================================
    // Clean up
    // =========================================================================
    await pg.query(`DELETE FROM public.transactions WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.products WHERE business_id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.businesses WHERE id = $1;`, [testBizId]);
    await pg.query(`DELETE FROM public.billing_payment_settings;`);
  } finally {
    await pg.end();
  }

  // Summary
  console.log("\n==================================================");
  console.log("STEP 9.1 TEST RESULTS SUMMARY");
  console.log("==================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error(`❌ ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log("✅ ALL 17 STEP 9.1 TESTS PASSED SUCCESSFULLY!");
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
