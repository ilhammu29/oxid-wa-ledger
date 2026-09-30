import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20260930160000";
const MIGRATION_NAME = "step6c_product_aliases";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_product_aliases_product_tenant
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products(id, business_id)
    ON DELETE CASCADE,
  CONSTRAINT uq_product_aliases_business_normalized
    UNIQUE (business_id, normalized_alias)
);

DROP TRIGGER IF EXISTS trg_product_aliases_updated_at ON public.product_aliases;
CREATE TRIGGER trg_product_aliases_updated_at
  BEFORE UPDATE ON public.product_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_product_aliases_business_product
  ON public.product_aliases(business_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_aliases_lookup
  ON public.product_aliases(business_id, normalized_alias)
  WHERE active = true;

ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_aliases FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_aliases TO authenticated;
GRANT ALL ON public.product_aliases TO service_role;

DROP POLICY IF EXISTS "product_aliases_select_member" ON public.product_aliases;
CREATE POLICY "product_aliases_select_member"
  ON public.product_aliases
  FOR SELECT
  TO authenticated
  USING (app_auth.is_business_member(business_id));

DROP POLICY IF EXISTS "product_aliases_insert_admin" ON public.product_aliases;
CREATE POLICY "product_aliases_insert_admin"
  ON public.product_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "product_aliases_update_admin" ON public.product_aliases;
CREATE POLICY "product_aliases_update_admin"
  ON public.product_aliases
  FOR UPDATE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (
    app_auth.has_business_role(business_id, ARRAY['owner', 'admin'])
    AND business_id = business_id
  );

DROP POLICY IF EXISTS "product_aliases_delete_admin" ON public.product_aliases;
CREATE POLICY "product_aliases_delete_admin"
  ON public.product_aliases
  FOR DELETE
  TO authenticated
  USING (app_auth.has_business_role(business_id, ARRAY['owner', 'admin']));

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('${MIGRATION_VERSION}', '${MIGRATION_NAME}')
ON CONFLICT (version) DO NOTHING;
`;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawPgUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
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

    const res = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_aliases'
      ORDER BY ordinal_position;
    `);

    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 6C migration applied successfully to Supabase PostgreSQL",
      tableColumns: res.rows,
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
