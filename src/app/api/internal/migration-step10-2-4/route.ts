import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_SQL = `
CREATE OR REPLACE FUNCTION public.create_or_bootstrap_product(
  p_business_id UUID,
  p_name TEXT,
  p_unit TEXT DEFAULT 'kg',
  p_price BIGINT DEFAULT 0,
  p_aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_is_onboarding BOOLEAN DEFAULT false,
  p_set_as_default BOOLEAN DEFAULT false,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_clean_name TEXT;
  v_clean_unit TEXT;
  v_price BIGINT;
  v_current_default_id UUID;
  v_should_be_default BOOLEAN := false;
  v_existing_prod RECORD;
  v_product_id UUID;
  v_alias TEXT;
  v_clean_alias TEXT;
  v_norm_alias TEXT;
BEGIN
  -- 1. Identity & Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    IF (
      current_user IN ('postgres', 'service_role')
      OR session_user IN ('postgres', 'service_role', 'authenticator')
      OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      OR COALESCE(auth.role(), '') = 'service_role'
    ) AND p_user_id IS NOT NULL THEN
      v_user_id := p_user_id;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'Sesi Anda tidak valid. Silakan masuk kembali.'
      );
    END IF;
  END IF;

  -- 2. Tenant isolation check: user must have owner or admin role in p_business_id
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role'
     AND COALESCE(auth.role(), '') != 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_users
      WHERE business_id = p_business_id
        AND user_id = v_user_id
        AND role IN ('owner', 'admin')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'Hanya pemilik atau admin yang dapat menambahkan produk.'
      );
    END IF;
  END IF;

  -- 3. Input validation
  v_clean_name := trim(p_name);
  IF v_clean_name IS NULL OR length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_NAME',
      'message', 'Nama produk minimal 2 karakter.'
    );
  END IF;

  v_price := COALESCE(p_price, 0);
  IF v_price < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PRICE',
      'message', 'Harga produk tidak valid.'
    );
  END IF;

  v_clean_unit := COALESCE(NULLIF(trim(p_unit), ''), 'kg');

  -- 4. Concurrency lock per business to eliminate race conditions
  PERFORM pg_advisory_xact_lock(hashtext('product_bootstrap_' || p_business_id::text));

  -- 5. Idempotency guard for onboarding / retry requests
  IF p_is_onboarding THEN
    SELECT id, name, is_default, unit, default_price
    INTO v_existing_prod
    FROM public.products
    WHERE business_id = p_business_id
      AND active = true
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;

    IF v_existing_prod.id IS NOT NULL THEN
      -- Ensure progress is marked product_completed
      INSERT INTO public.business_onboarding_progress (
        business_id,
        current_step,
        product_completed
      )
      VALUES (
        p_business_id,
        3,
        true
      )
      ON CONFLICT (business_id) DO UPDATE SET
        product_completed = true,
        current_step = GREATEST(public.business_onboarding_progress.current_step, 3);

      -- Ensure existing product is marked default if no other default exists
      IF NOT v_existing_prod.is_default AND NOT EXISTS (
        SELECT 1 FROM public.products WHERE business_id = p_business_id AND is_default = true AND active = true
      ) THEN
        UPDATE public.products SET is_default = true WHERE id = v_existing_prod.id;
        v_existing_prod.is_default := true;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'product_id', v_existing_prod.id,
        'name', v_existing_prod.name,
        'is_default', v_existing_prod.is_default,
        'idempotent', true,
        'message', 'Produk pertama Anda sudah berhasil dibuat. Melanjutkan onboarding…'
      );
    END IF;
  END IF;

  -- 6. Enforce Default Product Invariant:
  -- Each business may have ZERO or ONE active default product.
  SELECT id INTO v_current_default_id
  FROM public.products
  WHERE business_id = p_business_id
    AND is_default = true
    AND active = true
  LIMIT 1;

  IF v_current_default_id IS NULL THEN
    -- If no active default exists (or zero products), this first product becomes default automatically
    v_should_be_default := true;
  ELSIF p_set_as_default THEN
    -- Explicitly requested to switch default: clear previous default first
    UPDATE public.products
    SET is_default = false
    WHERE business_id = p_business_id
      AND is_default = true;
    v_should_be_default := true;
  ELSE
    -- Keep existing default intact, new product is NOT default
    v_should_be_default := false;
  END IF;

  -- 7. Insert the new product
  v_product_id := gen_random_uuid();

  INSERT INTO public.products (
    id,
    business_id,
    name,
    unit,
    default_price,
    is_default,
    active
  )
  VALUES (
    v_product_id,
    p_business_id,
    v_clean_name,
    v_clean_unit,
    v_price,
    v_should_be_default,
    true
  );

  -- 8. Insert aliases safely (canonical name + supplied aliases)
  -- 8.1 Self canonical name
  INSERT INTO public.product_aliases (
    business_id,
    product_id,
    alias,
    normalized_alias,
    active
  )
  VALUES (
    p_business_id,
    v_product_id,
    lower(v_clean_name),
    lower(regexp_replace(v_clean_name, '\s+', ' ', 'g')),
    true
  )
  ON CONFLICT (business_id, normalized_alias) DO NOTHING;

  -- 8.2 Additional aliases
  IF p_aliases IS NOT NULL AND array_length(p_aliases, 1) > 0 THEN
    FOREACH v_alias IN ARRAY p_aliases
    LOOP
      v_clean_alias := trim(v_alias);
      IF v_clean_alias IS NOT NULL AND length(v_clean_alias) > 0 THEN
        v_norm_alias := lower(regexp_replace(v_clean_alias, '\s+', ' ', 'g'));
        BEGIN
          INSERT INTO public.product_aliases (
            business_id,
            product_id,
            alias,
            normalized_alias,
            active
          )
          VALUES (
            p_business_id,
            v_product_id,
            v_clean_alias,
            v_norm_alias,
            true
          )
          ON CONFLICT (business_id, normalized_alias) DO NOTHING;
        EXCEPTION
          WHEN OTHERS THEN
            NULL; -- Skip malformed/colliding aliases gracefully
        END;
      END IF;
    END LOOP;
  END IF;

  -- 9. Update onboarding progress if called within onboarding flow
  IF p_is_onboarding THEN
    INSERT INTO public.business_onboarding_progress (
      business_id,
      current_step,
      product_completed
    )
    VALUES (
      p_business_id,
      3,
      true
    )
    ON CONFLICT (business_id) DO UPDATE SET
      product_completed = true,
      current_step = GREATEST(public.business_onboarding_progress.current_step, 3);
  END IF;

  -- 10. Audit trail
  INSERT INTO public.subscription_audit_logs (
    business_id,
    actor_user_id,
    action,
    new_status,
    metadata
  )
  VALUES (
    p_business_id,
    v_user_id,
    'product_created',
    'trialing',
    jsonb_build_object(
      'product_id', v_product_id,
      'name', v_clean_name,
      'unit', v_clean_unit,
      'default_price', v_price,
      'is_default', v_should_be_default,
      'is_onboarding', p_is_onboarding
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'name', v_clean_name,
    'is_default', v_should_be_default,
    'message', 'Produk berhasil disimpan.'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Graceful catch for idx_products_unique_default or other unique constraints
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DEFAULT_CONFLICT',
      'message', 'Produk berhasil disimpan, tetapi status produk default tidak dapat diperbarui.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRODUCT_CREATE_FAILED',
      'message', 'Produk belum dapat dibuat. Silakan coba lagi.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_bootstrap_product(uuid, text, text, bigint, text[], boolean, boolean, uuid) TO anon, authenticated, service_role;
`;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!pgUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  const cleanPgUrl = pgUrl.includes("?") ? pgUrl.split("?")[0] : pgUrl;

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

    // Check routine exists
    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'create_or_bootstrap_product';
    `);

    return NextResponse.json({
      success: true,
      message: "Step 10.2.4 authoritative product creation RPC applied successfully in production Supabase PostgreSQL",
      verifiedFunction: funcRes.rows,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK;").catch(() => {});
    const msg = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
