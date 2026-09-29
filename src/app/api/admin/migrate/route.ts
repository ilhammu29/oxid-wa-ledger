import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20260929225244";
const MIGRATION_NAME = "harden_transaction_audit_fk";

const MIGRATION_SQL = `
-- 1. Harden transaction_events.transaction_id foreign key
ALTER TABLE public.transaction_events
  DROP CONSTRAINT IF EXISTS transaction_events_transaction_id_fkey;

ALTER TABLE public.transaction_events
  ADD CONSTRAINT transaction_events_transaction_id_fkey
  FOREIGN KEY (transaction_id)
  REFERENCES public.transactions(id)
  ON DELETE RESTRICT;

-- 2. Harden transaction_events.business_id foreign key
ALTER TABLE public.transaction_events
  DROP CONSTRAINT IF EXISTS transaction_events_business_id_fkey;

ALTER TABLE public.transaction_events
  ADD CONSTRAINT transaction_events_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE RESTRICT;

-- 3. Explicit defense-in-depth privileges
REVOKE DELETE ON public.transactions FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.transaction_events FROM authenticated, anon;

-- 4. Record migration in standard Supabase migration tracking table
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
`;

export async function POST(req: NextRequest) {
  const authKey = req.headers.get("x-migration-key");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedKey || authKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!rawPgUrl) {
    return NextResponse.json(
      { error: "POSTGRES_URL is not configured in the server environment" },
      { status: 500 }
    );
  }

  const cleanPgUrl = rawPgUrl.replace(/\?.*$/, "");
  const client = new Client({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query("BEGIN;");
    await client.query(MIGRATION_SQL);
    await client.query("COMMIT;");

    // Fetch constraints on transaction_events
    const res = await client.query(`
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      WHERE conrelid = 'public.transaction_events'::regclass;
    `);

    // Fetch applied migrations
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Hardening migration applied successfully to Supabase PostgreSQL",
      constraints: res.rows,
      appliedMigrations: migRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
