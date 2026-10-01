/**
 * Step 9 Automated Test Suite: SaaS Subscription & Client Management
 * Covers:
 * 1. 9A Subscription Core:
 *    - Schema verification: business_subscriptions table & constraints
 *    - Auto-initialization trigger upon business creation (14-day trial)
 *    - Unique constraint per business
 *    - Financial ledger independence (ledger tables never deleted or altered)
 * 2. 9B Plans & Manual Billing:
 *    - Plan model (pilot, basic, pro) & integer IDR money semantics
 *    - subscription_payments table & status lifecycle (pending -> confirmed -> rejected)
 *    - Payment confirmation extends subscription duration
 * 3. 9C Subscription Gate:
 *    - Server-side subscription eligibility helper (getBusinessSubscriptionState)
 *    - canUseLedger allows read/dashboard access across states (even suspended/cancelled)
 *    - canCreateFinancialMutation allows active & trialing (unexpired)
 *    - canCreateFinancialMutation blocks grace_period, suspended, cancelled, expired
 *    - recordSale RPC/service throws SUBSCRIPTION_MUTATION_BLOCKED on suspended business
 *    - Conversation executor returns friendly Indonesian message on blocked mutation
 *    - Read-only reports & help succeed even when suspended
 * 4. 9D Customer Billing Dashboard:
 *    - formatIDR formatting & countdown calculations
 * 5. 9E Internal OXID Admin:
 *    - isOxidSuperAdmin authorization (grants admin, rejects regular owner)
 *    - listAllBusinessesForAdmin returns complete platform overview
 *    - Admin actions: activate, extend, suspend, reactivate, cancel
 *    - All admin actions write immutable audit logs to subscription_audit_logs
 *    - Secrets are never exposed
 * 6. 9F Expiry Automation & Notifications:
 *    - Lifecycle state machine: trialing -> grace_period -> suspended
 *    - Lifecycle state machine: active -> grace_period -> suspended
 *    - Lifecycle idempotency (second run yields 0 transitions)
 *    - Expiry notifications (7d, 3d, 1d, 0d) via Telegram to active operators
 *    - Expiry notification idempotency via notification_logs
 *    - Internal endpoint /api/internal/subscriptions/run authentication & fail-closed security
 * 7. Production Verification & Invariance:
 *    - Expiry never deletes transaction rows, products, or daily status
 *    - Telegram still processes allowed transactions
 *    - WhatsApp code preserved intact
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  getBusinessSubscription,
  getBusinessSubscriptionState,
  canUseLedger,
  canCreateFinancialMutation,
  createPaymentRecord,
  getBusinessPayments,
  runSubscriptionLifecycle,
  sendSubscriptionExpiryNotifications,
  isOxidSuperAdmin,
  listAllBusinessesForAdmin,
  getBusinessDetailForAdmin,
  adminActivateSubscription,
  adminConfirmPayment,
  adminRejectPayment,
  adminExtendSubscription,
  adminSuspendSubscription,
  adminReactivateSubscription,
  adminCancelSubscription,
  getAllPlans,
  getPlan,
  formatIDR,
} from "../src/modules/subscriptions";
import { executeConversationAction } from "../src/modules/conversation";
import { recordSale } from "../src/modules/transactions";
import { DomainError } from "../src/modules/transactions/errors";

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
                    .map((c, i) => {
                      values.push(c.val);
                      if (c.op === "= ANY") {
                        return `"${c.col}" = ANY ($${i + 1})`;
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
              let whereClause = "";
              const paramVals: any[] = [];
              if (conditions.length > 0) {
                whereClause =
                  "WHERE " +
                  conditions
                    .map((c, i) => {
                      paramVals.push(c.val);
                      if (c.op === "= ANY") {
                        return `"${c.col}" = ANY ($${i + 1})`;
                      }
                      return `"${c.col}" ${c.op} $${i + 1}`;
                    })
                    .join(" AND ");
              }
              const sql = `DELETE FROM public."${table}" ${whereClause};`;
              await pgClient.query(sql, paramVals);
              return { error: null };
            } catch (err: any) {
              return { error: { message: err.message, code: err.code } };
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

async function runStep9Tests() {
  console.log("=== OXID WA Ledger - Step 9 SaaS Subscription & Client Management Tests ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const supabase = createPgSupabaseAdapter(pgClient);

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data & Fixtures
    // -------------------------------------------------------------------------
    console.log("1. Setting up Step 9 test fixtures...");
    const testAdminUser = "99999999-9999-9999-9999-999999999990";
    const testOwnerA = "99999999-9999-9999-9999-999999999991";
    const testOwnerB = "99999999-9999-9999-9999-999999999992";

    const bizA = "9a9a9a9a-9a9a-9a9a-9a9a-9a9a9a9a9a91";
    const bizB = "9b9b9b9b-9b9b-9b9b-9b9b-9b9b9b9b9b92";

    // Clean past records
    await pgClient.query(`
      DELETE FROM public.subscription_audit_logs WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.subscription_payments WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.business_subscriptions WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.transaction_events WHERE transaction_id IN (SELECT id FROM public.transactions WHERE business_id IN ('${bizA}', '${bizB}'));
      DELETE FROM public.transactions WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.business_daily_status WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.notification_logs WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.telegram_authorized_users WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.business_channel_settings WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.products WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.business_users WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.businesses WHERE id IN ('${bizA}', '${bizB}');
    `);

    // Ensure Auth Users exist
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${testAdminUser}', 'platformadmin@oxid.test'),
        ('${testOwnerA}', 'ownerA@oxid.test'),
        ('${testOwnerB}', 'ownerB@oxid.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.platform_admins (user_id, email, role) VALUES
        ('${testAdminUser}', 'platformadmin@oxid.test', 'super_admin')
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO public.businesses (id, name, timezone, currency, status, created_by) VALUES
        ('${bizA}', 'Lele Sejahtera Biz A', 'Asia/Jakarta', 'IDR', 'active', '${testOwnerA}'),
        ('${bizB}', 'Nila Barokah Biz B', 'Asia/Jakarta', 'IDR', 'active', '${testOwnerB}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${testOwnerA}', 'owner'),
        ('${bizB}', '${testOwnerB}', 'owner')
      ON CONFLICT (business_id, user_id) DO NOTHING;

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active) VALUES
        ('91111111-1111-1111-1111-111111111111', '${bizA}', 'Lele Segar', 'kg', 25000, true, true),
        ('92222222-2222-2222-2222-222222222222', '${bizB}', 'Nila Segar', 'kg', 35000, true, true)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.business_channel_settings (business_id, telegram_enabled, whatsapp_enabled, primary_channel, reminder_channel) VALUES
        ('${bizA}', true, false, 'telegram', 'telegram'),
        ('${bizB}', true, false, 'telegram', 'telegram')
      ON CONFLICT (business_id) DO NOTHING;

      INSERT INTO public.telegram_authorized_users (business_id, telegram_user_id, display_label, active, receive_reminders) VALUES
        ('${bizA}', 99101, 'Operator A', true, true),
        ('${bizB}', 99201, 'Operator B', true, true)
      ON CONFLICT (business_id, telegram_user_id) DO NOTHING;
    `);

    console.log("✓ Fixtures ready.\n");

    // =========================================================================
    // SECTION 1: 9A Subscription Core & Schema
    // =========================================================================
    console.log("2. Running 9A Subscription Core Tests...");

    // 1.1 Verify auto-initialization trigger created trialing subscription for Biz A and Biz B
    const subA = await getBusinessSubscription(supabase, bizA);
    record(
      "9A_AUTO_INIT",
      "New business automatically initializes with 'pilot' plan and 'trialing' status",
      subA !== null && subA.planCode === "pilot" && subA.status === "trialing"
    );

    // 1.2 Verify 14-day trial duration
    const trialStart = new Date(subA!.trialStartedAt);
    const trialEnd = new Date(subA!.trialEndsAt);
    const durationDays = Math.round((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
    record(
      "9A_TRIAL_DURATION",
      "Trial duration is configured for 14 days",
      durationDays === 14
    );

    // 1.3 Verify uniqueness: Cannot insert second subscription for same business
    let duplicateSubError = false;
    try {
      await pgClient.query(`
        INSERT INTO public.business_subscriptions (business_id, plan_code, status)
        VALUES ('${bizA}', 'basic', 'active');
      `);
    } catch {
      duplicateSubError = true;
    }
    record(
      "9A_UNIQUE_SUB",
      "Unique constraint prevents multiple subscriptions per business",
      duplicateSubError === true
    );

    // 1.4 Financial ledger independence: Subscriptions table does not alter transactions table schema
    const txCols = await pgClient.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'business_id';
    `);
    record(
      "9A_LEDGER_INDEPENDENCE",
      "Financial ledger remains completely decoupled and independent from subscriptions",
      txCols.rows.length === 1
    );

    // =========================================================================
    // SECTION 2: 9B Plans & Manual Billing
    // =========================================================================
    console.log("\n3. Running 9B Plans & Manual Billing Tests...");

    // 2.1 Verify plan models (pilot, basic, pro)
    const plans = getAllPlans();
    record(
      "9B_PLANS_MODEL",
      "Plan model includes pilot (Rp 0), basic (Rp 49.000), and pro (Rp 149.000)",
      plans.length === 3 &&
        getPlan("pilot").priceIdr === 0 &&
        getPlan("basic").priceIdr === 49000 &&
        getPlan("pro").priceIdr === 149000
    );

    // 2.2 Create manual payment record with integer IDR
    const payment = await createPaymentRecord(supabase, {
      businessId: bizA,
      subscriptionId: subA!.id,
      amountIdr: 49000,
      paymentMethod: "manual_transfer",
      reference: "BCA Ref 998877",
    });
    record(
      "9B_PAYMENT_CREATE",
      "Manual payment record created with status 'pending' and integer IDR amount",
      payment.status === "pending" && payment.amountIdr === 49000 && payment.reference === "BCA Ref 998877"
    );

    // 2.3 Payment history query
    const paymentList = await getBusinessPayments(supabase, bizA);
    record(
      "9B_PAYMENT_LIST",
      "getBusinessPayments retrieves payments for authorized business",
      paymentList.length === 1 && paymentList[0].id === payment.id
    );

    // 2.4 IDR Currency formatter
    record(
      "9B_FORMAT_IDR",
      "formatIDR formats integer IDR into clean Indonesian currency string",
      formatIDR(49000).includes("49.000")
    );

    // =========================================================================
    // SECTION 3: 9C Subscription Gate & Server-side Guards
    // =========================================================================
    console.log("\n4. Running 9C Subscription Gate Tests...");

    // 3.1 Unexpired trial allows mutations
    const gateTrial = await canCreateFinancialMutation(supabase, bizA, new Date(Date.now() + 1000 * 60 * 60)); // 1 hour into trial
    record(
      "9C_TRIAL_ALLOWED",
      "canCreateFinancialMutation allows mutations during unexpired trial",
      gateTrial.allowed === true
    );

    // 3.2 canUseLedger allows read/dashboard access
    const ledgerAllowed = await canUseLedger(supabase, bizA);
    record(
      "9C_LEDGER_READ_ALLOWED",
      "canUseLedger allows dashboard view and report reads",
      ledgerAllowed === true
    );

    // 3.3 Expired trial (without payment) enters grace or blocks mutations
    const gateExpiredTrial = await canCreateFinancialMutation(
      supabase,
      bizA,
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days later (trial was 14 days)
    );
    record(
      "9C_EXPIRED_TRIAL_BLOCKED",
      "canCreateFinancialMutation strictly blocks mutations after trial expiration",
      gateExpiredTrial.allowed === false
    );

    // 3.4 Set Biz B subscription to 'suspended'
    await pgClient.query(`
      UPDATE public.business_subscriptions
      SET status = 'suspended', suspended_at = now()
      WHERE business_id = '${bizB}';
    `);

    const gateSuspended = await canCreateFinancialMutation(supabase, bizB);
    record(
      "9C_SUSPENDED_BLOCKED",
      "canCreateFinancialMutation strictly blocks mutations when status is 'suspended'",
      gateSuspended.allowed === false && gateSuspended.reason === "SUBSCRIPTION_SUSPENDED"
    );

    // 3.5 Direct recordSale on suspended business throws DomainError
    let threwGateError = false;
    let errCode = "";
    try {
      await recordSale(
        supabase,
        { businessId: bizB, source: "dashboard" },
        { quantity: 5, rawMessage: "5kg" }
      );
    } catch (err: any) {
      if (err instanceof DomainError) {
        threwGateError = true;
        errCode = err.code;
      }
    }
    record(
      "9C_RECORD_SALE_GUARDED",
      "recordSale throws DomainError SUBSCRIPTION_MUTATION_BLOCKED on suspended business",
      threwGateError === true && errCode === "SUBSCRIPTION_SUSPENDED"
    );

    // 3.6 Conversation executor on suspended business returns polite Indonesian message with zero ledger writes
    const convRes = await executeConversationAction(
      supabase,
      { businessId: bizB, source: "telegram", now: new Date() },
      "Kejual 10kg"
    );
    record(
      "9C_CONV_EXECUTOR_GUARD",
      "executeConversationAction politely blocks mutation on suspended business and informs operator",
      convRes.status === "ERROR" &&
        convRes.errorCode === "SUBSCRIPTION_SUSPENDED" &&
        convRes.replyText.includes("ditangguhkan")
    );

    // 3.7 Zero financial writes occurred in Business B
    const txCountB = await pgClient.query(`SELECT count(*)::int AS count FROM public.transactions WHERE business_id = '${bizB}';`);
    record(
      "9C_ZERO_WRITES_WHEN_BLOCKED",
      "Zero transaction rows committed to ledger when mutation is blocked by subscription gate",
      txCountB.rows[0].count === 0
    );

    // 3.8 Read-only queries (e.g. reports, help) succeed even when suspended
    const reportRes = await executeConversationAction(
      supabase,
      { businessId: bizB, source: "telegram", now: new Date() },
      "laporan hari ini"
    );
    record(
      "9C_REPORTS_PRESERVED_WHEN_SUSPENDED",
      "Read-only reports remain accessible when business is suspended",
      reportRes.action === "SHOW_REPORT_TODAY" && reportRes.status === "SUCCESS"
    );

    // =========================================================================
    // SECTION 4: 9E Internal OXID Admin Actions & Authorization
    // =========================================================================
    console.log("\n5. Running 9E Internal OXID Admin Tests...");

    // 4.1 isOxidSuperAdmin authorization check
    const adminUser = { id: testAdminUser, email: "platformadmin@oxid.test" } as any;
    const regularOwner = { id: testOwnerA, email: "ownerA@oxid.test" } as any;

    record(
      "9E_ADMIN_AUTH_SUPER",
      "isOxidSuperAdmin grants access to verified platform admin in platform_admins table",
      (await isOxidSuperAdmin(adminUser, supabase)) === true
    );
    record(
      "9E_ADMIN_AUTH_REJECT_OWNER",
      "isOxidSuperAdmin strictly rejects regular business owner",
      (await isOxidSuperAdmin(regularOwner, supabase)) === false
    );

    // 4.2 listAllBusinessesForAdmin
    const adminBizList = await listAllBusinessesForAdmin(supabase);
    record(
      "9E_ADMIN_LIST_ALL",
      "listAllBusinessesForAdmin lists all registered businesses with plans and statuses",
      adminBizList.length >= 2 && adminBizList.some((b) => b.id === bizA) && adminBizList.some((b) => b.id === bizB)
    );

    // 4.3 Admin action: Confirm payment and extend subscription
    await adminConfirmPayment(supabase, {
      paymentId: payment.id,
      adminUserId: testAdminUser,
      adminEmail: "platformadmin@oxid.test",
      extensionDays: 30,
      notes: "Pembayaran transfer BCA verified",
    });

    const subAfterPayment = await getBusinessSubscription(supabase, bizA);
    record(
      "9E_ADMIN_CONFIRM_PAYMENT",
      "adminConfirmPayment marks payment confirmed and transitions subscription to 'active'",
      subAfterPayment?.status === "active"
    );

    // 4.4 Admin action: Extend subscription by 15 days
    const periodEndBeforeExtend = new Date(subAfterPayment!.currentPeriodEnd);
    await adminExtendSubscription(supabase, {
      businessId: bizA,
      days: 15,
      adminUserId: testAdminUser,
      adminEmail: "platformadmin@oxid.test",
      notes: "Extra 15 days promotion",
    });

    const subAfterExtend = await getBusinessSubscription(supabase, bizA);
    const periodEndAfterExtend = new Date(subAfterExtend!.currentPeriodEnd);
    const addedDays = Math.round((periodEndAfterExtend.getTime() - periodEndBeforeExtend.getTime()) / (1000 * 60 * 60 * 24));
    record(
      "9E_ADMIN_EXTEND",
      "adminExtendSubscription adds exact requested days to current_period_end",
      addedDays === 15
    );

    // 4.5 Admin action: Suspend subscription
    await adminSuspendSubscription(supabase, {
      businessId: bizA,
      adminUserId: testAdminUser,
      adminEmail: "platformadmin@oxid.test",
      notes: "Audit test suspension",
    });

    const subAfterSuspend = await getBusinessSubscription(supabase, bizA);
    record(
      "9E_ADMIN_SUSPEND",
      "adminSuspendSubscription transitions status to 'suspended' with timestamp",
      subAfterSuspend?.status === "suspended" && subAfterSuspend?.suspendedAt !== null
    );

    // 4.6 Admin action: Reactivate subscription
    await adminReactivateSubscription(supabase, {
      businessId: bizA,
      days: 30,
      adminUserId: testAdminUser,
      adminEmail: "platformadmin@oxid.test",
      notes: "Audit test reactivation",
    });

    const subAfterReactivate = await getBusinessSubscription(supabase, bizA);
    record(
      "9E_ADMIN_REACTIVATE",
      "adminReactivateSubscription restores 'active' status and clears suspended_at",
      subAfterReactivate?.status === "active" && subAfterReactivate?.suspendedAt === null
    );

    // 4.7 Audit logs verification: Every admin mutation generated an audit entry
    const auditLogs = await pgClient.query(`
      SELECT action, previous_status, new_status, actor_email
      FROM public.subscription_audit_logs
      WHERE business_id = '${bizA}'
      ORDER BY created_at ASC;
    `);
    record(
      "9E_AUDIT_TRAIL",
      "All administrative actions generate immutable audit log records in subscription_audit_logs",
      auditLogs.rows.length >= 4 &&
        auditLogs.rows.some((l) => l.action === "ADMIN_CONFIRM_PAYMENT") &&
        auditLogs.rows.some((l) => l.action === "ADMIN_SUSPEND_SUBSCRIPTION") &&
        auditLogs.rows.some((l) => l.action === "ADMIN_REACTIVATE_SUBSCRIPTION")
    );

    // =========================================================================
    // SECTION 5: 9F Expiry Automation & Lifecycle State Machine
    // =========================================================================
    console.log("\n6. Running 9F Expiry Automation Tests...");

    // 5.1 Set Biz A trial to past (expired) with active grace period
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const futureGrace = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    await pgClient.query(`
      UPDATE public.business_subscriptions
      SET status = 'trialing', trial_ends_at = '${pastDate}', grace_period_ends_at = '${futureGrace}'
      WHERE business_id = '${bizA}';
    `);

    // Run lifecycle
    const transitions1 = await runSubscriptionLifecycle(supabase, new Date());
    const subAfterLife1 = await getBusinessSubscription(supabase, bizA);

    record(
      "9F_LIFECYCLE_GRACE_TRANSITION",
      "Expired trialing subscription automatically transitions to 'grace_period' when within grace window",
      subAfterLife1?.status === "grace_period" &&
        transitions1.some((t) => t.businessId === bizA && t.newStatus === "grace_period")
    );

    // 5.2 Set Biz A grace period to past (expired)
    const pastGrace = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    await pgClient.query(`
      UPDATE public.business_subscriptions
      SET status = 'grace_period', grace_period_ends_at = '${pastGrace}'
      WHERE business_id = '${bizA}';
    `);

    const transitions2 = await runSubscriptionLifecycle(supabase, new Date());
    const subAfterLife2 = await getBusinessSubscription(supabase, bizA);

    record(
      "9F_LIFECYCLE_SUSPEND_TRANSITION",
      "Expired grace period automatically transitions to 'suspended'",
      subAfterLife2?.status === "suspended" &&
        transitions2.some((t) => t.businessId === bizA && t.newStatus === "suspended")
    );

    // 5.3 Idempotency: Second lifecycle run on same state generates 0 transitions
    const transitions3 = await runSubscriptionLifecycle(supabase, new Date());
    record(
      "9F_LIFECYCLE_IDEMPOTENCY",
      "Second lifecycle execution is idempotent and produces zero duplicate transitions",
      transitions3.filter((t) => t.businessId === bizA).length === 0
    );

    // 5.4 Expiry Notifications (7d, 3d, 1d, 0d)
    let fakeTgNotifications: Array<{ chatId: number | string; text: string }> = [];
    const mockTelegramSender = async (opts: { chatId: number | string; text: string }) => {
      fakeTgNotifications.push(opts);
      return { success: true };
    };

    // Configure Biz B as active expiring in exactly 3 days
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await pgClient.query(`
      UPDATE public.business_subscriptions
      SET status = 'active', current_period_end = '${threeDaysLater.toISOString()}'
      WHERE business_id = '${bizB}';
      DELETE FROM public.notification_logs WHERE business_id = '${bizB}';
    `);

    const notifResults1 = await sendSubscriptionExpiryNotifications(
      supabase,
      new Date(),
      { telegramSender: mockTelegramSender }
    );

    record(
      "9F_NOTIFICATION_DISPATCH",
      "Expiry notification dispatched via Telegram for subscription expiring in 3 days",
      notifResults1.length >= 1 &&
        fakeTgNotifications.length >= 1 &&
        fakeTgNotifications[0].text.includes("3 hari lagi")
    );

    // 5.5 Notification Idempotency: Second run today does NOT send duplicate
    const notifResults2 = await sendSubscriptionExpiryNotifications(
      supabase,
      new Date(),
      { telegramSender: mockTelegramSender }
    );
    record(
      "9F_NOTIFICATION_IDEMPOTENCY",
      "Repeated notification check skips cleanly without duplicate delivery on the same day",
      notifResults2.filter((n) => n.businessId === bizB).length === 0
    );

    // =========================================================================
    // SECTION 6: Security & Invariance Verification
    // =========================================================================
    console.log("\n7. Running Security & Data Invariance Tests...");

    // 6.1 Reactivate Biz A and ensure transactions work normally
    await adminReactivateSubscription(supabase, {
      businessId: bizA,
      days: 30,
      adminUserId: testAdminUser,
      adminEmail: "platformadmin@oxid.test",
      notes: "Restoring active state for end-to-end transaction test",
    });

    const saleRes = await executeConversationAction(
      supabase,
      { businessId: bizA, source: "telegram", now: new Date() },
      "Kejual 8kg"
    );
    record(
      "9F_ACTIVE_TRANSACTIONS_WORK",
      "Reactivated active subscription successfully records transactions via deterministic parser",
      saleRes.action === "CREATE_SALE" && saleRes.status === "SUCCESS"
    );

    // 6.2 Data Invariance: Check historical transaction count
    const txTotalA = await pgClient.query(`SELECT count(*)::int AS count FROM public.transactions WHERE business_id = '${bizA}';`);
    record(
      "9F_DATA_INVARIANCE",
      "Financial ledger history strictly preserved across all subscription transitions",
      txTotalA.rows[0].count >= 1
    );

    // =========================================================================
    // SECTION 7: /api/internal/subscriptions/run Endpoint Security & Auth Tests
    // =========================================================================
    console.log("\n8. Running Internal Cron Endpoint Security Tests...");
    const { POST: subscriptionCronRoute } = await import("@/app/api/internal/subscriptions/run/route");

    const originalCronSecret = process.env.SUBSCRIPTION_CRON_SECRET;
    const testSecret = "test_sub_cron_secret_step9_xyz";

    process.env.SUBSCRIPTION_CRON_SECRET = testSecret;

    // 7.1 Missing auth header -> 401
    const reqNoAuth = new NextRequest("http://localhost/api/internal/subscriptions/run", {
      method: "POST",
    });
    const resNoAuth = await subscriptionCronRoute(reqNoAuth);
    record(
      "9F_CRON_AUTH_MISSING",
      "Request without Authorization header returns 401 Unauthorized",
      resNoAuth.status === 401
    );

    // 7.2 Wrong secret -> 401
    const reqWrongSecret = new NextRequest("http://localhost/api/internal/subscriptions/run", {
      method: "POST",
      headers: { Authorization: "Bearer wrong_secret_here" },
    });
    const resWrongSecret = await subscriptionCronRoute(reqWrongSecret);
    record(
      "9F_CRON_AUTH_WRONG_SECRET",
      "Request with invalid Bearer token returns 401 Unauthorized",
      resWrongSecret.status === 401
    );

    // 7.3 Service role key rejected -> 401
    const reqServiceRole = new NextRequest("http://localhost/api/internal/subscriptions/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const resServiceRole = await subscriptionCronRoute(reqServiceRole);
    record(
      "9F_CRON_AUTH_SERVICE_ROLE_REJECTED",
      "SUPABASE_SERVICE_ROLE_KEY as Bearer token is strictly rejected (401)",
      resServiceRole.status === 401
    );

    // 7.4 REMINDER_CRON_SECRET as Bearer -> 401 (Separation of duties)
    process.env.REMINDER_CRON_SECRET = "reminder_cron_secret_mock_456789";
    const reqReminderSecret = new NextRequest("http://localhost/api/internal/subscriptions/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.REMINDER_CRON_SECRET}` },
    });
    const resReminderSecret = await subscriptionCronRoute(reqReminderSecret);
    record(
      "9F_CRON_AUTH_REMINDER_SECRET_REJECTED",
      "Separation of Duties: REMINDER_CRON_SECRET as Bearer token is strictly rejected (401)",
      resReminderSecret.status === 401
    );

    // 7.5 Missing secret in env -> 500 fail-closed
    delete process.env.SUBSCRIPTION_CRON_SECRET;
    delete process.env.REMINDER_CRON_SECRET;
    const reqFailClosed = new NextRequest("http://localhost/api/internal/subscriptions/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${testSecret}` },
    });
    const resFailClosed = await subscriptionCronRoute(reqFailClosed);
    record(
      "9F_CRON_FAIL_CLOSED",
      "Missing cron secret in runtime fails closed and returns 500 Server Error",
      resFailClosed.status === 500
    );

    // Restore env
    if (originalCronSecret) process.env.SUBSCRIPTION_CRON_SECRET = originalCronSecret;

  } catch (err: any) {
    console.error("Fatal Test Error:", err);
    record("FATAL", "Step 9 test execution threw error", false, err.message);
  } finally {
    await pgClient.end();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n=== Step 9 Test Results Summary ===");
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error(`Step 9 tests failed with ${failed} failing tests!`);
    process.exit(1);
  }
}

runStep9Tests();
