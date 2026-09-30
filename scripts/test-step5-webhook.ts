/**
 * Step 5 Test Suite for OXID WA Ledger.
 * Verifies:
 * - Meta Webhook Verification (GET hub.challenge)
 * - Meta X-Hub-Signature-256 validation (HMAC-SHA256, timing-safe)
 * - Phone number normalization and masking
 * - Inbound webhook extraction & status event filtering
 * - Tenant resolution via whatsapp_connections.phone_number_id
 * - Critical Security: whatsapp_authorized_senders enforcement
 * - Concurrency & message idempotency (processed_whatsapp_messages)
 * - Outbound Meta client & error handling
 * - Integration with deterministic parser & Step 4 transaction executor
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import {
  verifyHubChallenge,
  verifyMetaSignature,
  computeMetaSignature,
  safeCompareStrings,
} from "../src/modules/whatsapp/crypto";
import {
  normalizePhoneNumber,
  maskPhoneNumber,
} from "../src/modules/whatsapp/phone";
import { processIncomingWhatsAppWebhook } from "../src/modules/whatsapp/service";
import { MetaWebhookPayload } from "../src/modules/whatsapp/types";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  num: number;
  name: string;
  category: "SIGNATURE" | "VERIFICATION" | "PHONE" | "SECURITY" | "IDEMPOTENCY" | "E2E" | "STATUS";
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];
let testCounter = 1;

function record(
  category: TestReport["category"],
  name: string,
  passed: boolean,
  error?: string
) {
  const num = testCounter++;
  reports.push({ num, name, category, passed, error });
  const symbol = passed ? "✓" : "✗";
  const numStr = String(num).padStart(2, "0");
  console.log(`  ${symbol} [Test ${numStr}] [${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
}

// Helper to construct realistic Meta Cloud API incoming message payload
function buildMetaWebhookPayload(options: {
  messageId: string;
  phoneNumberId: string;
  fromPhone: string;
  text?: string;
  messageType?: string;
  timestamp?: string;
  statuses?: Array<{ id: string; status: "sent" | "delivered" | "read" | "failed"; timestamp: string; recipient_id: string }>;
}): MetaWebhookPayload {
  const {
    messageId,
    phoneNumberId,
    fromPhone,
    text,
    messageType = "text",
    timestamp = Math.floor(Date.now() / 1000).toString(),
    statuses,
  } = options;

  if (statuses) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-entry-1",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  phone_number_id: phoneNumberId,
                  display_phone_number: "628000000000",
                },
                statuses,
              },
            },
          ],
        },
      ],
    };
  }

  const messageObj: any = {
    from: fromPhone,
    id: messageId,
    timestamp,
    type: messageType,
  };

  if (messageType === "text" && text !== undefined) {
    messageObj.text = { body: text };
  } else if (messageType === "image") {
    messageObj.image = { id: "media-img-123", mime_type: "image/jpeg" };
  }

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-entry-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                phone_number_id: phoneNumberId,
                display_phone_number: "628000000000",
              },
              contacts: [
                {
                  profile: { name: "Test Sender" },
                  wa_id: fromPhone,
                },
              ],
              messages: [messageObj],
            },
          },
        ],
      },
    ],
  };
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
        select: (columns: string = "*") => {
          const conditions: Array<{ col: string; op: string; val: any }> = [];
          const orders: string[] = [];

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
              const cleanCols = columns.includes("(") ? columns : columns.split(",").map((c) => c.trim()).join(", ");
              const sql = `SELECT ${cleanCols} FROM public."${table}" ${whereClause} ${orderClause};`;
              const res = await pgClient.query(sql, values);
              return { data: res.rows, error: null };
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
            order: (col: string, { ascending }: { ascending: boolean } = { ascending: true }) => {
              orders.push(`"${col}" ${ascending ? "ASC" : "DESC"}`);
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
              for (const row of insertRows) {
                const keys = Object.keys(row);
                const cols = keys.map((k) => `"${k}"`).join(", ");
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
                const vals = keys.map((k) => (typeof row[k] === "object" && row[k] !== null ? JSON.stringify(row[k]) : row[k]));
                await pgClient.query(`INSERT INTO public."${table}" (${cols}) VALUES (${placeholders});`, vals);
              }
              return { data: insertRows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const b: any = {
            select: () => b,
            single: async () => ({ data: insertRows[0] || null, error: null }),
            maybeSingle: async () => ({ data: insertRows[0] || null, error: null }),
            then: (resolve: any, reject: any) => executeInsert().then(resolve, reject),
          };
          return b;
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runStep5Tests() {
  console.log("=== OXID WA Ledger - Step 5 Webhook & Security Test Suite ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const supabase = createPgSupabaseAdapter(pgClient);

  // Mock outbound Meta sends
  const outboundMessagesSent: Array<{ phoneNumberId: string; to: string; text: string }> = [];
  const mockMetaSender = async (opts: { phoneNumberId: string; to: string; text: string }) => {
    outboundMessagesSent.push(opts);
    return { success: true, messageId: `wam-out-${Date.now()}` };
  };

  try {
    // ------------------------------------------------------------------------
    // Part 1: Crypto & Phone Normalization Tests
    // ------------------------------------------------------------------------
    console.log("1. Running Crypto, Signature, and Phone Utility Tests...");

    const fakeSecret = "secret_app_key_1234567890abcdef";
    const sampleBody = JSON.stringify({ test: "payload", value: 42 });
    const validSignature = computeMetaSignature(sampleBody, fakeSecret);

    // Test 01: Valid Meta signature accepted
    const sigValid = verifyMetaSignature(sampleBody, validSignature, fakeSecret);
    record("SIGNATURE", "Valid Meta signature accepted", sigValid);

    // Test 02: Invalid signature rejected
    const sigInvalid = verifyMetaSignature(sampleBody, "sha256=0000000000000000000000000000000000000000000000000000000000000000", fakeSecret);
    record("SIGNATURE", "Invalid signature rejected", !sigInvalid);

    // Test 03: Missing signature header rejected
    const sigMissing = verifyMetaSignature(sampleBody, null, fakeSecret);
    record("SIGNATURE", "Missing signature rejected", !sigMissing);

    // Test 04: Modified payload rejected
    const modifiedBody = JSON.stringify({ test: "payload", value: 43 });
    const sigTampered = verifyMetaSignature(modifiedBody, validSignature, fakeSecret);
    record("SIGNATURE", "Modified payload rejected", !sigTampered);

    // Test 05: Signature comparison is timing-safe
    const comp1 = safeCompareStrings("abc", "abc");
    const comp2 = safeCompareStrings("abc", "def");
    const comp3 = safeCompareStrings("abc", "abcd");
    record("SIGNATURE", "Constant-time string comparison works accurately", comp1 && !comp2 && !comp3);

    // Test 06: GET verification with valid token returns challenge
    const getValid = verifyHubChallenge("subscribe", "my_verify_token_123", "my_verify_token_123");
    record("VERIFICATION", "Valid hub.mode and verify_token accepted", getValid);

    // Test 07: GET verification with invalid token rejected
    const getInvalidToken = verifyHubChallenge("subscribe", "wrong_token", "my_verify_token_123");
    record("VERIFICATION", "Invalid verify_token rejected", !getInvalidToken);

    // Test 08: GET verification with invalid mode rejected
    const getInvalidMode = verifyHubChallenge("publish", "my_verify_token_123", "my_verify_token_123");
    record("VERIFICATION", "Invalid hub.mode rejected", !getInvalidMode);

    // Test 09: Phone normalization: Indonesian local '08...' converted to '628...'
    const phone1 = normalizePhoneNumber("0812-3456-7890");
    record("PHONE", "Indonesian local '08...' normalized to '6281234567890'", phone1 === "6281234567890");

    // Test 10: Phone normalization: '+628...' converted to '628...'
    const phone2 = normalizePhoneNumber("+62 812 3456 7890");
    record("PHONE", "Formatted '+62 812...' normalized to digits '6281234567890'", phone2 === "6281234567890");

    // Test 11: Phone masking protects PII
    const masked = maskPhoneNumber("6281234567890");
    record("PHONE", "Phone masking masks middle digits (e.g. 62812****7890)", masked === "62812****7890");

    // ------------------------------------------------------------------------
    // Part 2: Seed Database for Multi-Tenant Webhook Testing
    // ------------------------------------------------------------------------
    console.log("\n2. Setting up multi-tenant test businesses, connections, and authorized senders...");

    const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const phoneIdA = "meta-phone-id-tenant-a";
    const phoneIdB = "meta-phone-id-tenant-b";
    const authorizedPhoneA = "6281234567890";
    const authorizedPhoneB = "6289876543210";
    const unauthorizedPhone = "6285555555555";

    // Clean public schema and re-apply all migrations
    await pgClient.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      CREATE SCHEMA IF NOT EXISTS auth;
    `);

    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await pgClient.query(sql);
    }

    // Insert auth users
    const userA = "11111111-1111-1111-1111-111111111111";
    const userB = "22222222-2222-2222-2222-222222222222";
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userA}', 'ownerA@farm.local'),
        ('${userB}', 'ownerB@farm.local')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Insert businesses
    await pgClient.query(`
      INSERT INTO public.businesses (id, name, currency, timezone, status, created_by) VALUES
        ('${bizA}', 'Lele Super Farm A', 'IDR', 'Asia/Jakarta', 'active', '${userA}'),
        ('${bizB}', 'Patin Mandiri B', 'IDR', 'Asia/Jakarta', 'active', '${userB}');
      
      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${userA}', 'owner'),
        ('${bizB}', '${userB}', 'owner');
    `);

    // Insert default products
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active) VALUES
        ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '${bizA}', 'Lele Konsumsi', 'kg', 28000, true, true),
        ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '${bizB}', 'Patin Segar', 'kg', 35000, true, true);
    `);

    // Insert WhatsApp connections
    await pgClient.query(`
      INSERT INTO public.whatsapp_connections (business_id, phone_number, phone_number_id, status) VALUES
        ('${bizA}', '${authorizedPhoneA}', '${phoneIdA}', 'connected'),
        ('${bizB}', '${authorizedPhoneB}', '${phoneIdB}', 'connected');
    `);

    // Insert Authorized Senders
    await pgClient.query(`
      INSERT INTO public.whatsapp_authorized_senders (business_id, phone_number, display_label, active) VALUES
        ('${bizA}', '${authorizedPhoneA}', 'Owner Farm A', true),
        ('${bizB}', '${authorizedPhoneB}', 'Owner Farm B', true);
    `);

    // ------------------------------------------------------------------------
    // Part 3: Webhook Pipeline & End-to-End Execution Tests
    // ------------------------------------------------------------------------
    console.log("\n3. Running Webhook Pipeline End-to-End Tests...");

    // Test 12: [SALE] High-confidence sale from authorized sender
    outboundMessagesSent.length = 0;
    const salePayload = buildMetaWebhookPayload({
      messageId: "wam-msg-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "Kejual 15kg",
      timestamp: "1727670000",
    });

    const resSale = await processIncomingWhatsAppWebhook(supabase, salePayload, {
      metaSender: mockMetaSender,
    });

    const dbTxRes = await pgClient.query(`
      SELECT quantity, total_amount, status FROM public.transactions WHERE business_id = '${bizA}'
    `);
    const dbAuditRes = await pgClient.query(`
      SELECT event_type FROM public.transaction_events WHERE business_id = '${bizA}'
    `);

    const salePassed =
      resSale.acknowledged &&
      resSale.type === "message_processed" &&
      resSale.action === "CREATE_SALE" &&
      resSale.executionResult?.status === "SUCCESS" &&
      dbTxRes.rowCount === 1 &&
      Number(dbTxRes.rows[0].quantity) === 15 &&
      Number(dbTxRes.rows[0].total_amount) === 420000 &&
      dbAuditRes.rowCount === 1 &&
      outboundMessagesSent.length === 1 &&
      outboundMessagesSent[0].text.includes("420.000");

    record("E2E", "Valid sale 'Kejual 15kg' creates transaction (15kg * 28,000 = Rp420,000) & outbound reply", salePassed);

    // Test 13: [IDEMPOTENCY] Duplicate delivery with identical message ID
    outboundMessagesSent.length = 0;
    const resDup = await processIncomingWhatsAppWebhook(supabase, salePayload, {
      metaSender: mockMetaSender,
    });

    const dbTxDupRes = await pgClient.query(`
      SELECT COUNT(*) as count FROM public.transactions WHERE business_id = '${bizA}'
    `);
    const dbAuditDupRes = await pgClient.query(`
      SELECT COUNT(*) as count FROM public.transaction_events WHERE business_id = '${bizA}'
    `);

    const dupPassed =
      resDup.acknowledged &&
      resDup.type === "duplicate_ignored" &&
      Number(dbTxDupRes.rows[0].count) === 1 &&
      Number(dbAuditDupRes.rows[0].count) === 1 &&
      outboundMessagesSent.length === 0;

    record("IDEMPOTENCY", "Duplicate delivery with same message ID safely ignored with 0 duplicate transactions", dupPassed);

    // Test 14: [CONCURRENCY] Concurrent delivery of identical message ID
    const concurrentPayload = buildMetaWebhookPayload({
      messageId: "wam-concurrent-999",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "Kejual 10kg",
    });

    const clientConc1 = new Client({ connectionString: PG_URL });
    const clientConc2 = new Client({ connectionString: PG_URL });
    await clientConc1.connect();
    await clientConc2.connect();
    const supabaseConc1 = createPgSupabaseAdapter(clientConc1);
    const supabaseConc2 = createPgSupabaseAdapter(clientConc2);

    const [c1, c2] = await Promise.all([
      processIncomingWhatsAppWebhook(supabaseConc1, concurrentPayload, { metaSender: mockMetaSender }),
      processIncomingWhatsAppWebhook(supabaseConc2, concurrentPayload, { metaSender: mockMetaSender }),
    ]);

    await clientConc1.end();
    await clientConc2.end();

    const results = [c1.type, c2.type];
    const exactlyOneClaimed = results.includes("message_processed") && results.includes("duplicate_ignored");
    record("IDEMPOTENCY", "Concurrent delivery of identical message ID: exactly one worker executes", exactlyOneClaimed);

    // Test 15: [SECURITY] Unauthorized sender cannot create transactions
    const unauthorizedSalePayload = buildMetaWebhookPayload({
      messageId: "wam-unauth-001",
      phoneNumberId: phoneIdA,
      fromPhone: unauthorizedPhone,
      text: "Kejual 50kg",
    });

    const txBeforeCount = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;
    const resUnauth = await processIncomingWhatsAppWebhook(supabase, unauthorizedSalePayload, {
      metaSender: mockMetaSender,
    });
    const txAfterCount = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;

    const unauthPassed =
      resUnauth.acknowledged &&
      resUnauth.type === "unauthorized_sender" &&
      txBeforeCount === txAfterCount;

    record("SECURITY", "Unauthorized sender cannot create transaction (0 financial writes)", unauthPassed);

    // Test 16: [SECURITY] Unauthorized sender cannot request report
    const unauthReportPayload = buildMetaWebhookPayload({
      messageId: "wam-unauth-report",
      phoneNumberId: phoneIdA,
      fromPhone: unauthorizedPhone,
      text: "laporan hari ini",
    });
    const resUnauthReport = await processIncomingWhatsAppWebhook(supabase, unauthReportPayload, {
      metaSender: mockMetaSender,
    });
    record("SECURITY", "Unauthorized sender cannot request reports (no financial or business leaks)", resUnauthReport.type === "unauthorized_sender");

    // Test 17: [SECURITY] Unauthorized sender cannot cancel transaction
    const unauthCancelPayload = buildMetaWebhookPayload({
      messageId: "wam-unauth-cancel",
      phoneNumberId: phoneIdA,
      fromPhone: unauthorizedPhone,
      text: "batal terakhir",
    });
    const resUnauthCancel = await processIncomingWhatsAppWebhook(supabase, unauthCancelPayload, {
      metaSender: mockMetaSender,
    });
    record("SECURITY", "Unauthorized sender cannot cancel transaction", resUnauthCancel.type === "unauthorized_sender");

    // Test 18: [SECURITY] Unauthorized sender cannot correct transaction
    const unauthCorrectPayload = buildMetaWebhookPayload({
      messageId: "wam-unauth-correct",
      phoneNumberId: phoneIdA,
      fromPhone: unauthorizedPhone,
      text: "ubah terakhir jadi 20kg",
    });
    const resUnauthCorrect = await processIncomingWhatsAppWebhook(supabase, unauthCorrectPayload, {
      metaSender: mockMetaSender,
    });
    record("SECURITY", "Unauthorized sender cannot correct transaction", resUnauthCorrect.type === "unauthorized_sender");

    // Test 19: [SECURITY] Spoofed sender in message text has no effect
    const spoofedTextPayload = buildMetaWebhookPayload({
      messageId: "wam-spoof-text",
      phoneNumberId: phoneIdA,
      fromPhone: unauthorizedPhone,
      text: `dari ${authorizedPhoneA}: Kejual 100kg`,
    });
    const resSpoof = await processIncomingWhatsAppWebhook(supabase, spoofedTextPayload, {
      metaSender: mockMetaSender,
    });
    record("SECURITY", "Spoofed sender in message text has no effect (blocked by envelope sender check)", resSpoof.type === "unauthorized_sender");

    // Test 20: [SECURITY] Cross-tenant isolation: Sender A sending to Business B is blocked
    const crossTenantPayload = buildMetaWebhookPayload({
      messageId: "wam-cross-tenant-1",
      phoneNumberId: phoneIdB, // Routed to Business B
      fromPhone: authorizedPhoneA, // But sender is only authorized for Business A
      text: "Kejual 5kg",
    });
    const resCross = await processIncomingWhatsAppWebhook(supabase, crossTenantPayload, {
      metaSender: mockMetaSender,
    });
    record("SECURITY", "Sender from Business A cannot operate Business B (tenant-isolated sender check)", resCross.type === "unauthorized_sender");

    // Test 21: [FALSE_POSITIVE] Stock statement produces zero transactions
    const txCountBeforeStock = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions WHERE business_id = '${bizA}'`)).rows[0].count;
    const stockPayload = buildMetaWebhookPayload({
      messageId: "wam-stock-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "stok tinggal 15kg",
    });
    const resStock = await processIncomingWhatsAppWebhook(supabase, stockPayload, {
      metaSender: mockMetaSender,
    });
    const txCountAfterStock = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions WHERE business_id = '${bizA}'`)).rows[0].count;
    record("E2E", "Stock false-positive 'stok tinggal 15kg' creates zero transactions", txCountBeforeStock === txCountAfterStock && resStock.action !== "CREATE_SALE");

    // Test 22: [REPORT] Report query returns summary without mutating ledger
    const txBeforeReport = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;
    const reportPayload = buildMetaWebhookPayload({
      messageId: "wam-report-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "laporan hari ini",
    });
    const resReport = await processIncomingWhatsAppWebhook(supabase, reportPayload, {
      metaSender: mockMetaSender,
    });
    const txAfterReport = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;
    record("E2E", "Report query 'laporan hari ini' executes without financial mutation", txBeforeReport === txAfterReport && resReport.action === "SHOW_REPORT_TODAY");

    // Test 23: [AMBIGUOUS] Ambiguous weight returns confirmation notice without writing transaction
    const txBeforeAmbig = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;
    const ambigPayload = buildMetaWebhookPayload({
      messageId: "wam-ambig-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "15kg",
    });
    const resAmbig = await processIncomingWhatsAppWebhook(supabase, ambigPayload, {
      metaSender: mockMetaSender,
    });
    const txAfterAmbig = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions`)).rows[0].count;
    record("E2E", "Ambiguous '15kg' requires confirmation and creates zero transactions", txBeforeAmbig === txAfterAmbig && resAmbig.executionResult?.status === "CONFIRMATION_REQUIRED");

    // Test 24: [STATUS_EVENT] Status callback event ignores parser
    const statusPayload = buildMetaWebhookPayload({
      messageId: "ignored",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      statuses: [
        {
          id: "wam-msg-001",
          status: "delivered",
          timestamp: Math.floor(Date.now() / 1000).toString(),
          recipient_id: authorizedPhoneA,
        },
      ],
    });
    const resStatus = await processIncomingWhatsAppWebhook(supabase, statusPayload, {
      metaSender: mockMetaSender,
    });
    record("STATUS", "Status webhook event ('delivered') safely acknowledged without invoking parser", resStatus.acknowledged && resStatus.type === "status_event");

    // Test 25: [NON_TEXT] Non-text message (image) handled safely without crash
    const imagePayload = buildMetaWebhookPayload({
      messageId: "wam-img-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      messageType: "image",
    });
    const resImage = await processIncomingWhatsAppWebhook(supabase, imagePayload, {
      metaSender: mockMetaSender,
    });
    record("E2E", "Non-text message ('image') handled safely with text-only notice", resImage.acknowledged && resImage.type === "unsupported_message_type");

    // Test 26: [CORRECTION] Correction flow via WhatsApp webhook
    const correctPayload = buildMetaWebhookPayload({
      messageId: "wam-correct-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "ubah terakhir jadi 20kg",
    });
    const resCorrect = await processIncomingWhatsAppWebhook(supabase, correctPayload, {
      metaSender: mockMetaSender,
    });
    record("E2E", "Correction 'ubah terakhir jadi 20kg' succeeds via webhook", resCorrect.executionResult?.status === "SUCCESS" && resCorrect.action === "REQUEST_CORRECT_LAST");

    // Test 27: [CANCELLATION] Cancellation flow via WhatsApp webhook
    const cancelPayload = buildMetaWebhookPayload({
      messageId: "wam-cancel-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "batal terakhir",
    });
    const resCancel = await processIncomingWhatsAppWebhook(supabase, cancelPayload, {
      metaSender: mockMetaSender,
    });
    record("E2E", "Cancellation 'batal terakhir' succeeds via webhook", resCancel.executionResult?.status === "SUCCESS" && resCancel.action === "REQUEST_CANCEL_LAST");

    // Test 28: [FAULT_TOLERANCE] Outbound reply failure does NOT rollback financial transaction
    const failingMetaSender = async () => {
      return { success: false, errorCode: "WHATSAPP_ACCESS_TOKEN_INVALID", errorMessage: "Session expired" };
    };
    const failOutboundPayload = buildMetaWebhookPayload({
      messageId: "wam-failoutbound-001",
      phoneNumberId: phoneIdB, // Tenant B
      fromPhone: authorizedPhoneB,
      text: "Kejual 5kg",
    });

    const txBBefore = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions WHERE business_id = '${bizB}'`)).rows[0].count;
    const resFailOutbound = await processIncomingWhatsAppWebhook(supabase, failOutboundPayload, {
      metaSender: failingMetaSender,
    });
    const txBAfter = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions WHERE business_id = '${bizB}'`)).rows[0].count;

    const faultPassed =
      resFailOutbound.executionResult?.status === "SUCCESS" &&
      resFailOutbound.sendResult?.success === false &&
      Number(txBAfter) === Number(txBBefore) + 1;

    record("E2E", "Outbound reply failure does NOT rollback financial transaction", faultPassed);

    // Test 29: [FAULT_TOLERANCE] Retry after outbound reply failure does not recreate financial transaction
    const resRetry = await processIncomingWhatsAppWebhook(supabase, failOutboundPayload, {
      metaSender: failingMetaSender,
    });
    const txBAfterRetry = (await pgClient.query(`SELECT COUNT(*) FROM public.transactions WHERE business_id = '${bizB}'`)).rows[0].count;

    record("IDEMPOTENCY", "Retry of message with failed outbound reply is recognized as duplicate", resRetry.type === "duplicate_ignored" && txBAfter === txBAfterRetry);

    // Test 30: [DAILY_STATUS] NO_SALE via webhook on a day without sales
    const noSalePayload = buildMetaWebhookPayload({
      messageId: "wam-nosale-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "gak ada penjualan hari ini",
      timestamp: String(Math.floor(new Date("2026-12-01T12:00:00Z").getTime() / 1000)),
    });
    const resNoSale = await processIncomingWhatsAppWebhook(supabase, noSalePayload, {
      metaSender: mockMetaSender,
    });
    const noSaleInDb = (await pgClient.query(`SELECT status FROM public.business_daily_status WHERE business_id = '${bizA}' AND local_date = '2026-12-01'`)).rows;
    record("E2E", "NO_SALE 'gak ada penjualan hari ini' records daily status via webhook", resNoSale.action === "MARK_NO_SALE" && noSaleInDb[0]?.status === "NO_SALE");

    // Test 31: [DAILY_STATUS] CLOSED via webhook on a day without sales
    const closedPayload = buildMetaWebhookPayload({
      messageId: "wam-closed-001",
      phoneNumberId: phoneIdA,
      fromPhone: authorizedPhoneA,
      text: "libur hari ini",
      timestamp: String(Math.floor(new Date("2026-12-02T12:00:00Z").getTime() / 1000)),
    });
    const resClosed = await processIncomingWhatsAppWebhook(supabase, closedPayload, {
      metaSender: mockMetaSender,
    });
    const closedInDb = (await pgClient.query(`SELECT status FROM public.business_daily_status WHERE business_id = '${bizA}' AND local_date = '2026-12-02'`)).rows;
    record("E2E", "CLOSED 'libur hari ini' records daily status via webhook", resClosed.action === "MARK_CLOSED" && closedInDb[0]?.status === "CLOSED");

    // ------------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------------
    const passedCount = reports.filter((r) => r.passed).length;
    const failedCount = reports.filter((r) => !r.passed).length;

    console.log("\n=== Step 5 Test Results Summary ===");
    console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Test execution failed with exception:", errorMsg);
    process.exit(1);
  } finally {
    await pgClient.end().catch(() => {});
  }
}

runStep5Tests();
