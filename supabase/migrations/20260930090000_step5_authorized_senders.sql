-- ============================================================================
-- OXID WA Ledger - STEP 5: Authorized Senders & WhatsApp Webhook Infrastructure
-- Migration: 20260930090000_step5_authorized_senders.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: whatsapp_authorized_senders
-- Restricts incoming message processing strictly to authorized business operators.
-- ----------------------------------------------------------------------------
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

-- Trigger for automatic updated_at timestamp
CREATE TRIGGER trg_whatsapp_authorized_senders_updated_at
  BEFORE UPDATE ON public.whatsapp_authorized_senders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Performance and foreign key index (for Supabase linter and fast tenant lookups)
CREATE INDEX IF NOT EXISTS idx_whatsapp_authorized_senders_business
  ON public.whatsapp_authorized_senders(business_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_authorized_senders_lookup
  ON public.whatsapp_authorized_senders(business_id, phone_number)
  WHERE active = true;

-- ----------------------------------------------------------------------------
-- 2. Enhance: processed_whatsapp_messages
-- Add optional columns for response tracking and error observability
-- ----------------------------------------------------------------------------
ALTER TABLE public.processed_whatsapp_messages
  ADD COLUMN IF NOT EXISTS response_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security & Grants for whatsapp_authorized_senders
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_authorized_senders ENABLE ROW LEVEL SECURITY;

-- Revoke default public & anon access
REVOKE ALL ON public.whatsapp_authorized_senders FROM PUBLIC, anon;

-- Grant permissions to authenticated users and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_authorized_senders TO authenticated;
GRANT ALL ON public.whatsapp_authorized_senders TO service_role;

-- RLS Policies
CREATE POLICY "whatsapp_authorized_senders_select_member"
  ON public.whatsapp_authorized_senders
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

CREATE POLICY "whatsapp_authorized_senders_insert_admin"
  ON public.whatsapp_authorized_senders
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

CREATE POLICY "whatsapp_authorized_senders_update_admin"
  ON public.whatsapp_authorized_senders
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

CREATE POLICY "whatsapp_authorized_senders_delete_admin"
  ON public.whatsapp_authorized_senders
  FOR DELETE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

-- ----------------------------------------------------------------------------
-- 4. Atomic PostgreSQL RPC: claim_whatsapp_message
-- Ensures strict idempotency and concurrency protection for webhook events.
-- ----------------------------------------------------------------------------
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
  -- Validate business existence
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RETURN jsonb_build_object('status', 'invalid_business');
  END IF;

  -- Attempt atomic claim insert
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

  -- If inserted, claim succeeded
  IF v_inserted_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'claimed');
  END IF;

  -- Conflict detected: inspect existing processing status
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

-- ----------------------------------------------------------------------------
-- 5. Atomic PostgreSQL RPC: complete_whatsapp_message
-- Marks message completion with result text or error.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. Record Migration in supabase_migrations
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260930090000', 'step5_authorized_senders')
ON CONFLICT (version) DO NOTHING;
