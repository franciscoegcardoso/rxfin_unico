-- pluggy_sync_logs: tipo de sync (ex. sync-investment-transactions)
ALTER TABLE public.pluggy_sync_logs
  ADD COLUMN IF NOT EXISTS sync_type TEXT;

COMMENT ON COLUMN public.pluggy_sync_logs.sync_type IS 'Ex.: sync-investment-transactions, initial-sync worker, etc.';

-- Transações de investimento (API GET /investments/{id}/transactions)
CREATE TABLE IF NOT EXISTS public.pluggy_investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.pluggy_investments(id) ON DELETE CASCADE,
  pluggy_investment_id TEXT NOT NULL,
  pluggy_transaction_id TEXT NOT NULL,
  type TEXT,
  description TEXT,
  quantity NUMERIC,
  value NUMERIC,
  amount NUMERIC,
  net_amount NUMERIC,
  agreed_rate NUMERIC,
  trade_date DATE,
  date DATE,
  brokerage_number TEXT,
  expenses JSONB,
  investment_type TEXT,
  currency_code TEXT,
  status TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pluggy_investment_transactions_pluggy_tx_id_key UNIQUE (pluggy_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_pit_user ON public.pluggy_investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pit_investment ON public.pluggy_investment_transactions(investment_id);

ALTER TABLE public.pluggy_investment_transactions ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS; políticas para authenticated (leitura própria)
DROP POLICY IF EXISTS "Users can view own pluggy_investment_transactions" ON public.pluggy_investment_transactions;
CREATE POLICY "Users can view own pluggy_investment_transactions"
  ON public.pluggy_investment_transactions FOR SELECT
  USING ((select auth.uid()) = user_id);
