-- ============================================================================
-- Migration: 20261002000000_step10_2_1_telegram_operator_enhancements.sql
-- STEP 10.2.1: Telegram Operator Pairing UI & Channel Management Hardening
--
-- 1. Add telegram_username & operator_role to public.telegram_authorized_users
-- 2. Enhance verify_and_consume_telegram_pairing_token to record username & role
-- ============================================================================

-- 1. Add additive columns to public.telegram_authorized_users
ALTER TABLE public.telegram_authorized_users
  ADD COLUMN IF NOT EXISTS telegram_username TEXT NULL,
  ADD COLUMN IF NOT EXISTS operator_role TEXT NULL DEFAULT 'Kasir';

-- Index on telegram_username if queried
CREATE INDEX IF NOT EXISTS idx_telegram_authorized_users_username
  ON public.telegram_authorized_users(telegram_username)
  WHERE telegram_username IS NOT NULL;

-- Drop old overload if exists
DROP FUNCTION IF EXISTS public.verify_and_consume_telegram_pairing_token(text, bigint, text);

-- 2. Enhanced RPC: verify_and_consume_telegram_pairing_token
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
  v_token RECORD;
  v_biz_name TEXT;
  v_label TEXT;
  v_role TEXT;
  v_username TEXT;
  v_plan_code TEXT;
  v_max_operators INT := 2;
  v_current_operators INT := 0;
BEGIN
  -- 1. Locate valid, unexpired, unused token
  SELECT
    tpt.id,
    tpt.business_id,
    tpt.token_code,
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
      'operator_role', v_role,
      'telegram_username', v_username,
      'token_id', v_token.id,
      'paired_at', clock_timestamp()
    )
  );

  RETURN jsonb_build_object(
    'valid', true,
    'business_id', v_token.business_id,
    'business_name', v_biz_name,
    'token_code', v_token.token_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_and_consume_telegram_pairing_token(text, bigint, text, text, text) TO authenticated, service_role;
