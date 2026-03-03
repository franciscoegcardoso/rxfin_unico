-- =============================================================================
-- F3: Confirmação após aplicar 20260304000000_f3_rls_auth_initplan_fix.sql
-- Execute no SQL Editor após rodar a migração.
-- =============================================================================

-- 1) Listar políticas atuais por tabela (confirmar que existem e cmd está correto)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_notification_prefs',
    'profile_crm',
    'profile_preferences',
    'onboarding_state',
    'jobs_queue_archive',
    'notification_queue'
  )
ORDER BY tablename, policyname;

-- 2) Saúde geral (se a função existir)
-- SELECT * FROM diagnose_db_health();
