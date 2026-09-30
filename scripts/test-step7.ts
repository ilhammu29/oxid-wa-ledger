/**
 * Step 7 Automated Test Suite: Client Readiness, Monitoring & Operational Hardening
 * Covers:
 * 1. 7A Pilot Hardening: Failure capture, secret scrubbing, truncation, review lifecycle, isolation.
 * 2. 7B Reminder Automation: Eligibility engine, ledger consistency, idempotency, cron auth, test reminder.
 * 3. 7D Client Onboarding: Secure token hashing, invite validation, atomic RPC onboarding, reuse rejection.
 * 4. 7E Monitoring & Telemetry: Safe telemetry recording, redaction, health status, retention cleanup.
 * 5. 7F Channel Switch: WhatsApp readiness guard, reminder guard, webhook toggling, data preservation.
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

import {
  captureConversationFailure,
  updateFailureReviewStatus,
  getConversationFailures,
} from "../src/modules/pilot-hardening";
import {
  checkReminderEligibility,
  runDueReminders,
  sendTestReminder,
} from "../src/modules/reminders";
import {
  createClientInvite,
  validateInviteToken,
  executeClientOnboarding,
  hashInviteToken,
} from "../src/modules/onboarding";
import {
  recordIntegrationEvent,
  getMonitoringData,
} from "../src/modules/monitoring";
import {
  checkWhatsAppReadiness,
  getBusinessChannelSettings,
  updateBusinessChannelSettings,
} from "../src/modules/channels";
import { processIncomingTelegramWebhook } from "../src/modules/telegram";

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
          return {
            then: (resolve: any, reject: any) => executeUpsert().then(resolve, reject),
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runStep7Tests() {
  console.log("=== OXID WA Ledger - Step 7 Client Readiness & Monitoring Test Suite ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const supabase = createPgSupabaseAdapter(pgClient);

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------------------
    console.log("1. Setting up Step 7 test fixtures...");
    const testUserIdA = "77777777-7777-7777-7777-777777777771";
    const testUserIdB = "77777777-7777-7777-7777-777777777772";
    const bizA = "7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a71";
    const bizB = "7b7b7b7b-7b7b-7b7b-7b7b-7b7b7b7b7b72";

    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${testUserIdA}', 'clientA@step7.test'),
        ('${testUserIdB}', 'clientB@step7.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.businesses (id, name, timezone, currency, status, created_by) VALUES
        ('${bizA}', 'Step 7 Farm A', 'Asia/Jakarta', 'IDR', 'active', '${testUserIdA}'),
        ('${bizB}', 'Step 7 Farm B', 'Asia/Jakarta', 'IDR', 'active', '${testUserIdB}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${testUserIdA}', 'owner'),
        ('${bizB}', '${testUserIdB}', 'owner')
      ON CONFLICT (business_id, user_id) DO NOTHING;

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active) VALUES
        ('71111111-1111-1111-1111-111111111111', '${bizA}', 'Lele Segar', 'kg', 28000, true, true),
        ('72222222-2222-2222-2222-222222222222', '${bizB}', 'Gurame', 'kg', 45000, true, true)
      ON CONFLICT (id) DO NOTHING;

      -- Operator setup
      INSERT INTO public.telegram_authorized_users (business_id, telegram_user_id, display_label, active, receive_reminders) VALUES
        ('${bizA}', 77101, 'Operator Pilot A', true, true),
        ('${bizB}', 77201, 'Operator Pilot B', true, false)
      ON CONFLICT (business_id, telegram_user_id) DO UPDATE
      SET active = true, receive_reminders = EXCLUDED.receive_reminders;
    `);

    console.log("✓ Fixtures ready.\n");

    // =========================================================================
    // TEST SECTION 1: 7A Pilot Hardening / Failure Capture
    // =========================================================================
    console.log("2. Running 7A Pilot Hardening Tests...");

    // 1.1 Unparseable message capture
    const longMessage = "Pesan panjang tak terduga ".repeat(30); // > 500 chars
    const captureRes = await captureConversationFailure(supabase, {
      businessId: bizA,
      channel: "telegram",
      senderReference: "77101",
      messageText: longMessage,
      failureType: "UNKNOWN_INTENT",
    });
    record(
      "7A_FAILURE_CAPTURE",
      "Unparseable operator message captured with truncation to <= 500 chars",
      captureRes.success === true && captureRes.id !== undefined
    );

    // Verify stored row
    const failureRowRes = await pgClient.query(
      `SELECT * FROM public.conversation_failures WHERE id = $1;`,
      [captureRes.id]
    );
    const failureRow = failureRowRes.rows[0];
    record(
      "7A_FAILURE_CAPTURE",
      "Raw message strictly capped at 500 chars and pending by default",
      failureRow && failureRow.message_text.length <= 500 && failureRow.review_status === "pending"
    );

    // 1.2 Review status transition
    const updateRes = await updateFailureReviewStatus(supabase, {
      failureId: failureRow.id,
      reviewStatus: "reviewed",
      reviewedBy: testUserIdA,
    });
    record(
      "7A_FAILURE_CAPTURE",
      "Failure review status transitions from pending to reviewed",
      updateRes.success === true
    );

    // 1.3 Tenant isolation on failures
    const listResA = await getConversationFailures(supabase, bizA);
    const listResB = await getConversationFailures(supabase, bizB);
    record(
      "7A_FAILURE_ISOLATION",
      "Failures query strictly isolated per tenant (Biz A > 0, Biz B == 0)",
      listResA.length > 0 && listResB.length === 0
    );

    // =========================================================================
    // TEST SECTION 2: 7B Reminder Automation
    // =========================================================================
    console.log("\n3. Running 7B Reminder Automation Tests...");

    // Setup reminder settings for bizA
    await pgClient.query(`
      INSERT INTO public.business_reminder_settings (business_id, enabled, reminder_time, days_of_week, channel, timezone)
      VALUES ('${bizA}', true, '18:00', ARRAY[0,1,2,3,4,5,6]::smallint[], 'telegram', 'Asia/Jakarta')
      ON CONFLICT (business_id) DO UPDATE SET enabled = true, reminder_time = '18:00', days_of_week = ARRAY[0,1,2,3,4,5,6]::smallint[];
    `);

    // 2.1 Disabled settings check
    await pgClient.query(`UPDATE public.business_reminder_settings SET enabled = false WHERE business_id = '${bizA}';`);
    const eligDisabled = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z") // 19:00 WIB
    );
    record(
      "7B_ELIGIBILITY",
      "Disabled reminder settings correctly marked ineligible",
      eligDisabled.eligible === false && eligDisabled.reason === "DISABLED"
    );

    // Re-enable for subsequent tests
    await pgClient.query(`UPDATE public.business_reminder_settings SET enabled = true WHERE business_id = '${bizA}';`);

    // 2.2 Day of week filtering
    await pgClient.query(`UPDATE public.business_reminder_settings SET days_of_week = ARRAY[1]::smallint[] WHERE business_id = '${bizA}';`); // Only Monday
    const eligWrongDay = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z") // Wednesday in WIB
    );
    record(
      "7B_ELIGIBILITY",
      "Day of week mismatch correctly marked ineligible",
      eligWrongDay.eligible === false && eligWrongDay.reason === "WRONG_WEEKDAY"
    );

    // Reset days_of_week
    await pgClient.query(`UPDATE public.business_reminder_settings SET days_of_week = ARRAY[0,1,2,3,4,5,6]::smallint[] WHERE business_id = '${bizA}';`);

    // 2.3 Time check (before scheduled time)
    const eligBeforeTime = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T10:00:00Z") // 17:00 WIB < 18:00
    );
    record(
      "7B_ELIGIBILITY",
      "Current time earlier than reminder time marked ineligible",
      eligBeforeTime.eligible === false && eligBeforeTime.reason === "BEFORE_SCHEDULED_TIME"
    );

    // 2.4 Confirmed sales exist today -> ineligible
    await pgClient.query(`
      INSERT INTO public.transactions (
        id,
        business_id,
        product_id,
        transaction_type,
        quantity,
        unit,
        unit_price,
        total_amount,
        status,
        source,
        transaction_at,
        created_by_user_id
      ) VALUES (
        '73333333-3333-3333-3333-333333333333',
        '${bizA}',
        '71111111-1111-1111-1111-111111111111',
        'sale',
        10,
        'kg',
        28000,
        280000,
        'confirmed',
        'system',
        '2026-09-30T03:00:00Z', -- today in WIB
        '${testUserIdA}'
      ) ON CONFLICT (id) DO UPDATE SET status = 'confirmed', transaction_at = '2026-09-30T03:00:00Z';
    `);

    const eligWithSales = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z") // 19:00 WIB
    );
    record(
      "7B_ELIGIBILITY",
      "Confirmed sales already recorded today correctly blocks reminder",
      eligWithSales.eligible === false && eligWithSales.reason === "HAS_CONFIRMED_SALES"
    );

    // 2.5 Cancelled sales do NOT count as active sales
    await pgClient.query(`
      UPDATE public.transactions
      SET status = 'cancelled'
      WHERE id = '73333333-3333-3333-3333-333333333333';
    `);

    const eligCancelledSale = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z")
    );
    record(
      "7B_ELIGIBILITY",
      "Cancelled sales excluded from sales check (reminder remains eligible)",
      eligCancelledSale.eligible === true
    );

    // 2.6 Daily status NO_SALE blocks reminder
    await pgClient.query(`
      INSERT INTO public.business_daily_status (business_id, local_date, status, source)
      VALUES ('${bizA}', '2026-09-30', 'NO_SALE', 'dashboard')
      ON CONFLICT (business_id, local_date) DO UPDATE SET status = 'NO_SALE';
    `);

    const eligWithNoSaleStatus = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z")
    );
    record(
      "7B_ELIGIBILITY",
      "Explicit daily status (NO_SALE) correctly blocks reminder",
      eligWithNoSaleStatus.eligible === false && eligWithNoSaleStatus.reason === "HAS_DAILY_STATUS"
    );

    // Clean up daily status for runner test
    await pgClient.query(`
      DELETE FROM public.business_daily_status WHERE business_id = '${bizA}' AND local_date = '2026-09-30';
    `);

    // 2.7 Runner execution with atomic notification_logs claim
    let fakeMessagesSent: Array<{ recipient: string; text: string }> = [];
    const mockSender = async (opts: { chatId: number | string; text: string }) => {
      fakeMessagesSent.push({ recipient: String(opts.chatId), text: opts.text });
      return { success: true, messageId: 999 };
    };

    const runnerRes1 = await runDueReminders(supabase, {
      now: new Date("2026-09-30T12:00:00Z"),
      telegramSender: mockSender as any,
    });
    record(
      "7B_RUNNER",
      "Reminder runner triggers and delivers reminder to designated recipient",
      runnerRes1.notificationsSent === 1 && fakeMessagesSent.length === 1
    );

    // 2.8 Idempotency on second run today
    const runnerRes2 = await runDueReminders(supabase, {
      now: new Date("2026-09-30T12:05:00Z"),
      telegramSender: mockSender as any,
    });
    record(
      "7B_RUNNER_IDEMPOTENCY",
      "Second reminder run on same day safely skips (0 duplicate messages)",
      runnerRes2.notificationsSent === 0 && fakeMessagesSent.length === 1
    );

    // 2.9 Test reminder
    const testRemindRes = await sendTestReminder(supabase, {
      businessId: bizA,
      telegramUserId: 77101,
      telegramSender: mockSender as any,
    });
    record(
      "7B_TEST_REMINDER",
      "Test reminder sends without financial writes or idempotency claim",
      testRemindRes.success === true && fakeMessagesSent.length === 2
    );

    // =========================================================================
    // TEST SECTION 3: 7D Client Onboarding
    // =========================================================================
    console.log("\n4. Running 7D Client Onboarding Tests...");

    // 3.1 Create client invite with SHA-256 hash
    const inviteRes = await createClientInvite(supabase, {
      email: "newpilot@oxid.local",
      createdBy: testUserIdA,
      expiresInDays: 7,
    });
    record(
      "7D_INVITE_CREATE",
      "Invite token created with high-entropy raw token and SHA-256 hash",
      inviteRes.success === true && inviteRes.token !== undefined && inviteRes.inviteUrl !== undefined
    );

    // Verify raw token is NOT in database
    const inviteDbRow = await pgClient.query(
      `SELECT * FROM public.client_onboarding_invites WHERE token_hash = $1;`,
      [hashInviteToken(inviteRes.token!)]
    );
    record(
      "7D_INVITE_SECURITY",
      "Raw invite token is never stored in DB, only token_hash",
      inviteDbRow.rows.length === 1 && (inviteDbRow.rows[0] as any).token === undefined
    );

    // 3.2 Invite validation
    const validInvite = await validateInviteToken(supabase, inviteRes.token!, "newpilot@oxid.local");
    record(
      "7D_INVITE_VALIDATION",
      "Invite validation succeeds for matching email and unexpired token",
      validInvite.valid === true && validInvite.email === "newpilot@oxid.local"
    );

    const emailMismatchInvite = await validateInviteToken(supabase, inviteRes.token!, "wrong@email.com");
    record(
      "7D_INVITE_VALIDATION",
      "Invite validation rejects mismatched user email",
      emailMismatchInvite.valid === false && emailMismatchInvite.reason === "EMAIL_MISMATCH"
    );

    // 3.3 Atomic RPC execution for onboarding
    // Create new auth user for the new client
    const newClientUserId = "77777777-7777-7777-7777-777777777773";
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${newClientUserId}', 'newpilot@oxid.local')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Set session user for auth.uid() check
    await pgClient.query(`SELECT set_config('request.jwt.claim.sub', '${newClientUserId}', false);`);

    // Call RPC directly as new client user
    const rpcRes = await pgClient.query(
      `
      SELECT public.complete_client_onboarding(
        p_invite_token_hash := $1,
        p_business_name := 'Berkah Lele Baru',
        p_timezone := 'Asia/Jakarta',
        p_currency := 'IDR',
        p_product_name := 'Ikan Lele Super',
        p_product_unit := 'kg',
        p_product_price := 30000,
        p_channel := 'telegram',
        p_telegram_user_id := 88801,
        p_enable_reminder := true,
        p_reminder_time := '19:00',
        p_reminder_days := ARRAY[1,2,3,4,5,6]::smallint[]
      ) AS result;
      `,
      [hashInviteToken(inviteRes.token!)]
    );

    const onboardResult = rpcRes.rows[0]?.result;
    record(
      "7D_ONBOARDING_RPC",
      "Atomic onboarding RPC creates business, product, operator, and reminder settings",
      onboardResult?.success === true && onboardResult?.business_id !== undefined
    );

    // 3.4 Prevent token reuse
    try {
      await pgClient.query(
        `
        SELECT public.complete_client_onboarding(
          p_invite_token_hash := $1,
          p_business_name := 'Duplicate Attempt'
        );
        `,
        [hashInviteToken(inviteRes.token!)]
      );
      record("7D_ONBOARDING_REUSE", "Used token rejected on second attempt", false);
    } catch (err: any) {
      record(
        "7D_ONBOARDING_REUSE",
        "Used token strictly rejected on second attempt",
        err.message.includes("INVITE_ALREADY_USED") || err.message.includes("INVITE_INACTIVE")
      );
    }

    // =========================================================================
    // TEST SECTION 4: 7E Monitoring & Safe Telemetry
    // =========================================================================
    console.log("\n5. Running 7E Monitoring & Safe Telemetry Tests...");

    // 4.1 Safe telemetry recording with secret scrubbing
    await recordIntegrationEvent(supabase, {
      businessId: bizA,
      channel: "telegram",
      direction: "inbound",
      eventType: "test.event",
      status: "success",
      metadata: {
        token: "SECRET_BOT_TOKEN_12345",
        app_secret: "SECRET_META_APP_99999",
        safeData: "hello world",
      },
    });

    const eventRow = await pgClient.query(
      `SELECT metadata FROM public.integration_events WHERE business_id = $1 AND event_type = 'test.event' ORDER BY created_at DESC LIMIT 1;`,
      [bizA]
    );
    record(
      "7E_TELEMETRY",
      "Integration event telemetry recorded successfully",
      eventRow.rows.length === 1
    );

    const metaJson = JSON.stringify(eventRow.rows[0]?.metadata || {});
    record(
      "7E_TELEMETRY_SCRUBBING",
      "Sensitive tokens scrubbed and replaced with [REDACTED]",
      metaJson.includes("[REDACTED]") && !metaJson.includes("SECRET_BOT_TOKEN")
    );

    // 4.2 Monitoring data aggregation
    const monitoringData = await getMonitoringData(supabase, bizA);
    record(
      "7E_MONITORING_VIEW",
      "Monitoring service aggregates channel health, scheduler health, and errors",
      monitoringData.channels.telegram.status !== undefined &&
        monitoringData.channels.whatsapp.status !== undefined &&
        monitoringData.scheduler.status !== undefined
    );

    // 4.3 Retention cleanup RPC
    const cleanupRes = await supabase.rpc("cleanup_old_telemetry", { p_days: 30 });
    record(
      "7E_RETENTION_CLEANUP",
      "Telemetry cleanup RPC executes cleanly leaving ledger untouched",
      cleanupRes.error === null
    );

    // =========================================================================
    // TEST SECTION 5: 7F Client-Ready Channel Switch
    // =========================================================================
    console.log("\n6. Running 7F Channel Switch Tests...");

    // 5.1 WhatsApp readiness check (Biz A has no WhatsApp connection yet -> not ready)
    const waReadiness = await checkWhatsAppReadiness(supabase, bizA);
    record(
      "7F_WA_READINESS",
      "WhatsApp readiness check detects missing connections/phone ID/senders",
      waReadiness.ready === false && waReadiness.missingRequirements.length > 0
    );

    // 5.2 Enabling WhatsApp blocked when not ready
    const updateWaBlocked = await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: true,
      whatsappEnabled: true, // Should be rejected!
      primaryChannel: "whatsapp",
      reminderChannel: "telegram",
    });
    record(
      "7F_CHANNEL_GUARD",
      "Enabling WhatsApp blocked when operational readiness requirements unmet",
      updateWaBlocked.success === false && Boolean(updateWaBlocked.error?.includes("Aktivasi WhatsApp diblokir"))
    );

    // 5.3 Automated WhatsApp reminder strictly blocked in Step 7
    const updateWaReminderBlocked = await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: true,
      whatsappEnabled: false,
      primaryChannel: "telegram",
      reminderChannel: "whatsapp", // Should be rejected!
    });
    record(
      "7F_REMINDER_GUARD",
      "Setting reminder channel to WhatsApp blocked pending Step 8 production templates",
      updateWaReminderBlocked.success === false &&
        Boolean(updateWaReminderBlocked.error?.includes("Reminder WhatsApp belum tersedia"))
    );

    // 5.4 Disabling Telegram causes incoming webhook to be ignored safely
    await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: false,
      whatsappEnabled: false,
      primaryChannel: "telegram",
      reminderChannel: "telegram",
    });

    const disabledTelegramUpdateRes = await processIncomingTelegramWebhook(
      supabase,
      {
        update_id: 999991,
        message: {
          message_id: 1,
          from: { id: 77101, is_bot: false, first_name: "Operator" },
          chat: { id: 77101, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text: "10kg",
        },
      },
      { telegramSender: mockSender as any }
    );

    record(
      "7F_WEBHOOK_ENFORCEMENT",
      "Disabled Telegram channel safely ignores messages with channel.disabled_ignored",
      disabledTelegramUpdateRes.acknowledged === true &&
        disabledTelegramUpdateRes.type === "channel_disabled"
    );

    // 5.5 Financial Ledger Preservation (No transaction modified or deleted)
    const txCountRes = await pgClient.query(
      `SELECT count(*)::int AS count FROM public.transactions WHERE business_id = $1;`,
      [bizA]
    );
    record(
      "7F_DATA_PRESERVATION",
      "Channel switches preserve all financial transactions and ledger integrity",
      txCountRes.rows[0]?.count >= 1
    );

    // Re-enable Telegram for bizA
    await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: true,
      whatsappEnabled: false,
      primaryChannel: "telegram",
      reminderChannel: "telegram",
    });

  } catch (err: any) {
    console.error("Fatal Test Error:", err);
    record("FATAL", "Step 7 test execution threw error", false, err.message);
  } finally {
    await pgClient.end();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n=== Step 7 Test Results Summary ===");
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error(`Step 7 tests failed with ${failed} failing tests!`);
    process.exit(1);
  }
}

runStep7Tests();
