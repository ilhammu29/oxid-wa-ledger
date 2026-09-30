-- ============================================================================
-- OXID WA Ledger - Step 7: Client Readiness, Automation, Onboarding & Monitoring
-- Migration: 20260930180000_step7_client_readiness_and_monitoring.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pilot Hardening: public.conversation_failures
-- Captures unhandled or unparseable messages from authorized operators.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp')),
  sender_reference TEXT NULL,
  message_text TEXT NOT NULL,
  normalized_text TEXT NULL,
  failure_type TEXT NOT NULL CHECK (failure_type IN (
    'UNKNOWN_INTENT',
    'UNKNOWN_PRODUCT',
    'AMBIGUOUS_PRODUCT',
    'MULTI_PRODUCT',
    'AMBIGUOUS_QUANTITY',
    'UNSUPPORTED_FORMAT'
  )),
  parser_intent TEXT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Performance and lookup index
CREATE INDEX IF NOT EXISTS idx_conversation_failures_business_review
  ON public.conversation_failures(business_id, review_status, created_at DESC);

-- RLS: conversation_failures
ALTER TABLE public.conversation_failures ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.conversation_failures FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.conversation_failures TO authenticated;
GRANT ALL ON public.conversation_failures TO service_role;

DROP POLICY IF EXISTS "conversation_failures_select_member" ON public.conversation_failures;
CREATE POLICY "conversation_failures_select_member"
  ON public.conversation_failures
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "conversation_failures_update_admin" ON public.conversation_failures;
CREATE POLICY "conversation_failures_update_admin"
  ON public.conversation_failures
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

DROP POLICY IF EXISTS "conversation_failures_insert_authenticated" ON public.conversation_failures;
CREATE POLICY "conversation_failures_insert_authenticated"
  ON public.conversation_failures
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.is_business_member(business_id));

-- ----------------------------------------------------------------------------
-- 2. Reminder Automation: public.business_reminder_settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_reminder_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TIME NOT NULL DEFAULT '18:00',
  days_of_week SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,0]::SMALLINT[],
  channel TEXT NOT NULL DEFAULT 'telegram' CHECK (channel IN ('telegram', 'whatsapp')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_business_reminder_settings_updated_at ON public.business_reminder_settings;
CREATE TRIGGER trg_business_reminder_settings_updated_at
  BEFORE UPDATE ON public.business_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_reminder_settings_enabled
  ON public.business_reminder_settings(enabled)
  WHERE enabled = true;

-- RLS: business_reminder_settings
ALTER TABLE public.business_reminder_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_reminder_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.business_reminder_settings TO authenticated;
GRANT ALL ON public.business_reminder_settings TO service_role;

DROP POLICY IF EXISTS "business_reminder_settings_select_member" ON public.business_reminder_settings;
CREATE POLICY "business_reminder_settings_select_member"
  ON public.business_reminder_settings
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "business_reminder_settings_modify_admin" ON public.business_reminder_settings;
CREATE POLICY "business_reminder_settings_modify_admin"
  ON public.business_reminder_settings
  FOR ALL
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

-- ----------------------------------------------------------------------------
-- 3. Extend telegram_authorized_users with receive_reminders
-- ----------------------------------------------------------------------------
ALTER TABLE public.telegram_authorized_users
  ADD COLUMN IF NOT EXISTS receive_reminders BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 4. Extend notification_logs status check constraint
-- ----------------------------------------------------------------------------
ALTER TABLE public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'delivered'));

-- ----------------------------------------------------------------------------
-- 5. Scheduler Heartbeat & Job Runs: public.system_job_runs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  businesses_checked INTEGER NOT NULL DEFAULT 0,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  notifications_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_job_runs_job_created
  ON public.system_job_runs(job_name, created_at DESC);

ALTER TABLE public.system_job_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_job_runs FROM PUBLIC, anon;
GRANT SELECT ON public.system_job_runs TO authenticated;
GRANT ALL ON public.system_job_runs TO service_role;

DROP POLICY IF EXISTS "system_job_runs_select_authenticated" ON public.system_job_runs;
CREATE POLICY "system_job_runs_select_authenticated"
  ON public.system_job_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 6. Client Onboarding Invites: public.client_onboarding_invites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_onboarding_invites_lookup
  ON public.client_onboarding_invites(token_hash)
  WHERE active = true;

ALTER TABLE public.client_onboarding_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.client_onboarding_invites FROM PUBLIC, anon;
GRANT SELECT ON public.client_onboarding_invites TO authenticated;
GRANT ALL ON public.client_onboarding_invites TO service_role;

DROP POLICY IF EXISTS "client_onboarding_invites_select_own" ON public.client_onboarding_invites;
CREATE POLICY "client_onboarding_invites_select_own"
  ON public.client_onboarding_invites
  FOR SELECT
  TO authenticated
  USING (
    LOWER(email) = LOWER(COALESCE((SELECT u.email FROM auth.users u WHERE u.id = (SELECT auth.uid())), ''))
  );

-- ----------------------------------------------------------------------------
-- 7. Extend businesses table with onboarding_completed_at
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;

-- ----------------------------------------------------------------------------
-- 8. Integration Events & Safe Telemetry: public.integration_events
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'system')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'ignored', 'warning')),
  error_code TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_business_created
  ON public.integration_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_events_created
  ON public.integration_events(created_at DESC);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_events FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;

DROP POLICY IF EXISTS "integration_events_select_member" ON public.integration_events;
CREATE POLICY "integration_events_select_member"
  ON public.integration_events
  FOR SELECT
  TO authenticated
  USING (business_id IS NOT NULL AND app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "integration_events_insert_authenticated" ON public.integration_events;
CREATE POLICY "integration_events_insert_authenticated"
  ON public.integration_events
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id IS NULL OR app_auth.is_business_member(business_id));

-- ----------------------------------------------------------------------------
-- 9. Client-Ready Channel Switch: public.business_channel_settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_channel_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  telegram_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  primary_channel TEXT NOT NULL DEFAULT 'telegram' CHECK (primary_channel IN ('telegram', 'whatsapp')),
  reminder_channel TEXT NOT NULL DEFAULT 'telegram' CHECK (reminder_channel IN ('telegram', 'whatsapp')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS trg_business_channel_settings_updated_at ON public.business_channel_settings;
CREATE TRIGGER trg_business_channel_settings_updated_at
  BEFORE UPDATE ON public.business_channel_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_channel_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_channel_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.business_channel_settings TO authenticated;
GRANT ALL ON public.business_channel_settings TO service_role;

DROP POLICY IF EXISTS "business_channel_settings_select_member" ON public.business_channel_settings;
CREATE POLICY "business_channel_settings_select_member"
  ON public.business_channel_settings
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "business_channel_settings_modify_admin" ON public.business_channel_settings;
CREATE POLICY "business_channel_settings_modify_admin"
  ON public.business_channel_settings
  FOR ALL
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

-- ----------------------------------------------------------------------------
-- 10. Atomic Onboarding RPC: complete_client_onboarding
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_client_onboarding(
  p_invite_token_hash TEXT,
  p_business_name TEXT,
  p_timezone TEXT DEFAULT 'Asia/Jakarta',
  p_currency TEXT DEFAULT 'IDR',
  p_product_name TEXT DEFAULT 'Lele',
  p_product_unit TEXT DEFAULT 'kg',
  p_product_price BIGINT DEFAULT 28000,
  p_channel TEXT DEFAULT 'telegram',
  p_telegram_user_id BIGINT DEFAULT NULL,
  p_enable_reminder BOOLEAN DEFAULT false,
  p_reminder_time TIME DEFAULT '18:00',
  p_reminder_days SMALLINT[] DEFAULT ARRAY[1,2,3,4,5,6,0]::SMALLINT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_invite RECORD;
  v_business_id UUID;
  v_product_id UUID;
BEGIN
  -- 1. Authorization check: User must be authenticated
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User must be authenticated to complete onboarding' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify invite exists, is active, unexpired, and unused
  SELECT * INTO v_invite
  FROM public.client_onboarding_invites
  WHERE token_hash = p_invite_token_hash;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND: Undangan tidak valid atau tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_invite.active THEN
    RAISE EXCEPTION 'INVITE_INACTIVE: Undangan sudah tidak aktif' USING ERRCODE = '42501';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'INVITE_ALREADY_USED: Undangan sudah pernah digunakan' USING ERRCODE = '42501';
  END IF;

  IF v_invite.expires_at < clock_timestamp() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED: Undangan telah kedaluwarsa' USING ERRCODE = '42501';
  END IF;

  -- 3. Verify user's email matches invite's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF LOWER(COALESCE(v_user_email, '')) <> LOWER(v_invite.email) THEN
    RAISE EXCEPTION 'INVITE_EMAIL_MISMATCH: Email pengguna (%s) tidak cocok dengan email undangan (%s)',
      COALESCE(v_user_email, 'unknown'), v_invite.email USING ERRCODE = '42501';
  END IF;

  -- 4. Create Business
  INSERT INTO public.businesses (
    name,
    timezone,
    currency,
    status,
    created_by,
    onboarding_completed_at
  )
  VALUES (
    p_business_name,
    COALESCE(NULLIF(p_timezone, ''), 'Asia/Jakarta'),
    COALESCE(NULLIF(p_currency, ''), 'IDR'),
    'active',
    v_user_id,
    clock_timestamp()
  )
  RETURNING id INTO v_business_id;

  -- 5. Create Owner Membership in business_users
  INSERT INTO public.business_users (
    business_id,
    user_id,
    role
  )
  VALUES (
    v_business_id,
    v_user_id,
    'owner'
  );

  -- 6. Create Default Product
  INSERT INTO public.products (
    business_id,
    name,
    unit,
    default_price,
    is_default,
    active
  )
  VALUES (
    v_business_id,
    COALESCE(NULLIF(p_product_name, ''), 'Produk Utama'),
    COALESCE(NULLIF(p_product_unit, ''), 'kg'),
    COALESCE(p_product_price, 0),
    true,
    true
  )
  RETURNING id INTO v_product_id;

  -- 7. Create Telegram Operator if provided
  IF p_telegram_user_id IS NOT NULL AND p_telegram_user_id > 0 THEN
    INSERT INTO public.telegram_authorized_users (
      business_id,
      telegram_user_id,
      display_label,
      active,
      receive_reminders
    )
    VALUES (
      v_business_id,
      p_telegram_user_id,
      'Operator Utama (' || p_business_name || ')',
      true,
      p_enable_reminder
    )
    ON CONFLICT (business_id, telegram_user_id)
    DO UPDATE SET
      active = true,
      receive_reminders = p_enable_reminder,
      updated_at = clock_timestamp();
  END IF;

  -- 8. Create Reminder Settings
  INSERT INTO public.business_reminder_settings (
    business_id,
    enabled,
    reminder_time,
    days_of_week,
    channel,
    timezone,
    updated_by
  )
  VALUES (
    v_business_id,
    p_enable_reminder,
    COALESCE(p_reminder_time, '18:00'::TIME),
    COALESCE(p_reminder_days, ARRAY[1,2,3,4,5,6,0]::SMALLINT[]),
    'telegram',
    COALESCE(NULLIF(p_timezone, ''), 'Asia/Jakarta'),
    v_user_id
  );

  -- 9. Create Channel Settings
  INSERT INTO public.business_channel_settings (
    business_id,
    telegram_enabled,
    whatsapp_enabled,
    primary_channel,
    reminder_channel,
    updated_by
  )
  VALUES (
    v_business_id,
    (p_channel = 'telegram'),
    (p_channel = 'whatsapp'),
    COALESCE(p_channel, 'telegram'),
    'telegram',
    v_user_id
  );

  -- 10. Mark Invite as used
  UPDATE public.client_onboarding_invites
  SET
    used_at = clock_timestamp(),
    active = false
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_business_id,
    'product_id', v_product_id,
    'business_name', p_business_name,
    'owner_user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_client_onboarding TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 11. Safe Telemetry Retention Cleanup RPC
-- Only removes telemetry and old system job runs; leaves financial records untouched.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry(
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_events_deleted INT;
  v_jobs_deleted INT;
BEGIN
  v_cutoff := clock_timestamp() - (p_days || ' days')::INTERVAL;

  DELETE FROM public.integration_events
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;

  DELETE FROM public.system_job_runs
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_jobs_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cutoff', v_cutoff,
    'events_deleted', v_events_deleted,
    'job_runs_deleted', v_jobs_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_telemetry(INT) TO service_role;
