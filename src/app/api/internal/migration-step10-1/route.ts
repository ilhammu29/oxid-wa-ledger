import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_SQL = `
-- Update RPC: verify_and_consume_telegram_pairing_token
-- Adds single-business constraint (10.1I) and plan operator limit (10.1M)
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
  v_plan_code TEXT;
  v_max_operators INT;
  v_current_operators INT;
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

  -- 1.5 Check if Telegram user is already active in another business (10.1I: ONE TELEGRAM USER = ONE ACTIVE BUSINESS CONTEXT)
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

  -- 1.6 Check plan operator capacity (10.1L, 10.1M: Pilot=2, Basic=2, Pro=10)
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
    updated_at = clock_timestamp();

  -- 5. Advance onboarding progress if at step 3
  UPDATE public.business_onboarding_progress
  SET
    current_step = GREATEST(current_step, 4),
    telegram_completed = true,
    updated_at = clock_timestamp()
  WHERE business_id = v_token.business_id;

  -- 6. Audit log entry
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
      'token_id', v_token.id,
      'paired_at', clock_timestamp()
    )
  );

  RETURN jsonb_build_object(
    'valid', true,
    'business_id', v_token.business_id,
    'business_name', v_biz_name,
    'display_label', v_label
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_consume_telegram_pairing_token(TEXT, BIGINT, TEXT) TO authenticated, service_role, anon;
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

    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'verify_and_consume_telegram_pairing_token';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 10.1 RPC verify_and_consume_telegram_pairing_token updated in production Supabase PostgreSQL",
      verifiedFunction: funcRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
