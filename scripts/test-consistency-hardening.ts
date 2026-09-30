/**
 * Business-State Consistency Hardening Test Suite for OXID WA Ledger.
 * Verifies consistency rules between Daily Status (NO_SALE / CLOSED) and Sales Transactions.
 *
 * Covers all 22 test requirements in Section 14.
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
} from "../src/modules/transactions";
import { ExecutionContext } from "../src/modules/transactions/types";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

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
  console.log(`  ${symbol} [Hardening ${num.toString().padStart(2, "0")}] [${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
}

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

async function runHardeningTests() {
  console.log("=== OXID WA Ledger - Consistency Hardening Test Suite ===\n");
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  try {
    console.log("1. Setting up schema and applying migrations...");
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

    console.log("2. Seeding test tenant data...");
    const ownerA = "11111111-1111-1111-1111-111111111111";
    const ownerB = "33333333-3333-3333-3333-333333333333";
    await client.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${ownerA}', 'ownerA@oxid.local'),
        ('${ownerB}', 'ownerB@oxid.local')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Business A (Asia/Jakarta, Rp28,000 / kg)
    const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizA}', 'Catfish Pilot A', 'Asia/Jakarta', 'active', '${ownerA}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizA}', '${ownerA}', 'owner');

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES ('aaaa1111-1111-1111-1111-111111111111', '${bizA}', 'Ikan Lele Segar', 'kg', 28000, true, true);
    `);

    // Business B (Asia/Makassar, Rp15,000 / kg)
    const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await client.query(`
      INSERT INTO public.businesses (id, name, timezone, status, created_by)
      VALUES ('${bizB}', 'Vegetable Store B', 'Asia/Makassar', 'active', '${ownerB}');

      INSERT INTO public.business_users (business_id, user_id, role)
      VALUES ('${bizB}', '${ownerB}', 'owner');

      INSERT INTO public.products (id, business_id, name, unit, default_price, is_default, active)
      VALUES ('bbbb1111-1111-1111-1111-111111111111', '${bizB}', 'Kangkung Hidroponik', 'kg', 15000, true, true);
    `);

    console.log("✓ Test seed data ready!\n");
    console.log("3. Running Consistency Hardening Tests (Section 14)...\n");

    const sbClient = createPgSupabaseAdapter(client);
    const date1 = "2026-10-10"; // Test date 1
    const ctxA1: ExecutionContext = {
      businessId: bizA,
      source: "whatsapp",
      senderPhone: "+6281234567890",
      now: new Date(`${date1}T10:00:00+07:00`),
    };

    // ------------------------------------------------------------------------
    // Tests 1-2: Confirmed sale exists -> NO_SALE and CLOSED rejected
    // ------------------------------------------------------------------------
    // Step 1: Create a confirmed sale on date1
    await recordSale(sbClient, ctxA1, {
      quantity: 10,
      unit: "kg",
      transactionAt: ctxA1.now,
    });

    try {
      let threw = false;
      let errCode = "";
      try {
        await setDailyStatus(sbClient, ctxA1, "NO_SALE");
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_HAS_SALES";
      record(1, "confirmed sale exists → NO_SALE rejected with DAY_STATUS_HAS_SALES", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(1, "confirmed sale exists → NO_SALE rejected", "STATUS_CONFLICT", false, err.message);
    }

    try {
      let threw = false;
      let errCode = "";
      try {
        await setDailyStatus(sbClient, ctxA1, "CLOSED");
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_HAS_SALES";
      record(2, "confirmed sale exists → CLOSED rejected with DAY_STATUS_HAS_SALES", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(2, "confirmed sale exists → CLOSED rejected", "STATUS_CONFLICT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 3-4: NO_SALE / CLOSED exists -> new SALE rejected
    // ------------------------------------------------------------------------
    const date2 = "2026-10-11"; // Day marked NO_SALE
    const ctxA2: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${date2}T09:00:00+07:00`),
    };
    await setDailyStatus(sbClient, ctxA2, "NO_SALE");

    try {
      let threw = false;
      let errCode = "";
      try {
        await recordSale(sbClient, ctxA2, { quantity: 15, unit: "kg", transactionAt: ctxA2.now });
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_CONFLICT";
      record(3, "NO_SALE exists → new SALE rejected with DAY_STATUS_CONFLICT", "SALE_CONFLICT", passed);
    } catch (err: any) {
      record(3, "NO_SALE exists → new SALE rejected", "SALE_CONFLICT", false, err.message);
    }

    const date3 = "2026-10-12"; // Day marked CLOSED
    const ctxA3: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${date3}T09:00:00+07:00`),
    };
    await setDailyStatus(sbClient, ctxA3, "CLOSED");

    try {
      let threw = false;
      let errCode = "";
      try {
        await recordSale(sbClient, ctxA3, { quantity: 20, unit: "kg", transactionAt: ctxA3.now });
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_CONFLICT";
      record(4, "CLOSED exists → new SALE rejected with DAY_STATUS_CONFLICT", "SALE_CONFLICT", passed);
    } catch (err: any) {
      record(4, "CLOSED exists → new SALE rejected", "SALE_CONFLICT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 5-8: Zero rows / zero audit events on rejected operations
    // ------------------------------------------------------------------------
    try {
      // Check date 2 and date 3 transactions
      const txRows = (await client.query("SELECT COUNT(*)::INT as count FROM public.transactions WHERE business_id = $1 AND transaction_at >= '2026-10-11T00:00:00+07:00'", [bizA])).rows[0].count;
      record(5, "rejected sale creates zero transaction rows", "ZERO_WRITES", txRows === 0);
    } catch (err: any) {
      record(5, "rejected sale creates zero transaction rows", "ZERO_WRITES", false, err.message);
    }

    try {
      const evRows = (await client.query("SELECT COUNT(*)::INT as count FROM public.transaction_events WHERE business_id = $1 AND created_at >= '2026-10-11T00:00:00+07:00'", [bizA])).rows[0].count;
      record(6, "rejected sale creates zero transaction_events", "ZERO_WRITES", evRows === 0);
    } catch (err: any) {
      record(6, "rejected sale creates zero transaction_events", "ZERO_WRITES", false, err.message);
    }

    try {
      // On date 1, status was rejected because sales existed
      const statusRows = (await client.query("SELECT COUNT(*)::INT as count FROM public.business_daily_status WHERE business_id = $1 AND local_date = '2026-10-10'", [bizA])).rows[0].count;
      record(7, "rejected NO_SALE creates zero daily status rows", "ZERO_WRITES", statusRows === 0);
    } catch (err: any) {
      record(7, "rejected NO_SALE creates zero daily status rows", "ZERO_WRITES", false, err.message);
    }

    try {
      const statusRows = (await client.query("SELECT COUNT(*)::INT as count FROM public.business_daily_status WHERE business_id = $1 AND local_date = '2026-10-10'", [bizA])).rows[0].count;
      record(8, "rejected CLOSED creates zero daily status rows", "ZERO_WRITES", statusRows === 0);
    } catch (err: any) {
      record(8, "rejected CLOSED creates zero daily status rows", "ZERO_WRITES", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 9-11: Cancelled vs Corrected transactions in status conflict checks
    // ------------------------------------------------------------------------
    const date4 = "2026-10-13"; // Day with sale cancelled
    const ctxA4: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${date4}T10:00:00+07:00`),
    };
    // Insert sale and immediately cancel it
    await recordSale(sbClient, ctxA4, { quantity: 10, unit: "kg", transactionAt: ctxA4.now });
    await cancelLastSale(sbClient, ctxA4);

    try {
      // Since the only sale on date4 is cancelled, setting NO_SALE must SUCCEED
      const res = await setDailyStatus(sbClient, ctxA4, "NO_SALE");
      const passed = res.status === "NO_SALE" && res.localDate === date4;
      record(9, "cancelled transaction does not count as active sale for daily-status conflict", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(9, "cancelled transaction does not count as active sale", "STATUS_CONFLICT", false, err.message);
    }

    const date5 = "2026-10-14"; // Day with correction
    const ctxA5: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${date5}T10:00:00+07:00`),
    };
    await recordSale(sbClient, ctxA5, { quantity: 10, unit: "kg", transactionAt: ctxA5.now });
    await correctLastSale(sbClient, ctxA5, 25);

    try {
      // Corrected original row status = 'corrected'. But replacement row status = 'confirmed'.
      // Attempting NO_SALE should FAIL because replacement is active!
      let threw = false;
      let errCode = "";
      try {
        await setDailyStatus(sbClient, ctxA5, "NO_SALE");
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_HAS_SALES";
      record(10, "corrected original does not count but replacement DOES block NO_SALE", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(10, "corrected original does not count", "STATUS_CONFLICT", false, err.message);
    }

    try {
      // Cancel the replacement sale on date 5
      await cancelLastSale(sbClient, ctxA5);
      // Now date 5 has 1 corrected and 1 cancelled transaction. Zero confirmed transactions!
      const res = await setDailyStatus(sbClient, ctxA5, "CLOSED");
      const passed = res.status === "CLOSED" && res.localDate === date5;
      record(11, "confirmed correction replacement DOES count, and cancelling it permits CLOSED", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(11, "confirmed correction replacement DOES count", "STATUS_CONFLICT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 12-14: Existing daily status behavior (idempotency and conflicts)
    // ------------------------------------------------------------------------
    try {
      // Date 4 is NO_SALE. Submitting NO_SALE again must be duplicate-safe
      const dup = await setDailyStatus(sbClient, ctxA4, "NO_SALE");
      const passed = dup.isDuplicate === true && dup.status === "NO_SALE";
      record(12, "repeated NO_SALE remains idempotent", "IDEMPOTENCY", passed);
    } catch (err: any) {
      record(12, "repeated NO_SALE remains idempotent", "IDEMPOTENCY", false, err.message);
    }

    try {
      // Date 5 is CLOSED. Submitting CLOSED again must be duplicate-safe
      const dup = await setDailyStatus(sbClient, ctxA5, "CLOSED");
      const passed = dup.isDuplicate === true && dup.status === "CLOSED";
      record(13, "repeated CLOSED remains idempotent", "IDEMPOTENCY", passed);
    } catch (err: any) {
      record(13, "repeated CLOSED remains idempotent", "IDEMPOTENCY", false, err.message);
    }

    try {
      // Date 4 is NO_SALE. Submitting CLOSED must throw DAILY_STATUS_CONFLICT
      let threw = false;
      let errCode = "";
      try {
        await setDailyStatus(sbClient, ctxA4, "CLOSED");
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAILY_STATUS_CONFLICT";
      record(14, "NO_SALE ↔ CLOSED conflict behavior unchanged", "STATUS_CONFLICT", passed);
    } catch (err: any) {
      record(14, "NO_SALE ↔ CLOSED conflict behavior unchanged", "STATUS_CONFLICT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 15-17: Correction, Cancellation, and Reporting integrity
    // ------------------------------------------------------------------------
    const date6 = "2026-10-15";
    const ctxA6: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${date6}T10:00:00+07:00`),
    };
    const s1 = await recordSale(sbClient, ctxA6, { quantity: 10, unit: "kg", transactionAt: ctxA6.now });
    const s2 = await recordSale(sbClient, ctxA6, { quantity: 20, unit: "kg", transactionAt: ctxA6.now });

    try {
      const cor = await correctLastSale(sbClient, ctxA6, 30);
      const passed = cor.newQuantity === 30 && cor.newTotalAmount === 840000;
      record(15, "correction flow still works accurately", "FLOW", passed);
    } catch (err: any) {
      record(15, "correction flow still works accurately", "FLOW", false, err.message);
    }

    try {
      const can = await cancelLastSale(sbClient, ctxA6);
      const passed = can.status === "cancelled" && can.quantity === 30;
      record(16, "cancellation flow still works accurately", "FLOW", passed);
    } catch (err: any) {
      record(16, "cancellation flow still works accurately", "FLOW", false, err.message);
    }

    try {
      // On date 6, remaining confirmed sale is s1 (10kg, 280k).
      const rep = await getSalesReport(sbClient, ctxA6, "today");
      const passed = rep.transactionCount === 1 && rep.totalQuantity === 10 && rep.totalRevenue === 280000;
      record(17, "report totals remain correct and ignore cancelled/corrected", "REPORT", passed);
    } catch (err: any) {
      record(17, "report totals remain correct", "REPORT", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Test 18: Timezone boundary correctly maps sale/status date
    // ------------------------------------------------------------------------
    try {
      // In WITA (UTC+8, Business B):
      // Timestamp 2026-10-20T16:30:00Z -> In WIB it is 23:30 (2026-10-20), but in WITA it is 00:30 (2026-10-21)!
      // If we mark Business B as NO_SALE on 2026-10-21:
      const ctxBTimezone: ExecutionContext = {
        businessId: bizB,
        source: "whatsapp",
        senderPhone: "+6289876543210",
        now: new Date("2026-10-21T02:00:00+08:00"),
      };
      await setDailyStatus(sbClient, ctxBTimezone, "NO_SALE");

      // Now attempt to record sale at 2026-10-20T16:30:00Z (which is 2026-10-21 00:30 WITA)
      let threw = false;
      let errCode = "";
      try {
        await recordSale(sbClient, ctxBTimezone, {
          quantity: 5,
          unit: "kg",
          transactionAt: new Date("2026-10-20T16:30:00Z"),
        });
      } catch (err: any) {
        threw = true;
        errCode = err.code;
      }
      const passed = threw && errCode === "DAY_STATUS_CONFLICT";
      record(18, "timezone boundary correctly maps sale/status date (WITA cross-day boundary)", "TIMEZONE", passed);
    } catch (err: any) {
      record(18, "timezone boundary correctly maps sale/status date", "TIMEZONE", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 19-20: Tenant Isolation across status and sales
    // ------------------------------------------------------------------------
    const dateIso = "2026-10-25";
    const ctxA_Iso: ExecutionContext = {
      ...ctxA1,
      now: new Date(`${dateIso}T10:00:00+07:00`),
    };
    const ctxB_Iso: ExecutionContext = {
      businessId: bizB,
      source: "whatsapp",
      senderPhone: "+6289876543210",
      now: new Date(`${dateIso}T11:00:00+08:00`),
    };

    try {
      // Mark Business A as CLOSED on dateIso
      await setDailyStatus(sbClient, ctxA_Iso, "CLOSED");

      // Business B should be completely unaffected and able to record a sale on dateIso
      const saleB = await recordSale(sbClient, ctxB_Iso, { quantity: 10, unit: "kg", transactionAt: ctxB_Iso.now });
      const passed = saleB.status === "confirmed" && saleB.businessId === bizB;
      record(19, "Business A status cannot affect Business B sales", "TENANT_ISOLATION", passed);
    } catch (err: any) {
      record(19, "Business A status cannot affect Business B sales", "TENANT_ISOLATION", false, err.message);
    }

    try {
      // Business B has confirmed sale on dateIso. Business A should still be CLOSED and unaffected.
      const statusA = (await client.query("SELECT status FROM public.business_daily_status WHERE business_id = $1 AND local_date = $2", [bizA, dateIso])).rows[0]?.status;
      const passed = statusA === "CLOSED";
      record(20, "Business B sale cannot affect Business A status", "TENANT_ISOLATION", passed);
    } catch (err: any) {
      record(20, "Business B sale cannot affect Business A status", "TENANT_ISOLATION", false, err.message);
    }

    // ------------------------------------------------------------------------
    // Tests 21-22: Concurrency Tests (Real concurrent async requests)
    // ------------------------------------------------------------------------
    // Test 21: NO_SALE vs SALE concurrency
    const clientConcurrency1 = new Client({ connectionString: PG_URL });
    const clientConcurrency2 = new Client({ connectionString: PG_URL });
    await clientConcurrency1.connect();
    await clientConcurrency2.connect();

    try {
      const sb1 = createPgSupabaseAdapter(clientConcurrency1);
      const sb2 = createPgSupabaseAdapter(clientConcurrency2);
      const dateConc1 = "2026-11-01";
      const ctxConc1: ExecutionContext = {
        ...ctxA1,
        now: new Date(`${dateConc1}T10:00:00+07:00`),
      };

      // Launch near-simultaneous setDailyStatus and recordSale
      const p1 = setDailyStatus(sb1, ctxConc1, "NO_SALE");
      const p2 = recordSale(sb2, ctxConc1, { quantity: 15, unit: "kg", transactionAt: ctxConc1.now });

      const results = await Promise.allSettled([p1, p2]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly ONE must succeed and ONE must fail
      const oneWon = fulfilled.length === 1 && rejected.length === 1;

      // Verify database state: NEVER both NO_SALE and confirmed sale!
      const statusInDb = (await client.query("SELECT status FROM public.business_daily_status WHERE business_id = $1 AND local_date = $2", [bizA, dateConc1])).rows;
      const salesInDb = (await client.query("SELECT status FROM public.transactions WHERE business_id = $1 AND transaction_at >= '2026-11-01T00:00:00+07:00' AND transaction_at <= '2026-11-01T23:59:59+07:00' AND status = 'confirmed'", [bizA])).rows;

      const hasStatus = statusInDb.length > 0 && statusInDb[0].status === "NO_SALE";
      const hasSales = salesInDb.length > 0;
      const noContradiction = (hasStatus && !hasSales) || (!hasStatus && hasSales);

      record(21, "concurrent NO_SALE vs SALE cannot leave contradictory state (exactly one wins)", "CONCURRENCY", oneWon && noContradiction);
    } catch (err: any) {
      record(21, "concurrent NO_SALE vs SALE cannot leave contradictory state", "CONCURRENCY", false, err.message);
    } finally {
      await clientConcurrency1.end();
      await clientConcurrency2.end();
    }

    // Test 22: CLOSED vs SALE concurrency
    const clientConcurrency3 = new Client({ connectionString: PG_URL });
    const clientConcurrency4 = new Client({ connectionString: PG_URL });
    await clientConcurrency3.connect();
    await clientConcurrency4.connect();

    try {
      const sb3 = createPgSupabaseAdapter(clientConcurrency3);
      const sb4 = createPgSupabaseAdapter(clientConcurrency4);
      const dateConc2 = "2026-11-02";
      const ctxConc2: ExecutionContext = {
        ...ctxA1,
        now: new Date(`${dateConc2}T10:00:00+07:00`),
      };

      // Launch near-simultaneous setDailyStatus(CLOSED) and recordSale
      const p3 = setDailyStatus(sb3, ctxConc2, "CLOSED");
      const p4 = recordSale(sb4, ctxConc2, { quantity: 20, unit: "kg", transactionAt: ctxConc2.now });

      const results = await Promise.allSettled([p3, p4]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      const oneWon = fulfilled.length === 1 && rejected.length === 1;

      const statusInDb = (await client.query("SELECT status FROM public.business_daily_status WHERE business_id = $1 AND local_date = $2", [bizA, dateConc2])).rows;
      const salesInDb = (await client.query("SELECT status FROM public.transactions WHERE business_id = $1 AND transaction_at >= '2026-11-02T00:00:00+07:00' AND transaction_at <= '2026-11-02T23:59:59+07:00' AND status = 'confirmed'", [bizA])).rows;

      const hasStatus = statusInDb.length > 0 && statusInDb[0].status === "CLOSED";
      const hasSales = salesInDb.length > 0;
      const noContradiction = (hasStatus && !hasSales) || (!hasStatus && hasSales);

      record(22, "concurrent CLOSED vs SALE cannot leave contradictory state (exactly one wins)", "CONCURRENCY", oneWon && noContradiction);
    } catch (err: any) {
      record(22, "concurrent CLOSED vs SALE cannot leave contradictory state", "CONCURRENCY", false, err.message);
    } finally {
      await clientConcurrency3.end();
      await clientConcurrency4.end();
    }

    console.log("\n=== Hardening Test Results Summary ===");
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

runHardeningTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
