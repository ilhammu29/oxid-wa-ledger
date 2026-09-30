-- ============================================================================
-- OXID WA Ledger - Business-State Consistency Hardening Pass
-- Migration: 20260930081500_harden_daily_status_sale_consistency.sql
--
-- Prevents contradictory states between daily status (NO_SALE / CLOSED)
-- and active confirmed sales transactions on the same business-local date.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hardened RPC: record_sale
-- Enforces: Cannot record a sale if the date is already marked NO_SALE or CLOSED.
-- Serialized per (business_id, local_date) via advisory xact lock.
-- ----------------------------------------------------------------------------
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

  -- 7. Resolve active default product for this business
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
      'total_amount', v_total_amount
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

  -- 13. Return structured result
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

-- ----------------------------------------------------------------------------
-- 2. Hardened RPC: set_business_daily_status
-- Enforces: Cannot mark NO_SALE or CLOSED if confirmed sales already exist on that date.
-- Serialized per (business_id, local_date) via advisory xact lock.
-- ----------------------------------------------------------------------------
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
  v_biz_status TEXT;
  v_biz_tz TEXT;
  v_existing RECORD;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_has_sales BOOLEAN;
BEGIN
  -- 1. Authorization check for authenticated users
  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF NOT app_auth.has_business_role(p_business_id, ARRAY['owner', 'admin']) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Only business owner or admin can update daily status' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. Validate status input
  IF p_status NOT IN ('NO_SALE', 'CLOSED', 'ACTIVE') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status must be ACTIVE, NO_SALE, or CLOSED';
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

  -- 4. Acquire advisory xact lock on (business_id, local_date) to serialize with record_sale
  PERFORM pg_advisory_xact_lock(hashtext(p_business_id::text), hashtext(p_local_date::text));

  -- 5. Calculate UTC boundary for p_local_date in business timezone
  v_day_start := timezone(v_biz_tz, p_local_date::TIMESTAMP);
  v_day_end := timezone(v_biz_tz, (p_local_date + INTERVAL '1 day' - INTERVAL '1 microsecond')::TIMESTAMP);

  -- 6. Check if active confirmed sales exist for this date
  IF p_status IN ('NO_SALE', 'CLOSED') THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.transactions
      WHERE business_id = p_business_id
        AND status = 'confirmed'
        AND transaction_at >= v_day_start
        AND transaction_at <= v_day_end
    ) INTO v_has_sales;

    IF v_has_sales THEN
      RAISE EXCEPTION 'DAY_STATUS_HAS_SALES: Confirmed sales already exist for date %', p_local_date;
    END IF;
  END IF;

  -- 7. Check existing status record on that date
  SELECT id, status INTO v_existing
  FROM public.business_daily_status
  WHERE business_id = p_business_id
    AND local_date = p_local_date;

  IF FOUND THEN
    -- If already same status, idempotent success
    IF v_existing.status = p_status THEN
      RETURN jsonb_build_object(
        'id', v_existing.id,
        'business_id', p_business_id,
        'local_date', p_local_date,
        'status', p_status,
        'is_duplicate', true
      );
    ELSE
      -- Conflicting status (e.g. existing CLOSED, incoming NO_SALE or vice-versa)
      RAISE EXCEPTION 'DAILY_STATUS_CONFLICT: Existing status is % but requested %', v_existing.status, p_status;
    END IF;
  END IF;

  -- 8. Insert new record
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
