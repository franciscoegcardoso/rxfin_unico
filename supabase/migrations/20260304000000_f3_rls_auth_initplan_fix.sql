-- =============================================================================
-- F3: Corrigir políticas RLS com auth_rls_initplan warning (RXFin)
-- Supabase project_id: kneaniaifzgqibpajyji, region: sa-east-1
--
-- Problema: auth.uid() / auth.jwt() chamados por linha; correção: (select auth.uid()).
-- Tabelas: user_notification_prefs, profile_crm, profile_preferences,
--          onboarding_state, jobs_queue_archive, notification_queue.
--
-- DIAGNÓSTICO (executar antes, por tabela; todo o SQL em comentário):
/*
-- 1) user_notification_prefs
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'user_notification_prefs' AND schemaname = 'public';

-- 2) profile_crm
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profile_crm' AND schemaname = 'public';

-- 3) profile_preferences
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profile_preferences' AND schemaname = 'public';

-- 4) onboarding_state
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'onboarding_state' AND schemaname = 'public';

-- 5) jobs_queue_archive
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'jobs_queue_archive' AND schemaname = 'public';

-- 6) notification_queue
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'notification_queue' AND schemaname = 'public';
*/
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) user_notification_prefs (4 políticas: select_own, insert_own, update_own, delete_own)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_notification_prefs_select_own" ON public.user_notification_prefs;
CREATE POLICY "user_notification_prefs_select_own" ON public.user_notification_prefs
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_notification_prefs_insert_own" ON public.user_notification_prefs;
CREATE POLICY "user_notification_prefs_insert_own" ON public.user_notification_prefs
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_notification_prefs_update_own" ON public.user_notification_prefs;
CREATE POLICY "user_notification_prefs_update_own" ON public.user_notification_prefs
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_notification_prefs_delete_own" ON public.user_notification_prefs;
CREATE POLICY "user_notification_prefs_delete_own" ON public.user_notification_prefs
  FOR DELETE USING (user_id = (select auth.uid()));

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'user_notification_prefs';


-- -----------------------------------------------------------------------------
-- 2) profile_crm (admin_all)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profile_crm_admin_all" ON public.profile_crm;
CREATE POLICY "profile_crm_admin_all" ON public.profile_crm
  FOR ALL USING (public.is_admin((select auth.uid())));

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'profile_crm';


-- -----------------------------------------------------------------------------
-- 3) profile_preferences (select_own, upsert_own, update_own)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profile_preferences_select_own" ON public.profile_preferences;
CREATE POLICY "profile_preferences_select_own" ON public.profile_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "profile_preferences_upsert_own" ON public.profile_preferences;
CREATE POLICY "profile_preferences_upsert_own" ON public.profile_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "profile_preferences_update_own" ON public.profile_preferences;
CREATE POLICY "profile_preferences_update_own" ON public.profile_preferences
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'profile_preferences';


-- -----------------------------------------------------------------------------
-- 4) onboarding_state (select_own, upsert_own, update_own)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "onboarding_state_select_own" ON public.onboarding_state;
CREATE POLICY "onboarding_state_select_own" ON public.onboarding_state
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "onboarding_state_upsert_own" ON public.onboarding_state;
CREATE POLICY "onboarding_state_upsert_own" ON public.onboarding_state
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "onboarding_state_update_own" ON public.onboarding_state;
CREATE POLICY "onboarding_state_update_own" ON public.onboarding_state
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'onboarding_state';


-- -----------------------------------------------------------------------------
-- 5) jobs_queue_archive (admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "jobs_queue_archive_admin" ON public.jobs_queue_archive;
CREATE POLICY "jobs_queue_archive_admin" ON public.jobs_queue_archive
  FOR ALL USING (public.is_admin((select auth.uid())));

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'jobs_queue_archive';


-- -----------------------------------------------------------------------------
-- 6) notification_queue ("System can insert notifications")
--    Sistema/service_role insere; correção: (select auth.jwt()) para evitar initplan por linha.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_queue;
CREATE POLICY "System can insert notifications" ON public.notification_queue
  FOR INSERT
  WITH CHECK ((select auth.jwt())->>'role' = 'service_role');

-- Confirmar: SELECT policyname FROM pg_policies WHERE tablename = 'notification_queue';


-- =============================================================================
-- Confirmação final: listar políticas das 6 tabelas
-- =============================================================================
/*
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_notification_prefs', 'profile_crm', 'profile_preferences', 'onboarding_state', 'jobs_queue_archive', 'notification_queue')
ORDER BY tablename, policyname;
*/

-- Saúde geral (executar manualmente no SQL Editor se a função existir)
-- SELECT * FROM diagnose_db_health();
--
-- NOTAS:
-- - Se alguma tabela usar coluna diferente de user_id (ex.: id), ajuste USING/WITH CHECK.
-- - Se "System can insert notifications" no notification_queue usar auth.role() em vez de
--   auth.jwt()->>'role', troque para: WITH CHECK ((select auth.role()) = 'service_role').
