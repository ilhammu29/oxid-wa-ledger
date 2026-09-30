-- ============================================================================
-- OXID WA Ledger - STEP 6A: Telegram Bot Adapter Infrastructure
-- Migration: 20260930120000_step6a_telegram_adapter.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: telegram_authorized_users
-- Restricts Telegram message processing strictly to authorized business operators.
-- ----------------------------------------------------------------------------
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

-- Trigger for automatic updated_at timestamp
CREATE OR REPLACE TRIGGER trg_telegram_authorized_users_updated_at
  BEFORE UPDATE ON public.telegram_authorized_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Performance and foreign key index (for Supabase linter and fast tenant lookups)
CREATE INDEX IF NOT EXISTS idx_telegram_authorized_users_business
  ON public.telegram_authorized_users(business_id);

CREATE INDEX IF NOT EXISTS idx_telegram_authorized_users_lookup
  ON public.telegram_authorized_users(telegram_user_id)
  WHERE active = true;

-- ----------------------------------------------------------------------------
-- 2. Table: processed_telegram_updates
-- Idempotency protection for incoming Telegram webhook updates.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Update source CHECK constraints to allow 'telegram' as a valid channel source
-- ----------------------------------------------------------------------------
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('whatsapp', 'telegram', 'dashboard', 'system'));

ALTER TABLE public.business_daily_status DROP CONSTRAINT IF EXISTS business_daily_status_source_check;
ALTER TABLE public.business_daily_status ADD CONSTRAINT business_daily_status_source_check
  CHECK (source IN ('owner', 'whatsapp', 'telegram', 'system'));

-- ----------------------------------------------------------------------------
-- 3. Row Level Security & Grants for telegram_authorized_users
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. Row Level Security & Grants for processed_telegram_updates
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. Atomic PostgreSQL RPC: claim_telegram_update
-- Ensures strict idempotency and concurrency protection for Telegram updates.
-- ----------------------------------------------------------------------------
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
  -- If business_id is specified, validate business existence
  IF p_business_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RETURN jsonb_build_object('status', 'invalid_business');
  END IF;

  -- Attempt atomic claim insert
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

  -- If inserted, claim succeeded
  IF v_inserted_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;

  -- Conflict detected: inspect existing processing status
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

-- ----------------------------------------------------------------------------
-- 6. Atomic PostgreSQL RPC: complete_telegram_update
-- Marks Telegram update completion with response text or error message.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. Record Migration in supabase_migrations
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260930120000', 'step6a_telegram_adapter')
ON CONFLICT (version) DO NOTHING;
