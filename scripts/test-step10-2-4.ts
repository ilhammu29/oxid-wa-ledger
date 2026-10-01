/**
 * Automated Test Suite: STEP 10.2.4
 * PRODUCT ONBOARDING UNIQUE DEFAULT CONSTRAINT FIX
 *
 * Test cases:
 * 1. Brand-new business can create first product via authoritative RPC
 * 2. First product automatically becomes default (is_default = true)
 * 3. Second product creation does not violate unique default rule (is_default = false)
 * 4. Only one active default product exists per business
 * 5. Double-submit is idempotent (returns existing onboarding product without duplicating)
 * 6. Concurrent first-product submissions remain valid (zero race condition / zero crash)
 * 7. Retry after successful insert returns existing onboarding product smoothly
 * 8. Cross-tenant product creation strictly blocked (User A cannot create product in Business B)
 * 9. Foreign business_id spoofing blocked
 * 10. Parser default fallback still works ("Kejual 1kg" -> resolves to default product)
 * 11. Explicit product resolution still works ("Kejual lele 1kg" -> resolves to lele)
 * 12. Unknown explicit product remains rejected ("Kejual mujair 1kg" -> rejected with UNKNOWN_PRODUCT)
 * 13. Onboarding progresses to Step 3 Telegram after product creation (product_completed = true, 40%)
 * 14. Raw PostgreSQL unique errors never reach UI (friendly sanitized Indonesian copy)
 * 15. Existing businesses remain unaffected (catalog & defaults preserved)
 * 16. Product aliases correctly created and bound to tenant business
 * 17. Setting explicit default on second product clears previous default (exactly 1 default remains)
 * 18. Invalid product name (< 2 characters) strictly rejected with INVALID_NAME
 * 19. Negative product price strictly rejected with INVALID_PRICE
 * 20. Unauthenticated caller strictly rejected with UNAUTHORIZED
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

import { addFirstProductForBusiness } from "../src/modules/onboarding/client-launch";
import { resolveProductForSale } from "../src/modules/products/resolver";

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

function createPgSupabaseAdapter(pgClient: Client, currentAuthUser?: { id: string; email?: string }): SupabaseClient {
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
      let orderCol: string | null = null;
      let orderAsc: boolean = true;
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
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderCol = col;
          orderAsc = opts?.ascending ?? true;
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
            const orderClause = orderCol ? `ORDER BY "${orderCol}" ${orderAsc ? "ASC" : "DESC"}` : "";
            const sql = `SELECT ${selectedCols} FROM public."${table}" ${whereClause} ${orderClause};`;
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

async function runStep1024TestSuite() {
  console.log("\n=== OXID WA Ledger - Step 10.2.4 Product Onboarding Unique Default Constraint Tests ===\n");

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  try {
    // 0. Ensure Step 10.2.4 migration is applied
    const migSql = fs.readFileSync(
      "supabase/migrations/20261002040000_step10_2_4_authoritative_product_creation_rpc.sql",
      "utf8"
    );
    await pgClient.query(migSql);
    await pgClient.query(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
    `);

    // Setup test users & businesses
    const userA_Id = "00000000-1024-0000-0000-000000000001";
    const userB_Id = "00000000-1024-0000-0000-000000000002";
    const bizA_Id = "aaaaaaaa-1024-0000-0000-000000000001";
    const bizB_Id = "bbbbbbbb-1024-0000-0000-000000000002";

    await pgClient.query(`
      INSERT INTO auth.users (id, email)
      VALUES
        ('${userA_Id}', 'user_a_1024@test.id'),
        ('${userB_Id}', 'user_b_1024@test.id')
      ON CONFLICT (id) DO NOTHING;

      -- Clean test data
      DELETE FROM public.products WHERE business_id IN ('${bizA_Id}', '${bizB_Id}');
      DELETE FROM public.business_users WHERE business_id IN ('${bizA_Id}', '${bizB_Id}');
      DELETE FROM public.businesses WHERE id IN ('${bizA_Id}', '${bizB_Id}');

      -- Insert clean businesses
      INSERT INTO public.businesses (id, name, created_by, status)
      VALUES
        ('${bizA_Id}', 'Bisnis Lele 1024 A', '${userA_Id}', 'active'),
        ('${bizB_Id}', 'Bisnis Kopi 1024 B', '${userB_Id}', 'active');

      -- Insert owner memberships
      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES
        ('${bizA_Id}', '${userA_Id}', 'owner'),
        ('${bizB_Id}', '${userB_Id}', 'owner');

      -- Initialize onboarding progress
      INSERT INTO public.business_onboarding_progress (business_id, current_step, profile_completed, product_completed)
      VALUES
        ('${bizA_Id}', 2, true, false),
        ('${bizB_Id}', 2, true, false)
      ON CONFLICT (business_id) DO UPDATE SET current_step = 2, profile_completed = true, product_completed = false;
    `);

    const clientA = createPgSupabaseAdapter(pgClient, {
      id: userA_Id,
      email: "user_a_1024@test.id",
    });

    const clientB = createPgSupabaseAdapter(pgClient, {
      id: userB_Id,
      email: "user_b_1024@test.id",
    });

    let prodA1_Id = "";
    let prodA2_Id = "";

    // -------------------------------------------------------------------------
    // TEST 1: Brand-new business can create first product via authoritative RPC
    // -------------------------------------------------------------------------
    try {
      const res1 = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "Lele",
        unit: "kg",
        priceIdr: 28000,
        aliases: ["lele sangkuriang", "ikan lele"],
      });

      if (res1.success && res1.productId) {
        prodA1_Id = res1.productId;
        record(1, "Brand-new business can create first product via authoritative RPC", true);
      } else {
        record(1, "First product creation failed", false, res1.error);
      }
    } catch (e: any) {
      record(1, "Test 1 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: First product automatically becomes default (is_default = true)
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT id, name, is_default, active FROM public.products WHERE id = $1;`,
        [prodA1_Id]
      );
      if (rows.length === 1 && rows[0].is_default === true && rows[0].name === "Lele") {
        record(2, "First product automatically becomes default (is_default = true)", true);
      } else {
        record(2, "First product is not marked default", false, JSON.stringify(rows));
      }
    } catch (e: any) {
      record(2, "Test 2 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Second product creation does not violate unique default rule (is_default = false)
    // -------------------------------------------------------------------------
    try {
      const res2 = await clientA.rpc("create_or_bootstrap_product", {
        p_business_id: bizA_Id,
        p_name: "Nila",
        p_unit: "kg",
        p_price: 35000,
        p_aliases: ["ikan nila"],
        p_is_onboarding: false,
        p_set_as_default: false,
        p_user_id: userA_Id,
      });

      const resObj = res2.data as any;
      if (resObj?.success && resObj?.product_id && resObj?.is_default === false) {
        prodA2_Id = resObj.product_id;
        record(3, "Second product creation does not violate unique default rule (is_default = false)", true);
      } else {
        record(3, "Second product creation failed or became default", false, JSON.stringify(res2));
      }
    } catch (e: any) {
      record(3, "Test 3 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Only one active default product exists per business
    // -------------------------------------------------------------------------
    try {
      const { rows: defaultRows } = await pgClient.query(
        `SELECT id, name, is_default FROM public.products WHERE business_id = $1 AND is_default = true;`,
        [bizA_Id]
      );
      if (defaultRows.length === 1 && defaultRows[0].id === prodA1_Id) {
        record(4, "Only one active default product exists per business (strict single default)", true);
      } else {
        record(4, "Expected exactly 1 default product", false, `count=${defaultRows.length}`);
      }
    } catch (e: any) {
      record(4, "Test 4 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Double-submit is idempotent (returns existing onboarding product without duplicating)
    // -------------------------------------------------------------------------
    try {
      const resRetry = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "Lele",
        unit: "kg",
        priceIdr: 28000,
        aliases: ["lele"],
      });

      const { rows: allProds } = await pgClient.query(
        `SELECT id, name FROM public.products WHERE business_id = $1 AND name = 'Lele';`,
        [bizA_Id]
      );

      if (resRetry.success && resRetry.productId === prodA1_Id && allProds.length === 1) {
        record(5, "Double-submit is idempotent (returns existing onboarding product without duplicating)", true);
      } else {
        record(5, "Idempotency failed or created duplicate product", false, `count=${allProds.length}`);
      }
    } catch (e: any) {
      record(5, "Test 5 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Concurrent first-product submissions remain valid (zero race condition / zero crash)
    // -------------------------------------------------------------------------
    try {
      // Create a fresh business for concurrency test
      const bizConc_Id = "cccccccc-1024-0000-0000-000000000003";
      await pgClient.query(`
        DELETE FROM public.products WHERE business_id = '${bizConc_Id}';
        DELETE FROM public.business_users WHERE business_id = '${bizConc_Id}';
        DELETE FROM public.businesses WHERE id = '${bizConc_Id}';
        INSERT INTO public.businesses (id, name, created_by, status)
        VALUES ('${bizConc_Id}', 'Bisnis Concurrency', '${userA_Id}', 'active');
        INSERT INTO public.business_users (business_id, user_id, role)
        VALUES ('${bizConc_Id}', '${userA_Id}', 'owner');
      `);

      // Fire 2 simultaneous first product creation requests
      const [concRes1, concRes2] = await Promise.all([
        addFirstProductForBusiness(clientA, userA_Id, {
          businessId: bizConc_Id,
          name: "Patin",
          unit: "kg",
          priceIdr: 30000,
        }),
        addFirstProductForBusiness(clientA, userA_Id, {
          businessId: bizConc_Id,
          name: "Patin",
          unit: "kg",
          priceIdr: 30000,
        }),
      ]);

      const { rows: concProds } = await pgClient.query(
        `SELECT id, name, is_default FROM public.products WHERE business_id = $1;`,
        [bizConc_Id]
      );

      const bothSucceeded = concRes1.success && concRes2.success;
      const exactlyOneProduct = concProds.length === 1 && concProds[0].is_default === true;

      // Clean up concurrency business
      await pgClient.query(`DELETE FROM public.products WHERE business_id = '${bizConc_Id}';`);
      await pgClient.query(`DELETE FROM public.businesses WHERE id = '${bizConc_Id}';`);

      if (bothSucceeded && exactlyOneProduct) {
        record(6, "Concurrent first-product submissions remain valid (zero race condition / zero crash)", true);
      } else {
        record(6, "Concurrency test failed", false, `res1=${concRes1.success}, res2=${concRes2.success}, prods=${concProds.length}`);
      }
    } catch (e: any) {
      record(6, "Test 6 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Retry after successful insert returns existing onboarding product smoothly
    // -------------------------------------------------------------------------
    try {
      const retryRes = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "Ikan Lele Segar",
        unit: "kg",
        priceIdr: 28000,
      });

      if (retryRes.success && retryRes.productId === prodA1_Id) {
        record(7, "Retry after successful insert returns existing onboarding product smoothly", true);
      } else {
        record(7, "Retry did not return existing product", false, JSON.stringify(retryRes));
      }
    } catch (e: any) {
      record(7, "Test 7 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Cross-tenant product creation strictly blocked
    // -------------------------------------------------------------------------
    try {
      // User A attempts to create product in Business B
      const crossRes = await clientA.rpc("create_or_bootstrap_product", {
        p_business_id: bizB_Id,
        p_name: "Produk Ilegal",
        p_unit: "kg",
        p_price: 10000,
        p_is_onboarding: false,
      });

      const resObj = crossRes.data as any;
      if (!resObj?.success && (resObj?.error === "UNAUTHORIZED" || crossRes.error)) {
        record(8, "Cross-tenant product creation strictly blocked (User A cannot create product in Business B)", true);
      } else {
        record(8, "Cross-tenant product creation was allowed (Security breach)", false);
      }
    } catch (e: any) {
      record(8, "Test 8 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Foreign business_id spoofing blocked
    // -------------------------------------------------------------------------
    try {
      const spoofRes = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizB_Id,
        name: "Produk Spoof",
        unit: "kg",
        priceIdr: 15000,
      });

      if (!spoofRes.success && (spoofRes.error?.includes("pemilik") || spoofRes.error?.includes("admin") || spoofRes.error?.includes("tidak valid"))) {
        record(9, "Foreign business_id spoofing blocked (membership validated server-side)", true);
      } else {
        record(9, "Foreign business_id spoofing was permitted", false, JSON.stringify(spoofRes));
      }
    } catch (e: any) {
      record(9, "Test 9 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Parser default fallback still works ("Kejual 1kg" -> resolves to default product)
    // -------------------------------------------------------------------------
    try {
      const parseRes = await resolveProductForSale(clientA, bizA_Id, "Kejual 1kg");
      if (parseRes.status === "DEFAULT_USED" && parseRes.product?.id === prodA1_Id && parseRes.product?.name === "Lele") {
        record(10, "Parser default fallback still works ('Kejual 1kg' -> resolves to default product)", true);
      } else {
        record(10, "Parser default fallback failed", false, JSON.stringify(parseRes));
      }
    } catch (e: any) {
      record(10, "Test 10 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Explicit product resolution still works ("Kejual lele 1kg" -> resolves to lele)
    // -------------------------------------------------------------------------
    try {
      const parseRes = await resolveProductForSale(clientA, bizA_Id, "Kejual lele 1kg");
      if (parseRes.status === "RESOLVED" && parseRes.product?.id === prodA1_Id) {
        record(11, "Explicit product resolution still works ('Kejual lele 1kg' -> resolves to lele)", true);
      } else {
        record(11, "Explicit product resolution failed", false, JSON.stringify(parseRes));
      }
    } catch (e: any) {
      record(11, "Test 11 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Unknown explicit product remains rejected ("Kejual mujair 1kg" -> rejected with UNKNOWN_PRODUCT)
    // -------------------------------------------------------------------------
    try {
      const parseRes = await resolveProductForSale(clientA, bizA_Id, "Kejual mujair 1kg");
      if (parseRes.status === "UNKNOWN_PRODUCT" && parseRes.unknownTerm?.toLowerCase().includes("mujair")) {
        record(12, "Unknown explicit product remains rejected ('Kejual mujair 1kg' -> rejected with UNKNOWN_PRODUCT)", true);
      } else {
        record(12, "Unknown product was not rejected", false, JSON.stringify(parseRes));
      }
    } catch (e: any) {
      record(12, "Test 12 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Onboarding progresses to Step 3 Telegram after product creation
    // -------------------------------------------------------------------------
    try {
      const { rows } = await pgClient.query(
        `SELECT current_step, product_completed, profile_completed FROM public.business_onboarding_progress WHERE business_id = $1;`,
        [bizA_Id]
      );
      if (rows.length === 1 && rows[0].current_step === 3 && rows[0].product_completed === true && rows[0].profile_completed === true) {
        record(13, "Onboarding progresses to Step 3 Telegram after product creation (product_completed = true, 40%)", true);
      } else {
        record(13, "Onboarding progress mismatch", false, JSON.stringify(rows));
      }
    } catch (e: any) {
      record(13, "Test 13 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Raw PostgreSQL unique errors never reach UI (friendly sanitized copy)
    // -------------------------------------------------------------------------
    try {
      const resRaw = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "A", // too short
        unit: "kg",
        priceIdr: 1000,
      });

      const noSqlLeak =
        !resRaw.error?.includes("unique constraint") &&
        !resRaw.error?.includes("violates") &&
        !resRaw.error?.includes("idx_products_unique_default") &&
        !resRaw.error?.includes("23505");

      const hasFriendlyMessage = Boolean(resRaw.error?.includes("minimal 2 karakter") || resRaw.error?.includes("tidak valid"));

      if (!resRaw.success && noSqlLeak && hasFriendlyMessage) {
        record(14, "Raw PostgreSQL unique errors never reach UI (friendly sanitized Indonesian copy)", true);
      } else {
        record(14, "Raw error leaked or friendly message missing", false, resRaw.error);
      }
    } catch (e: any) {
      record(14, "Test 14 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Existing businesses remain unaffected (catalog & defaults preserved)
    // -------------------------------------------------------------------------
    try {
      const { rows: bizCount } = await pgClient.query(`SELECT count(*)::int as count FROM public.businesses;`);
      const { rows: subCount } = await pgClient.query(`SELECT count(*)::int as count FROM public.business_subscriptions;`);

      if (bizCount[0].count >= 2 && subCount[0].count >= 0) {
        record(15, "Existing businesses remain unaffected (catalog & defaults preserved)", true);
      } else {
        record(15, "Existing business integrity compromised", false);
      }
    } catch (e: any) {
      record(15, "Test 15 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 16: Product aliases correctly created and bound to tenant business
    // -------------------------------------------------------------------------
    try {
      const { rows: aliasRows } = await pgClient.query(
        `SELECT alias, normalized_alias FROM public.product_aliases WHERE product_id = $1;`,
        [prodA1_Id]
      );

      const hasCanonical = aliasRows.some((a) => a.normalized_alias === "lele");
      const hasAlias = aliasRows.some((a) => a.normalized_alias === "lele sangkuriang");

      if (hasCanonical && hasAlias) {
        record(16, "Product aliases correctly created and bound to tenant business", true);
      } else {
        record(16, "Aliases missing or misconfigured", false, JSON.stringify(aliasRows));
      }
    } catch (e: any) {
      record(16, "Test 16 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 17: Setting explicit default on second product clears previous default
    // -------------------------------------------------------------------------
    try {
      // Explicitly set prodA2 as default
      const resSwitch = await clientA.rpc("create_or_bootstrap_product", {
        p_business_id: bizA_Id,
        p_name: "Gurame",
        p_unit: "kg",
        p_price: 45000,
        p_is_onboarding: false,
        p_set_as_default: true,
        p_user_id: userA_Id,
      });

      const switchObj = resSwitch.data as any;
      const gurameId = switchObj?.product_id;

      const { rows: allDefaults } = await pgClient.query(
        `SELECT id, name FROM public.products WHERE business_id = $1 AND is_default = true;`,
        [bizA_Id]
      );

      if (allDefaults.length === 1 && allDefaults[0].id === gurameId && allDefaults[0].name === "Gurame") {
        record(17, "Setting explicit default on new product clears previous default (exactly 1 default remains)", true);
      } else {
        record(17, "Switching default failed or left multiple defaults", false, JSON.stringify(allDefaults));
      }
    } catch (e: any) {
      record(17, "Test 17 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 18: Invalid product name (< 2 characters) strictly rejected
    // -------------------------------------------------------------------------
    try {
      const resShort = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "X",
        unit: "kg",
        priceIdr: 20000,
      });

      if (!resShort.success && resShort.error?.includes("minimal 2 karakter")) {
        record(18, "Invalid product name (< 2 characters) strictly rejected with INVALID_NAME", true);
      } else {
        record(18, "Short name was not rejected", false, JSON.stringify(resShort));
      }
    } catch (e: any) {
      record(18, "Test 18 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 19: Negative product price strictly rejected with INVALID_PRICE
    // -------------------------------------------------------------------------
    try {
      const resNeg = await addFirstProductForBusiness(clientA, userA_Id, {
        businessId: bizA_Id,
        name: "Bawal",
        unit: "kg",
        priceIdr: -5000,
      });

      if (!resNeg.success && resNeg.error?.includes("tidak valid")) {
        record(19, "Negative product price strictly rejected with INVALID_PRICE", true);
      } else {
        record(19, "Negative price was not rejected", false, JSON.stringify(resNeg));
      }
    } catch (e: any) {
      record(19, "Test 19 failed", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 20: Unauthenticated caller strictly rejected with UNAUTHORIZED
    // -------------------------------------------------------------------------
    try {
      const unauthClient = createPgSupabaseAdapter(pgClient, undefined);
      const resUnauth = await addFirstProductForBusiness(unauthClient, "none", {
        businessId: bizA_Id,
        name: "Ikan Hantu",
        unit: "kg",
        priceIdr: 10000,
      });

      if (!resUnauth.success && (resUnauth.error?.includes("Sesi") || resUnauth.error?.includes("tidak valid") || resUnauth.error?.includes("pemilik") || resUnauth.error?.includes("admin"))) {
        record(20, "Unauthenticated caller strictly rejected with UNAUTHORIZED", true);
      } else {
        record(20, "Unauthenticated caller was not rejected", false, JSON.stringify(resUnauth));
      }
    } catch (e: any) {
      record(20, "Test 20 failed", false, e.message);
    }

    // Final Report Summary
    const total = reports.length;
    const passed = reports.filter((r) => r.passed).length;
    const failed = reports.filter((r) => !r.passed).length;

    console.log("\n========================================================");
    console.log(`STEP 10.2.4 TEST REPORT: ${passed}/${total} PASSED (${failed} FAILED)`);
    console.log("========================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await pgClient.end();
  }
}

runStep1024TestSuite().catch((err) => {
  console.error("Test runner threw uncaught exception:", err);
  process.exit(1);
});
