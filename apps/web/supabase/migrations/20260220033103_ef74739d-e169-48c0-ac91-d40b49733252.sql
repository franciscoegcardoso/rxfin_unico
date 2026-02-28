
-- ============================================================
-- FASE 2 — Remoção de Políticas Duplicadas + Consolidação
-- ============================================================

-- === ir_comprovantes: remover legados ===
DROP POLICY IF EXISTS "Users can delete their own comprovantes" ON public.ir_comprovantes;
DROP POLICY IF EXISTS "Users can create their own comprovantes" ON public.ir_comprovantes;
DROP POLICY IF EXISTS "Users can update their own comprovantes" ON public.ir_comprovantes;
-- "User owner policy" covers ALL ops, remove per-op duplicates too
DROP POLICY IF EXISTS "Users can delete their own ir_comprovantes" ON public.ir_comprovantes;
DROP POLICY IF EXISTS "Users can view their own ir_comprovantes" ON public.ir_comprovantes;
DROP POLICY IF EXISTS "Users can update their own ir_comprovantes" ON public.ir_comprovantes;
DROP POLICY IF EXISTS "Users can insert their own ir_comprovantes" ON public.ir_comprovantes;
-- Keep only "User owner policy" (ALL)

-- === ir_fiscal_chat: remover legados ===
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can delete their own ir_fiscal_chat" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can view their own ir_fiscal_chat" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can update their own ir_fiscal_chat" ON public.ir_fiscal_chat;
DROP POLICY IF EXISTS "Users can insert their own ir_fiscal_chat" ON public.ir_fiscal_chat;
-- Keep only "User owner policy" (ALL)

-- === ir_imports: remover legados ===
DROP POLICY IF EXISTS "Users can delete their own IR imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can delete their own ir_imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can view their own ir_imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can update their own IR imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can update their own ir_imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can insert their own IR imports" ON public.ir_imports;
DROP POLICY IF EXISTS "Users can insert their own ir_imports" ON public.ir_imports;
-- Keep only "User owner policy" (ALL)

-- === pluggy_accounts: remove "User owner policy" (per-op policies exist) ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_accounts;

-- === pluggy_connections: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_connections;

-- === pluggy_transactions: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.pluggy_transactions;

-- === gift_assignments: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_assignments;

-- === gift_events: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_events;

-- === gift_people: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.gift_people;

-- === fgts_monthly_entries: remove "User owner policy" ===
DROP POLICY IF EXISTS "User owner policy" ON public.fgts_monthly_entries;

-- === lancamentos_realizados: remove legacy INSERT ===
DROP POLICY IF EXISTS "Users can create their own lancamentos" ON public.lancamentos_realizados;

-- === purchase_registry: remove "purchases" duplicates, keep "purchase registry items" ===
DROP POLICY IF EXISTS "Users can delete their own purchases" ON public.purchase_registry;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchase_registry;
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.purchase_registry;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchase_registry;
DROP POLICY IF EXISTS "Users can create their own purchases" ON public.purchase_registry;
DROP POLICY IF EXISTS "Users can create their own purchase registry items" ON public.purchase_registry;

-- === legal_documents: remove PT-BR duplicates ===
DROP POLICY IF EXISTS "Apenas admin pode deletar documentos legais" ON public.legal_documents;
DROP POLICY IF EXISTS "Apenas admin pode atualizar documentos legais" ON public.legal_documents;
DROP POLICY IF EXISTS "Apenas admin pode inserir documentos legais" ON public.legal_documents;
DROP POLICY IF EXISTS "Leitura pública dos documentos legais" ON public.legal_documents;

-- === legal_document_versions: remove one duplicate UPDATE ===
DROP POLICY IF EXISTS "Only admins can update (to set is_current flag)" ON public.legal_document_versions;

-- === email_unsubscribes: remove duplicate admin SELECT ===
DROP POLICY IF EXISTS "Admins can view unsubscribes" ON public.email_unsubscribes;

-- === login_attempts: remove duplicate SELECT ===
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;

-- === subscription_plans: remove duplicate admin policies ===
DROP POLICY IF EXISTS "Only admins can delete subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Only admins can update subscription plans" ON public.subscription_plans;

-- === subscription_events: consolidate ===
DROP POLICY IF EXISTS "Admins can view all subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;
CREATE POLICY "subscription_events_select" ON public.subscription_events FOR SELECT TO authenticated
USING (is_admin((select auth.uid())) OR (select auth.uid()) = user_id);

-- === profiles: consolidate SELECT and UPDATE ===
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (is_admin((select auth.uid())) OR (select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (is_admin((select auth.uid())) OR (select auth.uid()) = id);

-- === deletion_audit_log: consolidate SELECT ===
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.deletion_audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.deletion_audit_log;
CREATE POLICY "deletion_audit_log_select" ON public.deletion_audit_log FOR SELECT TO authenticated
USING (is_admin((select auth.uid())) OR (select auth.uid()) = user_id);

-- === monthly_goals: remove legacy INSERT ===
DROP POLICY IF EXISTS "Users can create their own goals" ON public.monthly_goals;

-- === package_transaction_links: remove legacy INSERT ===
DROP POLICY IF EXISTS "Users can create their own package links" ON public.package_transaction_links;

-- === fipe_price_history: remove duplicate SELECT policies ===
DROP POLICY IF EXISTS "Cache is readable by everyone" ON public.fipe_price_history;
DROP POLICY IF EXISTS "FIPE history is readable by everyone" ON public.fipe_price_history;
DROP POLICY IF EXISTS "Permitir leitura pública de preços" ON public.fipe_price_history;
-- Keep "Allow public read fipe_price_history"

-- === fipe_catalog: remove duplicate SELECT ===
DROP POLICY IF EXISTS "read_all_cat" ON public.fipe_catalog;
-- Keep "Allow public read fipe_catalog"
