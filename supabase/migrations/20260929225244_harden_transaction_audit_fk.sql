-- ============================================================================
-- OXID WA Ledger - Hardening Pass: Transaction Audit Retention & Non-Destructive Cascades
-- Migration: 20260929225244_harden_transaction_audit_fk.sql
-- ============================================================================

-- 1. Harden transaction_events.transaction_id foreign key
-- Change from ON DELETE CASCADE to ON DELETE RESTRICT
-- Prevents accidental or privileged deletion of transactions while audit history exists.
ALTER TABLE public.transaction_events
  DROP CONSTRAINT IF EXISTS transaction_events_transaction_id_fkey;

ALTER TABLE public.transaction_events
  ADD CONSTRAINT transaction_events_transaction_id_fkey
  FOREIGN KEY (transaction_id)
  REFERENCES public.transactions(id)
  ON DELETE RESTRICT;

-- 2. Harden transaction_events.business_id foreign key
-- Change from ON DELETE CASCADE to ON DELETE RESTRICT
-- Prevents deletion of business records from cascading into audit trail destruction.
ALTER TABLE public.transaction_events
  DROP CONSTRAINT IF EXISTS transaction_events_business_id_fkey;

ALTER TABLE public.transaction_events
  ADD CONSTRAINT transaction_events_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.businesses(id)
  ON DELETE RESTRICT;

-- 3. Explicit defense-in-depth privileges
-- Enforce that authenticated and anon roles cannot execute DELETE on transactions
-- and cannot execute UPDATE or DELETE on transaction_events.
REVOKE DELETE ON public.transactions FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.transaction_events FROM authenticated, anon;
