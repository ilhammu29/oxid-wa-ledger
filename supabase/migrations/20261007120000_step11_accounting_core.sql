-- ============================================================================
-- Migration: 20261007120000_step11_accounting_core.sql
-- OXID LEDGER v2: ACCOUNTING & BOOKKEEPING CORE FOR UMKM
-- ============================================================================

-- 1. Extend products table with authoritative unit_cost (HPP)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_cost BIGINT NOT NULL DEFAULT 0 CHECK (unit_cost >= 0);

-- 2. Extend transactions table with credit sales and customer metadata
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS customer_name TEXT NULL;

-- ----------------------------------------------------------------------------
-- Table: chart_of_accounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  parent_id UUID NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coa_business_code UNIQUE (business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_business_code ON public.chart_of_accounts(business_id, code);
CREATE INDEX IF NOT EXISTS idx_coa_business_type ON public.chart_of_accounts(business_id, type);

-- ----------------------------------------------------------------------------
-- Function: seed_default_chart_of_accounts
-- Seeds authoritative Indonesian standard COA for a business
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1000 ASSETS
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '1000', 'Aset', 'ASSET', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '1100', 'Kas', 'ASSET', 'DEBIT', true, true),
    (p_business_id, '1200', 'Bank', 'ASSET', 'DEBIT', true, true),
    (p_business_id, '1300', 'Piutang Usaha', 'ASSET', 'DEBIT', true, true),
    (p_business_id, '1400', 'Persediaan Barang', 'ASSET', 'DEBIT', true, true),
    (p_business_id, '1500', 'Aset Tetap', 'ASSET', 'DEBIT', true, true),
    (p_business_id, '1590', 'Akumulasi Penyusutan', 'ASSET', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 2000 LIABILITIES
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '2000', 'Kewajiban', 'LIABILITY', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '2100', 'Hutang Usaha', 'LIABILITY', 'CREDIT', true, true),
    (p_business_id, '2200', 'Hutang Pinjaman', 'LIABILITY', 'CREDIT', true, true),
    (p_business_id, '2300', 'Kewajiban Lainnya', 'LIABILITY', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 3000 EQUITY
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '3000', 'Ekuitas', 'EQUITY', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '3100', 'Modal Pemilik', 'EQUITY', 'CREDIT', true, true),
    (p_business_id, '3200', 'Prive Pemilik', 'EQUITY', 'DEBIT', true, true),
    (p_business_id, '3300', 'Saldo Laba', 'EQUITY', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 4000 REVENUE
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '4000', 'Pendapatan', 'REVENUE', 'CREDIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '4100', 'Pendapatan Penjualan', 'REVENUE', 'CREDIT', true, true),
    (p_business_id, '4200', 'Pendapatan Lain-lain', 'OTHER_INCOME', 'CREDIT', true, true),
    (p_business_id, '4300', 'Retur Penjualan', 'REVENUE', 'DEBIT', true, true),
    (p_business_id, '4400', 'Potongan Penjualan', 'REVENUE', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 5000 COGS
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '5000', 'Harga Pokok Penjualan', 'COGS', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '5100', 'Beban Pokok Penjualan', 'COGS', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 6000 EXPENSES
  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES (p_business_id, '6000', 'Beban Operasional', 'EXPENSE', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (business_id, code, name, type, normal_balance, is_system, is_active)
  VALUES 
    (p_business_id, '6100', 'Beban Gaji', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6200', 'Beban Listrik & Air', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6300', 'Beban Internet & Pulsa', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6400', 'Beban Sewa', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6500', 'Beban Transportasi & Bensin', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6600', 'Beban Pemasaran & Iklan', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6700', 'Beban Administrasi & ATK', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6800', 'Beban Penyusutan', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6900', 'Beban Operasional Lainnya', 'EXPENSE', 'DEBIT', true, true),
    (p_business_id, '6950', 'Beban Bunga Pinjaman', 'OTHER_EXPENSE', 'DEBIT', true, true)
  ON CONFLICT (business_id, code) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------------------------
-- Table: counterparties (Customers & Suppliers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  phone TEXT NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counterparties_biz_type ON public.counterparties(business_id, type);

-- ----------------------------------------------------------------------------
-- Table: journal_entries (Header)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  journal_date DATE NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'SALE', 'EXPENSE', 'PURCHASE', 'CAPITAL_IN', 'OWNER_DRAW',
    'PAYMENT_RECEIVABLE', 'PAYMENT_PAYABLE', 'ASSET_PURCHASE',
    'DEPRECIATION', 'LOAN_IN', 'LOAN_PAYMENT', 'MANUAL',
    'VOID_REVERSAL', 'OPENING_BALANCE'
  )),
  source_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
  reference TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ NULL,
  void_reason TEXT NULL,
  reversal_entry_id UUID NULL REFERENCES public.journal_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_biz_date ON public.journal_entries(business_id, journal_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.journal_entries(business_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(business_id, status);

-- ----------------------------------------------------------------------------
-- Table: journal_lines (Detail - Double Entry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit BIGINT NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit BIGINT NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT NULL,
  line_order INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_journal_line_nonzero CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_id);

-- ----------------------------------------------------------------------------
-- Table: expenses (Operational & Overhead Expenses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  expense_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  payment_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  source TEXT NOT NULL DEFAULT 'telegram' CHECK (source IN ('telegram', 'whatsapp', 'dashboard', 'system')),
  created_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON public.expenses(business_id, expense_date DESC);

-- ----------------------------------------------------------------------------
-- Table: capital_movements (Owner Capital & Prive)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capital_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CAPITAL_IN', 'OWNER_DRAW')),
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  movement_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  source TEXT NOT NULL DEFAULT 'telegram',
  created_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_biz_date ON public.capital_movements(business_id, movement_date DESC);

-- ----------------------------------------------------------------------------
-- Table: purchases (Stock & Raw Materials Purchases)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_name TEXT NULL,
  supplier_id UUID NULL REFERENCES public.counterparties(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_cost BIGINT NOT NULL CHECK (unit_cost >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'credit')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  purchase_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'telegram',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_biz_date ON public.purchases(business_id, purchase_date DESC);

-- ----------------------------------------------------------------------------
-- Table: inventory_movements (Authoritative Stock Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_cost BIGINT NOT NULL CHECK (unit_cost >= 0),
  total_cost BIGINT NOT NULL CHECK (total_cost >= 0),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'opening_stock', 'purchase', 'sale', 'sale_void', 'purchase_void',
    'return', 'adjustment_in', 'adjustment_out', 'damaged', 'lost'
  )),
  reference_type TEXT NULL,
  reference_id UUID NULL,
  movement_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_biz_prod ON public.inventory_movements(business_id, product_id, movement_at DESC);

-- ----------------------------------------------------------------------------
-- Table: receivables (Piutang Penjualan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NULL REFERENCES public.counterparties(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  source_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'voided')),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receivables_biz_status ON public.receivables(business_id, status);

CREATE TABLE IF NOT EXISTS public.receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE RESTRICT,
  payment_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: payables (Hutang Pembelian)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID NULL REFERENCES public.counterparties(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  purchase_id UUID NULL REFERENCES public.purchases(id) ON DELETE SET NULL,
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'voided')),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payables_biz_status ON public.payables(business_id, status);

CREATE TABLE IF NOT EXISTS public.payable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payable_id UUID NOT NULL REFERENCES public.payables(id) ON DELETE RESTRICT,
  payment_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: fixed_assets & asset_depreciations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment',
  purchase_date DATE NOT NULL,
  acquisition_cost BIGINT NOT NULL CHECK (acquisition_cost > 0),
  useful_life_months INT NOT NULL CHECK (useful_life_months > 0),
  residual_value BIGINT NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
  depreciation_method TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
  accumulated_depreciation BIGINT NOT NULL DEFAULT 0 CHECK (accumulated_depreciation >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fully_depreciated', 'sold', 'disposed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_depreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE RESTRICT,
  depreciation_date DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  journal_entry_id UUID NULL REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: loans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lender_name TEXT NOT NULL,
  principal_amount BIGINT NOT NULL CHECK (principal_amount > 0),
  remaining_principal BIGINT NOT NULL CHECK (remaining_principal >= 0),
  interest_rate_percent NUMERIC(5, 2) DEFAULT 0,
  loan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: accounting_audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_user_id UUID NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acct_audit_biz ON public.accounting_audit_logs(business_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Auto-seed COA Trigger for new businesses
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_seed_chart_of_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.seed_default_chart_of_accounts(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_seed_coa ON public.businesses;
CREATE TRIGGER trg_business_seed_coa
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_chart_of_accounts();

-- Backfill existing businesses with COA
DO $$
DECLARE
  b RECORD;
BEGIN
  FOR b IN SELECT id FROM public.businesses LOOP
    PERFORM public.seed_default_chart_of_accounts(b.id);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) Configuration
-- ----------------------------------------------------------------------------
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_depreciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper macro for RLS policies
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'chart_of_accounts', 'counterparties', 'journal_entries', 'expenses',
    'capital_movements', 'purchases', 'inventory_movements', 'receivables',
    'receivable_payments', 'payables', 'payable_payments', 'fixed_assets',
    'asset_depreciations', 'loans', 'accounting_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS p_select_%I ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY p_select_%I ON public.%I FOR SELECT USING (app_auth.is_business_member(business_id))', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS p_insert_%I ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY p_insert_%I ON public.%I FOR INSERT WITH CHECK (app_auth.is_business_member(business_id))', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS p_update_%I ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY p_update_%I ON public.%I FOR UPDATE USING (app_auth.is_business_member(business_id))', tbl, tbl);
  END LOOP;
END;
$$;

-- Journal lines RLS joins to parent journal_entries
DROP POLICY IF EXISTS p_select_journal_lines ON public.journal_lines;
CREATE POLICY p_select_journal_lines ON public.journal_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id
      AND app_auth.is_business_member(je.business_id)
  )
);

DROP POLICY IF EXISTS p_insert_journal_lines ON public.journal_lines;
CREATE POLICY p_insert_journal_lines ON public.journal_lines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_id
      AND app_auth.is_business_member(je.business_id)
  )
);
