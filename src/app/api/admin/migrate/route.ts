import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIGRATION_VERSION = "20260929221542";
const MIGRATION_NAME = "step2_core_database";

const MIGRATION_SQL = `
-- 1. Private schema for authorization helper functions
CREATE SCHEMA IF NOT EXISTS app_auth;
REVOKE ALL ON SCHEMA app_auth FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_auth TO authenticated;

-- 2. Minimal, safe trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;

-- Table 1: businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_businesses_updated_at') THEN
    CREATE TRIGGER trg_businesses_updated_at
      BEFORE UPDATE ON public.businesses
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Table 2: business_users
CREATE TABLE IF NOT EXISTS public.business_users (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_users_user_lookup
  ON public.business_users(user_id, business_id);

-- Helper functions
CREATE OR REPLACE FUNCTION app_auth.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION app_auth.is_business_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_auth.is_business_member(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION app_auth.has_business_role(p_business_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = (SELECT auth.uid())
      AND role = ANY(p_roles)
  );
$$;

REVOKE ALL ON FUNCTION app_auth.has_business_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_auth.has_business_role(UUID, TEXT[]) TO authenticated;

-- Table 3: products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  default_price BIGINT NOT NULL CHECK (default_price >= 0),
  aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_products_id_business UNIQUE (id, business_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
    CREATE TRIGGER trg_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_business_id
  ON public.products(business_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_default
  ON public.products(business_id) WHERE (is_default = true);

-- Table 4: transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  product_id UUID NULL,
  transaction_type TEXT NOT NULL DEFAULT 'sale' CHECK (transaction_type IN ('sale')),
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'dashboard', 'system')),
  raw_message TEXT NULL,
  sender_phone TEXT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'corrected')),
  transaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  supersedes_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_transactions_product_tenant
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products(id, business_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_transactions_total_amount
    CHECK (total_amount = round(quantity * unit_price)::BIGINT)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transactions_updated_at') THEN
    CREATE TRIGGER trg_transactions_updated_at
      BEFORE UPDATE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_business_at
  ON public.transactions(business_id, transaction_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_business_status
  ON public.transactions(business_id, status);

-- Table 5: transaction_events
CREATE TABLE IF NOT EXISTS public.transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'cancelled', 'corrected')),
  old_values JSONB NULL,
  new_values JSONB NULL,
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_lookup
  ON public.transaction_events(transaction_id, created_at ASC);

-- Table 6: whatsapp_connections
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending_verification', 'rate_limited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_whatsapp_connections_updated_at') THEN
    CREATE TRIGGER trg_whatsapp_connections_updated_at
      BEFORE UPDATE ON public.whatsapp_connections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_business
  ON public.whatsapp_connections(business_id);

-- Table 7: business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  owner_display_name TEXT NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_local_time TIME NOT NULL DEFAULT '20:00:00',
  daily_report_enabled BOOLEAN NOT NULL DEFAULT true,
  confirmation_mode TEXT NOT NULL DEFAULT 'ambiguous_only' CHECK (confirmation_mode IN ('always', 'ambiguous_only', 'never')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_business_settings_updated_at') THEN
    CREATE TRIGGER trg_business_settings_updated_at
      BEFORE UPDATE ON public.business_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Table 8: business_daily_status
CREATE TABLE IF NOT EXISTS public.business_daily_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'NO_SALE', 'CLOSED')),
  note TEXT NULL,
  source TEXT NOT NULL DEFAULT 'owner' CHECK (source IN ('owner', 'whatsapp', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_daily_status UNIQUE (business_id, local_date)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_business_daily_status_updated_at') THEN
    CREATE TRIGGER trg_business_daily_status_updated_at
      BEFORE UPDATE ON public.business_daily_status
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_daily_status_lookup
  ON public.business_daily_status(business_id, local_date);

-- Table 9: notification_logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  local_date DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  provider_message_id TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_logs_idempotency UNIQUE (business_id, notification_type, local_date)
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_lookup
  ON public.notification_logs(business_id, local_date);

-- Table 10: processed_whatsapp_messages
CREATE TABLE IF NOT EXISTS public.processed_whatsapp_messages (
  message_id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sender_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  payload_hash TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_whatsapp_messages_business
  ON public.processed_whatsapp_messages(business_id, received_at DESC);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_daily_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT SELECT, INSERT ON public.transaction_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_daily_status TO authenticated;
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT SELECT ON public.processed_whatsapp_messages TO authenticated;

-- Policies (Drop existing if re-running to ensure idempotence)
DO $$
BEGIN
  -- businesses
  DROP POLICY IF EXISTS "businesses_select_member" ON public.businesses;
  DROP POLICY IF EXISTS "businesses_insert_creator" ON public.businesses;
  DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;

  -- business_users
  DROP POLICY IF EXISTS "business_users_select_member" ON public.business_users;
  DROP POLICY IF EXISTS "business_users_insert_permitted" ON public.business_users;
  DROP POLICY IF EXISTS "business_users_update_owner" ON public.business_users;
  DROP POLICY IF EXISTS "business_users_delete_permitted" ON public.business_users;

  -- products
  DROP POLICY IF EXISTS "products_select_member" ON public.products;
  DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
  DROP POLICY IF EXISTS "products_update_admin" ON public.products;
  DROP POLICY IF EXISTS "products_delete_owner" ON public.products;

  -- transactions
  DROP POLICY IF EXISTS "transactions_select_member" ON public.transactions;
  DROP POLICY IF EXISTS "transactions_insert_member" ON public.transactions;
  DROP POLICY IF EXISTS "transactions_update_privileged" ON public.transactions;

  -- transaction_events
  DROP POLICY IF EXISTS "transaction_events_select_member" ON public.transaction_events;
  DROP POLICY IF EXISTS "transaction_events_insert_member" ON public.transaction_events;

  -- whatsapp_connections
  DROP POLICY IF EXISTS "whatsapp_connections_select_member" ON public.whatsapp_connections;
  DROP POLICY IF EXISTS "whatsapp_connections_insert_admin" ON public.whatsapp_connections;
  DROP POLICY IF EXISTS "whatsapp_connections_update_admin" ON public.whatsapp_connections;
  DROP POLICY IF EXISTS "whatsapp_connections_delete_owner" ON public.whatsapp_connections;

  -- business_settings
  DROP POLICY IF EXISTS "business_settings_select_member" ON public.business_settings;
  DROP POLICY IF EXISTS "business_settings_insert_admin" ON public.business_settings;
  DROP POLICY IF EXISTS "business_settings_update_admin" ON public.business_settings;

  -- business_daily_status
  DROP POLICY IF EXISTS "business_daily_status_select_member" ON public.business_daily_status;
  DROP POLICY IF EXISTS "business_daily_status_insert_admin" ON public.business_daily_status;
  DROP POLICY IF EXISTS "business_daily_status_update_admin" ON public.business_daily_status;
  DROP POLICY IF EXISTS "business_daily_status_delete_owner" ON public.business_daily_status;

  -- notification_logs
  DROP POLICY IF EXISTS "notification_logs_select_member" ON public.notification_logs;

  -- processed_whatsapp_messages
  DROP POLICY IF EXISTS "processed_wa_messages_select_member" ON public.processed_whatsapp_messages;
END $$;

CREATE POLICY "businesses_select_member" ON public.businesses FOR SELECT TO authenticated USING (app_auth.is_business_member(id));
CREATE POLICY "businesses_insert_creator" ON public.businesses FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "businesses_update_owner" ON public.businesses FOR UPDATE TO authenticated USING (app_auth.has_business_role(id, ARRAY['owner'])) WITH CHECK (app_auth.has_business_role(id, ARRAY['owner']));

CREATE POLICY "business_users_select_member" ON public.business_users FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "business_users_insert_permitted" ON public.business_users FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) OR (user_id = (SELECT auth.uid()) AND role = 'owner' AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.created_by = (SELECT auth.uid()))));
CREATE POLICY "business_users_update_owner" ON public.business_users FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner']));
CREATE POLICY "business_users_delete_permitted" ON public.business_users FOR DELETE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner']) OR (user_id = (SELECT auth.uid()) AND role != 'owner'));

CREATE POLICY "products_select_member" ON public.products FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) AND business_id = business_id);
CREATE POLICY "products_delete_owner" ON public.products FOR DELETE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner']));

CREATE POLICY "transactions_select_member" ON public.transactions FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "transactions_insert_member" ON public.transactions FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin', 'member']));
CREATE POLICY "transactions_update_privileged" ON public.transactions FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) AND business_id = business_id);

CREATE POLICY "transaction_events_select_member" ON public.transaction_events FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "transaction_events_insert_member" ON public.transaction_events FOR INSERT TO authenticated WITH CHECK (app_auth.is_business_member(business_id));

CREATE POLICY "whatsapp_connections_select_member" ON public.whatsapp_connections FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "whatsapp_connections_insert_admin" ON public.whatsapp_connections FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));
CREATE POLICY "whatsapp_connections_update_admin" ON public.whatsapp_connections FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) AND business_id = business_id);
CREATE POLICY "whatsapp_connections_delete_owner" ON public.whatsapp_connections FOR DELETE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner']));

CREATE POLICY "business_settings_select_member" ON public.business_settings FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "business_settings_insert_admin" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));
CREATE POLICY "business_settings_update_admin" ON public.business_settings FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) AND business_id = business_id);

CREATE POLICY "business_daily_status_select_member" ON public.business_daily_status FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "business_daily_status_insert_admin" ON public.business_daily_status FOR INSERT TO authenticated WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));
CREATE POLICY "business_daily_status_update_admin" ON public.business_daily_status FOR UPDATE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])) WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']) AND business_id = business_id);
CREATE POLICY "business_daily_status_delete_owner" ON public.business_daily_status FOR DELETE TO authenticated USING (app_auth.has_business_role(business_id, ARRAY['owner']));

CREATE POLICY "notification_logs_select_member" ON public.notification_logs FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));
CREATE POLICY "processed_wa_messages_select_member" ON public.processed_whatsapp_messages FOR SELECT TO authenticated USING (app_auth.is_business_member(business_id));

-- Record migration in standard Supabase migration tracking table
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
`;

export async function POST(req: NextRequest) {
  const authKey = req.headers.get("x-migration-key");
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedKey || authKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!rawPgUrl) {
    return NextResponse.json(
      { error: "POSTGRES_URL is not configured in the server environment" },
      { status: 500 }
    );
  }

  // Strip query parameters so pg does not enforce strict sslmode CA checks
  const cleanPgUrl = rawPgUrl.replace(/\?.*$/, "");
  const client = new Client({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query("BEGIN;");
    await client.query(MIGRATION_SQL);
    await client.query("COMMIT;");

    // Fetch created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    // Fetch applied migrations
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 2 migration applied successfully to Supabase PostgreSQL",
      tablesCreated: res.rows.map((r) => r.table_name),
      appliedMigrations: migRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
