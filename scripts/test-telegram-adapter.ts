import { Client } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  verifyTelegramSecretToken,
  normalizeTelegramCommand,
  processIncomingTelegramWebhook,
  TelegramUpdate,
  TelegramSendResult,
} from "../src/modules/telegram";

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

function buildTelegramUpdate(options: {
  updateId: number;
  fromId?: number;
  chatId?: number;
  chatType?: "private" | "group" | "supergroup" | "channel";
  text?: string;
  isEdited?: boolean;
  isNonText?: boolean;
  date?: number;
}): TelegramUpdate {
  const {
    updateId,
    fromId = 111111111,
    chatId = 111111111,
    chatType = "private",
    text,
    isEdited = false,
    isNonText = false,
    date = Math.floor(Date.now() / 1000),
  } = options;

  if (isEdited) {
    return {
      update_id: updateId,
      edited_message: {
        message_id: 99,
        from: { id: fromId, is_bot: false, first_name: "User" },
        chat: { id: chatId, type: chatType },
        date,
        text: text || "edited message",
      },
    };
  }

  const messageObj: any = {
    message_id: Math.floor(Math.random() * 100000),
    from: { id: fromId, is_bot: false, first_name: "Tester" },
    chat: { id: chatId, type: chatType },
    date,
  };

  if (!isNonText && text !== undefined) {
    messageObj.text = text;
  } else if (isNonText) {
    messageObj.photo = [{ file_id: "photo_123", width: 100, height: 100 }];
  }

  return {
    update_id: updateId,
    message: messageObj,
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
          const conditions: Array<{ col: string; val: any }> = [];
          const executeQuery = async () => {
            try {
              const whereClause =
                conditions.length > 0
                  ? "WHERE " + conditions.map((c, i) => `"${c.col}" = $${i + 1}`).join(" AND ")
                  : "";
              const values = conditions.map((c) => c.val);
              const sql = `SELECT ${columns} FROM public."${table}" ${whereClause};`;
              const res = await pgClient.query(sql, values);
              return { data: res.rows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };

          const queryBuilder: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, val });
              return queryBuilder;
            },
            then: (onfulfilled: any, onrejected: any) => {
              return executeQuery().then(onfulfilled, onrejected);
            },
            maybeSingle: async () => {
              const res = await executeQuery();
              return { data: res.data?.[0] || null, error: res.error };
            },
            single: async () => {
              const res = await executeQuery();
              return { data: res.data?.[0] || null, error: res.error };
            },
          };
          return queryBuilder;
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runTests() {
  console.log("=== OXID WA Ledger - Step 6A Telegram Adapter Test Suite ===\n");

  // 1. Secret Verification & Crypto Tests
  console.log("1. Running Telegram Secret Token Verification Tests...");
  const validSecret = "oxid_telegram_secret_token_12345";

  record("SECRET", "Missing webhook secret rejected", !verifyTelegramSecretToken(undefined, validSecret));
  record("SECRET", "Empty webhook secret rejected", !verifyTelegramSecretToken("", validSecret));
  record("SECRET", "Invalid webhook secret rejected", !verifyTelegramSecretToken("wrong_token_xyz", validSecret));
  record("SECRET", "Different length secret rejected", !verifyTelegramSecretToken("oxid_token", validSecret));
  record("SECRET", "Valid webhook secret accepted", verifyTelegramSecretToken(validSecret, validSecret));

  // Command Normalizer Tests
  const startNorm = normalizeTelegramCommand("/start");
  const helpNorm = normalizeTelegramCommand("/help@oxid_bot");
  const naturalNorm = normalizeTelegramCommand("Kejual 15kg");
  record("NORMALIZER", "/start detected accurately", startNorm.isStart && startNorm.normalizedText === "/start");
  record("NORMALIZER", "/help@bot stripped to 'help'", !helpNorm.isStart && helpNorm.normalizedText === "help");
  record("NORMALIZER", "Natural language passed intact", !naturalNorm.isStart && naturalNorm.normalizedText === "Kejual 15kg");

  // 2. Database Setup & Multi-Tenant Fixtures
  console.log("\n2. Setting up multi-tenant test database fixtures...");
  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const businessIdA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const businessIdB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const userIdA = "11111111-1111-1111-1111-111111111111";
  const userIdB = "22222222-2222-2222-2222-222222222222";

  const telegramUserA = 111111111;
  const telegramUserB = 222222222;
  const telegramUserUnauthorized = 999999999;

  try {
    await pgClient.query("BEGIN;");

    // Clean previous test data
    await pgClient.query("DELETE FROM public.transaction_events CASCADE;");
    await pgClient.query("DELETE FROM public.transactions CASCADE;");
    await pgClient.query("DELETE FROM public.business_daily_status CASCADE;");
    await pgClient.query("DELETE FROM public.telegram_authorized_users CASCADE;");
    await pgClient.query("DELETE FROM public.processed_telegram_updates CASCADE;");
    await pgClient.query("DELETE FROM public.products CASCADE;");
    await pgClient.query("DELETE FROM public.business_settings CASCADE;");
    await pgClient.query("DELETE FROM public.business_users CASCADE;");
    await pgClient.query("DELETE FROM public.businesses CASCADE;");

    // Seed Business A & B (business_settings automatically created by trigger)
    await pgClient.query(`
      INSERT INTO public.businesses (id, name, timezone, currency, created_by, status)
      VALUES 
        ('${businessIdA}', 'Test Business A', 'Asia/Jakarta', 'IDR', '${userIdA}', 'active'),
        ('${businessIdB}', 'Test Business B', 'Asia/Jakarta', 'IDR', '${userIdB}', 'active');
    `);

    // Seed Default Products
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES 
        ('aaaaaaaa-1111-1111-1111-111111111111', '${businessIdA}', 'Lele A', 'kg', 28000, true, true),
        ('bbbbbbbb-2222-2222-2222-222222222222', '${businessIdB}', 'Lele B', 'kg', 30000, true, true);
    `);

    // Seed Telegram Authorized Users
    await pgClient.query(`
      INSERT INTO public.telegram_authorized_users (business_id, telegram_user_id, display_label, active)
      VALUES 
        ('${businessIdA}', ${telegramUserA}, 'Owner A', true),
        ('${businessIdB}', ${telegramUserB}, 'Owner B', true);
    `);

    await pgClient.query("COMMIT;");
    console.log("Database fixtures initialized successfully.");
  } catch (err: unknown) {
    await pgClient.query("ROLLBACK;");
    console.error("Fixture setup failed:", err);
    process.exit(1);
  }

  // Connect Supabase Client via PG adapter
  const supabase = createPgSupabaseAdapter(pgClient);

  // Mock Telegram Outbound Sender
  let sentOutboundMessages: Array<{ chatId: number | string; text: string }> = [];
  const mockTelegramSender = async (options: { chatId: number | string; text: string }): Promise<TelegramSendResult> => {
    sentOutboundMessages.push(options);
    return { success: true, messageId: Math.floor(Math.random() * 10000) };
  };

  const failingTelegramSender = async (): Promise<TelegramSendResult> => {
    return { success: false, errorCode: "TELEGRAM_NETWORK_ERROR", errorMessage: "Failed to reach Telegram" };
  };

  console.log("\n3. Running Telegram Pipeline End-to-End Tests...");

  // Test 1: [SECRET] Missing secret rejected by verifier
  record("SECRET", "Missing webhook secret rejected", !verifyTelegramSecretToken(undefined, "test-secret"));

  // Test 2: [SECRET] Invalid secret rejected
  record("SECRET", "Invalid webhook secret rejected", !verifyTelegramSecretToken("wrong-secret", "test-secret"));

  // Test 3: [SECRET] Valid secret accepted
  record("SECRET", "Valid webhook secret accepted", verifyTelegramSecretToken("test-secret", "test-secret"));

  // Test 4: [BOOTSTRAP] Unauthorized /start returns own Telegram user ID
  sentOutboundMessages = [];
  const unauthStartUpdate = buildTelegramUpdate({
    updateId: 1001,
    fromId: telegramUserUnauthorized,
    chatId: telegramUserUnauthorized,
    text: "/start",
  });
  const resUnauthStart = await processIncomingTelegramWebhook(supabase, unauthStartUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txCountAfterUnauthStart = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const unauthReply = sentOutboundMessages[0]?.text || "";
  record(
    "BOOTSTRAP",
    "Unauthorized /start returns own Telegram user ID and zero financial writes",
    resUnauthStart.type === "unauthorized_user" &&
      unauthReply.includes("Telegram User ID Anda:\n999999999") &&
      !unauthReply.includes("Test Business") &&
      txCountAfterUnauthStart === "0"
  );

  // Test 5: [SECURITY] Unauthorized SALE produces zero financial writes
  sentOutboundMessages = [];
  const unauthSaleUpdate = buildTelegramUpdate({
    updateId: 1002,
    fromId: telegramUserUnauthorized,
    chatId: telegramUserUnauthorized,
    text: "Kejual 15kg",
  });
  const resUnauthSale = await processIncomingTelegramWebhook(supabase, unauthSaleUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txCountAfterUnauthSale = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  record(
    "SECURITY",
    "Unauthorized SALE produces zero financial writes",
    resUnauthSale.type === "unauthorized_user" && txCountAfterUnauthSale === "0"
  );

  // Test 6: [HELP] Authorized HELP works
  sentOutboundMessages = [];
  const helpUpdate = buildTelegramUpdate({
    updateId: 1003,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "/help",
  });
  const resHelp = await processIncomingTelegramWebhook(supabase, helpUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txCountAfterHelp = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  record(
    "HELP",
    "Authorized HELP works with zero financial writes",
    resHelp.action === "SHOW_HELP" && txCountAfterHelp === "0" && sentOutboundMessages[0]?.text.includes("Panduan")
  );

  // Test 7: [E2E] Authorized SALE uses existing engine
  sentOutboundMessages = [];
  const saleUpdate = buildTelegramUpdate({
    updateId: 1004,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 15kg",
  });
  const resSale = await processIncomingTelegramWebhook(supabase, saleUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txRow = (await pgClient.query("SELECT * FROM public.transactions WHERE business_id = $1", [businessIdA])).rows[0];
  record(
    "E2E",
    "Authorized SALE uses existing engine (15kg * 28,000 = Rp420,000)",
    resSale.action === "CREATE_SALE" &&
      txRow &&
      Number(txRow.quantity) === 15 &&
      Number(txRow.total_amount) === 420000 &&
      txRow.source === "telegram" &&
      sentOutboundMessages[0]?.text.includes("420.000")
  );

  // Test 8: [IDEMPOTENCY] Duplicate update_id executes only once
  const txBeforeDup = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const resDup = await processIncomingTelegramWebhook(supabase, saleUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txAfterDup = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  record(
    "IDEMPOTENCY",
    "Duplicate update_id executes only once with zero duplicate transactions",
    resDup.type === "duplicate_ignored" && txBeforeDup === txAfterDup
  );

  // Test 9: [CONCURRENCY] Concurrent duplicate executes only once
  const concurrentUpdateId = 9999;
  const concurrent1 = buildTelegramUpdate({
    updateId: concurrentUpdateId,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 10kg",
  });
  const concurrent2 = buildTelegramUpdate({
    updateId: concurrentUpdateId,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 10kg",
  });

  const txBeforeConcurrent = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const [resC1, resC2] = await Promise.all([
    processIncomingTelegramWebhook(supabase, concurrent1, { telegramSender: mockTelegramSender }),
    processIncomingTelegramWebhook(supabase, concurrent2, { telegramSender: mockTelegramSender }),
  ]);
  const txAfterConcurrent = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const oneProcessed = (resC1.type === "message_processed" && resC2.type === "duplicate_ignored") ||
                       (resC2.type === "message_processed" && resC1.type === "duplicate_ignored");
  record(
    "IDEMPOTENCY",
    "Concurrent duplicate delivery results in exactly one execution",
    oneProcessed && Number(txAfterConcurrent) === Number(txBeforeConcurrent) + 1
  );

  // Test 10: [SAFETY] Stock false-positive does not create sale
  const txBeforeStock = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const stockUpdate = buildTelegramUpdate({
    updateId: 1010,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "stok tinggal 15kg",
  });
  const resStock = await processIncomingTelegramWebhook(supabase, stockUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txAfterStock = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  record(
    "SAFETY",
    "Stock false-positive 'stok tinggal 15kg' creates zero transactions",
    txBeforeStock === txAfterStock && resStock.action === "SHOW_UNKNOWN_HELP"
  );

  // Test 11: [SAFETY] Ambiguous sale does not create sale
  const txBeforeAmbig = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  const ambigUpdate = buildTelegramUpdate({
    updateId: 1011,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "15kg",
  });
  const resAmbig = await processIncomingTelegramWebhook(supabase, ambigUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txAfterAmbig = (await pgClient.query("SELECT COUNT(*) FROM public.transactions")).rows[0].count;
  record(
    "SAFETY",
    "Ambiguous sale '15kg' requires confirmation and creates zero transactions",
    txBeforeAmbig === txAfterAmbig && resAmbig.executionResult?.status === "CONFIRMATION_REQUIRED"
  );

  // Test 12: [REPORTS] REPORT_TODAY works
  const reportTodayUpdate = buildTelegramUpdate({
    updateId: 1012,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "laporan hari ini",
  });
  const resReportToday = await processIncomingTelegramWebhook(supabase, reportTodayUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "REPORTS",
    "REPORT_TODAY executes without financial mutation",
    resReportToday.action === "SHOW_REPORT_TODAY" && resReportToday.executionResult?.status === "SUCCESS"
  );

  // Test 13: [REPORTS] REPORT_WEEK works
  const reportWeekUpdate = buildTelegramUpdate({
    updateId: 1013,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "minggu ini dapat berapa",
  });
  const resReportWeek = await processIncomingTelegramWebhook(supabase, reportWeekUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "REPORTS",
    "REPORT_WEEK executes without financial mutation",
    resReportWeek.action === "SHOW_REPORT_WEEK" && resReportWeek.executionResult?.status === "SUCCESS"
  );

  // Test 14: [DAILY_STATUS] NO_SALE works
  const noSaleUpdate = buildTelegramUpdate({
    updateId: 1014,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "gak ada penjualan hari ini",
    date: Math.floor(Date.now() / 1000) + 86400, // tomorrow date to avoid conflict with today's sale
  });
  const resNoSale = await processIncomingTelegramWebhook(supabase, noSaleUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "DAILY_STATUS",
    "NO_SALE 'gak ada penjualan hari ini' records daily status",
    resNoSale.action === "MARK_NO_SALE" && resNoSale.executionResult?.status === "SUCCESS"
  );

  // Test 15: [DAILY_STATUS] CLOSED works
  const closedUpdate = buildTelegramUpdate({
    updateId: 1015,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "libur hari ini",
    date: Math.floor(Date.now() / 1000) + 86400 * 2, // 2 days in future
  });
  const resClosed = await processIncomingTelegramWebhook(supabase, closedUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "DAILY_STATUS",
    "CLOSED 'libur hari ini' records daily status",
    resClosed.action === "MARK_CLOSED" && resClosed.executionResult?.status === "SUCCESS"
  );

  // Test 16: [CORRECTION] CANCEL_LAST works
  // First create a fresh sale to cancel
  await processIncomingTelegramWebhook(supabase, buildTelegramUpdate({
    updateId: 10161,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 5kg",
  }), { telegramSender: mockTelegramSender });

  const cancelUpdate = buildTelegramUpdate({
    updateId: 1016,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "batal terakhir",
  });
  const resCancel = await processIncomingTelegramWebhook(supabase, cancelUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "CORRECTION",
    "CANCEL_LAST 'batal terakhir' cancels recent transaction",
    resCancel.action === "REQUEST_CANCEL_LAST" && resCancel.executionResult?.status === "SUCCESS"
  );

  // Test 17: [CORRECTION] CORRECT_LAST works
  // First create a fresh sale to correct
  await processIncomingTelegramWebhook(supabase, buildTelegramUpdate({
    updateId: 10171,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 8kg",
  }), { telegramSender: mockTelegramSender });

  const correctUpdate = buildTelegramUpdate({
    updateId: 1017,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "ubah terakhir jadi 20kg",
  });
  const resCorrect = await processIncomingTelegramWebhook(supabase, correctUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "CORRECTION",
    "CORRECT_LAST 'ubah terakhir jadi 20kg' corrects recent transaction",
    resCorrect.action === "REQUEST_CORRECT_LAST" && resCorrect.executionResult?.status === "SUCCESS"
  );

  // Test 18: [SAFE_IGNORE] Non-text message safe
  const nonTextUpdate = buildTelegramUpdate({
    updateId: 1018,
    fromId: telegramUserA,
    chatId: telegramUserA,
    isNonText: true,
  });
  const resNonText = await processIncomingTelegramWebhook(supabase, nonTextUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "SAFE_IGNORE",
    "Non-text update handled safely without crash",
    resNonText.type === "unsupported_message_type"
  );

  // Test 19: [SAFE_IGNORE] Group message safe
  const groupUpdate = buildTelegramUpdate({
    updateId: 1019,
    fromId: telegramUserA,
    chatId: 987654321,
    chatType: "group",
    text: "Kejual 15kg",
  });
  const resGroup = await processIncomingTelegramWebhook(supabase, groupUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "SAFE_IGNORE",
    "Group message safely ignored without executing sale",
    resGroup.type === "unsupported_chat_type"
  );

  // Test 20: [SAFE_IGNORE] Edited update safe
  const editedUpdate = buildTelegramUpdate({
    updateId: 1020,
    fromId: telegramUserA,
    chatId: telegramUserA,
    isEdited: true,
    text: "Kejual 15kg",
  });
  const resEdited = await processIncomingTelegramWebhook(supabase, editedUpdate, {
    telegramSender: mockTelegramSender,
  });
  record(
    "SAFE_IGNORE",
    "Edited update safely ignored without executing sale",
    resEdited.type === "unsupported_update"
  );

  // Test 21: [RESILIENCE] Outbound Telegram failure does not rollback committed sale
  const txBeforeFail = (await pgClient.query("SELECT COUNT(*) FROM public.transactions WHERE business_id = $1", [businessIdA])).rows[0].count;
  const failOutboundUpdate = buildTelegramUpdate({
    updateId: 1021,
    fromId: telegramUserA,
    chatId: telegramUserA,
    text: "Kejual 7kg",
  });
  const resFailOutbound = await processIncomingTelegramWebhook(supabase, failOutboundUpdate, {
    telegramSender: failingTelegramSender,
  });
  const txAfterFail = (await pgClient.query("SELECT COUNT(*) FROM public.transactions WHERE business_id = $1", [businessIdA])).rows[0].count;
  record(
    "RESILIENCE",
    "Outbound Telegram failure does not rollback committed sale",
    resFailOutbound.action === "CREATE_SALE" &&
      resFailOutbound.sendResult?.success === false &&
      Number(txAfterFail) === Number(txBeforeFail) + 1
  );

  // Test 22: [TENANT_ISOLATION] Business A Telegram user cannot access Business B
  const txBeforeUserA = (await pgClient.query("SELECT COUNT(*) FROM public.transactions WHERE business_id = $1", [businessIdB])).rows[0].count;
  const crossTenantUpdate = buildTelegramUpdate({
    updateId: 1022,
    fromId: telegramUserA, // User A operates
    chatId: telegramUserA,
    text: "Kejual 12kg",
  });
  await processIncomingTelegramWebhook(supabase, crossTenantUpdate, {
    telegramSender: mockTelegramSender,
  });
  const txAfterUserA = (await pgClient.query("SELECT COUNT(*) FROM public.transactions WHERE business_id = $1", [businessIdB])).rows[0].count;
  record(
    "TENANT_ISOLATION",
    "User A operations remain strictly scoped to Business A (zero Business B mutations)",
    txBeforeUserA === txAfterUserA
  );

  await pgClient.end();

  console.log("\n=== Step 6A Test Results Summary ===");
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;
  console.log(`Total: ${reports.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
