import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

const MIGRATION_VERSION = "20260930140000";
const MIGRATION_NAME = "step6b_dashboard_and_export";

const MIGRATION_SQL = `
-- ============================================================================
-- OXID WA Ledger - Step 6B: Dashboard Support, Custom Product Sales & Export RPCs
-- ============================================================================

-- 1. Update business_daily_status check constraint to include 'dashboard'
ALTER TABLE public.business_daily_status DROP CONSTRAINT IF EXISTS business_daily_status_source_check;
ALTER TABLE public.business_daily_status ADD CONSTRAINT business_daily_status_source_check
  CHECK (source IN ('owner', 'whatsapp', 'telegram', 'dashboard', 'system'));

-- 2. Update record_sale to accept optional p_product_id (backward-compatible)
DROP FUNCTION IF EXISTS public.record_sale(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.record_sale(
  p_business_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT DEFAULT 'kg',
  p_source TEXT DEFAULT 'whatsapp',
  p_raw_message TEXT DEFAULT NULL,
  p_sender_phone TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_transaction_at TIMESTAMPTZ DEFAULT now(),
  p_product_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz_status TEXT;
  v_biz_tz TEXT;
  v_product RECORD;
  v_total_amount BIGINT;
  v_transaction_id UUID;
  v_today_date DATE;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
  v_today_count INT;
  v_today_quantity NUMERIC;
  v_today_revenue BIGINT;
  v_daily_status TEXT;
BEGIN
  -- 1. Authorization check for authenticated users
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin', 'member']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Validate quantity
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than zero';
  END IF;

  -- 3. Validate business existence and active status
  SELECT status, timezone INTO v_biz_status, v_biz_tz
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND';
  END IF;

  IF v_biz_status != 'active' THEN
    RAISE EXCEPTION 'BUSINESS_INACTIVE: Business status is %', v_biz_status;
  END IF;

  -- 4. Calculate local date in business timezone
  v_today_date := (timezone(v_biz_tz, COALESCE(p_transaction_at, now())))::DATE;

  -- 5. Acquire advisory xact lock on (business_id, local_date) to serialize with set_business_daily_status
  PERFORM pg_advisory_xact_lock(hashtext(p_business_id::text), hashtext(v_today_date::text));

  -- 6. Check if date is already marked NO_SALE or CLOSED
  SELECT status INTO v_daily_status
  FROM public.business_daily_status
  WHERE business_id = p_business_id
    AND local_date = v_today_date;

  IF FOUND AND v_daily_status IN ('NO_SALE', 'CLOSED') THEN
    RAISE EXCEPTION 'DAY_STATUS_CONFLICT: Date % is already marked as %', v_today_date, v_daily_status;
  END IF;

  -- 7. Resolve product: if p_product_id is provided, resolve that active product; otherwise resolve default active product
  IF p_product_id IS NOT NULL THEN
    SELECT id, name, unit, default_price, active
    INTO v_product
    FROM public.products
    WHERE id = p_product_id
      AND business_id = p_business_id
      AND active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Active product % not found for business', p_product_id;
    END IF;
  ELSE
    SELECT id, name, unit, default_price, active
    INTO v_product
    FROM public.products
    WHERE business_id = p_business_id
      AND is_default = true
      AND active = true
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'DEFAULT_PRODUCT_NOT_CONFIGURED';
    END IF;
  END IF;

  -- 8. Validate unit compatibility (case-insensitive)
  IF LOWER(v_product.unit) != LOWER(p_unit) THEN
    RAISE EXCEPTION 'UNIT_MISMATCH: Product expects % but received %', v_product.unit, p_unit;
  END IF;

  -- 9. Calculate total amount exactly matching check constraint
  v_total_amount := round(p_quantity * v_product.default_price)::BIGINT;

  -- 10. Insert transaction
  INSERT INTO public.transactions (
    business_id,
    product_id,
    transaction_type,
    quantity,
    unit,
    unit_price,
    total_amount,
    source,
    raw_message,
    sender_phone,
    status,
    transaction_at,
    created_by_user_id
  ) VALUES (
    p_business_id,
    v_product.id,
    'sale',
    p_quantity,
    v_product.unit,
    v_product.default_price,
    v_total_amount,
    p_source,
    p_raw_message,
    p_sender_phone,
    'confirmed',
    COALESCE(p_transaction_at, now()),
    p_actor_user_id
  ) RETURNING id INTO v_transaction_id;

  -- 11. Insert audit event
  INSERT INTO public.transaction_events (
    business_id,
    transaction_id,
    event_type,
    new_values,
    actor_user_id,
    source
  ) VALUES (
    p_business_id,
    v_transaction_id,
    'created',
    jsonb_build_object(
      'status', 'confirmed',
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', p_quantity,
      'unit', v_product.unit,
      'unit_price', v_product.default_price,
      'total_amount', v_total_amount,
      'source', p_source,
      'actor_user_id', p_actor_user_id
    ),
    p_actor_user_id,
    p_source
  );

  -- 12. Calculate today's summary in business local timezone
  v_today_start := timezone(v_biz_tz, v_today_date::TIMESTAMP);
  v_today_end := timezone(v_biz_tz, (v_today_date + INTERVAL '1 day' - INTERVAL '1 microsecond')::TIMESTAMP);

  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(quantity), 0)::NUMERIC,
    COALESCE(SUM(total_amount), 0)::BIGINT
  INTO v_today_count, v_today_quantity, v_today_revenue
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND transaction_at >= v_today_start
    AND transaction_at <= v_today_end;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'business_id', p_business_id,
    'product_id', v_product.id,
    'product_name', v_product.name,
    'quantity', p_quantity,
    'unit', v_product.unit,
    'unit_price', v_product.default_price,
    'total_amount', v_total_amount,
    'status', 'confirmed',
    'transaction_at', COALESCE(p_transaction_at, now()),
    'today_summary', jsonb_build_object(
      'local_date', v_today_date,
      'transaction_count', v_today_count,
      'total_quantity', v_today_quantity,
      'total_revenue', v_today_revenue
    )
  );
END;
$$;

-- 3. Atomically set default product for a business
CREATE OR REPLACE FUNCTION public.set_default_product(
  p_business_id UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prod RECORD;
BEGIN
  -- 1. Authorization check for authenticated users
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only business owner or admin can change default product' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Verify product belongs to this business
  SELECT id, name, active
  INTO v_prod
  FROM public.products
  WHERE id = p_product_id
    AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product % does not belong to business', p_product_id;
  END IF;

  -- 3. Reset previous defaults for this business
  UPDATE public.products
  SET is_default = false
  WHERE business_id = p_business_id
    AND is_default = true;

  -- 4. Mark the target product as default and active
  UPDATE public.products
  SET is_default = true, active = true, updated_at = now()
  WHERE id = p_product_id
    AND business_id = p_business_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'business_id', p_business_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_product(UUID, UUID) TO authenticated, service_role;

-- 4. Single-query Overview KPIs RPC
CREATE OR REPLACE FUNCTION public.get_business_overview_kpis(
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz_tz TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_local_now TIMESTAMP;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;

  v_today_rev BIGINT;
  v_today_qty NUMERIC;
  v_today_cnt INT;
  v_week_rev BIGINT;
  v_month_rev BIGINT;
BEGIN
  -- 1. Authorization check
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.is_business_member(p_business_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Resolve timezone
  SELECT timezone INTO v_biz_tz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_tz IS NULL THEN
    v_biz_tz := 'Asia/Jakarta';
  END IF;

  -- Local time now in business timezone
  v_local_now := timezone(v_biz_tz, v_now);

  -- Today boundaries
  v_today_start := timezone(v_biz_tz, date_trunc('day', v_local_now));
  v_today_end := timezone(v_biz_tz, date_trunc('day', v_local_now) + interval '1 day' - interval '1 microsecond');

  -- Week boundaries (Monday to Sunday)
  v_week_start := timezone(v_biz_tz, date_trunc('week', v_local_now));
  v_week_end := timezone(v_biz_tz, date_trunc('week', v_local_now) + interval '1 week' - interval '1 microsecond');

  -- Month boundaries
  v_month_start := timezone(v_biz_tz, date_trunc('month', v_local_now));
  v_month_end := timezone(v_biz_tz, date_trunc('month', v_local_now) + interval '1 month' - interval '1 microsecond');

  -- Today aggregates
  SELECT
    COALESCE(SUM(total_amount), 0)::BIGINT,
    COALESCE(SUM(quantity), 0)::NUMERIC,
    COUNT(*)::INT
  INTO v_today_rev, v_today_qty, v_today_cnt
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND transaction_at >= v_today_start
    AND transaction_at <= v_today_end;

  -- Week revenue
  SELECT COALESCE(SUM(total_amount), 0)::BIGINT
  INTO v_week_rev
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND transaction_at >= v_week_start
    AND transaction_at <= v_week_end;

  -- Month revenue
  SELECT COALESCE(SUM(total_amount), 0)::BIGINT
  INTO v_month_rev
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND transaction_at >= v_month_start
    AND transaction_at <= v_month_end;

  RETURN jsonb_build_object(
    'today_revenue', v_today_rev,
    'today_quantity', v_today_qty,
    'today_transaction_count', v_today_cnt,
    'week_revenue', v_week_rev,
    'month_revenue', v_month_rev,
    'timezone', v_biz_tz
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_overview_kpis(UUID) TO authenticated, service_role;

-- 5. Daily Sales Series (14-day) RPC for Chart and Export
CREATE OR REPLACE FUNCTION public.get_business_daily_sales_series(
  p_business_id UUID,
  p_days INT DEFAULT 14
)
RETURNS TABLE (
  local_date DATE,
  revenue BIGINT,
  quantity NUMERIC,
  transaction_count INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz_tz TEXT;
  v_local_today DATE;
BEGIN
  -- 1. Authorization check
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.is_business_member(p_business_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT timezone INTO v_biz_tz
  FROM public.businesses
  WHERE id = p_business_id;

  IF v_biz_tz IS NULL THEN
    v_biz_tz := 'Asia/Jakarta';
  END IF;

  v_local_today := (timezone(v_biz_tz, clock_timestamp()))::DATE;

  RETURN QUERY
  WITH date_series AS (
    SELECT (v_local_today - (n || ' days')::INTERVAL)::DATE AS d
    FROM generate_series(p_days - 1, 0, -1) AS n
  ),
  daily_agg AS (
    SELECT
      (timezone(v_biz_tz, t.transaction_at))::DATE AS t_date,
      COALESCE(SUM(t.total_amount), 0)::BIGINT AS rev,
      COALESCE(SUM(t.quantity), 0)::NUMERIC AS qty,
      COUNT(*)::INT AS cnt
    FROM public.transactions t
    WHERE t.business_id = p_business_id
      AND t.status = 'confirmed'
      AND t.transaction_at >= timezone(v_biz_tz, (v_local_today - (p_days - 1))::TIMESTAMP)
      AND t.transaction_at < timezone(v_biz_tz, (v_local_today + 1)::TIMESTAMP)
    GROUP BY (timezone(v_biz_tz, t.transaction_at))::DATE
  )
  SELECT
    ds.d AS local_date,
    COALESCE(da.rev, 0)::BIGINT AS revenue,
    COALESCE(da.qty, 0)::NUMERIC AS quantity,
    COALESCE(da.cnt, 0)::INT AS transaction_count
  FROM date_series ds
  LEFT JOIN daily_agg da ON ds.d = da.t_date
  ORDER BY ds.d ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_daily_sales_series(UUID, INT) TO authenticated, service_role;

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
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('set_default_product', 'get_business_overview_kpis', 'get_business_daily_sales_series', 'record_sale')
      ORDER BY routine_name;
    `);

    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 6B migration applied successfully to Supabase PostgreSQL",
      functions: res.rows,
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
