import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_VERSION = "20260929231057";
const MIGRATION_NAME = "step4_transaction_execution_rpc";

const MIGRATION_SQL = `
-- ============================================================================
-- OXID WA Ledger - STEP 4: Transaction Execution, Atomicity, and Reporting RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_sale(
  p_business_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT DEFAULT 'kg',
  p_source TEXT DEFAULT 'whatsapp',
  p_raw_message TEXT DEFAULT NULL,
  p_sender_phone TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_transaction_at TIMESTAMPTZ DEFAULT now()
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

  -- 4. Resolve active default product for this business
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

  -- 5. Validate unit compatibility (case-insensitive)
  IF LOWER(v_product.unit) != LOWER(p_unit) THEN
    RAISE EXCEPTION 'UNIT_MISMATCH: Product expects % but received %', v_product.unit, p_unit;
  END IF;

  -- 6. Calculate total amount exactly matching check constraint
  v_total_amount := round(p_quantity * v_product.default_price)::BIGINT;

  -- 7. Insert transaction
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

  -- 8. Insert audit event
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
      'total_amount', v_total_amount
    ),
    p_actor_user_id,
    p_source
  );

  -- 9. Calculate today's summary in business local timezone
  v_today_date := (timezone(v_biz_tz, COALESCE(p_transaction_at, now())))::DATE;
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

  -- 10. Return structured result
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

REVOKE ALL ON FUNCTION public.record_sale(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_last_sale(
  p_business_id UUID,
  p_actor_user_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'whatsapp'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz_status TEXT;
  v_tx RECORD;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin', 'member']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT status INTO v_biz_status FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
  ORDER BY transaction_at DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_TRANSACTION_TO_CANCEL';
  END IF;

  UPDATE public.transactions
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_tx.id;

  INSERT INTO public.transaction_events (
    business_id,
    transaction_id,
    event_type,
    old_values,
    new_values,
    actor_user_id,
    source
  ) VALUES (
    p_business_id,
    v_tx.id,
    'cancelled',
    jsonb_build_object(
      'status', 'confirmed',
      'quantity', v_tx.quantity,
      'total_amount', v_tx.total_amount
    ),
    jsonb_build_object('status', 'cancelled'),
    p_actor_user_id,
    p_source
  );

  RETURN jsonb_build_object(
    'transaction_id', v_tx.id,
    'business_id', p_business_id,
    'quantity', v_tx.quantity,
    'unit', v_tx.unit,
    'unit_price', v_tx.unit_price,
    'total_amount', v_tx.total_amount,
    'status', 'cancelled',
    'cancelled_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_last_sale(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_last_sale(UUID, UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.correct_last_sale(
  p_business_id UUID,
  p_corrected_quantity NUMERIC,
  p_actor_user_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'whatsapp',
  p_raw_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_biz_status TEXT;
  v_orig RECORD;
  v_new_total BIGINT;
  v_new_tx_id UUID;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin', 'member']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_corrected_quantity IS NULL OR p_corrected_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY: Corrected quantity must be greater than zero';
  END IF;

  SELECT status INTO v_biz_status FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_orig
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
  ORDER BY transaction_at DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_TRANSACTION_TO_CORRECT';
  END IF;

  v_new_total := round(p_corrected_quantity * v_orig.unit_price)::BIGINT;

  UPDATE public.transactions
  SET status = 'corrected', updated_at = now()
  WHERE id = v_orig.id;

  INSERT INTO public.transaction_events (
    business_id,
    transaction_id,
    event_type,
    old_values,
    new_values,
    actor_user_id,
    source
  ) VALUES (
    p_business_id,
    v_orig.id,
    'corrected',
    jsonb_build_object(
      'status', 'confirmed',
      'quantity', v_orig.quantity,
      'total_amount', v_orig.total_amount
    ),
    jsonb_build_object(
      'status', 'corrected',
      'corrected_to_quantity', p_corrected_quantity,
      'new_total_amount', v_new_total
    ),
    p_actor_user_id,
    p_source
  );

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
    created_by_user_id,
    supersedes_transaction_id
  ) VALUES (
    p_business_id,
    v_orig.product_id,
    'sale',
    p_corrected_quantity,
    v_orig.unit,
    v_orig.unit_price,
    v_new_total,
    p_source,
    p_raw_message,
    v_orig.sender_phone,
    'confirmed',
    v_orig.transaction_at,
    p_actor_user_id,
    v_orig.id
  ) RETURNING id INTO v_new_tx_id;

  INSERT INTO public.transaction_events (
    business_id,
    transaction_id,
    event_type,
    new_values,
    actor_user_id,
    source
  ) VALUES (
    p_business_id,
    v_new_tx_id,
    'created',
    jsonb_build_object(
      'status', 'confirmed',
      'quantity', p_corrected_quantity,
      'total_amount', v_new_total,
      'supersedes_transaction_id', v_orig.id
    ),
    p_actor_user_id,
    p_source
  );

  RETURN jsonb_build_object(
    'original_transaction_id', v_orig.id,
    'original_quantity', v_orig.quantity,
    'original_total_amount', v_orig.total_amount,
    'new_transaction_id', v_new_tx_id,
    'new_quantity', p_corrected_quantity,
    'unit', v_orig.unit,
    'unit_price', v_orig.unit_price,
    'new_total_amount', v_new_total,
    'corrected_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_last_sale(UUID, NUMERIC, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_last_sale(UUID, NUMERIC, UUID, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_business_daily_status(
  p_business_id UUID,
  p_local_date DATE,
  p_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only business owner or admin can update daily status' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_status NOT IN ('NO_SALE', 'CLOSED', 'ACTIVE') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status must be ACTIVE, NO_SALE, or CLOSED';
  END IF;

  SELECT id, status INTO v_existing
  FROM public.business_daily_status
  WHERE business_id = p_business_id
    AND local_date = p_local_date;

  IF FOUND THEN
    IF v_existing.status = p_status THEN
      RETURN jsonb_build_object(
        'id', v_existing.id,
        'business_id', p_business_id,
        'local_date', p_local_date,
        'status', p_status,
        'is_duplicate', true
      );
    ELSE
      RAISE EXCEPTION 'DAILY_STATUS_CONFLICT: Existing status is % but requested %', v_existing.status, p_status;
    END IF;
  END IF;

  INSERT INTO public.business_daily_status (
    business_id,
    local_date,
    status,
    note,
    source
  ) VALUES (
    p_business_id,
    p_local_date,
    p_status,
    p_note,
    p_source
  ) RETURNING id INTO v_existing.id;

  RETURN jsonb_build_object(
    'id', v_existing.id,
    'business_id', p_business_id,
    'local_date', p_local_date,
    'status', p_status,
    'is_duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_business_daily_status(UUID, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_business_daily_status(UUID, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_business_sales_report(
  p_business_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_total_qty NUMERIC;
  v_total_rev BIGINT;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.is_business_member(p_business_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: User does not belong to business' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(quantity), 0)::NUMERIC,
    COALESCE(SUM(total_amount), 0)::BIGINT
  INTO v_count, v_total_qty, v_total_rev
  FROM public.transactions
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND transaction_at >= p_start_at
    AND transaction_at <= p_end_at;

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'start_at', p_start_at,
    'end_at', p_end_at,
    'transaction_count', v_count,
    'total_quantity', v_total_qty,
    'total_revenue', v_total_rev
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_sales_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_sales_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

-- Record in migration tracking
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

    // Fetch verified RPC routines
    const res = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('record_sale', 'cancel_last_sale', 'correct_last_sale', 'set_business_daily_status', 'get_business_sales_report')
      ORDER BY routine_name;
    `);

    // Fetch applied migrations
    const migRes = await client.query(`
      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
    `);

    return NextResponse.json({
      success: true,
      message: "Step 4 RPC functions applied successfully to Supabase PostgreSQL",
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
