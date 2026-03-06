-- Fase 3.2: Garantir tabela page_views existe e permitir INSERT para auth/anon (simuladores).
-- Estrutura alinhada a integrations/supabase/types.ts (page_views Row/Insert).

CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page TEXT NOT NULL,
  referrer TEXT,
  session_id TEXT,
  user_agent TEXT
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas admins (compatível com política existente em 20260220032922)
DROP POLICY IF EXISTS "Admins can read page views" ON public.page_views;
CREATE POLICY "Admins can read page views" ON public.page_views FOR SELECT USING (is_admin((SELECT auth.uid())));

-- INSERT: autenticados e anon podem registrar page view (simuladores, analytics)
DROP POLICY IF EXISTS "Allow insert page_views" ON public.page_views;
DROP POLICY IF EXISTS "Authenticated can insert page_views" ON public.page_views;
CREATE POLICY "Allow insert page_views" ON public.page_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

COMMENT ON TABLE public.page_views IS 'Page view tracking for simuladores and analytics; INSERT allowed for auth and anon.';
