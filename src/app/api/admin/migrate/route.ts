import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIGRATION_VERSION = "20260930090000";
const MIGRATION_NAME = "step5_authorized_senders";

const MIGRATION_SQL = `
-- ============================================================================
-- OXID WA Ledger - STEP 5: Authorized Senders & WhatsApp Webhook Infrastructure
-- Migration: 20260930090000_step5_authorized_senders.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_authorized_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_label TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_whatsapp_authorized_senders UNIQUE (business_id, phone_number)
);

CREATE OR REPLACE TRIGGER trg_whatsapp_authorized_senders_updated_at
  BEFORE UPDATE ON public.whatsapp_authorized_senders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_whatsapp_authorized_senders_business
  ON public.whatsapp_authorized_senders(business_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_authorized_senders_lookup
  ON public.whatsapp_authorized_senders(business_id, phone_number)
  WHERE active = true;

ALTER TABLE public.processed_whatsapp_messages
  ADD COLUMN IF NOT EXISTS response_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

ALTER TABLE public.whatsapp_authorized_senders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_authorized_senders FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_authorized_senders TO authenticated;
GRANT ALL ON public.whatsapp_authorized_senders TO service_role;

DROP POLICY IF EXISTS "whatsapp_authorized_senders_select_member" ON public.whatsapp_authorized_senders;
CREATE POLICY "whatsapp_authorized_senders_select_member"
  ON public.whatsapp_authorized_senders
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "whatsapp_authorized_senders_insert_admin" ON public.whatsapp_authorized_senders;
CREATE POLICY "whatsapp_authorized_senders_insert_admin"
  ON public.whatsapp_authorized_senders
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "whatsapp_authorized_senders_update_admin" ON public.whatsapp_authorized_senders;
CREATE POLICY "whatsapp_authorized_senders_update_admin"
  ON public.whatsapp_authorized_senders
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

DROP POLICY IF EXISTS "whatsapp_authorized_senders_delete_admin" ON public.whatsapp_authorized_senders;
CREATE POLICY "whatsapp_authorized_senders_delete_admin"
  ON public.whatsapp_authorized_senders
  FOR DELETE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

CREATE OR REPLACE FUNCTION public.claim_whatsapp_message(
  p_message_id TEXT,
  p_business_id UUID,
  p_sender_phone TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_payload_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted_id TEXT;
  v_existing_status TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RETURN jsonb_build_object('status', 'invalid_business');
  END IF;

  INSERT INTO public.processed_whatsapp_messages (
    message_id,
    business_id,
    sender_phone,
    message_type,
    processing_status,
    received_at,
    payload_hash
  )
  VALUES (
    p_message_id,
    p_business_id,
    p_sender_phone,
    COALESCE(p_message_type, 'text'),
    'processing',
    now(),
    p_payload_hash
  )
  ON CONFLICT (message_id) DO NOTHING
  RETURNING message_id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;

  SELECT processing_status INTO v_existing_status
  FROM public.processed_whatsapp_messages
  WHERE message_id = p_message_id;

  RETURN jsonb_build_object(
    'status', 'already_' || COALESCE(v_existing_status, 'unknown')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_message(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_message(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_whatsapp_message(
  p_message_id TEXT,
  p_processing_status TEXT,
  p_response_text TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.processed_whatsapp_messages
  SET
    processing_status = p_processing_status,
    processed_at = now(),
    response_text = p_response_text,
    error_message = p_error_message
  WHERE message_id = p_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_whatsapp_message(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_whatsapp_message(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

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

    // Fetch verified routines and tables
    const res = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('claim_whatsapp_message', 'complete_whatsapp_message')
      ORDER BY routine_name;
    `);

    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'whatsapp_authorized_senders';
    `);

    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 5 migration applied successfully to Supabase PostgreSQL",
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
