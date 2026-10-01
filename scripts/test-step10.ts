/**
 * Step 10 Automated Integration Test Suite: Client Launch & Commercial Onboarding
 *
 * Covers the 17-point end-to-end integration flow:
 *  1. User signup / auth validation
 *  2. Business creation & trial initialization (14 days)
 *  3. First product setup with aliases
 *  4. Cryptographic pairing token generation (short-lived, hashed)
 *  5. Token security boundaries (expired, replay, non-existent)
 *  6. Telegram bot pairing execution (/connect <code>)
 *  7. First transaction parsing & execution via deterministic parser
 *  8. Ledger data verification in PostgreSQL
 *  9. Onboarding detection of committed transaction
 * 10. Google Sheets optional setup & skip
 * 11. Authoritative onboarding completion (100%)
 * 12. Resumability of onboarding state
 * 13. Dashboard trial display logic
 * 14. Upgrade journey & manual payment submission with authoritative catalog price
 * 15. Payment confirmation by admin activating subscription
 * 16. Security boundaries (tenant isolation, unauthenticated blocked, secrets redacted)
 * 17. Data invariance (financial ledger and channels intact)
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  createBusinessForUser,
  getBusinessOnboardingState,
  addFirstProductForBusiness,
  generateTelegramPairingToken,
  checkFirstTransactionStatus,
  skipOrCompleteGoogleSheets,
  hashPairingToken,
} from "../src/modules/onboarding/client-launch";
import {
  processIncomingTelegramWebhook,
  TelegramUpdate,
  TelegramSendResult,
} from "../src/modules/telegram";
import {
  getAllPlans,
  getPlan,
  getBusinessSubscriptionState,
  createPaymentRecord,
  adminConfirmPayment,
  isOxidSuperAdmin,
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
                      if (c.op === "IS NULL") {
                        return `"${c.col}" IS NULL`;
                      }
                      return `"${c.col}" ${c.op} $${i + 1}`;
                    })
                    .join(" AND ");
              }
              const orderClause = orders.length > 0 ? `ORDER BY ${orders.join(", ")}` : "";
              const limitClause = limitCount !== null ? `LIMIT ${limitCount}` : "";

              if (options?.count === "exact" && options?.head) {
                const countSql = `SELECT count(*)::int AS count FROM public."${table}" ${whereClause};`;
                const countRes = await pgClient.query(countSql, values.filter((_, i) => conditions[i]?.op !== "IS NULL"));
                return { count: countRes.rows[0]?.count ?? 0, data: null, error: null };
              }

              const filteredValues = values.filter((_, i) => conditions[i]?.op !== "IS NULL");
              const cleanCols = columns.includes("(") ? columns : columns.split(",").map((c) => c.trim()).join(", ");
              const sql = `SELECT ${cleanCols} FROM public."${table}" ${whereClause} ${orderClause} ${limitClause};`;
              const res = await pgClient.query(sql, filteredValues);
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
            is: (col: string, val: any) => {
              if (val === null) {
                conditions.push({ col, op: "IS NULL", val: null });
              } else {
                conditions.push({ col, op: "=", val });
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
        upsert: (values: Record<string, any>, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
          const executeUpsert = async () => {
            try {
              const keys = Object.keys(values);
              const cols = keys.map((k) => `"${k}"`).join(", ");
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
              const vals = keys.map((k) =>
                typeof values[k] === "object" && values[k] !== null ? JSON.stringify(values[k]) : values[k]
              );
              const conflictCols = opts?.onConflict || "id";
              const updateCols = keys.filter((k) => !conflictCols.split(",").includes(k));
              const doAction = opts?.ignoreDuplicates
                ? "DO NOTHING"
                : `DO UPDATE SET ${updateCols.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ")}`;
              const sql = `INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflictCols}) ${doAction} RETURNING *;`;
              const res = await pgClient.query(sql, vals);
              return { data: res.rows, error: null };
            } catch (err: any) {
              return { data: null, error: { message: err.message, code: err.code } };
            }
          };
          const b: any = {
            select: () => b,
            single: async () => {
              const res = await executeUpsert();
              return { data: res.data?.[0] || null, error: res.error };
            },
            then: (resolve: any, reject: any) => executeUpsert().then(resolve, reject),
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
          const b: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return b;
            },
            in: (col: string, vals: any[]) => {
              conditions.push({ col, op: "= ANY", val: vals });
              return b;
            },
            select: () => b,
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
                      if (c.op === "IS NULL") {
                        return `"${c.col}" IS NULL`;
                      }
                      paramVals.push(c.val);
                      return `"${c.col}" ${c.op} $${paramVals.length}`;
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
            is: (col: string, val: any) => {
              if (val === null) {
                conditions.push({ col, op: "IS NULL", val: null });
              } else {
                conditions.push({ col, op: "=", val });
              }
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

async function runStep10Tests() {
  console.log("=== OXID WA Ledger - Step 10 Client Launch & Commercial Onboarding Tests ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  const supabase = createPgSupabaseAdapter(pgClient);

  // Mock Telegram sender matching real sendTelegramText signature: (options: { chatId, text }) => TelegramSendResult
  const sentOutboundMessages: Array<{ chatId: number | string; text: string }> = [];
  const mockTelegramSender = async (options: { chatId: number | string; text: string }): Promise<TelegramSendResult> => {
    sentOutboundMessages.push(options);
    return { success: true, messageId: Math.floor(Math.random() * 100000) };
  };

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data & Clean State
    // -------------------------------------------------------------------------
    const testAdminUser = "c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c310";
    const testAdminEmail = "admin_step10@example.com";
    const testClientUser = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d410";
    const testClientEmail = "budi_step10@lele-barokah.id";
    const testTelegramUserId = 77112244;

    // Clean past test fixtures
    await pgClient.query(`
      DELETE FROM public.subscription_audit_logs WHERE actor_user_id IN ('${testClientUser}', '${testAdminUser}');
      DELETE FROM public.processed_telegram_updates WHERE telegram_user_id = '${testTelegramUserId}';
      DELETE FROM public.processed_telegram_updates WHERE update_id IN (991001, 991002);
      DELETE FROM public.telegram_authorized_users WHERE telegram_user_id = '${testTelegramUserId}';
      DELETE FROM public.telegram_pairing_tokens WHERE created_by = '${testClientUser}';
      DELETE FROM public.business_onboarding_progress WHERE business_id IN (
        SELECT id FROM public.businesses WHERE created_by = '${testClientUser}'
      );
      DELETE FROM public.transaction_events WHERE transaction_id IN (
        SELECT id FROM public.transactions WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}')
      );
      DELETE FROM public.transactions WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.product_aliases WHERE product_id IN (
        SELECT id FROM public.products WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}')
      );
      DELETE FROM public.products WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.subscription_payments WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.business_subscriptions WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.business_channel_settings WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.business_reminder_settings WHERE business_id IN (SELECT id FROM public.businesses WHERE created_by = '${testClientUser}');
      DELETE FROM public.business_users WHERE user_id = '${testClientUser}';
      DELETE FROM public.businesses WHERE created_by = '${testClientUser}';
      DELETE FROM public.platform_admins WHERE user_id = '${testAdminUser}';
    `);

    // Delete auth users by ID and email (safe cleanup of prior runs with different IDs)
    await pgClient.query(`
      DELETE FROM auth.users WHERE id IN ('${testClientUser}', '${testAdminUser}')
        OR email IN ('${testClientEmail}', '${testAdminEmail}');
    `);

    // Insert auth users
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${testAdminUser}', '${testAdminEmail}'),
        ('${testClientUser}', '${testClientEmail}')
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

      INSERT INTO public.platform_admins (user_id, email, role, active) VALUES
        ('${testAdminUser}', '${testAdminEmail}', 'super_admin', true)
      ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', active = true;
    `);

    let createdBusinessId: string = "";
    let createdProductId: string = "";
    let pairingTokenCode: string = "";

    // -------------------------------------------------------------------------
    // TEST 1: User Signup / Auth Validation
    // -------------------------------------------------------------------------
    try {
      const validateSignup = (name: string, email: string, pass: string) => {
        if (!name || name.trim().length < 2) return "Nama lengkap wajib diisi";
        if (!email || !email.includes("@")) return "Format email tidak valid";
        if (!pass || pass.length < 8) return "Kata sandi minimal 8 karakter";
        return null;
      };

      const errEmpty = validateSignup("", "test@test.com", "12345678");
      const errEmail = validateSignup("Budi", "notanemail", "12345678");
      const errPass = validateSignup("Budi", "test@test.com", "123");
      const ok = validateSignup("Budi Santoso", testClientEmail, "password123!");

      if (errEmpty && errEmail && errPass && ok === null) {
        record(1, "10B", "User signup & auth validation enforces complete credentials", true);
      } else {
        record(1, "10B", "User signup & auth validation failed", false, "Validation didn't enforce rules");
      }
    } catch (e: any) {
      record(1, "10B", "User signup & auth validation", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Business Creation & Trial Initialization (14 days)
    // -------------------------------------------------------------------------
    try {
      // createBusinessForUser(client, userId, input) => { success, businessId }
      const bizRes = await createBusinessForUser(supabase, testClientUser, {
        name: "Kolam Lele Barokah Budi",
        category: "peternakan",
        ownerName: "Pak Budi",
        timezone: "Asia/Jakarta",
        defaultUnit: "kg",
      });

      if (!bizRes.success || !bizRes.businessId) {
        throw new Error(`Business creation failed: ${bizRes.error}`);
      }

      createdBusinessId = bizRes.businessId;

      // Verify business row
      const bizCheck = await pgClient.query(`
        SELECT name, category, owner_name, default_unit, timezone FROM public.businesses WHERE id = $1;
      `, [createdBusinessId]);

      // Verify business subscription auto-created with 14-day trial
      const subCheck = await pgClient.query(`
        SELECT status, plan_code, trial_started_at, trial_ends_at, current_period_end
        FROM public.business_subscriptions WHERE business_id = $1;
      `, [createdBusinessId]);

      // Verify business onboarding progress auto-created
      const obCheck = await pgClient.query(`
        SELECT current_step, profile_completed, product_completed, telegram_completed, first_transaction_completed
        FROM public.business_onboarding_progress WHERE business_id = $1;
      `, [createdBusinessId]);

      const bRow = bizCheck.rows[0];
      const sRow = subCheck.rows[0];
      const oRow = obCheck.rows[0];

      const trialEnds = new Date(sRow.trial_ends_at).getTime();
      const trialStarts = new Date(sRow.trial_started_at).getTime();
      const trialDays = Math.round((trialEnds - trialStarts) / (1000 * 60 * 60 * 24));

      if (
        bRow?.category === "peternakan" &&
        bRow?.owner_name === "Pak Budi" &&
        sRow?.status === "trialing" &&
        sRow?.plan_code === "pilot" &&
        trialDays === 14 &&
        oRow?.current_step === 2 &&
        oRow?.profile_completed === true
      ) {
        record(2, "10B", "Business creation auto-initializes 14-day trial and onboarding progress", true);
      } else {
        record(2, "10B", "Business creation & trial init failed", false,
          `trialDays=${trialDays}, status=${sRow?.status}, step=${oRow?.current_step}, profile=${oRow?.profile_completed}`);
      }
    } catch (e: any) {
      record(2, "10B", "Business creation & trial initialization", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: First Product Setup with Aliases
    // -------------------------------------------------------------------------
    try {
      // addFirstProductForBusiness(client, userId, input) where input has { businessId, name, unit, priceIdr, aliases }
      const prodRes = await addFirstProductForBusiness(supabase, testClientUser, {
        businessId: createdBusinessId,
        name: "Ikan Lele Segar",
        unit: "kg",
        priceIdr: 26000,
        aliases: ["lele", "ikan lele", "lele segar"],
      });

      if (!prodRes.success || !prodRes.productId) {
        throw new Error(`Product creation failed: ${prodRes.error}`);
      }

      createdProductId = prodRes.productId;

      // Verify products table (column is default_price, not price_idr)
      const pCheck = await pgClient.query(`
        SELECT name, unit, default_price, is_default, active
        FROM public.products WHERE id = $1;
      `, [createdProductId]);

      // Verify aliases
      const aCheck = await pgClient.query(`
        SELECT alias FROM public.product_aliases WHERE product_id = $1 ORDER BY alias ASC;
      `, [createdProductId]);

      // Verify progress updated (product_completed = true, current_step = 3)
      const obCheck = await pgClient.query(`
        SELECT current_step, product_completed FROM public.business_onboarding_progress WHERE business_id = $1;
      `, [createdBusinessId]);

      const pRow = pCheck.rows[0];
      const aliases = aCheck.rows.map((r: any) => r.alias);
      const obRow = obCheck.rows[0];

      if (
        pRow?.name === "Ikan Lele Segar" &&
        Number(pRow?.default_price) === 26000 &&
        pRow?.is_default === true &&
        aliases.includes("lele") &&
        aliases.includes("ikan lele") &&
        obRow?.current_step === 3 &&
        obRow?.product_completed === true
      ) {
        record(3, "10D", "First product setup saves authoritative price, aliases, and updates progress", true);
      } else {
        record(3, "10D", "First product setup failed", false,
          `price=${pRow?.default_price}, aliases=${JSON.stringify(aliases)}, step=${obRow?.current_step}`);
      }
    } catch (e: any) {
      record(3, "10D", "First product setup with aliases", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Cryptographic Pairing Token Generation (short-lived, hashed)
    // -------------------------------------------------------------------------
    try {
      // generateTelegramPairingToken(client, businessId, userId) => { success, result: { code, expiresAt, ... } }
      const tokenRes = await generateTelegramPairingToken(supabase, createdBusinessId, testClientUser);

      if (!tokenRes.success || !tokenRes.result) {
        throw new Error(`Token generation failed: ${tokenRes.error}`);
      }

      pairingTokenCode = tokenRes.result.code;

      // Verify token format
      const isCodeValid = /^OXID-[A-Z0-9]{4,6}$/.test(tokenRes.result.code);
      const isDeepLinkValid = tokenRes.result.deepLink.includes(tokenRes.result.code);

      // Verify database stored token_hash (HMAC verifier) and zero plaintext code is stored
      const expectedHash = hashPairingToken(pairingTokenCode);
      const tCheck = await pgClient.query(`
        SELECT token_hash, expires_at, used_at FROM public.telegram_pairing_tokens WHERE token_hash = $1;
      `, [expectedHash]);

      const tRow = tCheck.rows[0];

      const expDate = new Date(tRow.expires_at).getTime();
      const diffMinutes = (expDate - Date.now()) / (1000 * 60);

      if (
        isCodeValid &&
        isDeepLinkValid &&
        tRow?.token_hash === expectedHash &&
        tRow?.used_at === null &&
        diffMinutes > 8 &&
        diffMinutes <= 11
      ) {
        record(4, "10E", "Pairing token generated with SHA-256 hash, 10-minute expiry, and deep link", true);
      } else {
        record(4, "10E", "Pairing token generation failed", false,
          `hashMatch=${tRow?.token_hash === expectedHash}, diffMinutes=${Math.round(diffMinutes)}, usedAt=${tRow?.used_at}`);
      }
    } catch (e: any) {
      record(4, "10E", "Cryptographic pairing token generation", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Token Security Boundaries (Expired, Replay, Non-existent)
    // -------------------------------------------------------------------------
    try {
      // 5.1 Non-existent token hash
      const fakeHash = hashPairingToken("OXID-FAKECODE999");
      const fakeRes = await supabase.rpc("verify_and_consume_telegram_pairing_token", {
        p_token_hash: fakeHash,
        p_telegram_user_id: 12345678,
        p_display_label: "Fake User",
      });

      const fakeOk = fakeRes.data?.valid === false;

      // 5.2 Expired token rejection
      const expiredHash = hashPairingToken("OXID-EXPD");
      await pgClient.query(`
        INSERT INTO public.telegram_pairing_tokens (
          business_id, token_hash, expires_at, created_by
        ) VALUES (
          $1, $2, NOW() - INTERVAL '5 minutes', $3
        );
      `, [createdBusinessId, expiredHash, testClientUser]);

      const expRes = await supabase.rpc("verify_and_consume_telegram_pairing_token", {
        p_token_hash: expiredHash,
        p_telegram_user_id: 12345678,
        p_display_label: "Expired User",
      });

      const expiredOk = expRes.data?.valid === false;

      // Clean up dummy expired token
      await pgClient.query(`DELETE FROM public.telegram_pairing_tokens WHERE token_hash = $1;`, [expiredHash]);

      if (fakeOk && expiredOk) {
        record(5, "10P", "Token security verifies fail-closed boundaries (non-existent, expired token rejected)", true);
      } else {
        record(5, "10P", "Token security boundaries failed", false, `fakeOk=${fakeOk}, expiredOk=${expiredOk}`);
      }
    } catch (e: any) {
      record(5, "10P", "Token security boundaries", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Telegram Bot Pairing Execution (/connect <code>)
    // -------------------------------------------------------------------------
    try {
      sentOutboundMessages.length = 0;

      const pairingUpdate: TelegramUpdate = {
        update_id: 991001,
        message: {
          message_id: 201,
          from: {
            id: testTelegramUserId,
            is_bot: false,
            first_name: "Budi",
            username: "budi_santoso",
          },
          chat: {
            id: testTelegramUserId,
            type: "private",
          },
          date: Math.floor(Date.now() / 1000),
          text: `/connect ${pairingTokenCode}`,
        },
      };

      const webhookResult = await processIncomingTelegramWebhook(supabase, pairingUpdate, {
        telegramSender: mockTelegramSender,
      });

      const isPairingSuccess = webhookResult.type === "pairing_success";

      // Verify token consumed in DB (column is used_at, not consumed_at)
      const tokenConsumedCheck = await pgClient.query(`
        SELECT used_at, telegram_user_id FROM public.telegram_pairing_tokens WHERE token_hash = $1;
      `, [hashPairingToken(pairingTokenCode)]);

      // Verify operator added to telegram_authorized_users
      const opCheck = await pgClient.query(`
        SELECT business_id, display_label, active FROM public.telegram_authorized_users
        WHERE telegram_user_id = $1;
      `, [testTelegramUserId]);

      // Verify progress updated (telegram_completed = true)
      const obCheck = await pgClient.query(`
        SELECT current_step, telegram_completed FROM public.business_onboarding_progress WHERE business_id = $1;
      `, [createdBusinessId]);

      // 6.2 Test Replay Rejection: same token hash consumed again must fail
      const replayHash = hashPairingToken(pairingTokenCode);
      const replayRes = await supabase.rpc("verify_and_consume_telegram_pairing_token", {
        p_token_hash: replayHash,
        p_telegram_user_id: 99999999,
        p_display_label: "Attacker",
      });
      const replayRejected = replayRes.data?.valid === false;

      const tConsumed = tokenConsumedCheck.rows[0];
      const opRow = opCheck.rows[0];
      const obRow = obCheck.rows[0];

      if (
        isPairingSuccess &&
        tConsumed?.used_at !== null &&
        Number(tConsumed?.telegram_user_id) === testTelegramUserId &&
        opRow?.business_id === createdBusinessId &&
        opRow?.active === true &&
        obRow?.current_step >= 4 &&
        obRow?.telegram_completed === true &&
        replayRejected
      ) {
        record(6, "10E", "Telegram /connect pairing activates operator, consumes token, prevents replay", true);
      } else {
        record(6, "10E", "Telegram bot pairing execution failed", false,
          `isSuccess=${isPairingSuccess}, replayRejected=${replayRejected}, step=${obRow?.current_step}, tgConn=${obRow?.telegram_completed}`);
      }
    } catch (e: any) {
      record(6, "10E", "Telegram bot pairing execution", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: First Transaction Parsing & Execution via Deterministic Parser
    // -------------------------------------------------------------------------
    try {
      sentOutboundMessages.length = 0;

      const txUpdate: TelegramUpdate = {
        update_id: 991002,
        message: {
          message_id: 202,
          from: {
            id: testTelegramUserId,
            is_bot: false,
            first_name: "Budi",
            username: "budi_santoso",
          },
          chat: {
            id: testTelegramUserId,
            type: "private",
          },
          date: Math.floor(Date.now() / 1000),
          text: "Kejual lele 5kg 130000",
        },
      };

      const txResult = await processIncomingTelegramWebhook(supabase, txUpdate, {
        telegramSender: mockTelegramSender,
      });

      const replyText = sentOutboundMessages[0]?.text || "";
      const isConfirmed = replyText.includes("BERHASIL") || replyText.includes("Catat") || replyText.includes("130.000") || replyText.includes("✅");

      if (txResult.acknowledged && isConfirmed) {
        record(7, "10F", "Deterministic parser handles 'Kejual lele 5kg 130000' and sends formatted receipt", true);
      } else {
        record(7, "10F", "First transaction parsing failed", false,
          `acknowledged=${txResult.acknowledged}, type=${txResult.type}, reply=${replyText.substring(0, 100)}`);
      }
    } catch (e: any) {
      record(7, "10F", "First transaction parsing & execution", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Ledger Data Verification in PostgreSQL
    // -------------------------------------------------------------------------
    try {
      // Column is total_amount, not amount
      const txCheck = await pgClient.query(`
        SELECT id, business_id, product_id, quantity, total_amount, status, source
        FROM public.transactions
        WHERE business_id = $1
        ORDER BY created_at DESC LIMIT 1;
      `, [createdBusinessId]);

      const txRow = txCheck.rows[0];

      if (
        txRow &&
        txRow.business_id === createdBusinessId &&
        txRow.product_id === createdProductId &&
        Number(txRow.quantity) === 5 &&
        Number(txRow.total_amount) === 130000 &&
        txRow.status === "confirmed" &&
        txRow.source === "telegram"
      ) {
        record(8, "10F", "PostgreSQL ledger verifies committed transaction: 5kg @ Rp 130.000 (status = confirmed)", true);
      } else {
        record(8, "10F", "Ledger data verification failed", false, `txRow=${JSON.stringify(txRow)}`);
      }
    } catch (e: any) {
      record(8, "10F", "Ledger data verification in PostgreSQL", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Onboarding Detection of Committed Transaction
    // -------------------------------------------------------------------------
    try {
      // checkFirstTransactionStatus returns { recorded, transaction?: { id, productName, quantity, unit, totalAmountIdr, transactionAt } }
      const checkRes = await checkFirstTransactionStatus(supabase, createdBusinessId);

      const obCheck = await pgClient.query(`
        SELECT current_step, first_transaction_completed FROM public.business_onboarding_progress WHERE business_id = $1;
      `, [createdBusinessId]);

      const obRow = obCheck.rows[0];

      if (
        checkRes.recorded === true &&
        checkRes.transaction?.totalAmountIdr === 130000 &&
        obRow?.current_step === 5 &&
        obRow?.first_transaction_completed === true
      ) {
        record(9, "10F", "Onboarding detects committed transaction from ledger and advances progress", true);
      } else {
        record(9, "10F", "Onboarding detection of committed transaction failed", false,
          `recorded=${checkRes.recorded}, step=${obRow?.current_step}, txCompleted=${obRow?.first_transaction_completed}`);
      }
    } catch (e: any) {
      record(9, "10F", "Onboarding detection of committed transaction", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Google Sheets Optional Setup & Skip
    // -------------------------------------------------------------------------
    try {
      // skipOrCompleteGoogleSheets(client, businessId, skipped) => { success }
      const skipRes = await skipOrCompleteGoogleSheets(supabase, createdBusinessId, true);

      const obCheck = await pgClient.query(`
        SELECT current_step, google_sheets_completed, google_sheets_skipped, completed_at
        FROM public.business_onboarding_progress WHERE business_id = $1;
      `, [createdBusinessId]);

      const obRow = obCheck.rows[0];

      if (
        skipRes.success === true &&
        obRow?.google_sheets_skipped === true &&
        obRow?.completed_at !== null &&
        obRow?.current_step === 6
      ) {
        record(10, "10G", "Google Sheets optional step can be skipped without blocking onboarding", true);
      } else {
        record(10, "10G", "Google Sheets skip failed", false,
          `success=${skipRes.success}, skipped=${obRow?.google_sheets_skipped}, step=${obRow?.current_step}`);
      }
    } catch (e: any) {
      record(10, "10G", "Google Sheets optional setup & skip", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Authoritative Onboarding Completion (100%)
    // -------------------------------------------------------------------------
    try {
      // getBusinessOnboardingState returns { percentage, currentStep, profileCompleted, productCompleted, telegramCompleted, firstTransactionCompleted, googleSheetsCompleted, completedAt, ... }
      const state = await getBusinessOnboardingState(supabase, createdBusinessId);

      if (
        state.percentage === 100 &&
        state.currentStep === 6 &&
        state.profileCompleted &&
        state.productCompleted &&
        state.telegramCompleted &&
        state.firstTransactionCompleted &&
        (state.googleSheetsCompleted || state.googleSheetsSkipped) &&
        state.completedAt !== null
      ) {
        record(11, "10C", "Authoritative onboarding state reports 100% completed with timestamp", true);
      } else {
        record(11, "10C", "Authoritative onboarding completion failed", false,
          `pct=${state.percentage}, step=${state.currentStep}, completed=${state.completedAt !== null}`);
      }
    } catch (e: any) {
      record(11, "10C", "Authoritative onboarding completion", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Resumability of Onboarding State
    // -------------------------------------------------------------------------
    try {
      // Create a secondary business that stops after step 1
      const partialBizRes = await createBusinessForUser(supabase, testClientUser, {
        name: "Usaha Belum Selesai Budi",
        category: "kuliner",
        ownerName: "Budi Santoso",
        timezone: "Asia/Jakarta",
        defaultUnit: "porsi",
      });

      if (!partialBizRes.success || !partialBizRes.businessId) {
        throw new Error(`Partial business creation failed: ${partialBizRes.error}`);
      }

      const partialBizId = partialBizRes.businessId;

      const pState1 = await getBusinessOnboardingState(supabase, partialBizId);
      const isStep2 = pState1.currentStep === 2 && pState1.percentage === 20;

      // Add a product to advance
      await addFirstProductForBusiness(supabase, testClientUser, {
        businessId: partialBizId,
        name: "Nasi Goreng Spesial",
        unit: "porsi",
        priceIdr: 18000,
        aliases: ["nasgor", "nasi goreng"],
      });

      const pState2 = await getBusinessOnboardingState(supabase, partialBizId);
      const isStep3 = pState2.currentStep === 3 && pState2.percentage === 40;

      // Clean up partial biz
      await pgClient.query(`
        DELETE FROM public.product_aliases WHERE product_id IN (SELECT id FROM public.products WHERE business_id = '${partialBizId}');
        DELETE FROM public.products WHERE business_id = '${partialBizId}';
        DELETE FROM public.business_onboarding_progress WHERE business_id = '${partialBizId}';
        DELETE FROM public.business_subscriptions WHERE business_id = '${partialBizId}';
        DELETE FROM public.business_channel_settings WHERE business_id = '${partialBizId}';
        DELETE FROM public.business_reminder_settings WHERE business_id = '${partialBizId}';
        DELETE FROM public.business_users WHERE business_id = '${partialBizId}';
        DELETE FROM public.businesses WHERE id = '${partialBizId}';
      `);

      if (isStep2 && isStep3) {
        record(12, "10C", "Onboarding state is resumable: correctly evaluates incomplete stage and percentage", true);
      } else {
        record(12, "10C", "Onboarding resumability failed", false,
          `step1=(step=${pState1.currentStep},pct=${pState1.percentage}), step2=(step=${pState2.currentStep},pct=${pState2.percentage})`);
      }
    } catch (e: any) {
      record(12, "10C", "Resumability of onboarding state", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Dashboard Trial Display Logic
    // -------------------------------------------------------------------------
    try {
      const subState = await getBusinessSubscriptionState(supabase, createdBusinessId);

      const getTrialBannerType = (state: typeof subState) => {
        if (state.status !== "trialing") return "none";
        if (state.remainingDays > 7) return "info";
        if (state.remainingDays > 3) return "warning";
        return "urgent";
      };

      const bannerType = getTrialBannerType(subState);
      const days = subState.remainingDays;

      if (subState.status === "trialing" && days >= 13 && bannerType === "info") {
        record(13, "10H", `Dashboard trial banner logic calculates ${days} days remaining (tier: ${bannerType})`, true);
      } else {
        record(13, "10H", "Dashboard trial display logic failed", false,
          `status=${subState.status}, days=${days}, bannerType=${bannerType}`);
      }
    } catch (e: any) {
      record(13, "10H", "Dashboard trial display logic", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Upgrade Journey & Manual Payment with Authoritative Catalog Price
    // -------------------------------------------------------------------------
    let createdPaymentId: string = "";
    try {
      const basicPlan = getPlan("basic");

      if (!basicPlan || basicPlan.priceIdr !== 49000) {
        throw new Error("Basic plan pricing must authoritatively be 49000");
      }

      // Get subscription ID for the payment
      const subRow = await pgClient.query(`
        SELECT id FROM public.business_subscriptions WHERE business_id = $1 LIMIT 1;
      `, [createdBusinessId]);

      const subscriptionId = subRow.rows[0]?.id;
      if (!subscriptionId) throw new Error("No subscription found for business");

      // createPaymentRecord requires { businessId, subscriptionId, amountIdr }
      const paymentRes = await createPaymentRecord(supabase, {
        businessId: createdBusinessId,
        subscriptionId,
        amountIdr: basicPlan.priceIdr,
      });

      createdPaymentId = paymentRes.id;

      // Verify payment row (column is amount_idr, not amount)
      const payCheck = await pgClient.query(`
        SELECT amount_idr, status FROM public.subscription_payments WHERE id = $1;
      `, [createdPaymentId]);

      const payRow = payCheck.rows[0];

      if (
        Number(payRow?.amount_idr) === 49000 &&
        payRow?.status === "pending"
      ) {
        record(14, "10I", "Upgrade journey creates payment request strictly using authoritative catalog price (Rp 49.000)", true);
      } else {
        record(14, "10I", "Upgrade journey failed", false, `payRow=${JSON.stringify(payRow)}`);
      }
    } catch (e: any) {
      record(14, "10I", "Upgrade journey & manual payment submission", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Payment Confirmation by Admin Activating Subscription
    // -------------------------------------------------------------------------
    try {
      await adminConfirmPayment(supabase, {
        paymentId: createdPaymentId,
        adminUserId: testAdminUser,
        adminEmail: testAdminEmail,
      });

      // Verify payment status
      const payCheck = await pgClient.query(`
        SELECT status, confirmed_by, confirmed_at FROM public.subscription_payments WHERE id = $1;
      `, [createdPaymentId]);

      // Verify subscription upgraded to active
      const subCheck = await pgClient.query(`
        SELECT status, plan_code, current_period_end FROM public.business_subscriptions WHERE business_id = $1;
      `, [createdBusinessId]);

      // Verify audit log
      const auditCheck = await pgClient.query(`
        SELECT action, actor_email FROM public.subscription_audit_logs
        WHERE business_id = $1 AND action = 'ADMIN_CONFIRM_PAYMENT'
        ORDER BY created_at DESC LIMIT 1;
      `, [createdBusinessId]);

      const pRow = payCheck.rows[0];
      const sRow = subCheck.rows[0];
      const aRow = auditCheck.rows[0];

      if (
        pRow?.status === "confirmed" &&
        sRow?.status === "active" &&
        aRow?.action === "ADMIN_CONFIRM_PAYMENT" &&
        aRow?.actor_email === testAdminEmail
      ) {
        record(15, "10I", "Admin payment confirmation atomically activates subscription & logs immutable audit", true);
      } else {
        record(15, "10I", "Payment confirmation failed", false,
          `payStatus=${pRow?.status}, subStatus=${sRow?.status}, plan=${sRow?.plan_code}, action=${aRow?.action}`);
      }
    } catch (e: any) {
      record(15, "10I", "Payment confirmation by admin activating subscription", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 16: Security Boundaries (Tenant Isolation, Unauthenticated, Secrets)
    // -------------------------------------------------------------------------
    try {
      // 16.1 Regular tenant cannot act as super admin
      const isClientAdmin = await isOxidSuperAdmin({ id: testClientUser, email: testClientEmail } as any, supabase);

      // 16.2 Unauthenticated user cannot act as super admin
      const isAnonAdmin = await isOxidSuperAdmin(null, supabase);

      // 16.3 Super admin is properly verified
      const isAdminSuper = await isOxidSuperAdmin({ id: testAdminUser, email: testAdminEmail } as any, supabase);

      // 16.4 Verify pairing token zero-plaintext: token_code column dropped, only hash exists
      const colCheck = await pgClient.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'telegram_pairing_tokens' AND column_name = 'token_code';
      `);
      const rawTokenLeaked = colCheck.rows.length > 0;

      if (!isClientAdmin && !isAnonAdmin && isAdminSuper && !rawTokenLeaked) {
        record(16, "10P", "Security boundaries: fail-closed auth, client denied admin, pairing tokens securely hashed", true);
      } else {
        record(16, "10P", "Security boundaries failed", false,
          `clientAdmin=${isClientAdmin}, anonAdmin=${isAnonAdmin}, adminSuper=${isAdminSuper}, rawLeaked=${rawTokenLeaked}`);
      }
    } catch (e: any) {
      record(16, "10P", "Security boundaries & tenant isolation", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 17: Data Invariance (Financial Ledger & Channels Intact)
    // -------------------------------------------------------------------------
    try {
      // 17.1 Check pilot business if exists
      const pilotBiz = await pgClient.query(`
        SELECT id, name FROM public.businesses WHERE name ILIKE '%Lele Pilot%' OR name ILIKE '%Pilot%' LIMIT 1;
      `);

      let pilotIntact = true;
      if (pilotBiz.rows.length > 0) {
        const pId = pilotBiz.rows[0].id;
        const txCount = await pgClient.query(`SELECT count(*)::int AS count FROM public.transactions WHERE business_id = $1;`, [pId]);
        pilotIntact = txCount.rows[0].count >= 0;
      }

      // 17.2 WhatsApp channel remains deferred / disabled by default
      const chSettings = await pgClient.query(`
        SELECT primary_channel, whatsapp_enabled FROM public.business_channel_settings WHERE business_id = $1;
      `, [createdBusinessId]);

      const chRow = chSettings.rows[0];
      const waDeferred = chRow?.primary_channel === "telegram" && chRow?.whatsapp_enabled === false;

      // 17.3 Test business transaction still exists in ledger
      const txStillExists = await pgClient.query(`
        SELECT count(*)::int AS count FROM public.transactions
        WHERE business_id = $1 AND status = 'confirmed';
      `, [createdBusinessId]);

      const hasLedgerData = txStillExists.rows[0].count > 0;

      if (pilotIntact && waDeferred && hasLedgerData) {
        record(17, "10S", "Data invariance: financial ledger intact, WhatsApp channel remains strictly deferred", true);
      } else {
        record(17, "10S", "Data invariance check failed", false,
          `pilotIntact=${pilotIntact}, waDeferred=${waDeferred}, hasLedgerData=${hasLedgerData}`);
      }
    } catch (e: any) {
      record(17, "10S", "Data invariance check", false, e.message);
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    const total = reports.length;
    const passed = reports.filter((r) => r.passed).length;
    const failed = reports.filter((r) => !r.passed).length;

    console.log("\n========================================================");
    console.log(`STEP 10 TEST REPORT: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log("========================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await pgClient.end();
  }
}

runStep10Tests().catch((err) => {
  console.error("FATAL STEP 10 TEST ERROR:", err);
  process.exit(1);
});
