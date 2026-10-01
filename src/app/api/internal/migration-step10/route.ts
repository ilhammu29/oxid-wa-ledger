import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20261001200000";
const MIGRATION_NAME = "step10_client_launch_onboarding";

const MIGRATION_SQL = `
-- 1. Add metadata columns to public.businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS category TEXT NULL,
  ADD COLUMN IF NOT EXISTS owner_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS default_unit TEXT NULL DEFAULT 'kg';

-- 2. Create Table: public.telegram_pairing_tokens
CREATE TABLE IF NOT EXISTS public.telegram_pairing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_code TEXT NOT NULL,
  telegram_user_id BIGINT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_telegram_pairing_tokens_hash
  ON public.telegram_pairing_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_telegram_pairing_tokens_business
  ON public.telegram_pairing_tokens(business_id, expires_at);

-- 3. Create Table: public.business_onboarding_progress
CREATE TABLE IF NOT EXISTS public.business_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 1,
  profile_completed BOOLEAN NOT NULL DEFAULT true,
  product_completed BOOLEAN NOT NULL DEFAULT false,
  telegram_completed BOOLEAN NOT NULL DEFAULT false,
  first_transaction_completed BOOLEAN NOT NULL DEFAULT false,
  google_sheets_completed BOOLEAN NOT NULL DEFAULT false,
  google_sheets_skipped BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_business_onboarding_progress_biz
  ON public.business_onboarding_progress(business_id);

-- Updated_at trigger for business_onboarding_progress
DROP TRIGGER IF EXISTS trg_business_onboarding_progress_updated_at ON public.business_onboarding_progress;
CREATE TRIGGER trg_business_onboarding_progress_updated_at
  BEFORE UPDATE ON public.business_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Trigger to auto-initialize onboarding progress on new business creation
CREATE OR REPLACE FUNCTION public.trg_init_business_onboarding_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.business_onboarding_progress (
    business_id,
    current_step,
    profile_completed
  )
  VALUES (
    NEW.id,
    1,
    true
  )
  ON CONFLICT (business_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_onboarding_progress_init ON public.businesses;
CREATE TRIGGER trg_business_onboarding_progress_init
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_init_business_onboarding_progress();

-- 5. Backfill existing businesses into business_onboarding_progress
INSERT INTO public.business_onboarding_progress (
  business_id,
  current_step,
  profile_completed,
  product_completed,
  telegram_completed,
  first_transaction_completed,
  google_sheets_completed,
  completed_at
)
SELECT
  b.id AS business_id,
  CASE WHEN b.onboarding_completed_at IS NOT NULL THEN 6 ELSE 1 END AS current_step,
  true AS profile_completed,
  EXISTS(SELECT 1 FROM public.products p WHERE p.business_id = b.id AND p.active = true) AS product_completed,
  EXISTS(SELECT 1 FROM public.telegram_authorized_users tau WHERE tau.business_id = b.id AND tau.active = true) AS telegram_completed,
  EXISTS(SELECT 1 FROM public.transactions t WHERE t.business_id = b.id AND t.status = 'confirmed') AS first_transaction_completed,
  EXISTS(SELECT 1 FROM public.google_sheets_connections gsc WHERE gsc.business_id = b.id AND gsc.enabled = true) AS google_sheets_completed,
  b.onboarding_completed_at AS completed_at
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;

-- 6. Helper RPC: verify_and_consume_telegram_pairing_token
CREATE OR REPLACE FUNCTION public.verify_and_consume_telegram_pairing_token(
  p_token_hash TEXT,
  p_telegram_user_id BIGINT,
  p_display_label TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token RECORD;
  v_biz_name TEXT;
  v_label TEXT;
BEGIN
  -- 1. Find valid, unexpired, unused token
  SELECT t.id, t.business_id, t.expires_at, t.used_at, b.name AS business_name
  INTO v_token
  FROM public.telegram_pairing_tokens t
  JOIN public.businesses b ON b.id = t.business_id
  WHERE t.token_hash = p_token_hash
    AND t.used_at IS NULL
    AND t.expires_at > clock_timestamp()
  FOR UPDATE;

  IF v_token.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'TOKEN_INVALID_OR_EXPIRED'
    );
  END IF;

  v_biz_name := v_token.business_name;
  v_label := COALESCE(NULLIF(p_display_label, ''), 'Operator Telegram (' || v_biz_name || ')');

  -- 2. Mark token as consumed
  UPDATE public.telegram_pairing_tokens
  SET
    used_at = clock_timestamp(),
    telegram_user_id = p_telegram_user_id
  WHERE id = v_token.id;

  -- 3. Register or update telegram_authorized_users
  INSERT INTO public.telegram_authorized_users (
    business_id,
    telegram_user_id,
    display_label,
    active,
    receive_reminders
  )
  VALUES (
    v_token.business_id,
    p_telegram_user_id,
    v_label,
    true,
    true
  )
  ON CONFLICT (business_id, telegram_user_id)
  DO UPDATE SET
    active = true,
    receive_reminders = true,
    display_label = EXCLUDED.display_label,
    updated_at = clock_timestamp();

  -- 4. Ensure business_channel_settings has telegram_enabled = true
  INSERT INTO public.business_channel_settings (
    business_id,
    telegram_enabled,
    primary_channel
  )
  VALUES (
    v_token.business_id,
    true,
    'telegram'
  )
  ON CONFLICT (business_id)
  DO UPDATE SET
    telegram_enabled = true,
    primary_channel = 'telegram',
    updated_at = clock_timestamp();

  -- 5. Update business_onboarding_progress
  UPDATE public.business_onboarding_progress
  SET
    telegram_completed = true,
    current_step = GREATEST(current_step, 4),
    updated_at = clock_timestamp()
  WHERE business_id = v_token.business_id;

  -- 6. Record audit log
  INSERT INTO public.subscription_audit_logs (
    subscription_id,
    business_id,
    actor_user_id,
    actor_email,
    action,
    previous_status,
    new_status,
    notes,
    metadata
  )
  VALUES (
    (SELECT id FROM public.business_subscriptions WHERE business_id = v_token.business_id LIMIT 1),
    v_token.business_id,
    NULL,
    'telegram:' || p_telegram_user_id::text,
    'telegram_connected',
    (SELECT status FROM public.business_subscriptions WHERE business_id = v_token.business_id LIMIT 1),
    COALESCE((SELECT status FROM public.business_subscriptions WHERE business_id = v_token.business_id LIMIT 1), 'trialing'),
    'Operator Telegram terhubung via pairing token',
    jsonb_build_object(
      'telegram_user_id', p_telegram_user_id,
      'business_name', v_biz_name,
      'paired_at', clock_timestamp()
    )
  );

  RETURN jsonb_build_object(
    'valid', true,
    'business_id', v_token.business_id,
    'business_name', v_biz_name
  );
END;
$$;

-- 7. Row Level Security Policies
ALTER TABLE public.telegram_pairing_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_pairing_tokens FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.telegram_pairing_tokens TO authenticated;
GRANT ALL ON public.telegram_pairing_tokens TO service_role;

DROP POLICY IF EXISTS "telegram_pairing_tokens_select_own" ON public.telegram_pairing_tokens;
CREATE POLICY "telegram_pairing_tokens_select_own"
  ON public.telegram_pairing_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = telegram_pairing_tokens.business_id
        AND bu.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "telegram_pairing_tokens_insert_own" ON public.telegram_pairing_tokens;
CREATE POLICY "telegram_pairing_tokens_insert_own"
  ON public.telegram_pairing_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = telegram_pairing_tokens.business_id
        AND bu.user_id = (SELECT auth.uid())
    )
  );

ALTER TABLE public.business_onboarding_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_onboarding_progress FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.business_onboarding_progress TO authenticated;
GRANT ALL ON public.business_onboarding_progress TO service_role;

DROP POLICY IF EXISTS "onboarding_progress_select_own" ON public.business_onboarding_progress;
CREATE POLICY "onboarding_progress_select_own"
  ON public.business_onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = business_onboarding_progress.business_id
        AND bu.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "onboarding_progress_update_own" ON public.business_onboarding_progress;
CREATE POLICY "onboarding_progress_update_own"
  ON public.business_onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = business_onboarding_progress.business_id
        AND bu.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = business_onboarding_progress.business_id
        AND bu.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "onboarding_progress_admin_select" ON public.business_onboarding_progress;
CREATE POLICY "onboarding_progress_admin_select"
  ON public.business_onboarding_progress
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin', 'billing_admin', 'viewer']));

GRANT EXECUTE ON FUNCTION public.verify_and_consume_telegram_pairing_token TO authenticated, service_role;

-- 8. Record Migration in supabase_migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '${MIGRATION_VERSION}',
  ARRAY['STEP 10: Client Launch & Commercial Onboarding'],
  '${MIGRATION_NAME}'
)
ON CONFLICT (version) DO NOTHING;

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

    await client.query("NOTIFY pgrst, 'reload schema';");

    // Verify columns in businesses
    const colsBizRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'businesses'
        AND column_name IN ('category', 'owner_name', 'default_unit')
      ORDER BY ordinal_position;
    `);

    // Verify tables created
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('telegram_pairing_tokens', 'business_onboarding_progress')
      ORDER BY table_name;
    `);

    // Verify function verify_and_consume_telegram_pairing_token
    const funcRes = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'verify_and_consume_telegram_pairing_token';
    `);

    // Verify migration record
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 10 migration applied successfully to production Supabase PostgreSQL",
      verifiedBusinessesColumns: colsBizRes.rows.map((r: { column_name: string }) => r.column_name),
      verifiedTables: tablesRes.rows.map((r: { table_name: string }) => r.table_name),
      verifiedFunction: funcRes.rows,
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
