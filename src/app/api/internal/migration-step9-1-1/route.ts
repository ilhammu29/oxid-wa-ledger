import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20261001180000";
const MIGRATION_NAME = "step9_1_1_admin_control_center";

const MIGRATION_SQL = `
-- 1. Table: public.platform_admins schema enhancements
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_role_check;

ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_role_check
  CHECK (role IN ('super_admin', 'support_admin', 'billing_admin', 'viewer'));

DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_platform_admins_lookup
  ON public.platform_admins(user_id, active, role);

ALTER TABLE public.subscription_audit_logs
  ALTER COLUMN subscription_id DROP NOT NULL;

-- 2. Platform Admin Authorization Helper Function
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

-- 3. Row Level Security Policies for platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_select_self" ON public.platform_admins;
CREATE POLICY "platform_admins_select_self"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "platform_admins_select_admin" ON public.platform_admins;
CREATE POLICY "platform_admins_select_admin"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin']));

DROP POLICY IF EXISTS "platform_admins_super_admin_manage" ON public.platform_admins;
CREATE POLICY "platform_admins_super_admin_manage"
  ON public.platform_admins
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin']))
  WITH CHECK (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin']));

-- 4. Row Level Security Policies for subscription_audit_logs
DROP POLICY IF EXISTS "subscription_audit_logs_select_admin" ON public.subscription_audit_logs;
CREATE POLICY "subscription_audit_logs_select_admin"
  ON public.subscription_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'support_admin', 'billing_admin', 'viewer']));

-- 5. Row Level Security Policies for billing_payment_settings
DROP POLICY IF EXISTS "Admins full access to billing settings" ON public.billing_payment_settings;
CREATE POLICY "Admins full access to billing settings"
  ON public.billing_payment_settings
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']))
  WITH CHECK (public.is_platform_admin((SELECT auth.uid()), ARRAY['super_admin', 'billing_admin']));

-- 6. Row Level Security Policies for subscription_payments
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

-- 7. Record Migration in supabase_migrations
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '${MIGRATION_VERSION}',
  ARRAY['STEP 9.1.1: Platform Admin Activation & Admin Control Center Hardening'],
  '${MIGRATION_NAME}'
)
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

    await client.query("NOTIFY pgrst, 'reload schema';");

    // Verify columns in platform_admins
    const colsRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'platform_admins'
      ORDER BY ordinal_position;
    `);

    // Verify function is_platform_admin
    const funcRes = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'is_platform_admin';
    `);

    // Verify migration record
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '${MIGRATION_VERSION}';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 9.1.1 migration applied successfully to production Supabase PostgreSQL",
      verifiedColumns: colsRes.rows.map((r: { column_name: string }) => r.column_name),
      verifiedFunction: funcRes.rows,
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
