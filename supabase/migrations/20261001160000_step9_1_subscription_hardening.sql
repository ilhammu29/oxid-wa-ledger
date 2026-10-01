-- ============================================================================
-- OXID WA Ledger - STEP 9.1: Subscription Hardening & Verification
-- Migration: 20261001160000_step9_1_subscription_hardening.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.billing_payment_settings
-- Secure, server-side dynamic configuration for manual billing payment methods.
-- Default state in production is empty/inactive, requiring no hardcoded bank details.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  masked_account_number TEXT NOT NULL,
  payment_instructions TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_billing_payment_settings_updated_at ON public.billing_payment_settings;
CREATE TRIGGER trg_billing_payment_settings_updated_at
  BEFORE UPDATE ON public.billing_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Index on active status for efficient customer queries
CREATE INDEX IF NOT EXISTS idx_billing_payment_settings_active
  ON public.billing_payment_settings(active);

-- Enable Row Level Security
ALTER TABLE public.billing_payment_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active payment settings
DROP POLICY IF EXISTS "Authenticated users can read active billing settings" ON public.billing_payment_settings;
CREATE POLICY "Authenticated users can read active billing settings"
  ON public.billing_payment_settings
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Allow service role and platform admins to manage payment settings
DROP POLICY IF EXISTS "Admins full access to billing settings" ON public.billing_payment_settings;
CREATE POLICY "Admins full access to billing settings"
  ON public.billing_payment_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
    )
  );
