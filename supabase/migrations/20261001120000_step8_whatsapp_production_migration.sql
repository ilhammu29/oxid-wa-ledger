-- ============================================================================
-- OXID WA Ledger - STEP 8: Production WhatsApp Client Migration
-- Migration: 20261001120000_step8_whatsapp_production_migration.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extend whatsapp_connections with Production Metadata & Template Settings
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS verified_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS reminder_template_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS reminder_template_language TEXT NOT NULL DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS reminder_template_status TEXT NOT NULL DEFAULT 'unconfigured';

-- Safely expand status check constraint to include 'active' if needed
DO $$
BEGIN
  ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_status_check;
  ALTER TABLE public.whatsapp_connections
    ADD CONSTRAINT whatsapp_connections_status_check
    CHECK (status IN ('connected', 'active', 'disconnected', 'pending_verification', 'rate_limited'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Check constraint for reminder_template_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_whatsapp_reminder_template_status'
  ) THEN
    ALTER TABLE public.whatsapp_connections
      ADD CONSTRAINT chk_whatsapp_reminder_template_status
      CHECK (reminder_template_status IN ('unconfigured', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Extend whatsapp_authorized_senders with Reminder Flag
-- ----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_authorized_senders
  ADD COLUMN IF NOT EXISTS receive_reminders BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 3. Record Migration in supabase_migrations
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261001120000', 'step8_whatsapp_production_migration')
ON CONFLICT (version) DO NOTHING;
