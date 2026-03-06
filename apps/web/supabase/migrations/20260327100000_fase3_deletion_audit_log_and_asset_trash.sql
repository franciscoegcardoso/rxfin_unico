-- Fase 3.1 + 3.4: Garantir tabelas deletion_audit_log e asset_trash existem (idempotente) e view user_trash.
-- Em ambientes onde 20260108 não foi aplicada, a tabela deletion_audit_log pode estar ausente (404 PGRST205).
-- O frontend usa .from('user_trash'); o backend tem asset_trash: criamos view user_trash para compatibilidade.

-- asset_trash (se não existir)
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

-- deletion_audit_log (se não existir)
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

-- View user_trash: frontend usa .from('user_trash'); tabela real é asset_trash.
CREATE OR REPLACE VIEW public.user_trash
WITH (security_invoker = true)
AS SELECT id, user_id, original_id, asset_type, asset_data, linked_data, deleted_at, expires_at, deleted_reason
FROM public.asset_trash;

COMMENT ON VIEW public.user_trash IS 'Alias for asset_trash for frontend compatibility; RLS on asset_trash applies via security_invoker.';

GRANT SELECT ON public.user_trash TO authenticated;
GRANT SELECT ON public.user_trash TO anon;
