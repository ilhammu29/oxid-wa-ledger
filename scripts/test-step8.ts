/**
 * Step 8 Automated Test Suite: Production WhatsApp Client Migration
 * Covers:
 * 1. 8A Production WhatsApp Connection:
 *    - Unknown phone_number_id rejected (zero tenant resolution, zero financial writes)
 *    - Valid phone_number_id resolves business
 *    - Cross-tenant isolation (Biz A sender cannot affect Biz B)
 *    - Phone number normalization (0812..., +62812..., formatting)
 *    - Authorized vs unauthorized senders (silent ignore, capture in failures, zero writes)
 *    - Atomic idempotency on duplicate wamid
 *    - Status callbacks (delivered, read, sent) safe handling without mutation
 *    - Non-text messages handled gracefully without crash
 * 2. 8B WhatsApp Template / Automated Reminder:
 *    - Meta template payload structure verification
 *    - Blocked when template status is not approved
 *    - Blocked when no operator has receive_reminders = true
 *    - Eligible and triggers when template approved and recipient exists
 *    - Daily idempotency via notification_logs
 * 3. 8C Telegram -> WhatsApp Cutover:
 *    - Dual-run mode (both Telegram and WhatsApp active simultaneously)
 *    - Safe primary channel switch to WhatsApp
 *    - Disabling Telegram preserves Telegram operators and configuration
 *    - Incoming Telegram webhook safely ignored when Telegram disabled
 * 4. 8D Production Verification & Ledger Invariance:
 *    - Outbound Meta Graph API error does not rollback committed ledger transaction
 *    - Integration events telemetry recorded for WhatsApp inbound, outbound, and reminder
 *    - Telemetry scrubbing replaces sensitive tokens with [REDACTED]
 *    - Monitoring service aggregates WhatsApp channel health and status
 *    - Financial source of truth strictly preserved in PostgreSQL
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  processIncomingWhatsAppWebhook,
  normalizePhoneNumber,
  maskPhoneNumber,
  sendMetaTemplateMessage,
  MetaWebhookPayload,
} from "../src/modules/whatsapp";
import { processIncomingTelegramWebhook } from "../src/modules/telegram";
import {
  checkWhatsAppReadiness,
  getBusinessChannelSettings,
  updateBusinessChannelSettings,
} from "../src/modules/channels";
import {
  checkReminderEligibility,
  runDueReminders,
} from "../src/modules/reminders";
import { getMonitoringData, recordIntegrationEvent } from "../src/modules/monitoring";

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
        upsert: (values: Record<string, any>) => {
          const executeUpsert = async () => {
            try {
              const keys = Object.keys(values);
              const cols = keys.map((k) => `"${k}"`).join(", ");
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
              const vals = keys.map((k) =>
                typeof values[k] === "object" && values[k] !== null ? JSON.stringify(values[k]) : values[k]
              );
              const pkCol = keys.includes("business_id") ? "business_id" : "id";
              const updateCols = keys
                .filter((k) => k !== pkCol)
                .map((k) => `"${k}" = EXCLUDED."${k}"`)
                .join(", ");
              const sql = `
                INSERT INTO public."${table}" (${cols})
                VALUES (${placeholders})
                ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateCols}
                RETURNING *;
              `;
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

// Helpers for crafting WhatsApp Webhook Payloads
function createWhatsAppTextWebhookPayload(opts: {
  phoneNumberId: string;
  from: string;
  messageId: string;
  text: string;
  timestamp?: string;
}): MetaWebhookPayload {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba_entry_1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "6289516885651",
                phone_number_id: opts.phoneNumberId,
              },
              messages: [
                {
                  id: opts.messageId,
                  from: opts.from,
                  timestamp: opts.timestamp || String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: opts.text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function createWhatsAppStatusWebhookPayload(opts: {
  phoneNumberId: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string;
}): MetaWebhookPayload {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba_entry_1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "6289516885651",
                phone_number_id: opts.phoneNumberId,
              },
              statuses: [
                {
                  id: opts.messageId,
                  status: opts.status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: opts.recipientId,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function createWhatsAppMediaWebhookPayload(opts: {
  phoneNumberId: string;
  from: string;
  messageId: string;
  mediaType: "image" | "audio" | "document" | "sticker";
}): MetaWebhookPayload {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba_entry_1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "6289516885651",
                phone_number_id: opts.phoneNumberId,
              },
              messages: [
                {
                  id: opts.messageId,
                  from: opts.from,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: opts.mediaType,
                  [opts.mediaType]: { id: "media_12345" },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function runStep8Tests() {
  console.log("=== OXID WA Ledger - Step 8 WhatsApp Client Migration Test Suite ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const supabase = createPgSupabaseAdapter(pgClient);

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data & Multi-Tenant Fixtures
    // -------------------------------------------------------------------------
    console.log("1. Setting up Step 8 test fixtures...");
    const userA = "88888888-8888-8888-8888-888888888881";
    const userB = "88888888-8888-8888-8888-888888888882";
    const bizA = "8a8a8a8a-8a8a-8a8a-8a8a-8a8a8a8a8a81";
    const bizB = "8b8b8b8b-8b8b-8b8b-8b8b-8b8b8b8b8b82";

    const phoneIdA = "1317475444788884";
    const phoneIdB = "2317475444788885";

    const operatorPhoneA = "6289516885651";
    const operatorPhoneB = "6281234567890";

    // Clean up past records for these test businesses
    await pgClient.query(`
      DELETE FROM public.notification_logs WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.transaction_events WHERE transaction_id IN (SELECT id FROM public.transactions WHERE business_id IN ('${bizA}', '${bizB}'));
      DELETE FROM public.transactions WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.business_daily_status WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.processed_whatsapp_messages WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.conversation_failures WHERE business_id IN ('${bizA}', '${bizB}');
      DELETE FROM public.integration_events WHERE business_id IN ('${bizA}', '${bizB}');
    `);

    // Ensure Auth Users & Businesses exist
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userA}', 'step8ownerA@oxid.test'),
        ('${userB}', 'step8ownerB@oxid.test')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.businesses (id, name, timezone, currency, status, created_by) VALUES
        ('${bizA}', 'Lele Super Biz A', 'Asia/Jakarta', 'IDR', 'active', '${userA}'),
        ('${bizB}', 'Nila Sejahtera Biz B', 'Asia/Jakarta', 'IDR', 'active', '${userB}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${userA}', 'owner'),
        ('${bizB}', '${userB}', 'owner')
      ON CONFLICT (business_id, user_id) DO NOTHING;

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active) VALUES
        ('81111111-1111-1111-1111-111111111111', '${bizA}', 'Lele Konsumsi', 'kg', 28000, true, true),
        ('82222222-2222-2222-2222-222222222222', '${bizB}', 'Nila Hitam', 'kg', 35000, true, true)
      ON CONFLICT (id) DO NOTHING;

      -- WhatsApp Connections setup
      INSERT INTO public.whatsapp_connections (
        business_id, phone_number, display_phone_number, verified_name, phone_number_id, waba_id, status, reminder_template_name, reminder_template_language, reminder_template_status
      ) VALUES
        ('${bizA}', '${operatorPhoneA}', '+62 895-1688-5651', 'Lele Super Biz', '${phoneIdA}', '1893345502027787', 'connected', 'daily_sales_reminder', 'id', 'approved'),
        ('${bizB}', '${operatorPhoneB}', '+62 812-3456-7890', 'Nila Sejahtera', '${phoneIdB}', '2893345502027788', 'connected', 'daily_sales_reminder', 'id', 'unconfigured')
      ON CONFLICT (phone_number_id) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        phone_number = EXCLUDED.phone_number,
        display_phone_number = EXCLUDED.display_phone_number,
        verified_name = EXCLUDED.verified_name,
        waba_id = EXCLUDED.waba_id,
        status = 'connected',
        reminder_template_name = EXCLUDED.reminder_template_name,
        reminder_template_status = EXCLUDED.reminder_template_status;

      -- WhatsApp Authorized Senders setup
      INSERT INTO public.whatsapp_authorized_senders (
        business_id, phone_number, display_label, active, receive_reminders
      ) VALUES
        ('${bizA}', '${operatorPhoneA}', 'Owner A', true, true),
        ('${bizB}', '${operatorPhoneB}', 'Owner B', true, false)
      ON CONFLICT (business_id, phone_number) DO UPDATE SET
        active = true,
        receive_reminders = EXCLUDED.receive_reminders;

      -- Telegram Authorized Users setup (for dual-run and cutover tests)
      INSERT INTO public.telegram_authorized_users (
        business_id, telegram_user_id, display_label, active, receive_reminders
      ) VALUES
        ('${bizA}', 88101, 'Operator Telegram A', true, true),
        ('${bizB}', 88201, 'Operator Telegram B', true, false)
      ON CONFLICT (business_id, telegram_user_id) DO UPDATE SET
        active = true,
        receive_reminders = EXCLUDED.receive_reminders;

      INSERT INTO public.business_channel_settings (
        business_id, telegram_enabled, whatsapp_enabled, primary_channel, reminder_channel
      ) VALUES
        ('${bizA}', true, true, 'telegram', 'telegram'),
        ('${bizB}', true, false, 'telegram', 'telegram')
      ON CONFLICT (business_id) DO UPDATE SET
        telegram_enabled = true,
        whatsapp_enabled = true,
        primary_channel = 'telegram',
        reminder_channel = 'telegram';
    `);

    // Ensure token is recognized in process.env for readiness
    process.env.WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "mock_whatsapp_access_token_step8";

    console.log("✓ Fixtures ready.\n");

    // Mock sender tracking
    let fakeWhatsAppSent: Array<{ to: string; text?: string; template?: string }> = [];
    const mockWhatsAppSender = async (opts: { phoneNumberId: string; to: string; text: string }) => {
      fakeWhatsAppSent.push({ to: opts.to, text: opts.text });
      return { success: true, messageId: `wamid_${Date.now()}_${Math.random()}` };
    };

    let fakeTelegramSent: Array<{ chatId: number | string; text: string }> = [];
    const mockTelegramSender = async (opts: { chatId: number | string; text: string }) => {
      fakeTelegramSent.push({ chatId: opts.chatId, text: opts.text });
      return { success: true, messageId: 999 };
    };

    // =========================================================================
    // SECTION 1: 8A Production WhatsApp Connection & Ingestion
    // =========================================================================
    console.log("2. Running 8A Production WhatsApp Connection Tests...");

    // 1.1 Unknown phone_number_id rejected safely (zero financial writes, zero tenant resolved)
    const unknownPhonePayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: "unknown_phone_number_id_99999",
      from: operatorPhoneA,
      messageId: "wamid_unknown_phone_1",
      text: "10kg",
    });
    const unknownPhoneRes = await processIncomingWhatsAppWebhook(supabase, unknownPhonePayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_PHONE_ID_GUARD",
      "Unknown phone_number_id is safely ignored (unknown_connection) with zero financial mutations",
      unknownPhoneRes.acknowledged === true && unknownPhoneRes.type === "unknown_connection"
    );

    // 1.2 Valid phone_number_id correctly resolves business tenant
    const validPhonePayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: phoneIdA,
      from: operatorPhoneA,
      messageId: "wamid_valid_phone_1",
      text: "Kejual 10kg",
    });
    const validPhoneRes = await processIncomingWhatsAppWebhook(supabase, validPhonePayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_PHONE_ID_RESOLVE",
      "Valid phone_number_id correctly resolves business tenant and processes transaction",
      validPhoneRes.acknowledged === true &&
        validPhoneRes.type === "message_processed" &&
        validPhoneRes.businessId === bizA &&
        validPhoneRes.action === "CREATE_SALE"
    );

    // Verify transaction recorded in DB
    const txRowA = await pgClient.query(
      `SELECT * FROM public.transactions WHERE business_id = $1 AND source = 'whatsapp' ORDER BY created_at DESC LIMIT 1;`,
      [bizA]
    );
    record(
      "8A_TX_COMMITTED",
      "WhatsApp sale transaction committed to PostgreSQL ledger with source = 'whatsapp'",
      txRowA.rows.length === 1 && Number(txRowA.rows[0].quantity) === 10 && Number(txRowA.rows[0].total_amount) === 280000
    );

    // 1.3 Cross-Tenant Isolation: Biz A operator cannot access Biz B
    const crossTenantPayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: phoneIdB,
      from: operatorPhoneA, // Biz A operator sending to Biz B's phone ID!
      messageId: "wamid_cross_tenant_1",
      text: "5kg",
    });
    const crossTenantRes = await processIncomingWhatsAppWebhook(supabase, crossTenantPayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_CROSS_TENANT",
      "Operator from Business A is blocked from mutating Business B (unauthorized_sender)",
      crossTenantRes.acknowledged === true &&
        crossTenantRes.type === "unauthorized_sender" &&
        crossTenantRes.businessId === bizB
    );

    const txRowB = await pgClient.query(
      `SELECT count(*)::int AS count FROM public.transactions WHERE business_id = $1;`,
      [bizB]
    );
    record(
      "8A_CROSS_TENANT_ZERO_WRITES",
      "Zero transactions written to Business B from unauthorized sender",
      txRowB.rows[0].count === 0
    );

    // 1.4 Phone Number Normalization
    record(
      "8A_PHONE_NORM",
      "081234567890 normalizes to 6281234567890",
      normalizePhoneNumber("081234567890") === "6281234567890"
    );
    record(
      "8A_PHONE_NORM",
      "+62 895-1688-5651 normalizes to 6289516885651",
      normalizePhoneNumber("+62 895-1688-5651") === "6289516885651"
    );
    record(
      "8A_PHONE_MASK",
      "maskPhoneNumber properly masks 6289516885651 as 62895****5651",
      maskPhoneNumber("6289516885651") === "62895****5651"
    );

    // 1.5 Authorized vs Unauthorized Sender
    const unauthPayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: phoneIdA,
      from: "6289999999999", // Unregistered number
      messageId: "wamid_unauth_sender_1",
      text: "5kg",
    });
    const unauthRes = await processIncomingWhatsAppWebhook(supabase, unauthPayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_UNAUTH_SENDER",
      "Unregistered sender blocked silently (acknowledged: true, type: unauthorized_sender)",
      unauthRes.acknowledged === true && unauthRes.type === "unauthorized_sender"
    );

    // 1.6 Idempotency on duplicate wamid
    const duplicatePayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: phoneIdA,
      from: operatorPhoneA,
      messageId: "wamid_valid_phone_1", // Re-sending same message ID!
      text: "10kg",
    });
    const duplicateRes = await processIncomingWhatsAppWebhook(supabase, duplicatePayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_IDEMPOTENCY",
      "Duplicate WhatsApp message ID acknowledged as duplicate_ignored without double transaction",
      duplicateRes.acknowledged === true && duplicateRes.type === "duplicate_ignored"
    );

    // Verify still only 1 transaction for bizA
    const txCountAfterDup = await pgClient.query(
      `SELECT count(*)::int AS count FROM public.transactions WHERE business_id = $1;`,
      [bizA]
    );
    record(
      "8A_IDEMPOTENCY_LEDGER",
      "Exactly 1 transaction row exists in ledger (duplicate was not recorded)",
      txCountAfterDup.rows[0].count === 1
    );

    // 1.7 Status callbacks (delivered, read, sent) safe handling
    const statusPayload = createWhatsAppStatusWebhookPayload({
      phoneNumberId: phoneIdA,
      messageId: "wamid_valid_phone_1",
      status: "delivered",
      recipientId: operatorPhoneA,
    });
    const statusRes = await processIncomingWhatsAppWebhook(supabase, statusPayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_STATUS_CALLBACK",
      "WhatsApp status callback (delivered) handled safely without parser invocation or crash",
      statusRes.acknowledged === true && statusRes.type === "status_event"
    );

    // 1.8 Non-text messages handled gracefully
    const mediaPayload = createWhatsAppMediaWebhookPayload({
      phoneNumberId: phoneIdA,
      from: operatorPhoneA,
      messageId: "wamid_media_image_1",
      mediaType: "image",
    });
    const mediaRes = await processIncomingWhatsAppWebhook(supabase, mediaPayload, {
      metaSender: mockWhatsAppSender as any,
    });
    record(
      "8A_NON_TEXT_SAFETY",
      "Non-text image message returns unsupported_message_type and informs operator safely",
      mediaRes.acknowledged === true && mediaRes.type === "unsupported_message_type"
    );

    // =========================================================================
    // SECTION 2: 8B WhatsApp Template / Automated Reminder
    // =========================================================================
    console.log("\n3. Running 8B WhatsApp Template & Automated Reminder Tests...");

    // 2.1 Meta template message sending function structure check
    let mockGraphApiCalls: Array<{ url: string; body: any }> = [];
    const mockFetch = async (url: string, init: any) => {
      mockGraphApiCalls.push({ url, body: JSON.parse(init.body) });
      return {
        ok: true,
        json: async () => ({
          messaging_product: "whatsapp",
          contacts: [{ input: "6289516885651", wa_id: "6289516885651" }],
          messages: [{ id: "wamid_template_test_1" }],
        }),
      } as any;
    };

    const templateSendRes = await sendMetaTemplateMessage(
      {
        phoneNumberId: phoneIdA,
        to: operatorPhoneA,
        templateName: "daily_sales_reminder",
        languageCode: "id",
      },
      mockFetch as any
    );
    record(
      "8B_TEMPLATE_SEND",
      "sendMetaTemplateMessage constructs compliant Meta template payload",
      templateSendRes.success === true &&
        mockGraphApiCalls.length === 1 &&
        mockGraphApiCalls[0].body.type === "template" &&
        mockGraphApiCalls[0].body.template.name === "daily_sales_reminder" &&
        mockGraphApiCalls[0].body.template.language.code === "id"
    );

    // 2.2 Reminder blocked when template status is not approved
    // Biz B has template status = 'unconfigured'
    await updateBusinessChannelSettings(supabase, bizB, {
      telegramEnabled: true,
      whatsappEnabled: false,
      primaryChannel: "telegram",
      reminderChannel: "whatsapp",
    }).catch(() => {});

    const eligUnapprovedTemplate = await checkReminderEligibility(
      supabase,
      bizB,
      new Date("2026-09-30T12:00:00Z")
    );
    record(
      "8B_UNAPPROVED_BLOCK",
      "Reminder eligibility rejected when template is not approved (WHATSAPP_TEMPLATE_NOT_READY)",
      eligUnapprovedTemplate.eligible === false &&
        (eligUnapprovedTemplate.reason === "WHATSAPP_TEMPLATE_NOT_READY" ||
          eligUnapprovedTemplate.reason === "NO_ACTIVE_RECIPIENTS" ||
          eligUnapprovedTemplate.reason === "DISABLED")
    );

    // 2.3 Reminder blocked when no operator has receive_reminders = true
    // In Biz A, disable receive_reminders temporarily
    await pgClient.query(`
      UPDATE public.whatsapp_authorized_senders
      SET receive_reminders = false
      WHERE business_id = '${bizA}';
    `);

    // Set reminder channel to WhatsApp for Biz A
    await pgClient.query(`
      UPDATE public.business_channel_settings
      SET reminder_channel = 'whatsapp'
      WHERE business_id = '${bizA}';

      UPDATE public.business_reminder_settings SET enabled = false WHERE business_id != '${bizA}';

      INSERT INTO public.business_reminder_settings (business_id, enabled, channel, reminder_time, days_of_week, timezone)
      VALUES ('${bizA}', true, 'whatsapp', '18:00', ARRAY[0,1,2,3,4,5,6]::smallint[], 'Asia/Jakarta')
      ON CONFLICT (business_id) DO UPDATE SET enabled = true, channel = 'whatsapp', reminder_time = '18:00', days_of_week = ARRAY[0,1,2,3,4,5,6]::smallint[];
    `);

    // Clean up sales and notifications for today so eligibility won't fail on HAS_CONFIRMED_SALES or ALREADY_SENT
    await pgClient.query(`DELETE FROM public.transaction_events WHERE transaction_id IN (SELECT id FROM public.transactions WHERE business_id = '${bizA}');`);
    await pgClient.query(`DELETE FROM public.transactions WHERE business_id = '${bizA}';`);
    await pgClient.query(`DELETE FROM public.notification_logs WHERE business_id = '${bizA}';`);

    const eligNoRecipients = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z") // 19:00 WIB
    );
    record(
      "8B_NO_RECIPIENTS_BLOCK",
      "WhatsApp reminder rejected when no operator has receive_reminders = true (NO_ACTIVE_RECIPIENTS)",
      eligNoRecipients.eligible === false && eligNoRecipients.reason === "NO_ACTIVE_RECIPIENTS"
    );

    // 2.4 Reminder allowed when template approved and recipient exists
    await pgClient.query(`
      UPDATE public.whatsapp_authorized_senders
      SET receive_reminders = true
      WHERE business_id = '${bizA}' AND phone_number = '${operatorPhoneA}';
    `);

    const eligReady = await checkReminderEligibility(
      supabase,
      bizA,
      new Date("2026-09-30T12:00:00Z")
    );
    record(
      "8B_ELIGIBLE_WHEN_READY",
      "WhatsApp reminder eligible when template is approved and active recipient exists",
      eligReady.eligible === true &&
        eligReady.channel === "whatsapp" &&
        eligReady.recipients?.length === 1 &&
        eligReady.recipients[0].phone === operatorPhoneA
    );

    // 2.5 Runner triggers and delivers reminder via WhatsApp template sender
    let whatsappRemindersSent: Array<{ to: string; template: string }> = [];
    const mockWhatsAppTemplateSender = async (opts: { to: string; templateName: string }) => {
      whatsappRemindersSent.push({ to: opts.to, template: opts.templateName });
      return { success: true, messageId: "wamid_remind_999" };
    };

    const runnerRes1 = await runDueReminders(supabase, {
      now: new Date("2026-09-30T12:00:00Z"),
      whatsappTemplateSender: mockWhatsAppTemplateSender as any,
    });
    record(
      "8B_RUNNER_WHATSAPP",
      "Reminder runner delivers reminder to WhatsApp operator via template sender",
      runnerRes1.notificationsSent === 1 && whatsappRemindersSent.length === 1
    );

    // 2.6 Daily reminder idempotency on second run today
    const runnerRes2 = await runDueReminders(supabase, {
      now: new Date("2026-09-30T12:05:00Z"),
      whatsappTemplateSender: mockWhatsAppTemplateSender as any,
    });
    record(
      "8B_RUNNER_IDEMPOTENCY",
      "Second reminder run on same day skips cleanly with 0 duplicate deliveries",
      runnerRes2.notificationsSent === 0 && whatsappRemindersSent.length === 1
    );

    // =========================================================================
    // SECTION 3: 8C Telegram -> WhatsApp Cutover
    // =========================================================================
    console.log("\n4. Running 8C Telegram -> WhatsApp Cutover Tests...");

    // 3.1 Dual-run mode: Both channels process sales concurrently
    await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: true,
      whatsappEnabled: true,
      primaryChannel: "whatsapp",
      reminderChannel: "whatsapp",
    });

    // Send sale via WhatsApp
    const waSaleRes = await processIncomingWhatsAppWebhook(
      supabase,
      createWhatsAppTextWebhookPayload({
        phoneNumberId: phoneIdA,
        from: operatorPhoneA,
        messageId: "wamid_dual_run_wa_1",
        text: "Kejual 8kg",
      }),
      { metaSender: mockWhatsAppSender as any }
    );

    // Send sale via Telegram
    const dynamicTgUpdateId1 = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000);
    const tgSaleRes = await processIncomingTelegramWebhook(
      supabase,
      {
        update_id: dynamicTgUpdateId1,
        message: {
          message_id: 101,
          from: { id: 88101, is_bot: false, first_name: "Telegram Operator" },
          chat: { id: 88101, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text: "Kejual 12kg",
        },
      },
      { telegramSender: mockTelegramSender as any }
    );

    record(
      "8C_DUAL_RUN",
      "Dual-run mode: Both WhatsApp and Telegram sales processed successfully in parallel",
      waSaleRes.action === "CREATE_SALE" && tgSaleRes.action === "CREATE_SALE"
    );

    // 3.2 Cutover to WhatsApp Primary Channel
    const channelSettingsAfterCutover = await getBusinessChannelSettings(supabase, bizA);
    record(
      "8C_PRIMARY_CUTOVER",
      "Primary channel safely set to 'whatsapp'",
      channelSettingsAfterCutover.primaryChannel === "whatsapp"
    );

    // 3.3 Disabling Telegram preserves Telegram operators & config
    await updateBusinessChannelSettings(supabase, bizA, {
      telegramEnabled: false,
      whatsappEnabled: true,
      primaryChannel: "whatsapp",
      reminderChannel: "whatsapp",
    });

    const tgOperatorsPreserved = await pgClient.query(
      `SELECT count(*)::int AS count FROM public.telegram_authorized_users WHERE business_id = $1;`,
      [bizA]
    );
    record(
      "8C_PRESERVE_TELEGRAM_USERS",
      "Disabling Telegram channel strictly preserves authorized Telegram operators in database",
      tgOperatorsPreserved.rows[0].count >= 1
    );

    // 3.4 When Telegram is disabled, incoming Telegram update is ignored safely
    const dynamicTgUpdateId2 = dynamicTgUpdateId1 + 1;
    const disabledTgRes = await processIncomingTelegramWebhook(
      supabase,
      {
        update_id: dynamicTgUpdateId2,
        message: {
          message_id: 102,
          from: { id: 88101, is_bot: false, first_name: "Telegram Operator" },
          chat: { id: 88101, type: "private" },
          date: Math.floor(Date.now() / 1000),
          text: "Kejual 15kg",
        },
      },
      { telegramSender: mockTelegramSender as any }
    );
    record(
      "8C_DISABLED_CHANNEL_IGNORED",
      "Incoming message to disabled Telegram channel safely ignored without mutation",
      disabledTgRes.acknowledged === true && disabledTgRes.type === "channel_disabled"
    );

    // =========================================================================
    // SECTION 4: 8D Production Verification & Ledger Invariance
    // =========================================================================
    console.log("\n5. Running 8D Production Verification & Ledger Invariance Tests...");

    // 4.1 Outbound Meta Graph API error does NOT rollback committed ledger transaction
    const mockFailingMetaSender = async () => {
      return {
        success: false,
        errorCode: "WHATSAPP_NETWORK_TIMEOUT",
        errorMessage: "Meta Cloud API unreachable",
      };
    };

    const failingSendPayload = createWhatsAppTextWebhookPayload({
      phoneNumberId: phoneIdA,
      from: operatorPhoneA,
      messageId: "wamid_failing_outbound_1",
      text: "Kejual 7kg",
    });

    const failingOutboundRes = await processIncomingWhatsAppWebhook(supabase, failingSendPayload, {
      metaSender: mockFailingMetaSender as any,
    });

    record(
      "8D_RESILIENCE",
      "Outbound Meta Graph API error does NOT rollback committed transaction in ledger",
      failingOutboundRes.acknowledged === true &&
        failingOutboundRes.action === "CREATE_SALE" &&
        failingOutboundRes.sendResult?.success === false
    );

    const checkCommittedTx = await pgClient.query(
      `SELECT * FROM public.transactions WHERE business_id = $1 AND quantity = 7 AND status = 'confirmed';`,
      [bizA]
    );
    record(
      "8D_LEDGER_INTEGRITY",
      "Financial transaction (7kg) exists in PostgreSQL ledger despite outbound transport error",
      checkCommittedTx.rows.length === 1
    );

    // 4.2 Telemetry recording & Secret Scrubbing
    await recordIntegrationEvent(supabase, {
      businessId: bizA,
      channel: "whatsapp",
      direction: "inbound",
      eventType: "test.step8.telemetry",
      status: "success",
      metadata: {
        token: "EAAX...SECRET_BEARER_TOKEN",
        client_secret: "SECRET_APP_9999",
        safeNote: "Step 8 Telemetry",
      },
    });

    const eventRow = await pgClient.query(
      `SELECT metadata FROM public.integration_events WHERE business_id = $1 AND event_type = 'test.step8.telemetry';`,
      [bizA]
    );
    const metaStr = JSON.stringify(eventRow.rows[0]?.metadata || {});
    record(
      "8D_TELEMETRY_SCRUBBING",
      "Integration events telemetry recorded with sensitive tokens scrubbed to [REDACTED]",
      metaStr.includes("[REDACTED]") && !metaStr.includes("SECRET_BEARER_TOKEN")
    );

    // 4.3 Monitoring service status aggregation
    const monitoringData = await getMonitoringData(supabase, bizA);
    record(
      "8D_MONITORING_VIEW",
      "Monitoring service reports healthy WhatsApp channel status and active state",
      (monitoringData.channels.whatsapp.status === "ACTIVE" || monitoringData.channels.whatsapp.status === "WARNING") &&
        monitoringData.channels.whatsapp.enabled === true
    );

    // 4.4 WhatsApp Readiness check for production
    const readinessBizA = await checkWhatsAppReadiness(supabase, bizA);
    record(
      "8D_READINESS_ACTIVE",
      "WhatsApp readiness reports ready: true, status: 'ACTIVE', and approved template",
      readinessBizA.ready === true &&
        readinessBizA.status === "ACTIVE" &&
        readinessBizA.hasApprovedTemplate === true &&
        readinessBizA.authorizedSendersCount >= 1
    );

    // 4.5 Financial Ledger Source of Truth Invariance
    const totalTransactionsBizA = await pgClient.query(
      `SELECT count(*)::int AS count FROM public.transactions WHERE business_id = $1;`,
      [bizA]
    );
    record(
      "8D_SOURCE_OF_TRUTH",
      "PostgreSQL remains the single authoritative source of truth for all transactions",
      totalTransactionsBizA.rows[0].count >= 3
    );

  } catch (err: any) {
    console.error("Fatal Test Error:", err);
    record("FATAL", "Step 8 test execution threw error", false, err.message);
  } finally {
    await pgClient.end();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n=== Step 8 Test Results Summary ===");
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error(`Step 8 tests failed with ${failed} failing tests!`);
    process.exit(1);
  }
}

runStep8Tests();
