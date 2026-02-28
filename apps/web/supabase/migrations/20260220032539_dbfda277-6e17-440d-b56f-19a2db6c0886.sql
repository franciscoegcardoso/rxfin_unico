
-- ============================================================
-- FASE 1 — LOTE 2: Tabelas de usuário (A-F)
-- ============================================================

-- === asset_trash ===
DROP POLICY IF EXISTS "Users can delete their own trash" ON public.asset_trash;
CREATE POLICY "Users can delete their own trash" ON public.asset_trash FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own trash" ON public.asset_trash;
CREATE POLICY "Users can view their own trash" ON public.asset_trash FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own trash" ON public.asset_trash;
CREATE POLICY "Users can insert their own trash" ON public.asset_trash FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === budget_package_transactions ===
DROP POLICY IF EXISTS "Users can delete their own package transactions" ON public.budget_package_transactions;
CREATE POLICY "Users can delete their own package transactions" ON public.budget_package_transactions FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own package transactions" ON public.budget_package_transactions;
CREATE POLICY "Users can view their own package transactions" ON public.budget_package_transactions FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own package transactions" ON public.budget_package_transactions;
CREATE POLICY "Users can update their own package transactions" ON public.budget_package_transactions FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create their own package transactions" ON public.budget_package_transactions;
CREATE POLICY "Users can create their own package transactions" ON public.budget_package_transactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === budget_packages ===
DROP POLICY IF EXISTS "Users can delete their own packages" ON public.budget_packages;
CREATE POLICY "Users can delete their own packages" ON public.budget_packages FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own packages" ON public.budget_packages;
CREATE POLICY "Users can view their own packages" ON public.budget_packages FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own packages" ON public.budget_packages;
CREATE POLICY "Users can update their own packages" ON public.budget_packages FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can create their own packages" ON public.budget_packages;
CREATE POLICY "Users can create their own packages" ON public.budget_packages FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === consorcios ===
DROP POLICY IF EXISTS "Users can delete their own consorcios" ON public.consorcios;
CREATE POLICY "Users can delete their own consorcios" ON public.consorcios FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own consorcios" ON public.consorcios;
CREATE POLICY "Users can view their own consorcios" ON public.consorcios FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own consorcios" ON public.consorcios;
CREATE POLICY "Users can update their own consorcios" ON public.consorcios FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own consorcios" ON public.consorcios;
CREATE POLICY "Users can insert their own consorcios" ON public.consorcios FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === deletion_audit_log ===
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.deletion_audit_log;
CREATE POLICY "Users can view their own audit logs" ON public.deletion_audit_log FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.deletion_audit_log;
CREATE POLICY "Users can insert their own audit logs" ON public.deletion_audit_log FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === driver_vehicle_access ===
DROP POLICY IF EXISTS "Workspace owners can manage vehicle access" ON public.driver_vehicle_access;
CREATE POLICY "Workspace owners can manage vehicle access" ON public.driver_vehicle_access FOR ALL USING ((select auth.uid()) = workspace_owner_id);
DROP POLICY IF EXISTS "Drivers can view their own vehicle access" ON public.driver_vehicle_access;
CREATE POLICY "Drivers can view their own vehicle access" ON public.driver_vehicle_access FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- === favorite_vehicles ===
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorite_vehicles;
CREATE POLICY "Users can delete own favorites" ON public.favorite_vehicles FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorite_vehicles;
CREATE POLICY "Users can view own favorites" ON public.favorite_vehicles FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own favorites" ON public.favorite_vehicles;
CREATE POLICY "Users can update own favorites" ON public.favorite_vehicles FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorite_vehicles;
CREATE POLICY "Users can insert own favorites" ON public.favorite_vehicles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === fgts_monthly_entries ===
DROP POLICY IF EXISTS "User owner policy" ON public.fgts_monthly_entries;
CREATE POLICY "User owner policy" ON public.fgts_monthly_entries FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own FGTS entries" ON public.fgts_monthly_entries;
CREATE POLICY "Users can delete their own FGTS entries" ON public.fgts_monthly_entries FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own FGTS entries" ON public.fgts_monthly_entries;
CREATE POLICY "Users can view their own FGTS entries" ON public.fgts_monthly_entries FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own FGTS entries" ON public.fgts_monthly_entries;
CREATE POLICY "Users can update their own FGTS entries" ON public.fgts_monthly_entries FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own FGTS entries" ON public.fgts_monthly_entries;
CREATE POLICY "Users can insert their own FGTS entries" ON public.fgts_monthly_entries FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === financiamentos ===
DROP POLICY IF EXISTS "Users can delete their own financiamentos" ON public.financiamentos;
CREATE POLICY "Users can delete their own financiamentos" ON public.financiamentos FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own financiamentos" ON public.financiamentos;
CREATE POLICY "Users can view their own financiamentos" ON public.financiamentos FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own financiamentos" ON public.financiamentos;
CREATE POLICY "Users can update their own financiamentos" ON public.financiamentos FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own financiamentos" ON public.financiamentos;
CREATE POLICY "Users can insert their own financiamentos" ON public.financiamentos FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === fipe_catalog (auth.role()) ===
DROP POLICY IF EXISTS "write_service_cat" ON public.fipe_catalog;
CREATE POLICY "write_service_cat" ON public.fipe_catalog FOR INSERT WITH CHECK ((select auth.role()) = 'service_role'::text);
DROP POLICY IF EXISTS "update_service_cat" ON public.fipe_catalog;
CREATE POLICY "update_service_cat" ON public.fipe_catalog FOR UPDATE USING ((select auth.role()) = 'service_role'::text) WITH CHECK ((select auth.role()) = 'service_role'::text);
