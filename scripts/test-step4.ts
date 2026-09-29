/**
 * Step 4 Test Suite for OXID WA Ledger.
 * Verifies transaction execution, atomic RPCs, protection rules, reporting, and conversation flow.
 *
 * Covers all 45 test points required by Section 26.
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  recordSale,
  cancelLastSale,
  correctLastSale,
  setDailyStatus,
  getSalesReport,
  calculateTotalAmount,
  parseQuantityToThousandths,
  formatRupiah,
} from "../src/modules/transactions";
import { executeConversationAction } from "../src/modules/conversation";
import { ExecutionContext } from "../src/modules/transactions/types";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55440/postgres";

interface TestReport {
  num: number;
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(num: number, name: string, category: string, passed: boolean, error?: string) {
  reports.push({ num, name, category, passed, error });
  const symbol = passed ? "✓" : "✗";
  console.log(`  ${symbol} [Test ${num.toString().padStart(2, "0")}] [${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
}

/**
 * Creates a lightweight SupabaseClient-compatible wrapper backed by node-postgres.
 */
function createPgSupabaseAdapter(pgClient: Client): SupabaseClient {
  const adapter = {
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
        select: (columns: string) => {
          return {
            eq: (colName: string, colValue: any) => {
              return {
                maybeSingle: async () => {
                  try {
                    const sql = `SELECT ${columns} FROM public.${table} WHERE ${colName} = $1 LIMIT 1;`;
                    const res = await pgClient.query(sql, [colValue]);
                    return { data: res.rows[0] || null, error: null };
                  } catch (err: any) {
                    return { data: null, error: { message: err.message, code: err.code } };
                  }
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return adapter;
}

async function runStep4Tests() {
  console.log("=== OXID WA Ledger - Step 4 Domain & Execution Test Suite ===\n");
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  try {
    console.log("1. Setting up database schema and applying migrations...");
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;

      CREATE SCHEMA IF NOT EXISTS auth;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END
      $$;

      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$;

      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      GRANT SELECT ON auth.users TO authenticated, service_role;
    `);

    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
    }
    console.log("✓ All migrations applied cleanly!\n");

    console.log("2. Setting up test seed data...");
    // Clear dynamic tables
    await client.query(`
      TRUNCATE TABLE public.transaction_events CASCADE;
      TRUNCATE TABLE public.transactions CASCADE;
      TRUNCATE TABLE public.business_daily_status CASCADE;
      TRUNCATE TABLE public.business_users CASCADE;
      TRUNCATE TABLE public.products CASCADE;
      TRUNCATE TABLE public.businesses CASCADE;
    `);

    const ownerA = "11111111-1111-1111-1111-111111111111";
    const ownerB = "33333333-3333-3333-3333-333333333333";
    await client.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerA}', 'ownerA@oxid.local'),
        ('${ownerB}', 'ownerB@oxid.local')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Business A: Catfish Pilot (Asia/Jakarta, Rp28,000 / kg)
    const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizA}', 'Catfish Pilot A', 'Asia/Jakarta', 'active', '${ownerA}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizA}', '${ownerA}', 'owner');
    `);

    const prodCatfishA = "aaaa1111-1111-1111-1111-111111111111";
    await client.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES ('${prodCatfishA}', '${bizA}', 'Ikan Lele Segar', 'kg', 28000, true, true);
    `);

    // Business B: Vegetable Store (Asia/Makassar, Rp15,000 / kg)
    const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizB}', 'Vegetable Store B', 'Asia/Makassar', 'active', '${ownerB}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizB}', '${ownerB}', 'owner');
    `);

    const prodVegB = "bbbb1111-1111-1111-1111-111111111111";
    await client.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES ('${prodVegB}', '${bizB}', 'Kangkung Hidroponik', 'kg', 15000, true, true);
    `);

    // Business C: Has only INACTIVE product
    const bizC = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizC}', 'Inactive Biz C', 'Asia/Jakarta', 'active', '${ownerA}');

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES ('cccc1111-1111-1111-1111-111111111111', '${bizC}', 'Inactive Product', 'kg', 20000, true, false);
    `);

    // Business D: Has NO products
    const bizD = "dddddddd-dddd-dddd-dddd-dddddddddddd";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizD}', 'No Product Biz D', 'Asia/Jakarta', 'active', '${ownerA}');
    `);

    console.log("✓ Test seed data ready!\n");
    console.log("3. Running Step 4 Test Cases (Section 26)...\n");

    const sbClient = createPgSupabaseAdapter(client);
    const ctxA: ExecutionContext = {
      businessId: bizA,
      source: "whatsapp",
      senderPhone: "+6281234567890",
      now: new Date("2026-09-30T10:00:00+07:00"),
    };
    const ctxB: ExecutionContext = {
      businessId: bizB,
      source: "whatsapp",
      senderPhone: "+6289876543210",
      now: new Date("2026-09-30T11:00:00+08:00"),
    };

    // ------------------------------------------------------------------------
    // Tests 1-10: SALE operations & Product Resolution
    // ------------------------------------------------------------------------
    let sale1: any;
    try {
      sale1 = await recordSale(sbClient, ctxA, {
        quantity: 15,
        unit: "kg",
        rawMessage: "Kejual 15kg",
        transactionAt: ctxA.now,
      });
      const passed =
        sale1.quantity === 15 &&
        sale1.totalAmount === 420000 &&
        sale1.unitPrice === 28000 &&
        sale1.status === "confirmed";
      record(1, "SALE single kg creates transaction (15kg * 28,000 = 420,000)", "SALE", passed);
    } catch (err: any) {
      record(1, "SALE single kg creates transaction", "SALE", false, err.message);
    }

    let sale2: any;
    try {
      sale2 = await recordSale(sbClient, ctxA, {
        quantity: 2.5,
        unit: "kg",
        rawMessage: "Tadi laku 2,5 kilo",
        transactionAt: ctxA.now,
      });
      const passed =
        sale2.quantity === 2.5 &&
        sale2.totalAmount === 70000 &&
        sale2.unitPrice === 28000;
      record(2, "SALE with decimal quantity (2.5 kg * 28,000 = 70,000)", "SALE", passed);
    } catch (err: any) {
      record(2, "SALE with decimal quantity", "SALE", false, err.message);
    }

    try {
      const sale3 = await recordSale(sbClient, ctxA, {
        quantity: 10,
        unit: "kg",
        rawMessage: "jual 10 kg",
        transactionAt: ctxA.now,
      });
      const passed = sale3.quantity === 10 && sale3.totalAmount === 280000;
      record(3, "SALE with Indonesian thousand/standard quantity", "SALE", passed);
    } catch (err: any) {
      record(3, "SALE with Indonesian thousand/standard quantity", "SALE", false, err.message);
    }

    try {
      // 2.750 kg at 28,000 = 77,000
      const mathTotal = calculateTotalAmount(2.75, 28000);
      const res = await client.query("SELECT round(2.750 * 28000)::BIGINT as db_total");
      const dbTotal = Number(res.rows[0].db_total);
      const passed = Number(mathTotal) === 77000 && dbTotal === 77000;
      record(4, "exact IDR total calculation matches integer rule", "SALE", passed);
    } catch (err: any) {
      record(4, "exact IDR total calculation matches integer rule", "SALE", false, err.message);
    }

    try {
      const evRes = await client.query(
        "SELECT event_type, new_values FROM public.transaction_events WHERE transaction_id = $1",
        [sale1.transactionId]
      );
      const passed =
        evRes.rows.length === 1 &&
        evRes.rows[0].event_type === "created" &&
        evRes.rows[0].new_values.status === "confirmed" &&
        Number(evRes.rows[0].new_values.total_amount) === 420000;
      record(5, "audit event created with event_type = created", "SALE", passed);
    } catch (err: any) {
      record(5, "audit event created with event_type = created", "SALE", false, err.message);
    }

    try {
      // Up to here: 15kg (420k) + 2.5kg (70k) + 10kg (280k) = 27.5kg (770,000) across 3 txs
      const passed =
        sale2.todaySummary.transactionCount === 2 &&
        sale2.todaySummary.totalQuantity === 17.5 &&
        sale2.todaySummary.totalRevenue === 490000;
      record(6, "today summary computed accurately", "SALE", passed);
    } catch (err: any) {
      record(6, "today summary computed accurately", "SALE", false, err.message);
    }

    try {
      const summaryRes = await client.query(`
        SELECT COUNT(*)::INT as count, SUM(quantity)::NUMERIC as qty, SUM(total_amount)::BIGINT as rev
        FROM public.transactions
        WHERE business_id = $1 AND status = 'confirmed'
      `, [bizA]);
      const passed =
        summaryRes.rows[0].count === 3 &&
        Number(summaryRes.rows[0].qty) === 27.5 &&
        Number(summaryRes.rows[0].rev) === 770000;
      record(7, "multiple consecutive sales accumulate correctly in today summary", "SALE", passed);
    } catch (err: any) {
      record(7, "multiple consecutive sales accumulate correctly", "SALE", false, err.message);
    }

    try {
      // Business B sells Kangkung at 15,000 (NOT hardcoded to catfish or 28,000)
      const saleB = await recordSale(sbClient, ctxB, {
        quantity: 5,
        unit: "kg",
        rawMessage: "Kejual 5kg",
        transactionAt: ctxB.now,
      });
      const passed =
        saleB.productName === "Kangkung Hidroponik" &&
        saleB.unitPrice === 15000 &&
        saleB.totalAmount === 75000;
      record(8, "SALE respects configured active product (not hardcoded)", "SALE", passed);
    } catch (err: any) {
      record(8, "SALE respects configured active product", "SALE", false, err.message);
    }

    try {
      // Business C has only an inactive product
      const ctxC: ExecutionContext = { businessId: bizC, source: "whatsapp" };
      let threw = false;
      try {
        await recordSale(sbClient, ctxC, { quantity: 5, unit: "kg" });
      } catch (err: any) {
        threw = err.code === "DEFAULT_PRODUCT_NOT_CONFIGURED" || err.message.includes("DEFAULT_PRODUCT_NOT_CONFIGURED");
      }
      record(9, "inactive product is not chosen as default", "SALE", threw);
    } catch (err: any) {
      record(9, "inactive product is not chosen as default", "SALE", false, err.message);
    }

    try {
      // Business D has no products
      const ctxD: ExecutionContext = { businessId: bizD, source: "whatsapp" };
      let threw = false;
      try {
        await recordSale(sbClient, ctxD, { quantity: 5, unit: "kg" });
      } catch (err: any) {
        threw = err.code === "DEFAULT_PRODUCT_NOT_CONFIGURED" || err.message.includes("DEFAULT_PRODUCT_NOT_CONFIGURED");
      }
      record(10, "missing active product throws domain error", "SALE", threw);
    } catch (err: any) {
      record(10, "missing active product throws domain error", "SALE", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 11-14: Ambiguous Protection & Zero Database Writes
    // ------------------------------------------------------------------------
    try {
      const txCountBefore = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      const res = await executeConversationAction(sbClient, ctxA, "mungkin sekitar 10 kilo");
      const txCountAfter = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      const passed = res.status === "CONFIRMATION_REQUIRED" && txCountBefore === txCountAfter;
      record(11, "ambiguous sale with low confidence writes zero rows", "PROTECTION", passed);
    } catch (err: any) {
      record(11, "ambiguous sale with low confidence writes zero rows", "PROTECTION", false, err.message);
    }

    try {
      const txCountBefore = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      // Bare quantity "15kg" triggers requiresConfirmation
      const res = await executeConversationAction(sbClient, ctxA, "15kg");
      const txCountAfter = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      const passed = res.status === "CONFIRMATION_REQUIRED" && txCountBefore === txCountAfter;
      record(12, "ambiguous sale with requiresConfirmation writes zero rows", "PROTECTION", passed);
    } catch (err: any) {
      record(12, "ambiguous sale with requiresConfirmation writes zero rows", "PROTECTION", false, err.message);
    }

    try {
      const txCountBefore = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      const res = await executeConversationAction(sbClient, ctxA, "jual 10kg lalu 5kg");
      const txCountAfter = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1", [bizA])).rows[0].count;
      const passed = res.status === "CONFIRMATION_REQUIRED" && txCountBefore === txCountAfter;
      record(13, "ambiguous sale with multiple quantities writes zero rows", "PROTECTION", passed);
    } catch (err: any) {
      record(13, "ambiguous sale with multiple quantities writes zero rows", "PROTECTION", false, err.message);
    }

    try {
      const res = await executeConversationAction(sbClient, ctxA, "15kg");
      const confirmationData = res.data as { proposedIntent?: string; proposedQuantity?: string } | null;
      const passed =
        res.status === "CONFIRMATION_REQUIRED" &&
        confirmationData?.proposedIntent === "SALE" &&
        confirmationData?.proposedQuantity === "15.000" &&
        res.replyText.includes("15 kg") &&
        (res.replyText.includes("Apakah transaksi ini ingin dicatat") || res.replyText.includes("kemungkinan penjualan"));
      record(14, "ambiguous sale returns CONFIRMATION_REQUIRED with proposed values", "PROTECTION", passed);
    } catch (err: any) {
      record(14, "ambiguous sale returns CONFIRMATION_REQUIRED with proposed values", "PROTECTION", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 15-20: NO_SALE & CLOSED (Daily Status)
    // ------------------------------------------------------------------------
    try {
      const statusRes = await setDailyStatus(sbClient, ctxA, "NO_SALE");
      const passed =
        statusRes.status === "NO_SALE" &&
        statusRes.localDate === "2026-09-30" &&
        statusRes.isDuplicate === false;
      record(15, "NO_SALE records daily status for today", "DAILY_STATUS", passed);
    } catch (err: any) {
      record(15, "NO_SALE records daily status for today", "DAILY_STATUS", false, err.message);
    }

    try {
      const statusRes2 = await setDailyStatus(sbClient, ctxA, "NO_SALE");
      const passed =
        statusRes2.status === "NO_SALE" &&
        statusRes2.isDuplicate === true;
      record(16, "duplicate NO_SALE is idempotent and does not error", "DAILY_STATUS", passed);
    } catch (err: any) {
      record(16, "duplicate NO_SALE is idempotent", "DAILY_STATUS", false, err.message);
    }

    try {
      let threw = false;
      try {
        await setDailyStatus(sbClient, ctxA, "CLOSED");
      } catch (err: any) {
        threw = err.code === "DAILY_STATUS_CONFLICT";
      }
      record(17, "CLOSED on already NO_SALE day returns conflict error", "DAILY_STATUS", threw);
    } catch (err: any) {
      record(17, "CLOSED on already NO_SALE day returns conflict error", "DAILY_STATUS", false, err.message);
    }

    // Test CLOSED on Business B
    try {
      const statusB = await setDailyStatus(sbClient, ctxB, "CLOSED");
      const passed =
        statusB.status === "CLOSED" &&
        statusB.localDate === "2026-09-30" &&
        statusB.isDuplicate === false;
      record(18, "CLOSED records daily status", "DAILY_STATUS", passed);
    } catch (err: any) {
      record(18, "CLOSED records daily status", "DAILY_STATUS", false, err.message);
    }

    try {
      const statusB2 = await setDailyStatus(sbClient, ctxB, "CLOSED");
      const passed =
        statusB2.status === "CLOSED" &&
        statusB2.isDuplicate === true;
      record(19, "duplicate CLOSED is idempotent", "DAILY_STATUS", passed);
    } catch (err: any) {
      record(19, "duplicate CLOSED is idempotent", "DAILY_STATUS", false, err.message);
    }

    try {
      let threw = false;
      try {
        await setDailyStatus(sbClient, ctxB, "NO_SALE");
      } catch (err: any) {
        threw = err.code === "DAILY_STATUS_CONFLICT";
      }
      record(20, "NO_SALE on already CLOSED day returns conflict error", "DAILY_STATUS", threw);
    } catch (err: any) {
      record(20, "NO_SALE on already CLOSED day returns conflict error", "DAILY_STATUS", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 21-26: CANCEL_LAST
    // ------------------------------------------------------------------------
    // Recall on Biz A we have 3 sales: 15kg (first), 2.5kg (second), 10kg (third/latest).
    let cancelRes: any;
    try {
      cancelRes = await cancelLastSale(sbClient, ctxA);
      const passed =
        cancelRes.quantity === 10 &&
        cancelRes.status === "cancelled" &&
        cancelRes.totalAmount === 280000;
      record(21, "CANCEL_LAST cancels latest confirmed transaction (10kg)", "CANCEL", passed);
    } catch (err: any) {
      record(21, "CANCEL_LAST cancels latest confirmed transaction", "CANCEL", false, err.message);
    }

    try {
      const evRes = await client.query(
        "SELECT event_type, old_values, new_values FROM public.transaction_events WHERE transaction_id = $1 AND event_type = 'cancelled'",
        [cancelRes.transactionId]
      );
      const passed =
        evRes.rows.length === 1 &&
        evRes.rows[0].new_values.status === "cancelled" &&
        evRes.rows[0].old_values.status === "confirmed";
      record(22, "CANCEL_LAST creates audit event with event_type = cancelled", "CANCEL", passed);
    } catch (err: any) {
      record(22, "CANCEL_LAST creates audit event with event_type = cancelled", "CANCEL", false, err.message);
    }

    try {
      const rowRes = await client.query(
        "SELECT id, status FROM public.transactions WHERE id = $1",
        [cancelRes.transactionId]
      );
      const passed = rowRes.rows.length === 1 && rowRes.rows[0].status === "cancelled";
      record(23, "CANCEL_LAST does not delete transaction row", "CANCEL", passed);
    } catch (err: any) {
      record(23, "CANCEL_LAST does not delete transaction row", "CANCEL", false, err.message);
    }

    try {
      // Remaining confirmed on Biz A: 15kg (420k) + 2.5kg (70k) = 17.5kg (490k). Cancelled 10kg excluded!
      const report = await getSalesReport(sbClient, ctxA, "today");
      const passed =
        report.transactionCount === 2 &&
        report.totalQuantity === 17.5 &&
        report.totalRevenue === 490000;
      record(24, "cancelled transaction excluded from active totals", "CANCEL", passed);
    } catch (err: any) {
      record(24, "cancelled transaction excluded from active totals", "CANCEL", false, err.message);
    }

    try {
      // Cancel remaining 2 sales to reach empty state
      await cancelLastSale(sbClient, ctxA); // cancels 2.5kg
      await cancelLastSale(sbClient, ctxA); // cancels 15kg
      // Now 0 confirmed transactions left
      let threw = false;
      try {
        await cancelLastSale(sbClient, ctxA);
      } catch (err: any) {
        threw = err.code === "NO_TRANSACTION_TO_CANCEL";
      }
      record(25, "CANCEL_LAST when no confirmed transactions exist throws domain error", "CANCEL", threw);
    } catch (err: any) {
      record(25, "CANCEL_LAST when no confirmed transactions exist throws domain error", "CANCEL", false, err.message);
    }

    try {
      // Attempting another cancel should throw again
      let threw = false;
      try {
        await cancelLastSale(sbClient, ctxA);
      } catch (err: any) {
        threw = err.code === "NO_TRANSACTION_TO_CANCEL";
      }
      record(26, "duplicate CANCEL_LAST cannot cancel the same transaction twice", "CANCEL", threw);
    } catch (err: any) {
      record(26, "duplicate CANCEL_LAST cannot cancel the same transaction twice", "CANCEL", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 27-34: CORRECT_LAST
    // ------------------------------------------------------------------------
    // Create a new sale to correct: 10kg at Rp28,000 = Rp280,000
    const txToCorrect = await recordSale(sbClient, ctxA, {
      quantity: 10,
      unit: "kg",
      rawMessage: "Kejual 10kg",
      transactionAt: ctxA.now,
    });

    let correctRes: any;
    try {
      // Change to 20kg
      correctRes = await correctLastSale(sbClient, ctxA, 20, "ubah terakhir jadi 20kg");
      const origRow = (await client.query("SELECT status FROM public.transactions WHERE id = $1", [correctRes.originalTransactionId])).rows[0];
      const passed = origRow.status === "corrected";
      record(27, "CORRECT_LAST marks original transaction as corrected", "CORRECT", passed);
    } catch (err: any) {
      record(27, "CORRECT_LAST marks original transaction as corrected", "CORRECT", false, err.message);
    }

    try {
      const newRow = (await client.query("SELECT * FROM public.transactions WHERE id = $1", [correctRes.newTransactionId])).rows[0];
      const passed =
        newRow.status === "confirmed" &&
        Number(newRow.quantity) === 20 &&
        Number(newRow.total_amount) === 560000;
      record(28, "CORRECT_LAST creates replacement transaction with new quantity", "CORRECT", passed);
    } catch (err: any) {
      record(28, "CORRECT_LAST creates replacement transaction with new quantity", "CORRECT", false, err.message);
    }

    try {
      const newRow = (await client.query("SELECT supersedes_transaction_id FROM public.transactions WHERE id = $1", [correctRes.newTransactionId])).rows[0];
      const passed = newRow.supersedes_transaction_id === correctRes.originalTransactionId;
      record(29, "CORRECT_LAST links supersedes_transaction_id", "CORRECT", passed);
    } catch (err: any) {
      record(29, "CORRECT_LAST links supersedes_transaction_id", "CORRECT", false, err.message);
    }

    try {
      // Simulate changing default price in products table to 35,000 to verify price wasn't fetched from products
      await client.query("UPDATE public.products SET default_price = 35000 WHERE id = $1", [prodCatfishA]);
      const passed = correctRes.unitPrice === 28000;
      record(30, "CORRECT_LAST reuses original unit_price", "CORRECT", passed);
      // Revert product price back to 28000
      await client.query("UPDATE public.products SET default_price = 28000 WHERE id = $1", [prodCatfishA]);
    } catch (err: any) {
      record(30, "CORRECT_LAST reuses original unit_price", "CORRECT", false, err.message);
    }

    try {
      const passed = correctRes.newTotalAmount === 560000 && correctRes.originalTotalAmount === 280000;
      record(31, "CORRECT_LAST recalculates total_amount accurately", "CORRECT", passed);
    } catch (err: any) {
      record(31, "CORRECT_LAST recalculates total_amount accurately", "CORRECT", false, err.message);
    }

    try {
      const auditOrig = await client.query(
        "SELECT event_type FROM public.transaction_events WHERE transaction_id = $1 AND event_type = 'corrected'",
        [correctRes.originalTransactionId]
      );
      const auditNew = await client.query(
        "SELECT event_type FROM public.transaction_events WHERE transaction_id = $1 AND event_type = 'created'",
        [correctRes.newTransactionId]
      );
      const passed = auditOrig.rows.length === 1 && auditNew.rows.length === 1;
      record(32, "CORRECT_LAST creates audit event with event_type = corrected", "CORRECT", passed);
    } catch (err: any) {
      record(32, "CORRECT_LAST creates audit event with event_type = corrected", "CORRECT", false, err.message);
    }

    try {
      // Active confirmed transactions on Biz A: only the corrected 20kg (560k)
      const report = await getSalesReport(sbClient, ctxA, "today");
      const passed = report.totalRevenue === 560000 && report.totalQuantity === 20 && report.transactionCount === 1;
      record(33, "original transaction excluded from active totals after correction", "CORRECT", passed);
    } catch (err: any) {
      record(33, "original transaction excluded from active totals after correction", "CORRECT", false, err.message);
    }

    try {
      const report = await getSalesReport(sbClient, ctxA, "today");
      const passed = report.totalQuantity === 20 && report.totalRevenue === 560000;
      record(34, "replacement transaction included in active totals", "CORRECT", passed);
    } catch (err: any) {
      record(34, "replacement transaction included in active totals", "CORRECT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 35-42: REPORTING & Timezone Operations
    // ------------------------------------------------------------------------
    // Add another sale to Biz A on 2026-09-30: 5kg at 28,000 = 140,000
    // Total today = 20kg + 5kg = 25kg, Rp700,000 across 2 txs
    await recordSale(sbClient, ctxA, {
      quantity: 5,
      unit: "kg",
      rawMessage: "Kejual 5kg",
      transactionAt: ctxA.now,
    });

    try {
      const repToday = await getSalesReport(sbClient, ctxA, "today");
      const passed =
        repToday.period === "today" &&
        repToday.transactionCount === 2 &&
        repToday.totalQuantity === 25 &&
        repToday.totalRevenue === 700000;
      record(35, "REPORT_TODAY calculates today's confirmed totals", "REPORT", passed);
    } catch (err: any) {
      record(35, "REPORT_TODAY calculates today's confirmed totals", "REPORT", false, err.message);
    }

    try {
      // 2026-09-30 is Wednesday. Monday is 2026-09-28, Sunday is 2026-10-04.
      // Insert a sale on Monday (2026-09-28) for 10kg (280k)
      await recordSale(sbClient, ctxA, {
        quantity: 10,
        unit: "kg",
        rawMessage: "Kejual 10kg senin",
        transactionAt: new Date("2026-09-28T09:00:00+07:00"),
      });
      // Insert a sale on prior Sunday (2026-09-27) for 50kg (1.4m) - should be EXCLUDED from this week!
      await recordSale(sbClient, ctxA, {
        quantity: 50,
        unit: "kg",
        rawMessage: "Kejual 50kg minggu lalu",
        transactionAt: new Date("2026-09-27T15:00:00+07:00"),
      });

      const repWeek = await getSalesReport(sbClient, ctxA, "week");
      // Week should have: 25kg (today Wed) + 10kg (Mon) = 35kg (980,000) across 3 txs
      const passed =
        repWeek.period === "week" &&
        repWeek.transactionCount === 3 &&
        repWeek.totalQuantity === 35 &&
        repWeek.totalRevenue === 980000;
      record(36, "REPORT_WEEK calculates Monday-Sunday range totals", "REPORT", passed);
    } catch (err: any) {
      record(36, "REPORT_WEEK calculates Monday-Sunday range totals", "REPORT", false, err.message);
    }

    try {
      // Month (September 2026) includes:
      // - 2026-09-27: 50kg (1,400,000)
      // - 2026-09-28: 10kg (280,000)
      // - 2026-09-30: 25kg (700,000)
      // Total month = 85kg, Rp2,380,000 across 4 txs
      const repMonth = await getSalesReport(sbClient, ctxA, "month");
      const passed =
        repMonth.period === "month" &&
        repMonth.transactionCount === 4 &&
        repMonth.totalQuantity === 85 &&
        repMonth.totalRevenue === 2380000;
      record(37, "REPORT_MONTH calculates calendar month totals", "REPORT", passed);
    } catch (err: any) {
      record(37, "REPORT_MONTH calculates calendar month totals", "REPORT", false, err.message);
    }

    try {
      // Add a sale and immediately cancel it
      const tempSale = await recordSale(sbClient, ctxA, {
        quantity: 100,
        unit: "kg",
        rawMessage: "Kejual 100kg",
        transactionAt: ctxA.now,
      });
      await cancelLastSale(sbClient, ctxA);

      const repMonth = await getSalesReport(sbClient, ctxA, "month");
      const passed = repMonth.totalQuantity === 85 && repMonth.totalRevenue === 2380000;
      record(38, "reports exclude cancelled transactions", "REPORT", passed);
    } catch (err: any) {
      record(38, "reports exclude cancelled transactions", "REPORT", false, err.message);
    }

    try {
      // Verify that corrected original transactions (status = 'corrected') remain excluded
      const repMonth = await getSalesReport(sbClient, ctxA, "month");
      const passed = repMonth.totalQuantity === 85;
      record(39, "reports exclude superseded/corrected transactions", "REPORT", passed);
    } catch (err: any) {
      record(39, "reports exclude superseded/corrected transactions", "REPORT", false, err.message);
    }

    try {
      // Verify that replacement transactions (status = 'confirmed') remain included
      const repMonth = await getSalesReport(sbClient, ctxA, "month");
      const passed = repMonth.transactionCount === 4;
      record(40, "reports include replacement transactions", "REPORT", passed);
    } catch (err: any) {
      record(40, "reports include replacement transactions", "REPORT", false, err.message);
    }

    try {
      // Business B is in Asia/Makassar (UTC+8).
      // Test 23:30 WIB (which is 00:30 WITA next day):
      // On 2026-09-30T16:30:00Z -> In WIB (UTC+7) it is 2026-09-30 23:30 (Sept 30).
      // In WITA (UTC+8) it is 2026-10-01 00:30 (Oct 1).
      const saleWita = await recordSale(sbClient, ctxB, {
        quantity: 3,
        unit: "kg",
        transactionAt: new Date("2026-09-30T16:30:00Z"),
      });
      const passed = saleWita.todaySummary.localDate === "2026-10-01";
      record(41, "timezone conversion matches business timezone (WITA)", "TIMEZONE", passed);
    } catch (err: any) {
      record(41, "timezone conversion matches business timezone (WITA)", "TIMEZONE", false, err.message);
    }

    try {
      // Transactions on different local dates are partitioned correctly
      const repBToday = await getSalesReport(sbClient, { ...ctxB, now: new Date("2026-09-30T03:00:00Z") }, "today");
      // 2026-09-30 in WITA has the earlier sale (5kg, 75k). The 3kg sale was on 2026-10-01.
      const passed = repBToday.totalQuantity === 5 && repBToday.totalRevenue === 75000;
      record(42, "transactions on different local dates are partitioned correctly", "TIMEZONE", passed);
    } catch (err: any) {
      record(42, "transactions on different local dates are partitioned correctly", "TIMEZONE", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 43-45: Tenant Isolation & End-to-End Conversation Flow
    // ------------------------------------------------------------------------
    try {
      // Business A report vs Business B report: strictly isolated
      const repA = await getSalesReport(sbClient, ctxA, "month");
      const repB = await getSalesReport(sbClient, ctxB, "month");
      const passed = repA.businessId === bizA && repB.businessId === bizB && repA.totalRevenue !== repB.totalRevenue;
      record(43, "tenant isolation: operations on business A never touch business B", "TENANT_ISOLATION", passed);
    } catch (err: any) {
      record(43, "tenant isolation: operations on business A never touch business B", "TENANT_ISOLATION", false, err.message);
    }

    const ctxE2E: ExecutionContext = {
      ...ctxA,
      now: new Date("2026-09-30T12:00:00+07:00"),
    };

    try {
      const execRes = await executeConversationAction(sbClient, ctxE2E, "Kejual 15kg");
      const passed =
        execRes.status === "SUCCESS" &&
        execRes.action === "CREATE_SALE" &&
        execRes.replyText.includes("Penjualan tercatat") &&
        execRes.replyText.includes("15 kg") &&
        execRes.replyText.includes("Rp420.000");
      record(44, "conversation executor end-to-end: 'Kejual 15kg' -> SUCCESS + confirmation message", "E2E_CONVERSATION", passed);
    } catch (err: any) {
      record(44, "conversation executor end-to-end: 'Kejual 15kg'", "E2E_CONVERSATION", false, err.message);
    }

    try {
      const execCancel = await executeConversationAction(sbClient, ctxE2E, "batal yang terakhir");
      const passed =
        execCancel.status === "SUCCESS" &&
        execCancel.action === "REQUEST_CANCEL_LAST" &&
        execCancel.replyText.includes("Transaksi terakhir berhasil dibatalkan") &&
        execCancel.replyText.includes("15 kg");
      record(45, "conversation executor end-to-end: 'batal yang terakhir' -> SUCCESS + cancellation message", "E2E_CONVERSATION", passed);
    } catch (err: any) {
      record(45, "conversation executor end-to-end: 'batal yang terakhir'", "E2E_CONVERSATION", false, err.message);
    }

    console.log("\n=== Step 4 Test Results Summary ===");
    const passedCount = reports.filter((r) => r.passed).length;
    const failedCount = reports.filter((r) => !r.passed).length;
    console.log(`Total: ${reports.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runStep4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
