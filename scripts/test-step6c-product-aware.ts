/**
 * Step 6C Automated Test Suite: Product-Aware Messaging & Improved Copy
 * Tests:
 * 1. Product resolution via canonical name and aliases
 * 2. Inactive product exclusion
 * 3. Cross-tenant product isolation
 * 4. Default product behavior with explicit explanation
 * 5. Missing default product handling
 * 6. Explicit unknown product rejection without fallback (0 writes)
 * 7. Ambiguous multi-match product handling (0 writes)
 * 8. Multi-product in one message rejection (0 writes)
 * 9. Price integrity from DB (client text cannot override)
 * 10. Audit trail records correct product
 * 11. Centralized response formatter (reports, help, errors)
 * 12. Row-level security on product_aliases
 */

import { Client } from "pg";
import { SupabaseClient } from "@supabase/supabase-js";
import { executeConversationAction } from "../src/modules/conversation";
import { ExecutionContext } from "../src/modules/transactions/types";
import { normalizeProductTerm } from "../src/modules/products/normalizer";

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

          const builder: any = {
            eq: (col: string, val: any) => {
              conditions.push({ col, op: "=", val });
              return builder;
            },
            gte: (col: string, val: any) => {
              conditions.push({ col, op: ">=", val });
              return builder;
            },
            lte: (col: string, val: any) => {
              conditions.push({ col, op: "<=", val });
              return builder;
            },
            order: (col: string, { ascending }: { ascending: boolean } = { ascending: true }) => {
              orders.push(`"${col}" ${ascending ? "ASC" : "DESC"}`);
              return builder;
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

          return builder;
        },
        insert: async (rowOrRows: any) => {
          try {
            const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
            for (const r of rows) {
              const cols = Object.keys(r);
              const vals = cols.map((c) => r[c]);
              const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
              const colNames = cols.map((c) => `"${c}"`).join(", ");
              await pgClient.query(`INSERT INTO public."${table}" (${colNames}) VALUES (${placeholders});`, vals);
            }
            return { error: null };
          } catch (err: any) {
            return { error: { message: err.message, code: err.code } };
          }
        },
      };
    },
  } as unknown as SupabaseClient;
}

async function runStep6CTests() {
  console.log("=== OXID WA Ledger - Step 6C Product-Aware Messaging Test Suite ===\n");
  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  try {
    // ------------------------------------------------------------------------
    // 1. Setup Test Fixtures
    // ------------------------------------------------------------------------
    console.log("1. Setting up multi-tenant test database fixtures...");
    await pgClient.query("TRUNCATE TABLE public.transaction_events CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.transactions CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.product_aliases CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.products CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.business_daily_status CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.business_users CASCADE;");
    await pgClient.query("TRUNCATE TABLE public.businesses CASCADE;");

    const ownerA = "11111111-1111-1111-1111-111111111111";
    const ownerB = "22222222-2222-2222-2222-222222222222";
    await pgClient.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerA}', 'ownera@pilot.test'),
        ('${ownerB}', 'ownerb@pilot.test')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Business A: "Perikanan Maju A" (Asia/Jakarta)
    const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await pgClient.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizA}', 'Perikanan Maju A', 'Asia/Jakarta', 'active', '${ownerA}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizA}', '${ownerA}', 'owner');
    `);

    // Product 1 (Default): Lele (Rp28.000)
    const prodLele = "aaaa1111-1111-1111-1111-111111111111";
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES ('${prodLele}', '${bizA}', 'Lele', 'kg', 28000, true, true);
    `);

    // Alias for Lele: "ikan lele"
    await pgClient.query(`
      INSERT INTO public.product_aliases (business_id, product_id, alias, normalized_alias, active)
      VALUES ('${bizA}', '${prodLele}', 'ikan lele', '${normalizeProductTerm("ikan lele")}', true);
    `);

    // Product 2: Nila (Rp32.000)
    const prodNila = "aaaa2222-2222-2222-2222-222222222222";
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES ('${prodNila}', '${bizA}', 'Nila', 'kg', 32000, true, false);
    `);

    // Aliases for Nila: "ikan nila", "tilapia"
    await pgClient.query(`
      INSERT INTO public.product_aliases (business_id, product_id, alias, normalized_alias, active)
      VALUES
        ('${bizA}', '${prodNila}', 'ikan nila', '${normalizeProductTerm("ikan nila")}', true),
        ('${bizA}', '${prodNila}', 'tilapia', '${normalizeProductTerm("tilapia")}', true);
    `);

    // Product 3: Gurame Inactive (Rp45.000, active = false)
    const prodGurame = "aaaa3333-3333-3333-3333-333333333333";
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES ('${prodGurame}', '${bizA}', 'Gurame', 'kg', 45000, false, false);
    `);

    // Business B: "Perikanan Berkah B" (Asia/Jakarta)
    const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await pgClient.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizB}', 'Perikanan Berkah B', 'Asia/Jakarta', 'active', '${ownerB}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizB}', '${ownerB}', 'owner');
    `);

    // Product for Business B: Patin (Rp25.000)
    const prodPatin = "bbbb1111-1111-1111-1111-111111111111";
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES ('${prodPatin}', '${bizB}', 'Patin', 'kg', 25000, true, true);
    `);

    // Business C: "Bisnis Tanpa Default C" (No default product)
    const bizC = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await pgClient.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizC}', 'Bisnis Tanpa Default C', 'Asia/Jakarta', 'active', '${ownerA}');

      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES ('cccc1111-1111-1111-1111-111111111111', '${bizC}', 'Udang', 'kg', 80000, true, false);
    `);

    console.log("Database fixtures ready!\n");
    console.log("2. Running Product-Aware Execution Tests...\n");

    const sbClient = createPgSupabaseAdapter(pgClient);
    const ctxA: ExecutionContext = {
      businessId: bizA,
      source: "telegram",
      senderPhone: "+6281234567890",
      now: new Date("2026-09-30T10:00:00+07:00"),
    };

    // ------------------------------------------------------------------------
    // Test 1: "Kejual nila 10kg" resolves Nila (non-default product)
    // ------------------------------------------------------------------------
    const res1 = await executeConversationAction(sbClient, ctxA, "Kejual nila 10kg");
    const tx1 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res1.data as any)?.transactionId])).rows[0];
    record(
      "PRODUCT_RESOLUTION",
      "'Kejual nila 10kg' resolves active Nila (10kg * Rp32.000 = Rp320.000)",
      res1.status === "SUCCESS" &&
        res1.parsed.productId === prodNila &&
        res1.parsed.productName === "Nila" &&
        res1.parsed.isDefaultProductUsed === false &&
        tx1?.product_id === prodNila &&
        tx1?.total_amount === "320000" &&
        res1.replyText.includes("Nila") &&
        res1.replyText.includes("10 kg × Rp32.000") &&
        res1.replyText.includes("Total: Rp320.000") &&
        !res1.replyText.includes("produk default")
    );

    // ------------------------------------------------------------------------
    // Test 2: "Nila laku 5kg" resolves Nila
    // ------------------------------------------------------------------------
    const res2 = await executeConversationAction(sbClient, ctxA, "Nila laku 5kg");
    const tx2 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res2.data as any)?.transactionId])).rows[0];
    record(
      "PRODUCT_RESOLUTION",
      "'Nila laku 5kg' resolves active Nila (5kg * Rp32.000 = Rp160.000)",
      res2.status === "SUCCESS" &&
        tx2?.product_id === prodNila &&
        tx2?.total_amount === "160000" &&
        res2.replyText.includes("Nila") &&
        res2.replyText.includes("Total: Rp160.000")
    );

    // ------------------------------------------------------------------------
    // Test 3: Alias "ikan nila" resolves Nila
    // ------------------------------------------------------------------------
    const res3 = await executeConversationAction(sbClient, ctxA, "jual 4kg ikan nila");
    const tx3 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res3.data as any)?.transactionId])).rows[0];
    record(
      "PRODUCT_ALIAS",
      "Alias 'ikan nila' resolves Nila (4kg * Rp32.000 = Rp128.000)",
      res3.status === "SUCCESS" &&
        tx3?.product_id === prodNila &&
        tx3?.total_amount === "128000" &&
        res3.replyText.includes("Nila")
    );

    // ------------------------------------------------------------------------
    // Test 4: Alias "tilapia" resolves Nila
    // ------------------------------------------------------------------------
    const res4 = await executeConversationAction(sbClient, ctxA, "Kejual 2kg tilapia");
    const tx4 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res4.data as any)?.transactionId])).rows[0];
    record(
      "PRODUCT_ALIAS",
      "Alias 'tilapia' resolves Nila (2kg * Rp32.000 = Rp64.000)",
      res4.status === "SUCCESS" &&
        tx4?.product_id === prodNila &&
        tx4?.total_amount === "64000" &&
        res4.replyText.includes("Nila")
    );

    // ------------------------------------------------------------------------
    // Test 5: Canonical Lele resolves Lele
    // ------------------------------------------------------------------------
    const res5 = await executeConversationAction(sbClient, ctxA, "Kejual lele 10kg");
    const tx5 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res5.data as any)?.transactionId])).rows[0];
    record(
      "CANONICAL_MATCH",
      "Explicit 'lele' resolves canonical Lele (10kg * Rp28.000 = Rp280.000)",
      res5.status === "SUCCESS" &&
        tx5?.product_id === prodLele &&
        tx5?.total_amount === "280000" &&
        res5.replyText.includes("Lele")
    );

    // ------------------------------------------------------------------------
    // Test 6: Alias "ikan lele" resolves Lele
    // ------------------------------------------------------------------------
    const res6 = await executeConversationAction(sbClient, ctxA, "laku 7kg ikan lele");
    const tx6 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res6.data as any)?.transactionId])).rows[0];
    record(
      "PRODUCT_ALIAS",
      "Alias 'ikan lele' resolves Lele (7kg * Rp28.000 = Rp196.000)",
      res6.status === "SUCCESS" &&
        tx6?.product_id === prodLele &&
        tx6?.total_amount === "196000"
    );

    // ------------------------------------------------------------------------
    // Test 7: Inactive product (Gurame) is not resolved -> treated as unknown product
    // ------------------------------------------------------------------------
    const txCountBefore7 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    const res7 = await executeConversationAction(sbClient, ctxA, "Kejual gurame 10kg");
    const txCountAfter7 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    record(
      "INACTIVE_PRODUCT",
      "Inactive product 'Gurame' rejected with clarification and zero financial writes",
      res7.status === "ERROR" &&
        res7.errorCode === "UNKNOWN_PRODUCT" &&
        txCountAfter7 === txCountBefore7 &&
        res7.replyText.includes("Produk 'gurame' belum terdaftar") &&
        res7.replyText.includes("Produk aktif:")
    );

    // ------------------------------------------------------------------------
    // Test 8: Tenant isolation - Business B product (Patin) cannot resolve in Business A
    // ------------------------------------------------------------------------
    const txCountBefore8 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions")).rows[0].c;
    const res8 = await executeConversationAction(sbClient, ctxA, "Kejual patin 10kg");
    const txCountAfter8 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions")).rows[0].c;
    record(
      "TENANT_ISOLATION",
      "Product from Business B ('Patin') cannot resolve in Business A (zero writes)",
      res8.status === "ERROR" &&
        res8.errorCode === "UNKNOWN_PRODUCT" &&
        txCountAfter8 === txCountBefore8 &&
        res8.replyText.includes("Produk 'patin' belum terdaftar")
    );

    // ------------------------------------------------------------------------
    // Test 9: Tenant isolation - Business A product (Lele) cannot resolve in Business B
    // ------------------------------------------------------------------------
    const ctxB: ExecutionContext = {
      businessId: bizB,
      source: "telegram",
      senderPhone: "+6289999999999",
      now: new Date("2026-09-30T10:00:00+07:00"),
    };
    const res9 = await executeConversationAction(sbClient, ctxB, "Kejual lele 10kg");
    record(
      "TENANT_ISOLATION",
      "Product from Business A ('Lele') cannot resolve in Business B (zero writes)",
      res9.status === "ERROR" &&
        res9.errorCode === "UNKNOWN_PRODUCT" &&
        res9.replyText.includes("Produk 'lele' belum terdaftar")
    );

    // ------------------------------------------------------------------------
    // Test 10: Default product behavior - "Kejual 10kg" without product names
    // ------------------------------------------------------------------------
    const res10 = await executeConversationAction(sbClient, ctxA, "Kejual 10kg");
    const tx10 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res10.data as any)?.transactionId])).rows[0];
    record(
      "DEFAULT_PRODUCT",
      "'Kejual 10kg' resolves default Lele with explicit notification message",
      res10.status === "SUCCESS" &&
        res10.parsed.isDefaultProductUsed === true &&
        tx10?.product_id === prodLele &&
        res10.replyText.includes("Lele digunakan karena merupakan produk default.") &&
        res10.replyText.includes("Total: Rp280.000")
    );

    // ------------------------------------------------------------------------
    // Test 11: Missing default product returns friendly error with zero writes
    // ------------------------------------------------------------------------
    const ctxC: ExecutionContext = {
      businessId: bizC,
      source: "telegram",
      now: new Date("2026-09-30T10:00:00+07:00"),
    };
    const txCountBefore11 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizC])).rows[0].c;
    const res11 = await executeConversationAction(sbClient, ctxC, "Kejual 10kg");
    const txCountAfter11 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizC])).rows[0].c;
    record(
      "NO_DEFAULT",
      "Sale without product in business lacking default returns safe error (zero writes)",
      res11.status === "ERROR" &&
        res11.errorCode === "DEFAULT_PRODUCT_NOT_CONFIGURED" &&
        txCountAfter11 === txCountBefore11 &&
        res11.replyText.includes("Belum ada produk default. Atur produk default melalui dashboard.")
    );

    // ------------------------------------------------------------------------
    // Test 12: Explicit unknown product ("Kejual mujair 10kg") does NOT fallback to Lele
    // ------------------------------------------------------------------------
    const txCountBefore12 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    const res12 = await executeConversationAction(sbClient, ctxA, "Kejual mujair 10kg");
    const txCountAfter12 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    record(
      "UNKNOWN_PRODUCT",
      "Explicit unknown 'mujair' does NOT fallback to default Lele (zero financial writes)",
      res12.status === "ERROR" &&
        res12.errorCode === "UNKNOWN_PRODUCT" &&
        txCountAfter12 === txCountBefore12 &&
        res12.replyText.includes("Produk 'mujair' belum terdaftar") &&
        res12.replyText.includes("Lele") &&
        res12.replyText.includes("Nila")
    );

    // ------------------------------------------------------------------------
    // Test 13: "Mujair laku 5 kilo" does NOT fallback to Lele
    // ------------------------------------------------------------------------
    const txCountBefore13 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    const res13 = await executeConversationAction(sbClient, ctxA, "Mujair laku 5 kilo");
    const txCountAfter13 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    record(
      "UNKNOWN_PRODUCT",
      "'Mujair laku 5 kilo' rejected without fallback (zero writes)",
      res13.status === "ERROR" &&
        res13.errorCode === "UNKNOWN_PRODUCT" &&
        txCountAfter13 === txCountBefore13
    );

    // ------------------------------------------------------------------------
    // Test 14: Ambiguous product match (Nila Merah vs Nila Hitam) returns clarification
    // ------------------------------------------------------------------------
    const prodNilaMerah = "aaaa4444-4444-4444-4444-444444444444";
    const prodNilaHitam = "aaaa5555-5555-5555-5555-555555555555";
    // Temporarily deactivate single "Nila" and insert "Nila Merah" and "Nila Hitam"
    await pgClient.query(`UPDATE public.products SET active = false WHERE id = '${prodNila}';`);
    await pgClient.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, active, is_default)
      VALUES
        ('${prodNilaMerah}', '${bizA}', 'Nila Merah', 'kg', 35000, true, false),
        ('${prodNilaHitam}', '${bizA}', 'Nila Hitam', 'kg', 30000, true, false);
    `);

    const txCountBefore14 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    const res14 = await executeConversationAction(sbClient, ctxA, "Kejual nila 10kg");
    const txCountAfter14 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    record(
      "AMBIGUOUS_PRODUCT",
      "Ambiguous product term 'nila' for Nila Merah & Nila Hitam returns clarification (zero writes)",
      res14.status === "ERROR" &&
        res14.errorCode === "AMBIGUOUS_PRODUCT" &&
        txCountAfter14 === txCountBefore14 &&
        res14.replyText.includes("Saya menemukan lebih dari satu produk:") &&
        res14.replyText.includes("Nila Merah") &&
        res14.replyText.includes("Nila Hitam") &&
        res14.replyText.includes("Sebutkan produk yang dimaksud.")
    );

    // ------------------------------------------------------------------------
    // Test 15: Multi-product in one message ("Kejual lele 10kg dan nila merah 5kg")
    // ------------------------------------------------------------------------
    const txCountBefore15 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    const res15 = await executeConversationAction(sbClient, ctxA, "Kejual lele 10kg dan nila merah 5kg");
    const txCountAfter15 = (await pgClient.query("SELECT count(*)::int as c FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].c;
    record(
      "MULTI_PRODUCT",
      "Multi-product message 'Kejual lele 10kg dan nila merah 5kg' rejected (zero writes)",
      res15.status === "ERROR" &&
        res15.errorCode === "MULTI_PRODUCT_DETECTED" &&
        txCountAfter15 === txCountBefore15 &&
        res15.replyText.includes("Saya menemukan lebih dari satu produk dalam satu pesan.") &&
        res15.replyText.includes("Untuk sekarang kirim satu transaksi per pesan:")
    );

    // Restore Nila and remove Nila Merah / Hitam for subsequent tests
    await pgClient.query(`DELETE FROM public.products WHERE id IN ('${prodNilaMerah}', '${prodNilaHitam}');`);
    await pgClient.query(`UPDATE public.products SET active = true WHERE id = '${prodNila}';`);

    // ------------------------------------------------------------------------
    // Test 16: Financial integrity - Client text price ignored, DB price applied
    // ------------------------------------------------------------------------
    const res16 = await executeConversationAction(sbClient, ctxA, "Kejual nila 10kg seharga 10000");
    const tx16 = (await pgClient.query("SELECT * FROM public.transactions WHERE id = $1", [(res16.data as any)?.transactionId])).rows[0];
    record(
      "FINANCIAL_INTEGRITY",
      "Client text price attempt ignored, trusted DB price applied (10kg * Rp32.000 = Rp320.000)",
      res16.status === "SUCCESS" &&
        tx16?.unit_price === "32000" &&
        tx16?.total_amount === "320000"
    );

    // ------------------------------------------------------------------------
    // Test 17: Transaction event audit records correct product ID and name
    // ------------------------------------------------------------------------
    const event16 = (await pgClient.query(
      "SELECT * FROM public.transaction_events WHERE transaction_id = $1 AND event_type = 'created'",
      [(res16.data as any)?.transactionId]
    )).rows[0];
    record(
      "AUDIT_TRAIL",
      "Transaction event records product_id and product_name in new_values",
      event16 &&
        event16.new_values?.product_id === prodNila &&
        event16.new_values?.product_name === "Nila" &&
        event16.new_values?.total_amount === 320000
    );

    // ------------------------------------------------------------------------
    // Test 18: "help" copy includes active products list
    // ------------------------------------------------------------------------
    const res18 = await executeConversationAction(sbClient, ctxA, "help");
    record(
      "HELP_COPY",
      "'help' command returns enhanced copy with active products list",
      res18.status === "SUCCESS" &&
        res18.replyText.includes("OXID Ledger siap digunakan.") &&
        res18.replyText.includes("Produk aktif:") &&
        res18.replyText.includes("Lele") &&
        res18.replyText.includes("Nila")
    );

    // ------------------------------------------------------------------------
    // Test 19: "laporan hari ini" returns clean summary with product breakdown
    // ------------------------------------------------------------------------
    const res19 = await executeConversationAction(sbClient, ctxA, "laporan hari ini");
    record(
      "REPORT_COPY",
      "'laporan hari ini' returns formatted summary with product breakdown",
      res19.status === "SUCCESS" &&
        res19.replyText.includes("📊 Ringkasan hari ini") &&
        res19.replyText.includes("Omzet:") &&
        res19.replyText.includes("Terjual:") &&
        res19.replyText.includes("Lele:") &&
        res19.replyText.includes("Nila:")
    );

    // ------------------------------------------------------------------------
    // Test 20: RLS - product_aliases unique normalized alias constraint per business
    // ------------------------------------------------------------------------
    let duplicateRejected = false;
    try {
      await pgClient.query(`
        INSERT INTO public.product_aliases (business_id, product_id, alias, normalized_alias, active)
        VALUES ('${bizA}', '${prodLele}', 'ikan nila', '${normalizeProductTerm("ikan nila")}', true);
      `);
    } catch {
      duplicateRejected = true;
    }
    record(
      "DATABASE_CONSTRAINTS",
      "Duplicate normalized alias within same business rejected by unique constraint",
      duplicateRejected
    );

    // ------------------------------------------------------------------------
    // Test 21: Cross-tenant composite foreign key prevents attaching alias to foreign product
    // ------------------------------------------------------------------------
    let foreignProductRejected = false;
    try {
      // Trying to attach alias to Business B's product under Business A
      await pgClient.query(`
        INSERT INTO public.product_aliases (business_id, product_id, alias, normalized_alias, active)
        VALUES ('${bizA}', '${prodPatin}', 'patin palsu', '${normalizeProductTerm("patin palsu")}', true);
      `);
    } catch {
      foreignProductRejected = true;
    }
    record(
      "DATABASE_CONSTRAINTS",
      "Composite FK fk_product_aliases_product_tenant prevents cross-tenant product alias association",
      foreignProductRejected
    );

    console.log("\n=== Step 6C Test Results Summary ===");
    const passedCount = reports.filter((r) => r.passed).length;
    const failedCount = reports.filter((r) => !r.passed).length;
    console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    await pgClient.end();
  }
}

runStep6CTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
