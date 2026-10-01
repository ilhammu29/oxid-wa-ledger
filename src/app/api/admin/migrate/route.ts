import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20261001120000";
const MIGRATION_NAME = "step8_whatsapp_production_migration";

const MIGRATION_SQL = `
-- ----------------------------------------------------------------------------
-- 1. Extend whatsapp_connections with Production Metadata & Template Settings
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS verified_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS reminder_template_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS reminder_template_language TEXT NOT NULL DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS reminder_template_status TEXT NOT NULL DEFAULT 'unconfigured';

-- Safely expand status check constraint to include 'active' if needed
DO $$
BEGIN
  ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_status_check;
  ALTER TABLE public.whatsapp_connections
    ADD CONSTRAINT whatsapp_connections_status_check
    CHECK (status IN ('connected', 'active', 'disconnected', 'pending_verification', 'rate_limited'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Check constraint for reminder_template_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_whatsapp_reminder_template_status'
  ) THEN
    ALTER TABLE public.whatsapp_connections
      ADD CONSTRAINT chk_whatsapp_reminder_template_status
      CHECK (reminder_template_status IN ('unconfigured', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Extend whatsapp_authorized_senders with Reminder Flag
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_authorized_senders
  ADD COLUMN IF NOT EXISTS receive_reminders BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 3. Record Migration in supabase_migrations
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. PostgREST Schema Cache Reload
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
`;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL;

  if (!rawPgUrl) {
    return NextResponse.json(
      { error: "No PostgreSQL connection string available on server" },
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

    // Reload schema cache again after commit
    await client.query("NOTIFY pgrst, 'reload schema';");

    // 1. Verify columns in whatsapp_connections
    const connCols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_connections'
        AND column_name IN (
          'display_phone_number',
          'verified_name',
          'reminder_template_name',
          'reminder_template_language',
          'reminder_template_status'
        )
      ORDER BY column_name;
    `);

    // 2. Verify column in whatsapp_authorized_senders
    const senderCols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_authorized_senders'
        AND column_name = 'receive_reminders';
    `);

    // 3. Verify constraints
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
        AND conname IN ('whatsapp_connections_status_check', 'chk_whatsapp_reminder_template_status')
      ORDER BY conname;
    `);

    // 4. Verify migration record
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 8 migration applied successfully to production Supabase PostgreSQL",
      verifiedConnectionColumns: connCols.rows,
      verifiedSenderColumns: senderCols.rows,
      verifiedConstraints: constraints.rows,
      appliedMigration: migRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
