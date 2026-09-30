-- ============================================================================
-- OXID WA Ledger - Step 6C: Product Aliases & Tenant-Scoped Product Recognition
-- Migration: 20260930160000_step6c_product_aliases.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: product_aliases
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite FK strictly ensures product belongs to the exact same business
  CONSTRAINT fk_product_aliases_product_tenant
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products(id, business_id)
    ON DELETE CASCADE,
  -- Unique normalized alias within the business (avoids colliding aliases)
  CONSTRAINT uq_product_aliases_business_normalized
    UNIQUE (business_id, normalized_alias)
);

-- Trigger to maintain updated_at
CREATE TRIGGER trg_product_aliases_updated_at
  BEFORE UPDATE ON public.product_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_product_aliases_business_product
  ON public.product_aliases(business_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_aliases_lookup
  ON public.product_aliases(business_id, normalized_alias)
  WHERE active = true;

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
-- ----------------------------------------------------------------------------
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
