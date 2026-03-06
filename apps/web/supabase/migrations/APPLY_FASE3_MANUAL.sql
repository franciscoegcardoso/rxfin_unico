-- =============================================================================
-- Fase 3 — Aplicar manualmente no Supabase (SQL Editor)
-- =============================================================================
-- Use quando db push falhar por divergência de histórico (ex.: remote tem
-- migrações 20260303/20260304 que não existem localmente).
-- Cole e execute este arquivo no Dashboard Supabase → SQL Editor → New query.
-- =============================================================================

-- --- 3.1 + 3.4: asset_trash, deletion_audit_log, view user_trash ---
CREATE TABLE IF NOT EXISTS public.asset_trash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_data JSONB NOT NULL,
  linked_data JSONB DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  deleted_reason TEXT
);

ALTER TABLE public.asset_trash ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trash" ON public.asset_trash;
CREATE POLICY "Users can view their own trash" ON public.asset_trash FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own trash" ON public.asset_trash;
CREATE POLICY "Users can insert their own trash" ON public.asset_trash FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own trash" ON public.asset_trash;
CREATE POLICY "Users can delete their own trash" ON public.asset_trash FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  linked_records_deleted INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.deletion_audit_log;
DROP POLICY IF EXISTS "deletion_audit_log_select" ON public.deletion_audit_log;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.deletion_audit_log;
CREATE POLICY "deletion_audit_log_select" ON public.deletion_audit_log FOR SELECT TO authenticated
  USING (is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.deletion_audit_log;
CREATE POLICY "Users can insert their own audit logs" ON public.deletion_audit_log FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE VIEW public.user_trash
WITH (security_invoker = true)
AS SELECT id, user_id, original_id, asset_type, asset_data, linked_data, deleted_at, expires_at, deleted_reason
FROM public.asset_trash;

COMMENT ON VIEW public.user_trash IS 'Alias for asset_trash for frontend compatibility; RLS on asset_trash applies via security_invoker.';

GRANT SELECT ON public.user_trash TO authenticated;
GRANT SELECT ON public.user_trash TO anon;

-- --- 3.2: page_views + RLS INSERT ---
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page TEXT NOT NULL,
  referrer TEXT,
  session_id TEXT,
  user_agent TEXT
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views" ON public.page_views FOR SELECT USING (is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Allow insert page_views" ON public.page_views;
DROP POLICY IF EXISTS "Authenticated can insert page_views" ON public.page_views;
CREATE POLICY "Allow insert page_views" ON public.page_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

COMMENT ON TABLE public.page_views IS 'Page view tracking for simuladores and analytics; INSERT allowed for auth and anon.';

-- --- 3.3: RPC get_user_profile_settings ---
CREATE OR REPLACE FUNCTION public.get_user_profile_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  p_ready BOOLEAN;
  p_completed_at TIMESTAMPTZ;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('profile', null);
  END IF;

  SELECT p.onboarding_completed, p.onboarding_completed_at
  INTO p_ready, p_completed_at
  FROM public.profiles p
  WHERE p.id = uid
  LIMIT 1;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'onboarding_completed', p_ready,
      'onboarding_completed_at', p_completed_at
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('profile', null);
END;
$$;

COMMENT ON FUNCTION public.get_user_profile_settings() IS 'Returns current user profile settings (onboarding_completed) for ProtectedRoute and onboarding flows.';

GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO anon;
