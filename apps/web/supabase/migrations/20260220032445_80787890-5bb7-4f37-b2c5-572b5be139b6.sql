
-- ============================================================
-- FASE 1 — LOTE 1: Correção auth.uid() → (select auth.uid())
-- Tabelas prioritárias: lancamentos, pluggy, contas, credit_card
-- ============================================================

-- === lancamentos_realizados ===
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can delete their own lancamentos" ON public.lancamentos_realizados FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can view their own lancamentos" ON public.lancamentos_realizados FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can update their own lancamentos" ON public.lancamentos_realizados FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.lancamentos_realizados;
CREATE POLICY "Users can insert their own lancamentos" ON public.lancamentos_realizados FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === lancamento_metadata ===
DROP POLICY IF EXISTS "Users can delete their own metadata" ON public.lancamento_metadata;
CREATE POLICY "Users can delete their own metadata" ON public.lancamento_metadata FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own metadata" ON public.lancamento_metadata;
CREATE POLICY "Users can view their own metadata" ON public.lancamento_metadata FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own metadata" ON public.lancamento_metadata;
CREATE POLICY "Users can update their own metadata" ON public.lancamento_metadata FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own metadata" ON public.lancamento_metadata;
CREATE POLICY "Users can insert their own metadata" ON public.lancamento_metadata FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === lancamento_friendly_name_rules ===
DROP POLICY IF EXISTS "Users can delete their own rules" ON public.lancamento_friendly_name_rules;
CREATE POLICY "Users can delete their own rules" ON public.lancamento_friendly_name_rules FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own rules" ON public.lancamento_friendly_name_rules;
CREATE POLICY "Users can view their own rules" ON public.lancamento_friendly_name_rules FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own rules" ON public.lancamento_friendly_name_rules;
CREATE POLICY "Users can update their own rules" ON public.lancamento_friendly_name_rules FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own rules" ON public.lancamento_friendly_name_rules;
CREATE POLICY "Users can insert their own rules" ON public.lancamento_friendly_name_rules FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === pluggy_transactions ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_transactions;
CREATE POLICY "User owner policy" ON public.pluggy_transactions FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.pluggy_transactions;
CREATE POLICY "Users can delete their own transactions" ON public.pluggy_transactions FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.pluggy_transactions;
CREATE POLICY "Users can view their own transactions" ON public.pluggy_transactions FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.pluggy_transactions;
CREATE POLICY "Users can update their own transactions" ON public.pluggy_transactions FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.pluggy_transactions;
CREATE POLICY "Users can insert their own transactions" ON public.pluggy_transactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === pluggy_accounts ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_accounts;
CREATE POLICY "User owner policy" ON public.pluggy_accounts FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.pluggy_accounts;
CREATE POLICY "Users can delete their own accounts" ON public.pluggy_accounts FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own accounts" ON public.pluggy_accounts;
CREATE POLICY "Users can view their own accounts" ON public.pluggy_accounts FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.pluggy_accounts;
CREATE POLICY "Users can update their own accounts" ON public.pluggy_accounts FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.pluggy_accounts;
CREATE POLICY "Users can insert their own accounts" ON public.pluggy_accounts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === pluggy_connections ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_connections;
CREATE POLICY "User owner policy" ON public.pluggy_connections FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own connections" ON public.pluggy_connections;
CREATE POLICY "Users can delete their own connections" ON public.pluggy_connections FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own connections" ON public.pluggy_connections;
CREATE POLICY "Users can view their own connections" ON public.pluggy_connections FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own connections" ON public.pluggy_connections;
CREATE POLICY "Users can update their own connections" ON public.pluggy_connections FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own connections" ON public.pluggy_connections;
CREATE POLICY "Users can insert their own connections" ON public.pluggy_connections FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === contas_pagar_receber ===
DROP POLICY IF EXISTS "Users can delete their own contas" ON public.contas_pagar_receber;
CREATE POLICY "Users can delete their own contas" ON public.contas_pagar_receber FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own contas" ON public.contas_pagar_receber;
CREATE POLICY "Users can view their own contas" ON public.contas_pagar_receber FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own contas" ON public.contas_pagar_receber;
CREATE POLICY "Users can update their own contas" ON public.contas_pagar_receber FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own contas" ON public.contas_pagar_receber;
CREATE POLICY "Users can create their own contas" ON public.contas_pagar_receber FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === credit_card_transactions ===
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.credit_card_transactions;
CREATE POLICY "Users can delete their own transactions" ON public.credit_card_transactions FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_card_transactions;
CREATE POLICY "Users can view their own transactions" ON public.credit_card_transactions FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.credit_card_transactions;
CREATE POLICY "Users can update their own transactions" ON public.credit_card_transactions FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.credit_card_transactions;
CREATE POLICY "Users can create their own transactions" ON public.credit_card_transactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === credit_card_bills ===
DROP POLICY IF EXISTS "Users can delete their own bills" ON public.credit_card_bills;
CREATE POLICY "Users can delete their own bills" ON public.credit_card_bills FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own bills" ON public.credit_card_bills;
CREATE POLICY "Users can view their own bills" ON public.credit_card_bills FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own bills" ON public.credit_card_bills;
CREATE POLICY "Users can update their own bills" ON public.credit_card_bills FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own bills" ON public.credit_card_bills;
CREATE POLICY "Users can create their own bills" ON public.credit_card_bills FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === credit_card_imports ===
DROP POLICY IF EXISTS "Users can delete their own imports" ON public.credit_card_imports;
CREATE POLICY "Users can delete their own imports" ON public.credit_card_imports FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own imports" ON public.credit_card_imports;
CREATE POLICY "Users can view their own imports" ON public.credit_card_imports FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own imports" ON public.credit_card_imports;
CREATE POLICY "Users can insert their own imports" ON public.credit_card_imports FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
