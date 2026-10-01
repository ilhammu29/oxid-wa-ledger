-- ============================================================================
-- OXID WA Ledger - STEP 9.1.1: Platform Admin Activation & Admin Control Center
-- Migration: 20261001180000_step9_1_1_admin_control_center.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.platform_admins schema enhancements
-- Adds active state, audit creator tracking, and extended role matrix.
-- ----------------------------------------------------------------------------
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Update role constraint to allow expanded platform roles
ALTER TABLE public.platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_role_check;

ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_role_check
  CHECK (role IN ('super_admin', 'support_admin', 'billing_admin', 'viewer'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Index on user_id, active, and role
CREATE INDEX IF NOT EXISTS idx_platform_admins_lookup
  ON public.platform_admins(user_id, active, role);

-- Allow nullable subscription_id for platform-level audit records
ALTER TABLE public.subscription_audit_logs
  ALTER COLUMN subscription_id DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Platform Admin Authorization Helper Function
-- Secure, fail-closed SQL helper to check platform privileges.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin(
  p_user_id UUID,
  p_roles TEXT[] DEFAULT ARRAY['super_admin', 'support_admin', 'billing_admin', 'viewer']
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = p_user_id
      AND active = true
      AND role = ANY(p_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security Policies for platform_admins
-- ----------------------------------------------------------------------------
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to inspect their own admin status
DROP POLICY IF EXISTS "platform_admins_select_self" ON public.platform_admins;
CREATE POLICY "platform_admins_select_self"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Allow platform super_admin and support_admin to view all platform admins
DROP POLICY IF EXISTS "platform_admins_select_admin" ON public.platform_admins;
CREATE POLICY "platform_admins_select_admin"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin']));

-- Only super_admin can insert, update, or delete platform admins
DROP POLICY IF EXISTS "platform_admins_super_admin_manage" ON public.platform_admins;
CREATE POLICY "platform_admins_super_admin_manage"
  ON public.platform_admins
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin']))
  WITH CHECK (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin']));

-- ----------------------------------------------------------------------------
-- 4. Row Level Security Policies for subscription_audit_logs
-- Platform admins can view all audit logs across all businesses.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "subscription_audit_logs_select_admin" ON public.subscription_audit_logs;
CREATE POLICY "subscription_audit_logs_select_admin"
  ON public.subscription_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin', 'billing_admin', 'viewer']));

-- ----------------------------------------------------------------------------
-- 5. Row Level Security Policies for billing_payment_settings
-- Only active super_admin and billing_admin can manage payment settings.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to billing settings" ON public.billing_payment_settings;
CREATE POLICY "Admins full access to billing settings"
  ON public.billing_payment_settings
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']))
  WITH CHECK (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']));

-- ----------------------------------------------------------------------------
-- 6. Row Level Security Policies for subscription_payments
-- Platform admins can view and update payment statuses.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "subscription_payments_admin_select" ON public.subscription_payments;
CREATE POLICY "subscription_payments_admin_select"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin', 'billing_admin', 'viewer']));

DROP POLICY IF EXISTS "subscription_payments_admin_update" ON public.subscription_payments;
CREATE POLICY "subscription_payments_admin_update"
  ON public.subscription_payments
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']))
  WITH CHECK (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']));

-- ----------------------------------------------------------------------------
-- 7. Record Migration in supabase_migrations
-- ----------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20261001180000',
  ARRAY['STEP 9.1.1: Platform Admin Activation & Admin Control Center Hardening'],
  'step9_1_1_admin_control_center'
)
ON CONFLICT (version) DO NOTHING;
