import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20261001140000";
const MIGRATION_NAME = "step9_saas_subscriptions";

const MIGRATION_SQL = `
-- ============================================================================
-- OXID WA Ledger - STEP 9: SaaS Subscription & Client Management
-- Migration: 20261001140000_step9_saas_subscriptions.sql
-- ============================================================================

-- 1. Table: public.business_subscriptions
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'pilot' CHECK (plan_code IN ('pilot', 'basic', 'pro')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled')),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  grace_period_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '17 days'),
  activated_at TIMESTAMPTZ NULL,
  suspended_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_subscriptions_updated_at ON public.business_subscriptions;
CREATE TRIGGER trg_business_subscriptions_updated_at
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Indexes for efficient lifecycle queries
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status_period
  ON public.business_subscriptions(status, current_period_end);

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_trial_ends
  ON public.business_subscriptions(status, trial_ends_at)
  WHERE status = 'trialing';

CREATE INDEX IF NOT EXISTS idx_business_subscriptions_grace_ends
  ON public.business_subscriptions(status, grace_period_ends_at)
  WHERE status = 'grace_period';

-- 2. Table: public.subscription_payments
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.business_subscriptions(id) ON DELETE CASCADE,
  amount_idr BIGINT NOT NULL CHECK (amount_idr >= 0),
  payment_method TEXT NOT NULL DEFAULT 'manual_transfer',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reference TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL,
  confirmed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_subscription_payments_updated_at ON public.subscription_payments;
CREATE TRIGGER trg_subscription_payments_updated_at
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscription_payments_business
  ON public.subscription_payments(business_id, created_at DESC);

-- 3. Table: public.platform_admins
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table: public.subscription_audit_logs
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.business_subscriptions(id) ON DELETE CASCADE,
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NULL,
  action TEXT NOT NULL,
  previous_status TEXT NULL,
  new_status TEXT NOT NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_business
  ON public.subscription_audit_logs(business_id, created_at DESC);

-- 5. Automatic Business Subscription Initialization Trigger
CREATE OR REPLACE FUNCTION public.trg_init_business_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.business_subscriptions (
    business_id,
    plan_code,
    status,
    trial_started_at,
    trial_ends_at,
    current_period_start,
    current_period_end,
    grace_period_ends_at
  )
  VALUES (
    NEW.id,
    'pilot',
    'trialing',
    now(),
    now() + INTERVAL '14 days',
    now(),
    now() + INTERVAL '14 days',
    now() + INTERVAL '17 days'
  )
  ON CONFLICT (business_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_subscription_init ON public.businesses;
CREATE TRIGGER trg_business_subscription_init
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_init_business_subscription();

-- Backfill existing businesses with active subscriptions
INSERT INTO public.business_subscriptions (
  business_id,
  plan_code,
  status,
  trial_started_at,
  trial_ends_at,
  current_period_start,
  current_period_end,
  grace_period_ends_at,
  activated_at
)
SELECT
  b.id,
  'pilot',
  'active',
  b.created_at,
  b.created_at + INTERVAL '14 days',
  b.created_at,
  b.created_at + INTERVAL '365 days',
  b.created_at + INTERVAL '368 days',
  b.created_at
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;

-- 6. Row Level Security Policies
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_subscriptions FROM PUBLIC, anon;
GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT ALL ON public.business_subscriptions TO service_role;

REVOKE ALL ON public.subscription_payments FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;

REVOKE ALL ON public.platform_admins FROM PUBLIC, anon;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

REVOKE ALL ON public.subscription_audit_logs FROM PUBLIC, anon;
GRANT SELECT ON public.subscription_audit_logs TO authenticated;
GRANT ALL ON public.subscription_audit_logs TO service_role;

-- Subscription RLS
DROP POLICY IF EXISTS "business_subscriptions_select_own" ON public.business_subscriptions;
CREATE POLICY "business_subscriptions_select_own"
  ON public.business_subscriptions
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

-- Payment RLS
DROP POLICY IF EXISTS "subscription_payments_select_own" ON public.subscription_payments;
CREATE POLICY "subscription_payments_select_own"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "subscription_payments_insert_admin" ON public.subscription_payments;
CREATE POLICY "subscription_payments_insert_admin"
  ON public.subscription_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND status = 'pending'
  );

-- Audit log RLS
DROP POLICY IF EXISTS "subscription_audit_logs_select_own" ON public.subscription_audit_logs;
CREATE POLICY "subscription_audit_logs_select_own"
  ON public.subscription_audit_logs
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

-- Platform Admins RLS
DROP POLICY IF EXISTS "platform_admins_select_self" ON public.platform_admins;
CREATE POLICY "platform_admins_select_self"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 7. Subscription Gate Helper Function
CREATE OR REPLACE FUNCTION public.check_subscription_mutation_allowed(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT status, trial_ends_at, current_period_end, grace_period_ends_at
  INTO v_sub
  FROM public.business_subscriptions
  WHERE business_id = p_business_id;

  -- If no subscription record found, allow for backward compatibility
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Suspended or Cancelled or Past Due -> Strictly Blocked
  IF v_sub.status IN ('suspended', 'cancelled', 'past_due') THEN
    RETURN false;
  END IF;

  -- Grace Period -> Read only, block new financial mutations
  IF v_sub.status = 'grace_period' THEN
    RETURN false;
  END IF;

  -- Trialing -> Allowed only before trial_ends_at
  IF v_sub.status = 'trialing' THEN
    IF v_sub.trial_ends_at < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  -- Active -> Allowed only before current_period_end
  IF v_sub.status = 'active' THEN
    IF v_sub.current_period_end < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN true;
END;
$$;

-- 8. Record Migration in supabase_migrations
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL;

  if (!rawPgUrl) {
    return NextResponse.json(
      { error: "No PostgreSQL connection string available on server" },
      { status: 500 }
    );
  }

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

    // Reload schema cache again after commit
    await client.query("NOTIFY pgrst, 'reload schema';");

    // 1. Verify tables exist
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'business_subscriptions',
          'subscription_payments',
          'platform_admins',
          'subscription_audit_logs'
        )
      ORDER BY table_name;
    `);

    // 2. Verify trigger on businesses
    const trigRes = await client.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'businesses'
        AND trigger_name = 'trg_business_subscription_init';
    `);

    // 3. Verify function exists
    const funcRes = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'check_subscription_mutation_allowed';
    `);

    // 4. Verify backfilled subscriptions
    const subCountRes = await client.query(`
      SELECT count(*)::int AS count FROM public.business_subscriptions;
    `);

    // 5. Verify migration record
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 9 SaaS Subscriptions migration applied successfully to production Supabase PostgreSQL",
      verifiedTables: tablesRes.rows.map((r: { table_name: string }) => r.table_name),
      verifiedTrigger: trigRes.rows,
      verifiedFunction: funcRes.rows,
      backfilledSubscriptionsCount: subCountRes.rows[0]?.count ?? 0,
      appliedMigration: migRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
