import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_SQL = `
CREATE OR REPLACE FUNCTION public.create_business_for_authenticated_user(
  p_name TEXT,
  p_category TEXT DEFAULT 'Lainnya',
  p_owner_name TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'Asia/Pontianak',
  p_currency TEXT DEFAULT 'IDR',
  p_default_unit TEXT DEFAULT 'kg',
  p_owner_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_clean_name TEXT;
  v_clean_category TEXT;
  v_clean_owner_name TEXT;
  v_clean_timezone TEXT;
  v_clean_currency TEXT;
  v_clean_default_unit TEXT;
  v_confirmed_at TIMESTAMPTZ;
  v_existing_biz RECORD;
  v_business_id UUID;
BEGIN
  -- 1. Resolve & verify authenticated user identity
  v_user_id := auth.uid();

  -- If auth.uid() is null (e.g. backend service_role invocation or direct test script),
  -- allow fallback to p_owner_user_id ONLY if current user is superuser or service_role
  IF v_user_id IS NULL THEN
    IF (current_user IN ('postgres', 'service_role') OR current_setting('request.jwt.claim.role', true) = 'service_role') AND p_owner_user_id IS NOT NULL THEN
      v_user_id := p_owner_user_id;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'Sesi Anda tidak valid. Silakan masuk kembali.'
      );
    END IF;
  END IF;

  -- 2. Email verification enforcement (fail-closed in production)
  BEGIN
    EXECUTE 'SELECT COALESCE(confirmed_at, email_confirmed_at) FROM auth.users WHERE id = $1'
    INTO v_confirmed_at
    USING v_user_id;

    IF v_confirmed_at IS NULL AND COALESCE(auth.jwt() ->> 'email_confirmed_at', '') = '' THEN
      IF COALESCE(current_setting('app.allow_unverified_signup', true), 'false') != 'true'
         AND current_user NOT IN ('postgres', 'service_role') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'EMAIL_NOT_VERIFIED',
          'message', 'Email belum diverifikasi. Verifikasi email diperlukan sebelum membuat bisnis.'
        );
      END IF;
    END IF;
  EXCEPTION
    WHEN undefined_column THEN
      -- auth.users in local test environments may not have confirmation columns
      NULL;
  END;

  -- 3. Validate & sanitize inputs
  v_clean_name := trim(p_name);
  IF v_clean_name IS NULL OR length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_NAME',
      'message', 'Nama usaha minimal 2 karakter.'
    );
  END IF;

  v_clean_category := COALESCE(NULLIF(trim(p_category), ''), 'Lainnya');
  v_clean_owner_name := NULLIF(trim(p_owner_name), '');
  
  IF p_timezone IN ('Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura') THEN
    v_clean_timezone := p_timezone;
  ELSE
    v_clean_timezone := 'Asia/Pontianak';
  END IF;

  v_clean_currency := COALESCE(NULLIF(trim(p_currency), ''), 'IDR');
  v_clean_default_unit := COALESCE(NULLIF(trim(p_default_unit), ''), 'kg');

  -- 4. Idempotency guard: check for existing incomplete business created by this user
  SELECT id, name, onboarding_completed_at
  INTO v_existing_biz
  FROM public.businesses
  WHERE created_by = v_user_id
    AND onboarding_completed_at IS NULL
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_biz.id IS NOT NULL THEN
    -- Ensure owner membership exists
    INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (v_existing_biz.id, v_user_id, 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;

    -- Ensure onboarding progress is initialized to Step 2
    INSERT INTO public.business_onboarding_progress (
      business_id,
      current_step,
      profile_completed
    )
    VALUES (
      v_existing_biz.id,
      2,
      true
    )
    ON CONFLICT (business_id) DO UPDATE SET
      profile_completed = true,
      current_step = GREATEST(public.business_onboarding_progress.current_step, 2);

    RETURN jsonb_build_object(
      'success', true,
      'business_id', v_existing_biz.id,
      'name', v_existing_biz.name,
      'idempotent', true,
      'message', 'Melanjutkan proses onboarding usaha.'
    );
  END IF;

  -- 5. Atomically create new business and its owner bootstrap records
  v_business_id := gen_random_uuid();

  -- 5.1 Insert Business
  INSERT INTO public.businesses (
    id,
    name,
    category,
    owner_name,
    timezone,
    currency,
    default_unit,
    created_by,
    status
  )
  VALUES (
    v_business_id,
    v_clean_name,
    v_clean_category,
    v_clean_owner_name,
    v_clean_timezone,
    v_clean_currency,
    v_clean_default_unit,
    v_user_id,
    'active'
  );

  -- 5.2 Insert Owner Membership
  INSERT INTO public.business_users (
    business_id,
    user_id,
    role
  )
  VALUES (
    v_business_id,
    v_user_id,
    'owner'
  )
  ON CONFLICT (business_id, user_id) DO NOTHING;

  -- 5.3 Ensure 14-day trial subscription (trigger trg_business_subscription_init also fires)
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_code,
    status,
    trial_started_at,
    trial_ends_at,
    current_period_start,
    current_period_end,
    grace_period_ends_at
  )
  VALUES (
    v_business_id,
    'pilot',
    'trialing',
    clock_timestamp(),
    clock_timestamp() + INTERVAL '14 days',
    clock_timestamp(),
    clock_timestamp() + INTERVAL '14 days',
    clock_timestamp() + INTERVAL '17 days'
  )
  ON CONFLICT (business_id) DO NOTHING;

  -- 5.4 Ensure channel settings exist
  INSERT INTO public.business_channel_settings (
    business_id,
    telegram_enabled,
    whatsapp_enabled,
    primary_channel
  )
  VALUES (
    v_business_id,
    true,
    false,
    'telegram'
  )
  ON CONFLICT (business_id) DO NOTHING;

  -- 5.5 Ensure reminder settings exist
  INSERT INTO public.business_reminder_settings (
    business_id,
    enabled,
    reminder_time,
    days_of_week
  )
  VALUES (
    v_business_id,
    true,
    '18:00',
    ARRAY[1, 2, 3, 4, 5, 6, 0]
  )
  ON CONFLICT (business_id) DO NOTHING;

  -- 5.6 Initialize onboarding progress to step 2 (Profile completed = 20%)
  INSERT INTO public.business_onboarding_progress (
    business_id,
    current_step,
    profile_completed
  )
  VALUES (
    v_business_id,
    2,
    true
  )
  ON CONFLICT (business_id) DO UPDATE SET
    profile_completed = true,
    current_step = GREATEST(public.business_onboarding_progress.current_step, 2);

  -- 5.7 Audit trail
  INSERT INTO public.subscription_audit_logs (
    business_id,
    actor_user_id,
    action,
    new_status,
    metadata
  )
  VALUES (
    v_business_id,
    v_user_id,
    'business_created',
    'trialing',
    jsonb_build_object(
      'business_id', v_business_id,
      'name', v_clean_name,
      'category', v_clean_category,
      'timezone', v_clean_timezone,
      'currency', v_clean_currency,
      'created_via', 'rpc_bootstrap',
      'created_at', clock_timestamp()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_business_id,
    'name', v_clean_name,
    'message', 'Profil bisnis berhasil dibuat.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BUSINESS_CREATE_FAILED',
      'message', 'Profil usaha belum dapat dibuat. Silakan coba lagi.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_for_authenticated_user(text, text, text, text, text, text, uuid) TO anon, authenticated, service_role;
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

    // Check create_business_for_authenticated_user routine exists
    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'create_business_for_authenticated_user';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 10.2.3 business onboarding bootstrap RPC applied successfully in production Supabase PostgreSQL",
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
