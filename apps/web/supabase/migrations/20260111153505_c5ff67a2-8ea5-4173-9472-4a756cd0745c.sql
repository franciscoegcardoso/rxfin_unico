-- =====================================================
-- FASE 1: Criar Tabela de Faturas de Cartão de Crédito
-- =====================================================

CREATE TABLE public.credit_card_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT,
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  lancamento_id UUID REFERENCES public.lancamentos_realizados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.credit_card_bills ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para credit_card_bills
CREATE POLICY "Users can view their own bills"
  ON public.credit_card_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills"
  ON public.credit_card_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON public.credit_card_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
  ON public.credit_card_bills FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_credit_card_bills_user_id ON public.credit_card_bills(user_id);
CREATE INDEX idx_credit_card_bills_card_id ON public.credit_card_bills(card_id);
CREATE INDEX idx_credit_card_bills_due_date ON public.credit_card_bills(due_date);
CREATE INDEX idx_credit_card_bills_status ON public.credit_card_bills(status);

-- =====================================================
-- FASE 2: Criar Tabela de Junção N:N para Pacotes
-- =====================================================

CREATE TABLE public.package_transaction_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID NOT NULL REFERENCES public.budget_packages(id) ON DELETE CASCADE,
  lancamento_id UUID REFERENCES public.lancamentos_realizados(id) ON DELETE CASCADE,
  cc_transaction_id UUID REFERENCES public.credit_card_transactions(id) ON DELETE CASCADE,
  allocated_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_source_required CHECK (
    (lancamento_id IS NOT NULL AND cc_transaction_id IS NULL) OR
    (lancamento_id IS NULL AND cc_transaction_id IS NOT NULL)
  )
);

-- Habilitar RLS
ALTER TABLE public.package_transaction_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para package_transaction_links
CREATE POLICY "Users can view their own package links"
  ON public.package_transaction_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own package links"
  ON public.package_transaction_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own package links"
  ON public.package_transaction_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own package links"
  ON public.package_transaction_links FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_package_links_user_id ON public.package_transaction_links(user_id);
CREATE INDEX idx_package_links_package_id ON public.package_transaction_links(package_id);
CREATE INDEX idx_package_links_lancamento_id ON public.package_transaction_links(lancamento_id);
CREATE INDEX idx_package_links_cc_transaction_id ON public.package_transaction_links(cc_transaction_id);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX idx_package_links_unique_lancamento 
  ON public.package_transaction_links(package_id, lancamento_id) 
  WHERE lancamento_id IS NOT NULL;

CREATE UNIQUE INDEX idx_package_links_unique_cc_transaction 
  ON public.package_transaction_links(package_id, cc_transaction_id) 
  WHERE cc_transaction_id IS NOT NULL;

-- =====================================================
-- FASE 3: Adicionar Campos em credit_card_transactions
-- =====================================================

-- Vincular ao registro de compras
ALTER TABLE public.credit_card_transactions 
  ADD COLUMN IF NOT EXISTS purchase_registry_id UUID REFERENCES public.purchase_registry(id) ON DELETE SET NULL;

-- Vincular à fatura
ALTER TABLE public.credit_card_transactions 
  ADD COLUMN IF NOT EXISTS credit_card_bill_id UUID REFERENCES public.credit_card_bills(id) ON DELETE SET NULL;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_cc_transactions_purchase_registry 
  ON public.credit_card_transactions(purchase_registry_id);

CREATE INDEX IF NOT EXISTS idx_cc_transactions_bill_id 
  ON public.credit_card_transactions(credit_card_bill_id);

-- =====================================================
-- FASE 4: Adicionar Campos em lancamentos_realizados
-- =====================================================

-- Vincular ao registro de compras
ALTER TABLE public.lancamentos_realizados 
  ADD COLUMN IF NOT EXISTS purchase_registry_id UUID REFERENCES public.purchase_registry(id) ON DELETE SET NULL;

-- Tipo de origem do lançamento
ALTER TABLE public.lancamentos_realizados 
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('manual', 'credit_card_bill', 'conta_pagar', 'conta_receber'));

-- ID da origem (fatura ou conta)
ALTER TABLE public.lancamentos_realizados 
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_lancamentos_purchase_registry 
  ON public.lancamentos_realizados(purchase_registry_id);

CREATE INDEX IF NOT EXISTS idx_lancamentos_source_type 
  ON public.lancamentos_realizados(source_type);

CREATE INDEX IF NOT EXISTS idx_lancamentos_source_id 
  ON public.lancamentos_realizados(source_id);

-- =====================================================
-- FASE 5: Trigger para atualizar updated_at
-- =====================================================

-- Trigger para credit_card_bills
CREATE TRIGGER update_credit_card_bills_updated_at
  BEFORE UPDATE ON public.credit_card_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();