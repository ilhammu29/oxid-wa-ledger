import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

const MIGRATION_VERSION = "20260930120000";
const MIGRATION_NAME = "step6a_telegram_adapter";

const MIGRATION_SQL = `
-- ============================================================================
-- OXID WA Ledger - STEP 6A: Telegram Bot Adapter Infrastructure
-- Migration: 20260930120000_step6a_telegram_adapter.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_authorized_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  display_label TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_telegram_authorized_users UNIQUE (business_id, telegram_user_id)
);

CREATE OR REPLACE TRIGGER trg_telegram_authorized_users_updated_at
  BEFORE UPDATE ON public.telegram_authorized_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_telegram_authorized_users_business
  ON public.telegram_authorized_users(business_id);

CREATE INDEX IF NOT EXISTS idx_telegram_authorized_users_lookup
  ON public.telegram_authorized_users(telegram_user_id)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.processed_telegram_updates (
  update_id BIGINT PRIMARY KEY,
  business_id UUID NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NULL,
  processing_status TEXT NOT NULL,
  response_text TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_telegram_updates_business
  ON public.processed_telegram_updates(business_id);

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('whatsapp', 'telegram', 'dashboard', 'system'));

ALTER TABLE public.business_daily_status DROP CONSTRAINT IF EXISTS business_daily_status_source_check;
ALTER TABLE public.business_daily_status ADD CONSTRAINT business_daily_status_source_check
  CHECK (source IN ('owner', 'whatsapp', 'telegram', 'system'));

ALTER TABLE public.telegram_authorized_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_authorized_users FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_authorized_users TO authenticated;
GRANT ALL ON public.telegram_authorized_users TO service_role;

DROP POLICY IF EXISTS "telegram_authorized_users_select_member" ON public.telegram_authorized_users;
CREATE POLICY "telegram_authorized_users_select_member"
  ON public.telegram_authorized_users
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "telegram_authorized_users_insert_admin" ON public.telegram_authorized_users;
CREATE POLICY "telegram_authorized_users_insert_admin"
  ON public.telegram_authorized_users
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "telegram_authorized_users_update_admin" ON public.telegram_authorized_users;
CREATE POLICY "telegram_authorized_users_update_admin"
  ON public.telegram_authorized_users
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

DROP POLICY IF EXISTS "telegram_authorized_users_delete_admin" ON public.telegram_authorized_users;
CREATE POLICY "telegram_authorized_users_delete_admin"
  ON public.telegram_authorized_users
  FOR DELETE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

ALTER TABLE public.processed_telegram_updates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.processed_telegram_updates FROM PUBLIC, anon;
GRANT SELECT ON public.processed_telegram_updates TO authenticated;
GRANT ALL ON public.processed_telegram_updates TO service_role;

DROP POLICY IF EXISTS "processed_telegram_updates_select_member" ON public.processed_telegram_updates;
CREATE POLICY "processed_telegram_updates_select_member"
  ON public.processed_telegram_updates
  FOR SELECT
  TO authenticated
  USING (business_id IS NOT NULL AND app_auth.is_business_member(business_id));

CREATE OR REPLACE FUNCTION public.claim_telegram_update(
  p_update_id BIGINT,
  p_business_id UUID DEFAULT NULL,
  p_telegram_user_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted_id BIGINT;
  v_existing_status TEXT;
BEGIN
  IF p_business_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RETURN jsonb_build_object('status', 'invalid_business');
  END IF;

  INSERT INTO public.processed_telegram_updates (
    update_id,
    business_id,
    telegram_user_id,
    processing_status,
    created_at
  )
  VALUES (
    p_update_id,
    p_business_id,
    p_telegram_user_id,
    'processing',
    now()
  )
  ON CONFLICT (update_id) DO NOTHING
  RETURNING update_id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;

  SELECT processing_status INTO v_existing_status
  FROM public.processed_telegram_updates
  WHERE update_id = p_update_id;

  RETURN jsonb_build_object(
    'status', 'already_' || COALESCE(v_existing_status, 'unknown')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_telegram_update(BIGINT, UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_telegram_update(BIGINT, UUID, BIGINT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_telegram_update(
  p_update_id BIGINT,
  p_processing_status TEXT,
  p_business_id UUID DEFAULT NULL,
  p_response_text TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.processed_telegram_updates
  SET
    processing_status = p_processing_status,
    business_id = COALESCE(p_business_id, business_id),
    processed_at = now(),
    response_text = p_response_text,
    error_message = p_error_message
  WHERE update_id = p_update_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_telegram_update(BIGINT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_telegram_update(BIGINT, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO NOTHING;
`;

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
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

    const res = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('claim_telegram_update', 'complete_telegram_update')
      ORDER BY routine_name;
    `);

    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('telegram_authorized_users', 'processed_telegram_updates')
      ORDER BY table_name;
    `);

    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 6A migration applied successfully to Supabase PostgreSQL",
      functions: res.rows,
      tables: tableRes.rows,
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
