
-- ============================================================
-- FASE 1: Criar 9 tabelas para migrar FinancialContext ao Supabase
-- ============================================================

-- 1. user_goals (Sonhos)
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON public.user_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_assets (Bens e Investimentos)
CREATE TABLE public.user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  purchase_date DATE,
  purchase_value NUMERIC,
  is_rental_property BOOLEAN DEFAULT false,
  rental_income_id TEXT,
  rental_value NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON public.user_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_assets_updated_at BEFORE UPDATE ON public.user_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. user_monthly_entries (Valores mensais do planejamento)
CREATE TABLE public.user_monthly_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month TEXT NOT NULL,
  item_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  value NUMERIC NOT NULL DEFAULT 0,
  is_projection BOOLEAN NOT NULL DEFAULT false,
  is_manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, item_id, entry_type)
);
ALTER TABLE public.user_monthly_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own monthly entries" ON public.user_monthly_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_monthly_entries_updated_at BEFORE UPDATE ON public.user_monthly_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. user_asset_monthly_entries (Evolução patrimonial)
CREATE TABLE public.user_asset_monthly_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month TEXT NOT NULL,
  asset_id UUID NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, asset_id)
);
ALTER TABLE public.user_asset_monthly_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own asset monthly entries" ON public.user_asset_monthly_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_asset_monthly_entries_updated_at BEFORE UPDATE ON public.user_asset_monthly_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. user_shared_persons (Conta conjunta)
CREATE TABLE public.user_shared_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  is_owner BOOLEAN DEFAULT false,
  income_item_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_shared_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shared persons" ON public.user_shared_persons FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_shared_persons_updated_at BEFORE UPDATE ON public.user_shared_persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. user_financial_institutions (Instituições financeiras do usuário)
CREATE TABLE public.user_financial_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution_id TEXT NOT NULL,
  custom_name TEXT,
  custom_code TEXT,
  has_checking_account BOOLEAN DEFAULT false,
  has_savings_account BOOLEAN DEFAULT false,
  has_credit_card BOOLEAN DEFAULT false,
  has_investments BOOLEAN DEFAULT false,
  credit_card_brand TEXT,
  credit_card_due_day INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_financial_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own financial institutions" ON public.user_financial_institutions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_financial_institutions_updated_at BEFORE UPDATE ON public.user_financial_institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. user_drivers (Motoristas)
CREATE TABLE public.user_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drivers" ON public.user_drivers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_drivers_updated_at BEFORE UPDATE ON public.user_drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. user_vehicle_records (Registros de veículos)
CREATE TABLE public.user_vehicle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vehicle_id TEXT NOT NULL,
  record_date DATE NOT NULL,
  odometer INTEGER,
  fuel_liters NUMERIC,
  fuel_cost NUMERIC,
  record_type TEXT NOT NULL DEFAULT 'fuel',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_vehicle_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vehicle records" ON public.user_vehicle_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_vehicle_records_updated_at BEFORE UPDATE ON public.user_vehicle_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. user_asset_linked_expenses (Despesas vinculadas a ativos)
CREATE TABLE public.user_asset_linked_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.user_assets(id) ON DELETE CASCADE,
  expense_id TEXT NOT NULL,
  expense_type TEXT NOT NULL,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  is_auto_calculated BOOLEAN DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  annual_months INTEGER[],
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_asset_linked_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own asset linked expenses" ON public.user_asset_linked_expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_asset_linked_expenses_updated_at BEFORE UPDATE ON public.user_asset_linked_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_assets_user_id ON public.user_assets(user_id);
CREATE INDEX idx_user_monthly_entries_user_id ON public.user_monthly_entries(user_id);
CREATE INDEX idx_user_monthly_entries_month ON public.user_monthly_entries(user_id, month);
CREATE INDEX idx_user_asset_monthly_entries_user_id ON public.user_asset_monthly_entries(user_id);
CREATE INDEX idx_user_shared_persons_user_id ON public.user_shared_persons(user_id);
CREATE INDEX idx_user_financial_institutions_user_id ON public.user_financial_institutions(user_id);
CREATE INDEX idx_user_drivers_user_id ON public.user_drivers(user_id);
CREATE INDEX idx_user_vehicle_records_user_id ON public.user_vehicle_records(user_id);
CREATE INDEX idx_user_vehicle_records_vehicle ON public.user_vehicle_records(user_id, vehicle_id);
CREATE INDEX idx_user_asset_linked_expenses_user_id ON public.user_asset_linked_expenses(user_id);
CREATE INDEX idx_user_asset_linked_expenses_asset ON public.user_asset_linked_expenses(asset_id);
