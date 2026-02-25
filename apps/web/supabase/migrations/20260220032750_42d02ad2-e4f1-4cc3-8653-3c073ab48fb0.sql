
-- ============================================================
-- FASE 1 — LOTE 4: Remaining user tables + admin tables
-- ============================================================

-- === package_transaction_links ===
DROP POLICY IF EXISTS "Users can delete their own package links" ON public.package_transaction_links;
CREATE POLICY "Users can delete their own package links" ON public.package_transaction_links FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own package links" ON public.package_transaction_links;
CREATE POLICY "Users can view their own package links" ON public.package_transaction_links FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own package links" ON public.package_transaction_links;
CREATE POLICY "Users can update their own package links" ON public.package_transaction_links FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own package links" ON public.package_transaction_links;
CREATE POLICY "Users can insert their own package links" ON public.package_transaction_links FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === pluggy_investments ===
DROP POLICY IF EXISTS "Users can delete their own investments" ON public.pluggy_investments;
CREATE POLICY "Users can delete their own investments" ON public.pluggy_investments FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own investments" ON public.pluggy_investments;
CREATE POLICY "Users can view their own investments" ON public.pluggy_investments FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own investments" ON public.pluggy_investments;
CREATE POLICY "Users can update their own investments" ON public.pluggy_investments FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own investments" ON public.pluggy_investments;
CREATE POLICY "Users can insert their own investments" ON public.pluggy_investments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === pluggy_recurring_payments ===
DROP POLICY IF EXISTS "Users can delete their own recurring payments" ON public.pluggy_recurring_payments;
CREATE POLICY "Users can delete their own recurring payments" ON public.pluggy_recurring_payments FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own recurring payments" ON public.pluggy_recurring_payments;
CREATE POLICY "Users can view their own recurring payments" ON public.pluggy_recurring_payments FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own recurring payments" ON public.pluggy_recurring_payments;
CREATE POLICY "Users can update their own recurring payments" ON public.pluggy_recurring_payments FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own recurring payments" ON public.pluggy_recurring_payments;
CREATE POLICY "Users can insert their own recurring payments" ON public.pluggy_recurring_payments FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === purchase_registry ===
DROP POLICY IF EXISTS "Users can delete their own purchase registry items" ON public.purchase_registry;
CREATE POLICY "Users can delete their own purchase registry items" ON public.purchase_registry FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own purchases" ON public.purchase_registry;
CREATE POLICY "Users can delete their own purchases" ON public.purchase_registry FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own purchase registry items" ON public.purchase_registry;
CREATE POLICY "Users can view their own purchase registry items" ON public.purchase_registry FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchase_registry;
CREATE POLICY "Users can view their own purchases" ON public.purchase_registry FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own purchase registry items" ON public.purchase_registry;
CREATE POLICY "Users can update their own purchase registry items" ON public.purchase_registry FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.purchase_registry;
CREATE POLICY "Users can update their own purchases" ON public.purchase_registry FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own purchase registry items" ON public.purchase_registry;
CREATE POLICY "Users can insert their own purchase registry items" ON public.purchase_registry FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchase_registry;
CREATE POLICY "Users can insert their own purchases" ON public.purchase_registry FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === seguros ===
DROP POLICY IF EXISTS "Users can delete their own seguros" ON public.seguros;
CREATE POLICY "Users can delete their own seguros" ON public.seguros FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own seguros" ON public.seguros;
CREATE POLICY "Users can view their own seguros" ON public.seguros FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own seguros" ON public.seguros;
CREATE POLICY "Users can update their own seguros" ON public.seguros FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own seguros" ON public.seguros;
CREATE POLICY "Users can insert their own seguros" ON public.seguros FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === store_category_rules ===
DROP POLICY IF EXISTS "Users manage own rules" ON public.store_category_rules;
CREATE POLICY "Users manage own rules" ON public.store_category_rules FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- === store_friendly_name_rules ===
DROP POLICY IF EXISTS "Users can delete their own friendly name rules" ON public.store_friendly_name_rules;
CREATE POLICY "Users can delete their own friendly name rules" ON public.store_friendly_name_rules FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own friendly name rules" ON public.store_friendly_name_rules;
CREATE POLICY "Users can view their own friendly name rules" ON public.store_friendly_name_rules FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own friendly name rules" ON public.store_friendly_name_rules;
CREATE POLICY "Users can update their own friendly name rules" ON public.store_friendly_name_rules FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own friendly name rules" ON public.store_friendly_name_rules;
CREATE POLICY "Users can insert their own friendly name rules" ON public.store_friendly_name_rules FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- === sync_jobs ===
DROP POLICY IF EXISTS "Users can view own sync jobs" ON public.sync_jobs;
CREATE POLICY "Users can view own sync jobs" ON public.sync_jobs FOR SELECT USING ((select auth.uid()) = user_id);

-- === subscription_events ===
DROP POLICY IF EXISTS "Users can view their own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view their own subscription events" ON public.subscription_events FOR SELECT USING ((select auth.uid()) = user_id);

-- === tour_analytics ===
DROP POLICY IF EXISTS "Users can view own tour analytics" ON public.tour_analytics;
CREATE POLICY "Users can view own tour analytics" ON public.tour_analytics FOR SELECT USING ((select auth.uid()) = user_id);

-- === user_* tables (ALL policies) ===
DROP POLICY IF EXISTS "Users manage own asset linked expenses" ON public.user_asset_linked_expenses;
CREATE POLICY "Users manage own asset linked expenses" ON public.user_asset_linked_expenses FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own asset monthly entries" ON public.user_asset_monthly_entries;
CREATE POLICY "Users manage own asset monthly entries" ON public.user_asset_monthly_entries FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own assets" ON public.user_assets;
CREATE POLICY "Users manage own assets" ON public.user_assets FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own consents" ON public.user_consents;
CREATE POLICY "Users can view their own consents" ON public.user_consents FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;
CREATE POLICY "Users can insert their own consents" ON public.user_consents FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own drivers" ON public.user_drivers;
CREATE POLICY "Users manage own drivers" ON public.user_drivers FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own expense items" ON public.user_expense_items;
CREATE POLICY "Users can delete their own expense items" ON public.user_expense_items FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own expense items" ON public.user_expense_items;
CREATE POLICY "Users can view their own expense items" ON public.user_expense_items FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own expense items" ON public.user_expense_items;
CREATE POLICY "Users can update their own expense items" ON public.user_expense_items FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own expense items" ON public.user_expense_items;
CREATE POLICY "Users can insert their own expense items" ON public.user_expense_items FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own financial institutions" ON public.user_financial_institutions;
CREATE POLICY "Users manage own financial institutions" ON public.user_financial_institutions FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own goals" ON public.user_goals;
CREATE POLICY "Users manage own goals" ON public.user_goals FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own shortcuts" ON public.user_home_shortcuts;
CREATE POLICY "Users can view their own shortcuts" ON public.user_home_shortcuts FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own shortcuts" ON public.user_home_shortcuts;
CREATE POLICY "Users can update their own shortcuts" ON public.user_home_shortcuts FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own shortcuts" ON public.user_home_shortcuts;
CREATE POLICY "Users can insert their own shortcuts" ON public.user_home_shortcuts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own income items" ON public.user_income_items;
CREATE POLICY "Users can delete their own income items" ON public.user_income_items FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own income items" ON public.user_income_items;
CREATE POLICY "Users can view their own income items" ON public.user_income_items FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own income items" ON public.user_income_items;
CREATE POLICY "Users can update their own income items" ON public.user_income_items FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own income items" ON public.user_income_items;
CREATE POLICY "Users can insert their own income items" ON public.user_income_items FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own monthly entries" ON public.user_monthly_entries;
CREATE POLICY "Users manage own monthly entries" ON public.user_monthly_entries FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own shared persons" ON public.user_shared_persons;
CREATE POLICY "Users manage own shared persons" ON public.user_shared_persons FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own vehicle records" ON public.user_vehicle_records;
CREATE POLICY "Users manage own vehicle records" ON public.user_vehicle_records FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User owner policy" ON public.vehicle_fuel_consumption;
CREATE POLICY "User owner policy" ON public.vehicle_fuel_consumption FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- === workspace_feature_preferences ===
DROP POLICY IF EXISTS "Users can delete their own feature preferences" ON public.workspace_feature_preferences;
CREATE POLICY "Users can delete their own feature preferences" ON public.workspace_feature_preferences FOR DELETE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can view their own feature preferences" ON public.workspace_feature_preferences;
CREATE POLICY "Users can view their own feature preferences" ON public.workspace_feature_preferences FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own feature preferences" ON public.workspace_feature_preferences;
CREATE POLICY "Users can update their own feature preferences" ON public.workspace_feature_preferences FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own feature preferences" ON public.workspace_feature_preferences;
CREATE POLICY "Users can insert their own feature preferences" ON public.workspace_feature_preferences FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
