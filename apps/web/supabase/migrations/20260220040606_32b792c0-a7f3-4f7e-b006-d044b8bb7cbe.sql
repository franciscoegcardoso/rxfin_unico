
-- ============================================================
-- FASE 1: Corrigir Auth RLS Initplan (15 políticas em 14 tabelas)
-- Encapsular auth.uid()/auth.jwt()/is_admin() com (select ...)
-- ============================================================

-- 1. verification_codes: "Users can view own verification codes"
-- Current: email = (auth.jwt() ->> 'email'::text)
DROP POLICY IF EXISTS "Users can view own verification codes" ON public.verification_codes;
CREATE POLICY "Users can view own verification codes" ON public.verification_codes
FOR SELECT TO authenticated
USING (email = ((select auth.jwt()) ->> 'email'::text));

-- 2. profiles: "Users can insert their own profile"
-- Current: auth.uid() = id
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO public
WITH CHECK ((select auth.uid()) = id);

-- 3. user_roles: "Workspace owners can insert roles"
-- Current: auth.uid() = workspace_owner_id
DROP POLICY IF EXISTS "Workspace owners can insert roles" ON public.user_roles;
CREATE POLICY "Workspace owners can insert roles" ON public.user_roles
FOR INSERT TO public
WITH CHECK ((select auth.uid()) = workspace_owner_id);

-- 4. tour_analytics: "Users can insert own tour analytics"
-- Current: auth.uid() = user_id
DROP POLICY IF EXISTS "Users can insert own tour analytics" ON public.tour_analytics;
CREATE POLICY "Users can insert own tour analytics" ON public.tour_analytics
FOR INSERT TO public
WITH CHECK ((select auth.uid()) = user_id);

-- 5. pages: "Only admins can insert pages"
-- Current: is_admin(auth.uid())
DROP POLICY IF EXISTS "Only admins can insert pages" ON public.pages;
CREATE POLICY "Only admins can insert pages" ON public.pages
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 6. page_features: "Only admins can insert page features"
DROP POLICY IF EXISTS "Only admins can insert page features" ON public.page_features;
CREATE POLICY "Only admins can insert page features" ON public.page_features
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 7. page_groups: "Only admins can insert page groups"
DROP POLICY IF EXISTS "Only admins can insert page groups" ON public.page_groups;
CREATE POLICY "Only admins can insert page groups" ON public.page_groups
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 8. legal_documents: "Only admins can insert legal documents"
DROP POLICY IF EXISTS "Only admins can insert legal documents" ON public.legal_documents;
CREATE POLICY "Only admins can insert legal documents" ON public.legal_documents
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 9. legal_document_versions: "Only admins can upload legal documents"
DROP POLICY IF EXISTS "Only admins can upload legal documents" ON public.legal_document_versions;
CREATE POLICY "Only admins can upload legal documents" ON public.legal_document_versions
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 10. subscription_plans: "Admins can insert plans" (will be dropped in Fase 2)
-- 11. subscription_plans: "Only admins can insert subscription plans"
-- Both have: is_admin(auth.uid()) — fix the one we keep
DROP POLICY IF EXISTS "Only admins can insert subscription plans" ON public.subscription_plans;
CREATE POLICY "Only admins can insert subscription plans" ON public.subscription_plans
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 12. plan_comparison_features: "Only admins can insert comparison features"
DROP POLICY IF EXISTS "Only admins can insert comparison features" ON public.plan_comparison_features;
CREATE POLICY "Only admins can insert comparison features" ON public.plan_comparison_features
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 13. migration_rollbacks: "Admins can insert migration rollbacks"
DROP POLICY IF EXISTS "Admins can insert migration rollbacks" ON public.migration_rollbacks;
CREATE POLICY "Admins can insert migration rollbacks" ON public.migration_rollbacks
FOR INSERT TO public
WITH CHECK ((select is_admin((select auth.uid()))));

-- 14. notifications: "Admins can insert notifications"
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK ((select is_admin((select auth.uid()))));

-- 15. notification_templates: "Admins can insert notification templates"
DROP POLICY IF EXISTS "Admins can insert notification templates" ON public.notification_templates;
CREATE POLICY "Admins can insert notification templates" ON public.notification_templates
FOR INSERT TO authenticated
WITH CHECK ((select is_admin((select auth.uid()))));
