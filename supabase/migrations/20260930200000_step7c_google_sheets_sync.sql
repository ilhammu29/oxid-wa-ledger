-- ============================================================================
-- OXID WA Ledger - Step 7C: Google Sheets One-Way Sync
-- Migration: 20260930200000_step7c_google_sheets_sync.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.google_sheets_connections
-- Configuration and connection state for client Google Spreadsheets.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_sheets_connections (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  spreadsheet_id TEXT NULL,
  spreadsheet_title TEXT NULL,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (sync_interval_minutes >= 5 AND sync_interval_minutes <= 1440),
  last_sync_at TIMESTAMPTZ NULL,
  last_sync_status TEXT NULL CHECK (last_sync_status IS NULL OR last_sync_status IN ('success', 'failed', 'pending', 'syncing', 'never')),
  last_error_code TEXT NULL,
  last_error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Requirement 37: Ensure one spreadsheet belongs to exactly one business (prevent cross-client overwrite)
CREATE UNIQUE INDEX IF NOT EXISTS uq_google_sheets_connections_spreadsheet_id
  ON public.google_sheets_connections(spreadsheet_id)
  WHERE spreadsheet_id IS NOT NULL AND spreadsheet_id <> '';

-- Enable RLS
ALTER TABLE public.google_sheets_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.google_sheets_connections FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.google_sheets_connections TO authenticated;
GRANT ALL ON public.google_sheets_connections TO service_role;

DROP POLICY IF EXISTS "google_sheets_connections_select_member" ON public.google_sheets_connections;
CREATE POLICY "google_sheets_connections_select_member"
  ON public.google_sheets_connections
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "google_sheets_connections_insert_admin" ON public.google_sheets_connections;
CREATE POLICY "google_sheets_connections_insert_admin"
  ON public.google_sheets_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS "google_sheets_connections_update_admin" ON public.google_sheets_connections;
CREATE POLICY "google_sheets_connections_update_admin"
  ON public.google_sheets_connections
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
  );

-- ----------------------------------------------------------------------------
-- 2. Table: public.google_sheets_sync_queue
-- Outbox queue for asynchronous, non-blocking Google Sheets sync jobs.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_sheets_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  error_code TEXT NULL
);

-- Requirement 20: Queue coalescing - only one pending/processing sync job per business
CREATE UNIQUE INDEX IF NOT EXISTS uq_google_sheets_sync_queue_coalesce
  ON public.google_sheets_sync_queue(business_id)
  WHERE status IN ('pending', 'processing');

-- Polling index for worker
CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_queue_poll
  ON public.google_sheets_sync_queue(status, available_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.google_sheets_sync_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.google_sheets_sync_queue FROM PUBLIC, anon;
GRANT SELECT ON public.google_sheets_sync_queue TO authenticated;
GRANT ALL ON public.google_sheets_sync_queue TO service_role;

DROP POLICY IF EXISTS "google_sheets_sync_queue_select_member" ON public.google_sheets_sync_queue;
CREATE POLICY "google_sheets_sync_queue_select_member"
  ON public.google_sheets_sync_queue
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

-- ----------------------------------------------------------------------------
-- 3. Table: public.google_sheets_sync_runs
-- Historical operational audit log for Google Sheets sync executions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_sheets_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  rows_transactions INTEGER NOT NULL DEFAULT 0,
  rows_products INTEGER NOT NULL DEFAULT 0,
  rows_daily_status INTEGER NOT NULL DEFAULT 0,
  error_code TEXT NULL,
  error_message TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_sheets_sync_runs_biz_time
  ON public.google_sheets_sync_runs(business_id, started_at DESC);

-- Enable RLS
ALTER TABLE public.google_sheets_sync_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.google_sheets_sync_runs FROM PUBLIC, anon;
GRANT SELECT ON public.google_sheets_sync_runs TO authenticated;
GRANT ALL ON public.google_sheets_sync_runs TO service_role;

DROP POLICY IF EXISTS "google_sheets_sync_runs_select_member" ON public.google_sheets_sync_runs;
CREATE POLICY "google_sheets_sync_runs_select_member"
  ON public.google_sheets_sync_runs
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

-- ----------------------------------------------------------------------------
-- 4. RPC: public.enqueue_google_sheets_sync
-- Enqueues a sync job if the business has Google Sheets connection enabled.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_google_sheets_sync(
  p_business_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_enabled BOOLEAN := false;
BEGIN
  SELECT (enabled = true AND spreadsheet_id IS NOT NULL AND spreadsheet_id <> '')
  INTO v_is_enabled
  FROM public.google_sheets_connections
  WHERE business_id = p_business_id;

  IF NOT COALESCE(v_is_enabled, false) THEN
    RETURN false;
  END IF;

  INSERT INTO public.google_sheets_sync_queue (
    business_id,
    reason,
    status,
    available_at
  )
  VALUES (
    p_business_id,
    p_reason,
    'pending',
    now()
  )
  ON CONFLICT (business_id) WHERE status IN ('pending', 'processing')
  DO UPDATE SET
    reason = CASE
      WHEN google_sheets_sync_queue.reason NOT LIKE '%' || EXCLUDED.reason || '%'
      THEN google_sheets_sync_queue.reason || ', ' || EXCLUDED.reason
      ELSE google_sheets_sync_queue.reason
    END,
    available_at = LEAST(google_sheets_sync_queue.available_at, now());

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail the calling transaction on queue enqueue error
    RAISE WARNING 'enqueue_google_sheets_sync error: %', SQLERRM;
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_google_sheets_sync(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_google_sheets_sync(UUID, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Automatic Triggers for Business Mutations
-- Enqueues sync asynchronously on ledger, product, or daily status mutations.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enqueue_sheets_sync_on_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_biz_id UUID;
BEGIN
  v_biz_id := COALESCE(NEW.business_id, OLD.business_id);
  IF v_biz_id IS NOT NULL THEN
    PERFORM public.enqueue_google_sheets_sync(v_biz_id, TG_TABLE_NAME || '_' || TG_OP);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure financial transaction or state mutation NEVER fails
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sheets_sync_transactions ON public.transactions;
CREATE TRIGGER trg_sheets_sync_transactions
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_sheets_sync_on_mutation();

DROP TRIGGER IF EXISTS trg_sheets_sync_daily_status ON public.business_daily_status;
CREATE TRIGGER trg_sheets_sync_daily_status
  AFTER INSERT OR UPDATE ON public.business_daily_status
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_sheets_sync_on_mutation();

DROP TRIGGER IF EXISTS trg_sheets_sync_products ON public.products;
CREATE TRIGGER trg_sheets_sync_products
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_sheets_sync_on_mutation();

DROP TRIGGER IF EXISTS trg_sheets_sync_product_aliases ON public.product_aliases;
CREATE TRIGGER trg_sheets_sync_product_aliases
  AFTER INSERT OR UPDATE OR DELETE ON public.product_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_sheets_sync_on_mutation();
