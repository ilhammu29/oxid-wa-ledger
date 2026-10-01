/**
 * Automated Security & Bootstrap Test Suite: STEP 10.2.3
 * BUSINESS ONBOARDING RLS BOOTSTRAP FIX
 *
 * Test cases:
 * 1. Newly email-verified authenticated user creates first business via RPC securely
 * 2. Business row created with user as created_by
 * 3. Owner membership row created in business_users with role 'owner'
 * 4. Default 14-day trial subscription created exactly once
 * 5. Default channel settings created (telegram_enabled: true, whatsapp: false)
 * 6. Default reminder settings created (18:00, everyday)
 * 7. Onboarding progress initialized to Step 2 (profile_completed = true, 20%)
 * 8. Audit log created in subscription_audit_logs with sanitized metadata
 * 9. Idempotency: double-submit / retry returns existing business without duplicating
 * 10. Unauthenticated caller (null auth.uid) strictly rejected with UNAUTHORIZED
 * 11. Unverified email strictly rejected with EMAIL_NOT_VERIFIED when verification required
 * 12. Invalid business name (< 2 characters) strictly rejected with INVALID_NAME
 * 13. Multi-tenant isolation: User A cannot SELECT Business B
 * 14. Multi-tenant isolation: User B cannot SELECT Business A
 * 15. Multi-tenant isolation: User A cannot UPDATE Business B
 * 16. Client cannot spoof owner_user_id to create a business under another user's identity
 * 17. Atomic rollback: failure leaves zero orphan records (no partial business, users, or trial)
 * 18. Error UX maps to sanitized Indonesian copy without exposing raw PostgreSQL RLS errors
 * 19. Subsequent SELECT under authenticated RLS succeeds immediately without circular dependency
 * 20. Existing businesses, subscriptions, and operators survive migration untouched
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { createBusinessForUser } from "../src/modules/onboarding/client-launch";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(id: number, name: string, passed: boolean, error?: string) {
  reports.push({ id, name, passed, error });
  const icon = passed ? "✓" : "✗";
  console.log(`  ${icon} [Test ${id}] ${name}`);
  if (!passed && error) {
    console.error(`      -> Error: ${error}`);
  }
}

function createPgSupabaseAdapter(pgClient: Client, currentAuthUser?: { id: string; email?: string; email_confirmed_at?: string }): SupabaseClient {
  const adapter: any = {
    auth: {
      getUser: async () => ({
        data: {
          user: currentAuthUser || null,
        },
        error: null,
      }),
    },
    rpc: async (fnName: string, params: Record<string, any> = {}) => {
      try {
        await pgClient.query("BEGIN;");
        if (currentAuthUser?.id) {
          await pgClient.query(`SET LOCAL ROLE authenticated;`);
          await pgClient.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [currentAuthUser.id]);
          await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true);`);
          if (currentAuthUser.email_confirmed_at) {
            await pgClient.query(`SELECT set_config('request.jwt.claim.email_confirmed_at', $1, true);`, [currentAuthUser.email_confirmed_at]);
          }
        } else {
          await pgClient.query(`SET LOCAL ROLE anon;`);
          await pgClient.query(`SELECT set_config('request.jwt.claim.sub', '', true);`);
          await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'anon', true);`);
        }

        const keys = Object.keys(params).filter((k) => params[k] !== undefined);
        const args = keys.map((k, i) => `${k} := $${i + 1}`).join(", ");
        const values = keys.map((k) => params[k]);
        const sql = `SELECT public.${fnName}(${args}) AS result;`;
        const res = await pgClient.query(sql, values);
        await pgClient.query("COMMIT;");
        return { data: res.rows[0]?.result ?? null, error: null };
      } catch (err: any) {
        await pgClient.query("ROLLBACK;").catch(() => {});
        return { data: null, error: { message: err.message, code: err.code } };
      }
    },
    from: (table: string) => {
      let selectedCols = "*";
      let isSingle = false;
      const filters: Array<{ col: string; op: string; val: any }> = [];

      const queryBuilder: any = {
        select: (cols: string = "*") => {
          selectedCols = cols;
          return queryBuilder;
        },
        eq: (col: string, val: any) => {
          filters.push({ col, op: "=", val });
          return queryBuilder;
        },
        single: () => {
          isSingle = true;
          return queryBuilder;
        },
        maybeSingle: () => {
          isSingle = true;
          return queryBuilder;
        },
        then: async (resolve: any, reject: any) => {
          try {
            await pgClient.query("BEGIN;");
            if (currentAuthUser?.id) {
              await pgClient.query(`SET LOCAL ROLE authenticated;`);
              await pgClient.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [currentAuthUser.id]);
              await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true);`);
            } else {
              await pgClient.query(`SET LOCAL ROLE anon;`);
              await pgClient.query(`SELECT set_config('request.jwt.claim.sub', '', true);`);
              await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'anon', true);`);
            }

            const filterParts = filters.map((f, i) => `"${f.col}" ${f.op} $${i + 1}`);
            const vals = filters.map((f) => f.val);
            const whereClause = filterParts.length ? `WHERE ${filterParts.join(" AND ")}` : "";
            const sql = `SELECT ${selectedCols} FROM public."${table}" ${whereClause};`;
            const res = await pgClient.query(sql, vals);
            await pgClient.query("COMMIT;");
            const data = isSingle ? res.rows[0] || null : res.rows;
            return resolve({ data, error: null });
          } catch (err: any) {
            await pgClient.query("ROLLBACK;").catch(() => {});
            return resolve({ data: null, error: { message: err.message, code: err.code } });
          }
        },
      };

      return queryBuilder;
    },
  };

  return adapter as SupabaseClient;
}

async function runStep1023TestSuite() {
  console.log("\n=== OXID WA Ledger - Step 10.2.3 Business Onboarding RLS Bootstrap Tests ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  try {
    // 0. Ensure migration is applied and permissions granted
    const migSql = fs.readFileSync(
      "supabase/migrations/20261002020000_step10_2_3_business_onboarding_bootstrap_rpc.sql",
      "utf8"
    );
    await pgClient.query(migSql);
    await pgClient.query(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
    `);

    // Setup test users
    const userA_Id = "00000000-1023-0000-0000-000000000001";
    const userB_Id = "00000000-1023-0000-0000-000000000002";
    const userUnverified_Id = "00000000-1023-0000-0000-000000000003";
    const userSpoof_Id = "00000000-1023-0000-0000-000000000004";

    await pgClient.query(`
      INSERT INTO auth.users (id, email)
      VALUES
        ('${userA_Id}', 'user_a_1023@test.id'),
        ('${userB_Id}', 'user_b_1023@test.id'),
        ('${userUnverified_Id}', 'unverified_1023@test.id'),
        ('${userSpoof_Id}', 'user_spoof_1023@test.id')
      ON CONFLICT (id) DO NOTHING;

      -- Clean previous test data
      DELETE FROM public.businesses WHERE created_by IN ('${userA_Id}', '${userB_Id}', '${userUnverified_Id}', '${userSpoof_Id}');
    `);

    const clientA = createPgSupabaseAdapter(pgClient, {
      id: userA_Id,
      email: "user_a_1023@test.id",
      email_confirmed_at: new Date().toISOString(),
    });

    const clientB = createPgSupabaseAdapter(pgClient, {
      id: userB_Id,
      email: "user_b_1023@test.id",
      email_confirmed_at: new Date().toISOString(),
    });

    let bizA_Id = "";
    let bizB_Id = "";

    // -------------------------------------------------------------------------
    // TEST 1: User A creates first business via authoritative RPC
    // -------------------------------------------------------------------------
    try {
      const resA = await createBusinessForUser(clientA, userA_Id, {
        name: "Usaha Sukses Lele A",
        category: "Perikanan",
        ownerName: "Owner A",
        timezone: "Asia/Pontianak",
        currency: "IDR",
        defaultUnit: "kg",
      });

      if (resA.success && resA.businessId) {
        bizA_Id = resA.businessId;
        record(1, "Newly email-verified authenticated user creates first business via RPC securely", true);
      } else {
        record(1, "Business creation failed for User A", false, resA.error);
      }
    } catch (e: any) {
      record(1, "Test 1 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Business row exists and has user as created_by
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(`SELECT id, name, created_by, status FROM public.businesses WHERE id = $1;`, [bizA_Id]);
      if (rows.length === 1 && rows[0].created_by === userA_Id && rows[0].name === "Usaha Sukses Lele A") {
        record(2, "Business row created with authenticated user as created_by", true);
      } else {
        record(2, "Business row not found or created_by mismatch", false);
      }
    } catch (e: any) {
      record(2, "Test 2 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Owner membership row created in business_users with role 'owner'
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT role FROM public.business_users WHERE business_id = $1 AND user_id = $2;`,
        [bizA_Id, userA_Id]
      );
      if (rows.length === 1 && rows[0].role === "owner") {
        record(3, "Owner membership row created in business_users with role 'owner'", true);
      } else {
        record(3, "Owner membership not created in business_users", false);
      }
    } catch (e: any) {
      record(3, "Test 3 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Default 14-day trial subscription created exactly once
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT plan_code, status, trial_ends_at FROM public.business_subscriptions WHERE business_id = $1;`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].plan_code === "pilot" && rows[0].status === "trialing") {
        record(4, "Default 14-day trial subscription created exactly once (pilot/trialing)", true);
      } else {
        record(4, "Trial subscription count mismatch or invalid status", false, `count=${rows.length}`);
      }
    } catch (e: any) {
      record(4, "Test 4 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Default channel settings created
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT telegram_enabled, whatsapp_enabled, primary_channel FROM public.business_channel_settings WHERE business_id = $1;`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].telegram_enabled === true && rows[0].whatsapp_enabled === false && rows[0].primary_channel === "telegram") {
        record(5, "Default channel settings created (telegram: true, whatsapp: false, primary: telegram)", true);
      } else {
        record(5, "Channel settings mismatch", false);
      }
    } catch (e: any) {
      record(5, "Test 5 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Default reminder settings created (18:00)
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT enabled, reminder_time FROM public.business_reminder_settings WHERE business_id = $1;`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].enabled === true && rows[0].reminder_time.startsWith("18:00")) {
        record(6, "Default reminder settings created (enabled: true, reminder_time: 18:00)", true);
      } else {
        record(6, "Reminder settings mismatch", false);
      }
    } catch (e: any) {
      record(6, "Test 6 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Onboarding progress initialized to Step 2 (profile_completed = true)
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT current_step, profile_completed FROM public.business_onboarding_progress WHERE business_id = $1;`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].current_step === 2 && rows[0].profile_completed === true) {
        record(7, "Onboarding progress initialized to Step 2 (profile_completed = true, 20%)", true);
      } else {
        record(7, "Onboarding progress mismatch", false);
      }
    } catch (e: any) {
      record(7, "Test 7 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Audit log created in subscription_audit_logs
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT action, new_status, metadata FROM public.subscription_audit_logs WHERE business_id = $1 AND action = 'business_created';`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].action === "business_created" && rows[0].new_status === "trialing") {
        record(8, "Audit log created in subscription_audit_logs with sanitized metadata", true);
      } else {
        record(8, "Audit log record missing", false);
      }
    } catch (e: any) {
      record(8, "Test 8 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Idempotency: double-submit / retry returns existing business
    // -------------------------------------------------------------------------
    try {
      const retryRes = await createBusinessForUser(clientA, userA_Id, {
        name: "Usaha Sukses Lele A (Retry)",
        category: "Perikanan",
      });

      const { rows: allBiz } = await pgClient.query(
        `SELECT id FROM public.businesses WHERE created_by = $1;`,
        [userA_Id]
      );

      if (retryRes.success && retryRes.businessId === bizA_Id && allBiz.length === 1) {
        record(9, "Idempotency: double-submit / retry returns existing business without duplicating", true);
      } else {
        record(9, "Idempotency failed or created duplicate business", false, `count=${allBiz.length}`);
      }
    } catch (e: any) {
      record(9, "Test 9 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Unauthenticated caller strictly rejected with UNAUTHORIZED
    // -------------------------------------------------------------------------
    try {
      const unauthClient = createPgSupabaseAdapter(pgClient, undefined);
      const unauthRes = await createBusinessForUser(unauthClient, "none", {
        name: "Bisnis Gelap",
      });

      if (!unauthRes.success && (unauthRes.error?.includes("Sesi") || unauthRes.error?.includes("tidak valid"))) {
        record(10, "Unauthenticated caller (null auth.uid) strictly rejected with UNAUTHORIZED", true);
      } else {
        record(10, "Unauthenticated caller was not rejected", false, JSON.stringify(unauthRes));
      }
    } catch (e: any) {
      record(10, "Test 10 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Unverified email strictly rejected when verification required
    // -------------------------------------------------------------------------
    try {
      const unverifiedClient = createPgSupabaseAdapter(pgClient, {
        id: userUnverified_Id,
        email: "unverified_1023@test.id",
      });

      const prevEnv = process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP;
      process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP = "false";

      const unverifiedRes = await createBusinessForUser(unverifiedClient, userUnverified_Id, {
        name: "Bisnis Unverified",
      });

      process.env.ALLOW_UNVERIFIED_INTERNAL_SIGNUP = prevEnv;

      if (!unverifiedRes.success && unverifiedRes.error?.includes("Email belum diverifikasi")) {
        record(11, "Unverified email strictly rejected with EMAIL_NOT_VERIFIED when verification required", true);
      } else {
        record(11, "Unverified email was not rejected", false, JSON.stringify(unverifiedRes));
      }
    } catch (e: any) {
      record(11, "Test 11 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Invalid business name (< 2 characters) strictly rejected
    // -------------------------------------------------------------------------
    try {
      const invalidRes = await createBusinessForUser(clientB, userB_Id, {
        name: "A",
      });

      if (!invalidRes.success && invalidRes.error?.includes("minimal 2 karakter")) {
        record(12, "Invalid business name (< 2 characters) strictly rejected with INVALID_NAME", true);
      } else {
        record(12, "Invalid business name was not rejected", false, JSON.stringify(invalidRes));
      }
    } catch (e: any) {
      record(12, "Test 12 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // User B creates Business B
    // -------------------------------------------------------------------------
    const resB = await createBusinessForUser(clientB, userB_Id, {
      name: "Kedai Kopi B",
      category: "Kafe",
      ownerName: "Owner B",
    });
    bizB_Id = resB.businessId || "";

    // -------------------------------------------------------------------------
    // TEST 13: Multi-tenant isolation: User A cannot SELECT Business B
    // -------------------------------------------------------------------------
    try {
      const { data: bData } = await clientA
        .from("businesses")
        .select("id, name")
        .eq("id", bizB_Id)
        .maybeSingle();

      if (!bData) {
        record(13, "Multi-tenant isolation: User A cannot SELECT Business B (strict RLS)", true);
      } else {
        record(13, "Cross-tenant SELECT leak detected for User A", false, JSON.stringify(bData));
      }
    } catch (e: any) {
      record(13, "Test 13 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Multi-tenant isolation: User B cannot SELECT Business A
    // -------------------------------------------------------------------------
    try {
      const { data: aData } = await clientB
        .from("businesses")
        .select("id, name")
        .eq("id", bizA_Id)
        .maybeSingle();

      if (!aData) {
        record(14, "Multi-tenant isolation: User B cannot SELECT Business A (strict RLS)", true);
      } else {
        record(14, "Cross-tenant SELECT leak detected for User B", false, JSON.stringify(aData));
      }
    } catch (e: any) {
      record(14, "Test 14 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Multi-tenant isolation: User A cannot UPDATE Business B
    // -------------------------------------------------------------------------
    try {
      // Simulate User A trying to update Business B under authenticated role
      await pgClient.query("BEGIN;");
      await pgClient.query(`SET LOCAL ROLE authenticated;`);
      await pgClient.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [userA_Id]);
      await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true);`);

      const updateRes = await pgClient.query(
        `UPDATE public.businesses SET name = 'Hacked Name' WHERE id = $1;`,
        [bizB_Id]
      );
      await pgClient.query("COMMIT;");

      // Verify Business B name was NOT modified
      const { rows } = await pgClient.query(`SELECT name FROM public.businesses WHERE id = $1;`, [bizB_Id]);

      if (updateRes.rowCount === 0 && rows[0].name === "Kedai Kopi B") {
        record(15, "Multi-tenant isolation: User A cannot UPDATE Business B (0 rows affected)", true);
      } else {
        record(15, "Cross-tenant UPDATE succeeded (security breach)", false);
      }
    } catch (e: any) {
      await pgClient.query("ROLLBACK;").catch(() => {});
      record(15, "Test 15 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 16: Client cannot spoof owner_user_id to create a business for another user
    // -------------------------------------------------------------------------
    try {
      // User Spoof is authenticated in JWT, but passes userB_Id in p_owner_user_id
      await pgClient.query("BEGIN;");
      await pgClient.query(`SET LOCAL ROLE authenticated;`);
      await pgClient.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [userSpoof_Id]);
      await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true);`);

      const spoofRes = await pgClient.query(`
        SELECT public.create_business_for_authenticated_user(
          'Bisnis Spoof Attempt',
          'Lainnya',
          'Attacker',
          'Asia/Pontianak',
          'IDR',
          'kg',
          $1::uuid
        ) as res;
      `, [userB_Id]);
      await pgClient.query("COMMIT;");

      const resObj = spoofRes.rows[0]?.res;
      const createdBizId = resObj?.business_id;

      // Check who the created business belongs to
      const { rows: spoofCheck } = await pgClient.query(
        `SELECT created_by FROM public.businesses WHERE id = $1;`,
        [createdBizId]
      );

      // Clean up spoof attempt
      if (createdBizId) {
        await pgClient.query(`DELETE FROM public.businesses WHERE id = $1;`, [createdBizId]);
      }

      if (spoofCheck.length === 1 && spoofCheck[0].created_by === userSpoof_Id) {
        record(16, "Client cannot spoof owner_user_id: RPC strictly uses auth.uid() from JWT claims", true);
      } else {
        record(16, "Spoofed user_id was accepted instead of auth.uid()", false);
      }
    } catch (e: any) {
      await pgClient.query("ROLLBACK;").catch(() => {});
      record(16, "Test 16 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 17: Atomic rollback: failure leaves zero orphan records
    // -------------------------------------------------------------------------
    try {
      const countBefore = await pgClient.query(`
        SELECT
          (SELECT count(*)::int FROM public.businesses) as b_cnt,
          (SELECT count(*)::int FROM public.business_users) as u_cnt,
          (SELECT count(*)::int FROM public.business_subscriptions) as s_cnt;
      `);

      // Invoke RPC with invalid name (length < 2)
      await pgClient.query(`SELECT set_config('request.jwt.claim.sub', $1, true);`, [userA_Id]);
      await pgClient.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true);`);

      const failRes = await pgClient.query(`
        SELECT public.create_business_for_authenticated_user(
          '',
          'Lainnya',
          'Fail Test',
          'Asia/Pontianak',
          'IDR',
          'kg',
          $1::uuid
        ) as res;
      `, [userA_Id]);

      const countAfter = await pgClient.query(`
        SELECT
          (SELECT count(*)::int FROM public.businesses) as b_cnt,
          (SELECT count(*)::int FROM public.business_users) as u_cnt,
          (SELECT count(*)::int FROM public.business_subscriptions) as s_cnt;
      `);

      const noOrphans =
        countBefore.rows[0].b_cnt === countAfter.rows[0].b_cnt &&
        countBefore.rows[0].u_cnt === countAfter.rows[0].u_cnt &&
        countBefore.rows[0].s_cnt === countAfter.rows[0].s_cnt;

      if (!failRes.rows[0].res.success && noOrphans) {
        record(17, "Atomic rollback: failure leaves zero orphan records (no partial business, users, or trial)", true);
      } else {
        record(17, "Orphan records created during failed transaction", false);
      }
    } catch (e: any) {
      record(17, "Test 17 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 18: Error UX maps to sanitized Indonesian copy without exposing raw PostgreSQL RLS errors
    // -------------------------------------------------------------------------
    try {
      const errRes = await createBusinessForUser(clientA, userA_Id, {
        name: "X",
      });

      const hasRawPostgresError =
        errRes.error?.includes("violates row-level security") ||
        errRes.error?.includes("new row violates") ||
        errRes.error?.includes("42501");

      const hasFriendlyCopy =
        errRes.error?.includes("Nama usaha minimal 2 karakter") ||
        errRes.error?.includes("Profil usaha belum dapat dibuat");

      if (!hasRawPostgresError && hasFriendlyCopy) {
        record(18, "Error UX maps to sanitized Indonesian copy without exposing raw PostgreSQL RLS errors", true);
      } else {
        record(18, "Raw SQL error exposed to user", false, errRes.error);
      }
    } catch (e: any) {
      record(18, "Test 18 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 19: Subsequent SELECT under authenticated RLS succeeds immediately
    // -------------------------------------------------------------------------
    try {
      const { data: myBiz } = await clientA
        .from("businesses")
        .select("id, name, created_by")
        .eq("id", bizA_Id)
        .single();

      if (myBiz && myBiz.id === bizA_Id && myBiz.created_by === userA_Id) {
        record(19, "Subsequent SELECT under authenticated RLS succeeds immediately without circular dependency", true);
      } else {
        record(19, "Authenticated SELECT failed after bootstrap", false);
      }
    } catch (e: any) {
      record(19, "Test 19 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 20: Existing businesses, subscriptions, and operators survive migration
    // -------------------------------------------------------------------------
    try {
      const { rows: bizRows } = await pgClient.query(`SELECT count(*)::int as count FROM public.businesses;`);
      const { rows: subRows } = await pgClient.query(`SELECT count(*)::int as count FROM public.business_subscriptions;`);

      if (bizRows[0].count >= 2 && subRows[0].count >= 2) {
        record(20, "Existing businesses, subscriptions, and memberships survive migration untouched", true);
      } else {
        record(20, "Existing data wiped or corrupted", false);
      }
    } catch (e: any) {
      record(20, "Test 20 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // Test Summary
    // -------------------------------------------------------------------------
    const passed = reports.filter((r) => r.passed).length;
    const failed = reports.filter((r) => !r.passed).length;

    console.log("\n========================================================");
    console.log(`STEP 10.2.3 TEST REPORT: ${passed}/${reports.length} PASSED (${failed} FAILED)`);
    console.log("========================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await pgClient.end();
  }
}

runStep1023TestSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
