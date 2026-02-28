
-- ============================================================
-- FASE 1 — LOTE 5: Admin policies + workspace/members + remaining
-- ============================================================

-- === app_settings ===
DROP POLICY IF EXISTS "Only admins can delete settings" ON public.app_settings;
CREATE POLICY "Only admins can delete settings" ON public.app_settings FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can insert settings" ON public.app_settings;
CREATE POLICY "Only admins can insert settings" ON public.app_settings FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update settings" ON public.app_settings;
CREATE POLICY "Only admins can update settings" ON public.app_settings FOR UPDATE USING (is_admin((select auth.uid())));

-- === audit_logs ===
DROP POLICY IF EXISTS "audit_logs_super_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_only" ON public.audit_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.user_id = (select auth.uid()) AND workspace_members.role::text = 'super_admin'::text));

-- === conversion_events ===
DROP POLICY IF EXISTS "Admins can read conversion events" ON public.conversion_events;
CREATE POLICY "Admins can read conversion events" ON public.conversion_events FOR SELECT TO authenticated USING (is_admin((select auth.uid())));

-- === default_expense_items ===
DROP POLICY IF EXISTS "Only admins can delete default expense items" ON public.default_expense_items;
CREATE POLICY "Only admins can delete default expense items" ON public.default_expense_items FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can insert default expense items" ON public.default_expense_items;
CREATE POLICY "Only admins can insert default expense items" ON public.default_expense_items FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update default expense items" ON public.default_expense_items;
CREATE POLICY "Only admins can update default expense items" ON public.default_expense_items FOR UPDATE USING (is_admin((select auth.uid())));

-- === default_income_items ===
DROP POLICY IF EXISTS "Only admins can delete default income items" ON public.default_income_items;
CREATE POLICY "Only admins can delete default income items" ON public.default_income_items FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can insert default income items" ON public.default_income_items;
CREATE POLICY "Only admins can insert default income items" ON public.default_income_items FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update default income items" ON public.default_income_items;
CREATE POLICY "Only admins can update default income items" ON public.default_income_items FOR UPDATE USING (is_admin((select auth.uid())));

-- === deletion_audit_log ===
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.deletion_audit_log;
CREATE POLICY "Admins can view all audit logs" ON public.deletion_audit_log FOR SELECT USING (is_admin((select auth.uid())));

-- === deploy_history ===
DROP POLICY IF EXISTS "Admins can insert deploy history" ON public.deploy_history;
CREATE POLICY "Admins can insert deploy history" ON public.deploy_history FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view deploy history" ON public.deploy_history;
CREATE POLICY "Admins can view deploy history" ON public.deploy_history FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update deploy history" ON public.deploy_history;
CREATE POLICY "Admins can update deploy history" ON public.deploy_history FOR UPDATE USING (is_admin((select auth.uid())));

-- === email_campaign_logs ===
DROP POLICY IF EXISTS "Admins can view campaign logs" ON public.email_campaign_logs;
CREATE POLICY "Admins can view campaign logs" ON public.email_campaign_logs FOR SELECT USING (is_admin((select auth.uid())));

-- === email_campaign_recipients ===
DROP POLICY IF EXISTS "Admins can delete campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins can delete campaign recipients" ON public.email_campaign_recipients FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can insert campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins can insert campaign recipients" ON public.email_campaign_recipients FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view all campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins can view all campaign recipients" ON public.email_campaign_recipients FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins can update campaign recipients" ON public.email_campaign_recipients FOR UPDATE USING (is_admin((select auth.uid())));

-- === email_campaigns ===
DROP POLICY IF EXISTS "campaigns_owners_all" ON public.email_campaigns;
CREATE POLICY "campaigns_owners_all" ON public.email_campaigns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.owner_id = (select auth.uid())));
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can delete campaigns" ON public.email_campaigns FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can create campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can create campaigns" ON public.email_campaigns FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can view all campaigns" ON public.email_campaigns FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can update campaigns" ON public.email_campaigns FOR UPDATE USING (is_admin((select auth.uid())));

-- === email_queue ===
DROP POLICY IF EXISTS "Admins can view email queue" ON public.email_queue;
CREATE POLICY "Admins can view email queue" ON public.email_queue FOR SELECT USING (is_admin((select auth.uid())));

-- === email_templates ===
DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;
CREATE POLICY "Admins can delete templates" ON public.email_templates FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can create templates" ON public.email_templates;
CREATE POLICY "Admins can create templates" ON public.email_templates FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view all templates" ON public.email_templates;
CREATE POLICY "Admins can view all templates" ON public.email_templates FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update templates" ON public.email_templates;
CREATE POLICY "Admins can update templates" ON public.email_templates FOR UPDATE USING (is_admin((select auth.uid())));

-- === email_unsubscribes ===
DROP POLICY IF EXISTS "unsubscribes_own" ON public.email_unsubscribes;
CREATE POLICY "unsubscribes_own" ON public.email_unsubscribes FOR ALL TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can unsubscribe themselves" ON public.email_unsubscribes;
CREATE POLICY "Authenticated users can unsubscribe themselves" ON public.email_unsubscribes FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Admins can view all unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Admins can view all unsubscribes" ON public.email_unsubscribes FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Admins can view unsubscribes" ON public.email_unsubscribes FOR SELECT USING (is_admin((select auth.uid())));

-- === expense_categories ===
DROP POLICY IF EXISTS "Only admins can delete expense categories" ON public.expense_categories;
CREATE POLICY "Only admins can delete expense categories" ON public.expense_categories FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can insert expense categories" ON public.expense_categories;
CREATE POLICY "Only admins can insert expense categories" ON public.expense_categories FOR INSERT WITH CHECK (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update expense categories" ON public.expense_categories;
CREATE POLICY "Only admins can update expense categories" ON public.expense_categories FOR UPDATE USING (is_admin((select auth.uid())));

-- === expiration_actions ===
DROP POLICY IF EXISTS "expiration_actions_owner_select" ON public.expiration_actions;
CREATE POLICY "expiration_actions_owner_select" ON public.expiration_actions FOR SELECT TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid())));

-- === leads ===
DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT USING (is_admin((select auth.uid())));

-- === legal_document_versions ===
DROP POLICY IF EXISTS "Only admins can update (to set is_current flag)" ON public.legal_document_versions;
CREATE POLICY "Only admins can update (to set is_current flag)" ON public.legal_document_versions FOR UPDATE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update legal documents" ON public.legal_document_versions;
CREATE POLICY "Only admins can update legal documents" ON public.legal_document_versions FOR UPDATE USING (is_admin((select auth.uid())));

-- === legal_documents ===
DROP POLICY IF EXISTS "Apenas admin pode deletar documentos legais" ON public.legal_documents;
CREATE POLICY "Apenas admin pode deletar documentos legais" ON public.legal_documents FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Apenas admin pode atualizar documentos legais" ON public.legal_documents;
CREATE POLICY "Apenas admin pode atualizar documentos legais" ON public.legal_documents FOR UPDATE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update legal documents" ON public.legal_documents;
CREATE POLICY "Only admins can update legal documents" ON public.legal_documents FOR UPDATE USING (is_admin((select auth.uid())));

-- === login_attempts ===
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts" ON public.login_attempts FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "login_attempts_super_admin_only" ON public.login_attempts;
CREATE POLICY "login_attempts_super_admin_only" ON public.login_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.user_id = (select auth.uid()) AND workspace_members.role::text = 'super_admin'::text));

-- === migration_rollbacks ===
DROP POLICY IF EXISTS "Admins can view migration rollbacks" ON public.migration_rollbacks;
CREATE POLICY "Admins can view migration rollbacks" ON public.migration_rollbacks FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update migration rollbacks" ON public.migration_rollbacks;
CREATE POLICY "Admins can update migration rollbacks" ON public.migration_rollbacks FOR UPDATE USING (is_admin((select auth.uid())));

-- === notification_templates ===
DROP POLICY IF EXISTS "Admins can delete notification templates" ON public.notification_templates;
CREATE POLICY "Admins can delete notification templates" ON public.notification_templates FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update notification templates" ON public.notification_templates;
CREATE POLICY "Admins can update notification templates" ON public.notification_templates FOR UPDATE USING (is_admin((select auth.uid())));

-- === notifications (admin) ===
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE USING (is_admin((select auth.uid())));

-- === page_features/groups/pages ===
DROP POLICY IF EXISTS "Only admins can delete page features" ON public.page_features;
CREATE POLICY "Only admins can delete page features" ON public.page_features FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update page features" ON public.page_features;
CREATE POLICY "Only admins can update page features" ON public.page_features FOR UPDATE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can delete page groups" ON public.page_groups;
CREATE POLICY "Only admins can delete page groups" ON public.page_groups FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update page groups" ON public.page_groups;
CREATE POLICY "Only admins can update page groups" ON public.page_groups FOR UPDATE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can delete pages" ON public.pages;
CREATE POLICY "Only admins can delete pages" ON public.pages FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update pages" ON public.pages;
CREATE POLICY "Only admins can update pages" ON public.pages FOR UPDATE USING (is_admin((select auth.uid())));

-- === page_views ===
DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views" ON public.page_views FOR SELECT USING (is_admin((select auth.uid())));

-- === plan_comparison_features ===
DROP POLICY IF EXISTS "Only admins can delete comparison features" ON public.plan_comparison_features;
CREATE POLICY "Only admins can delete comparison features" ON public.plan_comparison_features FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update comparison features" ON public.plan_comparison_features;
CREATE POLICY "Only admins can update comparison features" ON public.plan_comparison_features FOR UPDATE USING (is_admin((select auth.uid())));

-- === profiles (admin) ===
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (is_admin((select auth.uid())));

-- === subscription_events (admin) ===
DROP POLICY IF EXISTS "Admins can view all subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view all subscription events" ON public.subscription_events FOR SELECT USING (is_admin((select auth.uid())));

-- === subscription_plans ===
DROP POLICY IF EXISTS "Admins can delete plans" ON public.subscription_plans;
CREATE POLICY "Admins can delete plans" ON public.subscription_plans FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can delete subscription plans" ON public.subscription_plans;
CREATE POLICY "Only admins can delete subscription plans" ON public.subscription_plans FOR DELETE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view all plans" ON public.subscription_plans;
CREATE POLICY "Admins can view all plans" ON public.subscription_plans FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can update plans" ON public.subscription_plans;
CREATE POLICY "Admins can update plans" ON public.subscription_plans FOR UPDATE USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Only admins can update subscription plans" ON public.subscription_plans;
CREATE POLICY "Only admins can update subscription plans" ON public.subscription_plans FOR UPDATE USING (is_admin((select auth.uid())));

-- === tour_analytics (admin) ===
DROP POLICY IF EXISTS "Admins can view all tour analytics" ON public.tour_analytics;
CREATE POLICY "Admins can view all tour analytics" ON public.tour_analytics FOR SELECT USING (is_admin((select auth.uid())));

-- === user_consents (admin) ===
DROP POLICY IF EXISTS "Admins can view all consents" ON public.user_consents;
CREATE POLICY "Admins can view all consents" ON public.user_consents FOR SELECT USING (is_admin((select auth.uid())));

-- === user_roles ===
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (is_admin((select auth.uid())));
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Workspace owners can read roles" ON public.user_roles;
CREATE POLICY "Workspace owners can read roles" ON public.user_roles FOR SELECT USING ((select auth.uid()) = workspace_owner_id);
DROP POLICY IF EXISTS "Workspace owners can update roles" ON public.user_roles;
CREATE POLICY "Workspace owners can update roles" ON public.user_roles FOR UPDATE USING ((select auth.uid()) = workspace_owner_id) WITH CHECK ((select auth.uid()) = workspace_owner_id);
DROP POLICY IF EXISTS "Cannot delete protected admin roles" ON public.user_roles;
CREATE POLICY "Cannot delete protected admin roles" ON public.user_roles FOR DELETE USING (((select auth.uid()) = workspace_owner_id) AND (NOT (role = 'admin'::app_role AND is_protected_admin(user_id))));

-- === workspace_members ===
DROP POLICY IF EXISTS "members_all_operations" ON public.workspace_members;
CREATE POLICY "members_all_operations" ON public.workspace_members FOR ALL
USING (user_id = (select auth.uid()) OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = (select auth.uid())));
DROP POLICY IF EXISTS "members_select" ON public.workspace_members;
CREATE POLICY "members_select" ON public.workspace_members FOR SELECT USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "prevent_self_role_change" ON public.workspace_members;
CREATE POLICY "prevent_self_role_change" ON public.workspace_members FOR UPDATE USING (user_id <> (select auth.uid()));

-- === workspaces ===
DROP POLICY IF EXISTS "workspace_owner_select" ON public.workspaces;
CREATE POLICY "workspace_owner_select" ON public.workspaces FOR SELECT USING (owner_id = (select auth.uid()));
