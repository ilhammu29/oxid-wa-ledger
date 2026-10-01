import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_SQL = `
-- 1. Invalidate outstanding unused pairing tokens from previous scheme
DELETE FROM public.telegram_pairing_tokens WHERE used_at IS NULL;

-- 2. Remove token_code column (zero plaintext storage in database)
ALTER TABLE public.telegram_pairing_tokens DROP COLUMN IF EXISTS token_code;

-- 3. Create table for brute-force pairing attempt tracking
CREATE TABLE IF NOT EXISTS public.telegram_pairing_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_telegram_pairing_attempts_user_time
  ON public.telegram_pairing_attempts(telegram_user_id, attempted_at);

ALTER TABLE public.telegram_pairing_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_pairing_attempts FROM PUBLIC, anon;
GRANT ALL ON public.telegram_pairing_attempts TO service_role;

-- 4. Maintenance function: Cleanup expired pairing tokens and stale attempts (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_expired_telegram_pairing_tokens()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INT := 0;
BEGIN
  DELETE FROM public.telegram_pairing_tokens
  WHERE (used_at IS NOT NULL AND used_at < (clock_timestamp() - INTERVAL '24 hours'))
     OR (expires_at < (clock_timestamp() - INTERVAL '24 hours'));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  DELETE FROM public.telegram_pairing_attempts
  WHERE attempted_at < (clock_timestamp() - INTERVAL '24 hours');

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_telegram_pairing_tokens() TO service_role;

-- 5. Enhanced RPC: verify_and_consume_telegram_pairing_token
-- Zero plaintext reference, HMAC verifier check, brute-force rate limiting
DROP FUNCTION IF EXISTS public.verify_and_consume_telegram_pairing_token(text, bigint, text);
DROP FUNCTION IF EXISTS public.verify_and_consume_telegram_pairing_token(text, bigint, text, text, text);

CREATE OR REPLACE FUNCTION public.verify_and_consume_telegram_pairing_token(
  p_token_hash TEXT,
  p_telegram_user_id BIGINT,
  p_display_label TEXT DEFAULT NULL,
  p_telegram_username TEXT DEFAULT NULL,
  p_operator_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_failed_attempts INT := 0;
  v_token RECORD;
  v_biz_name TEXT;
  v_label TEXT;
  v_role TEXT;
  v_username TEXT;
  v_plan_code TEXT;
  v_max_operators INT := 2;
  v_current_operators INT := 0;
BEGIN
  -- 0. Check brute force rate limit (max 10 failed attempts within 10 minutes)
  SELECT COUNT(*)::INT INTO v_failed_attempts
  FROM public.telegram_pairing_attempts
  WHERE telegram_user_id = p_telegram_user_id
    AND attempted_at > (clock_timestamp() - INTERVAL '10 minutes')
    AND success = false;

  IF v_failed_attempts >= 10 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'RATE_LIMITED',
      'message', 'Terlalu banyak percobaan kode koneksi. Silakan tunggu beberapa menit lalu coba lagi.'
    );
  END IF;

  -- 1. Locate valid, unexpired, unused token by cryptographic token_hash ONLY
  SELECT
    tpt.id,
    tpt.business_id,
    tpt.created_by,
    b.name AS business_name
  INTO v_token
  FROM public.telegram_pairing_tokens tpt
  JOIN public.businesses b ON b.id = tpt.business_id
  WHERE tpt.token_hash = p_token_hash
    AND tpt.used_at IS NULL
    AND tpt.expires_at > clock_timestamp()
  LIMIT 1;

  IF v_token.id IS NULL THEN
    -- Track failed attempt
    INSERT INTO public.telegram_pairing_attempts (telegram_user_id, success)
    VALUES (p_telegram_user_id, false);

    RETURN jsonb_build_object(
      'valid', false,
      'error', 'TOKEN_INVALID_OR_EXPIRED'
    );
  END IF;

  -- 1.5 Check if Telegram user is already active in another business (One Telegram User = One Active Business)
  IF EXISTS (
    SELECT 1 FROM public.telegram_authorized_users
    WHERE telegram_user_id = p_telegram_user_id
      AND active = true
      AND business_id != v_token.business_id
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'ALREADY_CONNECTED_TO_OTHER_BUSINESS',
      'message', 'Akun Telegram ini sudah terhubung ke bisnis lain. Putuskan koneksi sebelumnya melalui dashboard sebelum menghubungkan bisnis baru.'
    );
  END IF;

  -- 1.6 Check plan operator capacity (Pilot=2, Basic=2, Pro=10)
  SELECT COALESCE(plan_code, 'pilot') INTO v_plan_code
  FROM public.business_subscriptions
  WHERE business_id = v_token.business_id
  LIMIT 1;

  IF v_plan_code = 'pro' THEN
    v_max_operators := 10;
  ELSE
    v_max_operators := 2;
  END IF;

  SELECT COUNT(*)::INT INTO v_current_operators
  FROM public.telegram_authorized_users
  WHERE business_id = v_token.business_id
    AND active = true
    AND telegram_user_id != p_telegram_user_id;

  IF v_current_operators >= v_max_operators THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'OPERATOR_LIMIT_REACHED',
      'message', 'Batas operator Telegram untuk paket Anda sudah tercapai.'
    );
  END IF;

  v_biz_name := v_token.business_name;
  v_label := COALESCE(NULLIF(p_display_label, ''), 'Operator Telegram (' || v_biz_name || ')');
  v_role := COALESCE(NULLIF(p_operator_role, ''), 'Kasir');
  v_username := NULLIF(TRIM(p_telegram_username), '');

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
    telegram_username,
    operator_role,
    active,
    receive_reminders
  )
  VALUES (
    v_token.business_id,
    p_telegram_user_id,
    v_label,
    v_username,
    v_role,
    true,
    true
  )
  ON CONFLICT (business_id, telegram_user_id)
  DO UPDATE SET
    active = true,
    receive_reminders = true,
    display_label = EXCLUDED.display_label,
    telegram_username = COALESCE(EXCLUDED.telegram_username, public.telegram_authorized_users.telegram_username),
    operator_role = COALESCE(EXCLUDED.operator_role, public.telegram_authorized_users.operator_role),
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

  -- 6. Audit log entry (ZERO plaintext code recorded)
  INSERT INTO public.subscription_audit_logs (
    business_id,
    actor_user_id,
    action,
    new_status,
    metadata
  )
  VALUES (
    v_token.business_id,
    v_token.created_by,
    'telegram_paired',
    'trialing',
    jsonb_build_object(
      'telegram_user_id', p_telegram_user_id,
      'display_label', v_label,
      'operator_role', v_role,
      'telegram_username', v_username,
      'token_id', v_token.id,
      'paired_at', clock_timestamp()
    )
  );

  -- 7. Record successful pairing attempt
  INSERT INTO public.telegram_pairing_attempts (telegram_user_id, success)
  VALUES (p_telegram_user_id, true);

  RETURN jsonb_build_object(
    'valid', true,
    'business_id', v_token.business_id,
    'business_name', v_biz_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_consume_telegram_pairing_token(text, bigint, text, text, text) TO authenticated, service_role;
`;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!pgUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  const cleanPgUrl = pgUrl.includes("?") ? pgUrl.split("?")[0] : pgUrl;

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

    // 1. Check token_code is absent
    const colRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'telegram_pairing_tokens'
        AND column_name = 'token_code';
    `);

    // 2. Check table telegram_pairing_attempts exists
    const attemptsTableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'telegram_pairing_attempts';
    `);

    // 3. Check verify_and_consume_telegram_pairing_token routine exists
    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'verify_and_consume_telegram_pairing_token';
    `);

    // 4. Check remaining columns of telegram_pairing_tokens
    const remainingCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'telegram_pairing_tokens'
      ORDER BY ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 10.2.2 zero-plaintext migration applied successfully in production Supabase PostgreSQL",
      tokenCodeColumnExists: colRes.rows.length > 0,
      attemptsTableExists: attemptsTableRes.rows.length > 0,
      verifiedFunction: funcRes.rows,
      remainingColumns: remainingCols.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
