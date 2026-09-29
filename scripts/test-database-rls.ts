import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const PG_URL = process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

interface TestReport {
  name: string;
  category: "RLS" | "Integrity" | "Security";
  passed: boolean;
  error?: string;
}

const reports: TestReport[] = [];

function record(name: string, category: "RLS" | "Integrity" | "Security", passed: boolean, error?: string) {
  reports.push({ name, category, passed, error });
  const symbol = passed ? "✓" : "✗";
  console.log(`  ${symbol} [${category}] ${name}${error ? ` - ERROR: ${error}` : ""}`);
}

async function runTests() {
  console.log("=== OXID WA Ledger - Step 2 Database & RLS Test Suite ===\n");
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  try {
    console.log("1. Setting up Supabase Auth emulation & roles...");
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

    console.log("2. Applying Migrations...");
    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      console.log(`✓ Applied ${file}`);
    }
    console.log("✓ All migrations applied cleanly!\n");

    console.log("3. Inserting Test Users & Businesses (as superuser)...");
    const userOwnerA = "11111111-1111-1111-1111-111111111111";
    const userMemberA = "22222222-2222-2222-2222-222222222222";
    const userOwnerB = "33333333-3333-3333-3333-333333333333";
    const userNonMember = "44444444-4444-4444-4444-444444444444";

    await client.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${userOwnerA}', 'ownerA@oxid.local'),
        ('${userMemberA}', 'memberA@oxid.local'),
        ('${userOwnerB}', 'ownerB@oxid.local'),
        ('${userNonMember}', 'stranger@oxid.local')
      ON CONFLICT (id) DO NOTHING;
    `);

    const bizA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const bizB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    await client.query(`
      INSERT INTO public.businesses (id, name, created_by) VALUES
        ('${bizA}', 'Catfish Pilot A', '${userOwnerA}'),
        ('${bizB}', 'Vegetable Store B', '${userOwnerB}')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.business_users (business_id, user_id, role) VALUES
        ('${bizA}', '${userOwnerA}', 'owner'),
        ('${bizA}', '${userMemberA}', 'member'),
        ('${bizB}', '${userOwnerB}', 'owner')
      ON CONFLICT (business_id, user_id) DO NOTHING;
    `);

    // Helper to run query as a specific role and user
    async function asUser<T = any>(userId: string | null, role: "authenticated" | "anon", fn: (c: Client) => Promise<T>): Promise<T> {
      await client.query("BEGIN;");
      try {
        await client.query(`SET LOCAL ROLE ${role};`);
        if (userId) {
          await client.query(`SELECT set_config('request.jwt.claim.sub', '${userId}', true);`);
        } else {
          await client.query(`SELECT set_config('request.jwt.claim.sub', '', true);`);
        }
        const res = await fn(client);
        await client.query("COMMIT;");
        return res;
      } catch (err) {
        await client.query("ROLLBACK;");
        throw err;
      }
    }

    console.log("4. Running RLS Tests...");

    // Test 1: Owner A can read Business A
    try {
      const res = await asUser(userOwnerA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses WHERE id = $1", [bizA]);
      });
      record("Owner A can read Business A", "RLS", res.rows.length === 1);
    } catch (e: any) {
      record("Owner A can read Business A", "RLS", false, e.message);
    }

    // Test 2: Owner A cannot read Business B
    try {
      const res = await asUser(userOwnerA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses WHERE id = $1", [bizB]);
      });
      record("Owner A cannot read Business B", "RLS", res.rows.length === 0);
    } catch (e: any) {
      record("Owner A cannot read Business B", "RLS", false, e.message);
    }

    // Test 3: Member A can access permitted Business A data
    try {
      const res = await asUser(userMemberA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses WHERE id = $1", [bizA]);
      });
      record("Member A can access permitted Business A data", "RLS", res.rows.length === 1);
    } catch (e: any) {
      record("Member A can access permitted Business A data", "RLS", false, e.message);
    }

    // Test 4: Member A cannot access Business B
    try {
      const res = await asUser(userMemberA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses WHERE id = $1", [bizB]);
      });
      record("Member A cannot access Business B", "RLS", res.rows.length === 0);
    } catch (e: any) {
      record("Member A cannot access Business B", "RLS", false, e.message);
    }

    // Test 5: Owner B cannot access Business A
    try {
      const res = await asUser(userOwnerB, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses WHERE id = $1", [bizA]);
      });
      record("Owner B cannot access Business A", "RLS", res.rows.length === 0);
    } catch (e: any) {
      record("Owner B cannot access Business A", "RLS", false, e.message);
    }

    // Test 6: Non-member cannot access either business
    try {
      const res = await asUser(userNonMember, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.businesses");
      });
      record("Non-member cannot access either business", "RLS", res.rows.length === 0);
    } catch (e: any) {
      record("Non-member cannot access either business", "RLS", false, e.message);
    }

    // Setup Products in A and B
    const prodA = "1111aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const prodB = "2222bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await client.query(`
      INSERT INTO public.products (id, business_id, name, unit, default_price, aliases, is_default)
      VALUES 
        ('${prodA}', '${bizA}', 'Lele Segar', 'kg', 28000, ARRAY['lele', 'ikan lele'], true),
        ('${prodB}', '${bizB}', 'Bayam Organik', 'ikat', 5000, ARRAY['bayam'], true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Test 7: Product rows cannot cross tenants
    try {
      const res = await asUser(userOwnerA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.products");
      });
      const ids = res.rows.map((r) => r.id);
      record("Product rows cannot cross tenants", "RLS", ids.includes(prodA) && !ids.includes(prodB));
    } catch (e: any) {
      record("Product rows cannot cross tenants", "RLS", false, e.message);
    }

    // Test 8: Transactions cannot cross tenants
    const txA = "9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const txB = "9999bbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await client.query(`
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount)
      VALUES 
        ('${txA}', '${bizA}', '${prodA}', 2.500, 'kg', 28000, 70000),
        ('${txB}', '${bizB}', '${prodB}', 10.000, 'ikat', 5000, 50000)
      ON CONFLICT (id) DO NOTHING;
    `);

    try {
      const res = await asUser(userOwnerA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.transactions");
      });
      const ids = res.rows.map((r) => r.id);
      record("Transactions cannot cross tenants", "RLS", ids.includes(txA) && !ids.includes(txB));
    } catch (e: any) {
      record("Transactions cannot cross tenants", "RLS", false, e.message);
    }

    // Test 9: A user cannot insert a row using another business_id
    try {
      let threw = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query(`
          INSERT INTO public.products (business_id, name, unit, default_price)
          VALUES ('${bizB}', 'Injected Product', 'kg', 10000)
        `);
      });
    } catch (e: any) {
      record("User cannot insert row using another business_id", "RLS", true);
    }

    // Test 10: A user cannot change a row's business_id to another tenant
    try {
      let updated = 0;
      await asUser(userOwnerA, "authenticated", async (c) => {
        const res = await c.query(`
          UPDATE public.products SET business_id = '${bizB}' WHERE id = '${prodA}'
        `);
        updated = res.rowCount || 0;
      });
      record("User cannot change row business_id to another tenant", "RLS", updated === 0);
    } catch (e: any) {
      record("User cannot change row business_id to another tenant", "RLS", true);
    }

    // Test 11: Unauthorized hard deletion of ledger transactions is prevented
    try {
      let deleted = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query("DELETE FROM public.transactions WHERE id = $1", [txA]);
        deleted = true;
      });
      record("Unauthorized hard deletion of ledger transactions is prevented", "RLS", false, "Delete succeeded unexpectedly");
    } catch (e: any) {
      record("Unauthorized hard deletion of ledger transactions is prevented", "RLS", true);
    }

    // Test 12: Audit events cannot be arbitrarily rewritten
    const evA = "eeeeaeee-eeee-eeee-eeee-eeeeeeeeeeee";
    await client.query(`
      INSERT INTO public.transaction_events (id, business_id, transaction_id, event_type, new_values)
      VALUES ('${evA}', '${bizA}', '${txA}', 'created', '{"total": 70000}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    try {
      let updated = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query("UPDATE public.transaction_events SET new_values = '{\"total\": 0}' WHERE id = $1", [evA]);
        updated = true;
      });
      record("Audit events cannot be arbitrarily rewritten", "RLS", false, "Update succeeded unexpectedly");
    } catch (e: any) {
      record("Audit events cannot be arbitrarily rewritten", "RLS", true);
    }

    // Test 12b: Authenticated user cannot delete transaction_events
    try {
      let deleted = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query("DELETE FROM public.transaction_events WHERE id = $1", [evA]);
        deleted = true;
      });
      record("Authenticated user cannot delete transaction_events", "RLS", false, "Delete succeeded unexpectedly");
    } catch (e: any) {
      record("Authenticated user cannot delete transaction_events", "RLS", true);
    }

    // Test 13: Processed WhatsApp messages cannot be written by ordinary browser users
    try {
      let inserted = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query(`
          INSERT INTO public.processed_whatsapp_messages (message_id, business_id, sender_phone)
          VALUES ('msg-hacked-1', '${bizA}', '+6281111')
        `);
        inserted = true;
      });
      record("Processed WhatsApp messages cannot be written by authenticated users", "Security", false, "Write succeeded unexpectedly");
    } catch (e: any) {
      record("Processed WhatsApp messages cannot be written by authenticated users", "Security", true);
    }

    // Test 14: Notification log writes follow intended privileges
    try {
      let inserted = false;
      await asUser(userOwnerA, "authenticated", async (c) => {
        await c.query(`
          INSERT INTO public.notification_logs (business_id, notification_type, local_date, status)
          VALUES ('${bizA}', 'daily_reminder', '2026-09-30', 'sent')
        `);
        inserted = true;
      });
      record("Notification log writes blocked for authenticated users", "Security", false, "Write succeeded unexpectedly");
    } catch (e: any) {
      record("Notification log writes blocked for authenticated users", "Security", true);
    }

    // Test 15: Anonymous access is denied
    try {
      let anonRead = false;
      await asUser(null, "anon", async (c) => {
        const res = await c.query("SELECT * FROM public.businesses");
        anonRead = (res.rowCount || 0) > 0;
      });
      record("Anonymous access is denied to businesses", "Security", false, "Anon could read rows");
    } catch (e: any) {
      record("Anonymous access is denied to businesses", "Security", true);
    }

    // Test 16: UPDATE policies have corresponding SELECT access and correct WITH CHECK
    try {
      const res = await asUser(userOwnerA, "authenticated", async (c) => {
        const up = await c.query("UPDATE public.products SET name = 'Lele Segar Jumbo' WHERE id = $1 RETURNING name", [prodA]);
        return up.rows[0]?.name;
      });
      record("UPDATE policies work for authorized owner with WITH CHECK", "RLS", res === "Lele Segar Jumbo");
    } catch (e: any) {
      record("UPDATE policies work for authorized owner with WITH CHECK", "RLS", false, e.message);
    }

    // Test 17: Membership policies do not recurse or fail unexpectedly
    try {
      const res = await asUser(userMemberA, "authenticated", async (c) => {
        return await c.query("SELECT * FROM public.business_users WHERE business_id = $1", [bizA]);
      });
      record("Membership policies query cleanly without recursion", "RLS", res.rows.length === 2);
    } catch (e: any) {
      record("Membership policies query cleanly without recursion", "RLS", false, e.message);
    }

    console.log("\n5. Running Data Integrity Tests...");

    // Integrity 1: Negative quantity rejected
    try {
      let rejected = false;
      await client.query(`
        INSERT INTO public.transactions (business_id, quantity, unit, unit_price, total_amount)
        VALUES ('${bizA}', -2.5, 'kg', 28000, 70000)
      `);
      record("Negative quantity rejected", "Integrity", false, "Allowed negative quantity");
    } catch (e: any) {
      record("Negative quantity rejected", "Integrity", true);
    }

    // Integrity 2: Zero quantity rejected
    try {
      let rejected = false;
      await client.query(`
        INSERT INTO public.transactions (business_id, quantity, unit, unit_price, total_amount)
        VALUES ('${bizA}', 0, 'kg', 28000, 0)
      `);
      record("Zero quantity rejected", "Integrity", false, "Allowed zero quantity");
    } catch (e: any) {
      record("Zero quantity rejected", "Integrity", true);
    }

    // Integrity 3: Fractional quantity accepted (2.75 kg)
    try {
      const res = await client.query(`
        INSERT INTO public.transactions (business_id, quantity, unit, unit_price, total_amount)
        VALUES ('${bizA}', 2.750, 'kg', 28000, 77000)
        RETURNING quantity, total_amount
      `);
      record("Fractional quantity accepted (2.750 kg -> Rp77,000)", "Integrity", Number(res.rows[0].quantity) === 2.75);
    } catch (e: any) {
      record("Fractional quantity accepted (2.750 kg -> Rp77,000)", "Integrity", false, e.message);
    }

    // Integrity 4: Negative price rejected
    try {
      await client.query(`
        INSERT INTO public.products (business_id, name, unit, default_price)
        VALUES ('${bizA}', 'Negative Product', 'kg', -100)
      `);
      record("Negative price rejected", "Integrity", false, "Allowed negative price");
    } catch (e: any) {
      record("Negative price rejected", "Integrity", true);
    }

    // Integrity 5: Duplicate daily status rejected (business_id + local_date)
    try {
      await client.query(`
        INSERT INTO public.business_daily_status (business_id, local_date, status)
        VALUES ('${bizA}', '2026-09-30', 'ACTIVE');
      `);
      await client.query(`
        INSERT INTO public.business_daily_status (business_id, local_date, status)
        VALUES ('${bizA}', '2026-09-30', 'NO_SALE');
      `);
      record("Duplicate daily status rejected", "Integrity", false, "Allowed duplicate status");
    } catch (e: any) {
      record("Duplicate daily status rejected (business_id + local_date)", "Integrity", true);
    }

    // Integrity 6: Duplicate WhatsApp message ID rejected
    try {
      await client.query(`
        INSERT INTO public.processed_whatsapp_messages (message_id, business_id, sender_phone)
        VALUES ('wam-12345', '${bizA}', '+628123456');
      `);
      await client.query(`
        INSERT INTO public.processed_whatsapp_messages (message_id, business_id, sender_phone)
        VALUES ('wam-12345', '${bizA}', '+628123456');
      `);
      record("Duplicate WhatsApp message ID rejected", "Integrity", false, "Allowed duplicate WA message");
    } catch (e: any) {
      record("Duplicate WhatsApp message ID rejected", "Integrity", true);
    }

    // Integrity 7: Duplicate daily reminder identity rejected (business_id + notification_type + local_date)
    try {
      await client.query(`
        INSERT INTO public.notification_logs (business_id, notification_type, local_date, status)
        VALUES ('${bizA}', 'daily_reminder', '2026-09-30', 'sent');
      `);
      await client.query(`
        INSERT INTO public.notification_logs (business_id, notification_type, local_date, status)
        VALUES ('${bizA}', 'daily_reminder', '2026-09-30', 'pending');
      `);
      record("Duplicate daily reminder identity rejected", "Integrity", false, "Allowed duplicate reminder");
    } catch (e: any) {
      record("Duplicate daily reminder identity rejected", "Integrity", true);
    }

    // Integrity 8: Foreign business product reference cannot create an inconsistent transaction
    try {
      await client.query(`
        INSERT INTO public.transactions (business_id, product_id, quantity, unit, unit_price, total_amount)
        VALUES ('${bizA}', '${prodB}', 1, 'ikat', 5000, 5000)
      `);
      record("Foreign business product reference rejected by composite FK", "Integrity", false, "Cross-business product allowed");
    } catch (e: any) {
      record("Foreign business product reference rejected by composite FK", "Integrity", true);
    }

    // Integrity 9: Deleting / replacing WhatsApp connection does not destroy historical transactions
    try {
      const connId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      await client.query(`
        INSERT INTO public.whatsapp_connections (id, business_id, phone_number, phone_number_id, status)
        VALUES ('${connId}', '${bizA}', '+628999999', 'wa-channel-1', 'connected')
        ON CONFLICT (id) DO NOTHING;
      `);
      await client.query(`DELETE FROM public.whatsapp_connections WHERE id = '${connId}';`);
      const txCheck = await client.query("SELECT COUNT(*) FROM public.transactions WHERE business_id = $1", [bizA]);
      record("Deleting/replacing WhatsApp connection preserves transactions", "Integrity", Number(txCheck.rows[0].count) >= 2);
    } catch (e: any) {
      record("Deleting/replacing WhatsApp connection preserves transactions", "Integrity", false, e.message);
    }

    // Integrity 10: Privileged delete of transaction with audit event is blocked by FK
    const txHardId = "8888aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const evHardId = "8888eeee-eeee-eeee-eeee-eeeeeeeeeeee";
    await client.query(`
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount, status)
      VALUES ('${txHardId}', '${bizA}', '${prodA}', 1.000, 'kg', 28000, 28000, 'confirmed')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO public.transaction_events (id, business_id, transaction_id, event_type, new_values)
      VALUES ('${evHardId}', '${bizA}', '${txHardId}', 'created', '{"status": "confirmed"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);
    try {
      await client.query(`DELETE FROM public.transactions WHERE id = '${txHardId}';`);
      record("Privileged delete of transaction with audit event is blocked by FK", "Integrity", false, "Delete unexpectedly succeeded");
    } catch (e: any) {
      const isFkBlock = e.code === "23503" || e.message.includes("violates foreign key constraint");
      record("Privileged delete of transaction with audit event is blocked by FK", "Integrity", isFkBlock, e.message);
    }

    // Integrity 11: Privileged delete of business with audit event is blocked by FK
    try {
      await client.query(`DELETE FROM public.businesses WHERE id = '${bizA}';`);
      record("Privileged delete of business with audit event is blocked by FK", "Integrity", false, "Delete business unexpectedly succeeded");
    } catch (e: any) {
      const isFkBlock = e.code === "23503" || e.message.includes("violates foreign key constraint");
      record("Privileged delete of business with audit event is blocked by FK", "Integrity", isFkBlock, e.message);
    }

    // Integrity 12: Deleting product referenced by transaction is blocked
    try {
      await client.query(`DELETE FROM public.products WHERE id = '${prodA}';`);
      record("Deleting product referenced by transaction is blocked", "Integrity", false, "Delete product unexpectedly succeeded");
    } catch (e: any) {
      const isFkBlock = e.code === "23503" || e.message.includes("violates foreign key constraint");
      record("Deleting product referenced by transaction is blocked", "Integrity", isFkBlock, e.message);
    }

    // Integrity 13: Deleting auth user does not erase transaction history (ON DELETE SET NULL)
    const userTempAuthor = "99999999-9999-9999-9999-999999999999";
    const txAuthorTestId = "7777aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const evAuthorTestId = "7777eeee-eeee-eeee-eeee-eeeeeeeeeeee";
    await client.query(`
      INSERT INTO auth.users (id, email) VALUES ('${userTempAuthor}', 'tempauthor@oxid.local')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount, created_by_user_id)
      VALUES ('${txAuthorTestId}', '${bizA}', '${prodA}', 3.000, 'kg', 28000, 84000, '${userTempAuthor}')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO public.transaction_events (id, business_id, transaction_id, event_type, actor_user_id)
      VALUES ('${evAuthorTestId}', '${bizA}', '${txAuthorTestId}', 'created', '${userTempAuthor}')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`DELETE FROM auth.users WHERE id = '${userTempAuthor}';`);
    const txAfterUserDel = await client.query("SELECT created_by_user_id FROM public.transactions WHERE id = $1", [txAuthorTestId]);
    const evAfterUserDel = await client.query("SELECT actor_user_id FROM public.transaction_events WHERE id = $1", [evAuthorTestId]);
    const userDeletedPreserved = txAfterUserDel.rows.length === 1 && txAfterUserDel.rows[0].created_by_user_id === null &&
                                evAfterUserDel.rows.length === 1 && evAfterUserDel.rows[0].actor_user_id === null;
    record("Deleting auth user does not erase transaction history", "Integrity", userDeletedPreserved);

    // Integrity 14: Transaction correction workflow preserves history and maintains valid FK references
    const txOriginal = "6666aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const txCorrected = "5555aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await client.query(`
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount, status)
      VALUES ('${txOriginal}', '${bizA}', '${prodA}', 2.000, 'kg', 28000, 56000, 'confirmed')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO public.transaction_events (business_id, transaction_id, event_type, new_values)
      VALUES ('${bizA}', '${txOriginal}', 'created', '{"status": "confirmed"}'::jsonb);
    `);
    // Perform correction: original status becomes 'corrected', new transaction supersedes it
    await client.query(`UPDATE public.transactions SET status = 'corrected' WHERE id = '${txOriginal}';`);
    await client.query(`
      INSERT INTO public.transaction_events (business_id, transaction_id, event_type, old_values, new_values)
      VALUES ('${bizA}', '${txOriginal}', 'corrected', '{"status": "confirmed"}'::jsonb, '{"status": "corrected"}'::jsonb);
    `);
    await client.query(`
      INSERT INTO public.transactions (id, business_id, product_id, quantity, unit, unit_price, total_amount, status, supersedes_transaction_id)
      VALUES ('${txCorrected}', '${bizA}', '${prodA}', 3.000, 'kg', 28000, 84000, 'confirmed', '${txOriginal}')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO public.transaction_events (business_id, transaction_id, event_type, new_values)
      VALUES ('${bizA}', '${txCorrected}', 'created', '{"status": "confirmed", "supersedes": "${txOriginal}"}'::jsonb);
    `);
    // Verify supersedes link and immutability
    const corrCheck = await client.query("SELECT supersedes_transaction_id, status FROM public.transactions WHERE id = $1", [txCorrected]);
    const origCheck = await client.query("SELECT status FROM public.transactions WHERE id = $1", [txOriginal]);
    // Try to delete superseded original transaction: should fail due to supersedes_transaction_id FK constraint (and audit FK)
    let origDeleteBlocked = false;
    try {
      await client.query(`DELETE FROM public.transactions WHERE id = '${txOriginal}';`);
    } catch (e: any) {
      origDeleteBlocked = e.code === "23503";
    }
    const correctionValid = corrCheck.rows[0]?.supersedes_transaction_id === txOriginal &&
                            corrCheck.rows[0]?.status === "confirmed" &&
                            origCheck.rows[0]?.status === "corrected" &&
                            origDeleteBlocked;
    record("Transaction correction references remain valid and deletion blocked", "Integrity", correctionValid);

    // Summary
    console.log("\n=== Test Results Summary ===");
    const passed = reports.filter((r) => r.passed).length;
    const failed = reports.filter((r) => !r.passed).length;
    console.log(`Total: ${reports.length} | Passed: ${passed} | Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
