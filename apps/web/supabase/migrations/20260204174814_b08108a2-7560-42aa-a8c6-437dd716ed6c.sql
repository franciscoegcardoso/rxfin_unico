-- =============================================================
-- RLS Policies for all financial tables
-- Ensures access is restricted to the owner (auth.uid() = user_id)
-- =============================================================

-- 1. CONSORCIOS (verify existing)
ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;

-- 2. FINANCIAMENTOS (verify existing)
ALTER TABLE public.financiamentos ENABLE ROW LEVEL SECURITY;

-- 3. CONTAS_PAGAR_RECEBER (verify existing)
ALTER TABLE public.contas_pagar_receber ENABLE ROW LEVEL SECURITY;

-- 4. LANCAMENTOS_REALIZADOS
ALTER TABLE public.lancamentos_realizados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can view their own lancamentos" 
ON public.lancamentos_realizados FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can insert their own lancamentos" 
ON public.lancamentos_realizados FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can update their own lancamentos" 
ON public.lancamentos_realizados FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can delete their own lancamentos" 
ON public.lancamentos_realizados FOR DELETE 
USING (auth.uid() = user_id);

-- 5. CREDIT_CARD_BILLS (verify existing)
ALTER TABLE public.credit_card_bills ENABLE ROW LEVEL SECURITY;

-- 6. CREDIT_CARD_TRANSACTIONS (verify existing)
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- 7. CREDIT_CARD_IMPORTS (verify existing)
ALTER TABLE public.credit_card_imports ENABLE ROW LEVEL SECURITY;

-- 8. FGTS_MONTHLY_ENTRIES (verify existing)
ALTER TABLE public.fgts_monthly_entries ENABLE ROW LEVEL SECURITY;

-- 9. BUDGET_PACKAGES (verify existing)
ALTER TABLE public.budget_packages ENABLE ROW LEVEL SECURITY;

-- 10. BUDGET_PACKAGE_TRANSACTIONS (verify existing)
ALTER TABLE public.budget_package_transactions ENABLE ROW LEVEL SECURITY;

-- 11. IR_COMPROVANTES
ALTER TABLE public.ir_comprovantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can view their own ir_comprovantes" 
ON public.ir_comprovantes FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can insert their own ir_comprovantes" 
ON public.ir_comprovantes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can update their own ir_comprovantes" 
ON public.ir_comprovantes FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ir_comprovantes" ON public.ir_comprovantes;
CREATE POLICY "Users can delete their own ir_comprovantes" 
ON public.ir_comprovantes FOR DELETE 
USING (auth.uid() = user_id);

-- 12. IR_FISCAL_CHAT
ALTER TABLE public.ir_fiscal_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can view their own ir_fiscal_chat" 
ON public.ir_fiscal_chat FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can insert their own ir_fiscal_chat" 
ON public.ir_fiscal_chat FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can update their own ir_fiscal_chat" 
ON public.ir_fiscal_chat FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ir_fiscal_chat" ON public.ir_fiscal_chat;
CREATE POLICY "Users can delete their own ir_fiscal_chat" 
ON public.ir_fiscal_chat FOR DELETE 
USING (auth.uid() = user_id);

-- 13. IR_IMPORTS
ALTER TABLE public.ir_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can view their own ir_imports" 
ON public.ir_imports FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can insert their own ir_imports" 
ON public.ir_imports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can update their own ir_imports" 
ON public.ir_imports FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ir_imports" ON public.ir_imports;
CREATE POLICY "Users can delete their own ir_imports" 
ON public.ir_imports FOR DELETE 
USING (auth.uid() = user_id);

-- 14. GIFT_ASSIGNMENTS (verify existing)
ALTER TABLE public.gift_assignments ENABLE ROW LEVEL SECURITY;

-- 15. GIFT_EVENTS (verify existing)
ALTER TABLE public.gift_events ENABLE ROW LEVEL SECURITY;

-- 16. GIFT_PEOPLE (verify existing)
ALTER TABLE public.gift_people ENABLE ROW LEVEL SECURITY;