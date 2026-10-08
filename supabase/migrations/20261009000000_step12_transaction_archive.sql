-- ============================================================================
-- Migration: 20261009000000_step12_transaction_archive.sql
-- OXID LEDGER: TRANSACTION ARCHIVE & HIDE (NON-DESTRUCTIVE DELETION)
-- ============================================================================

-- 1. Extend transactions table with operational archive metadata
-- Allows hiding transactions from operational lists without destroying financial accounting history
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS archived_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS archive_reason TEXT NULL;

-- 2. Index for high-performance tenant-filtered unarchived/archived queries
CREATE INDEX IF NOT EXISTS idx_transactions_business_archived
  ON public.transactions(business_id, archived_at, transaction_at DESC);
