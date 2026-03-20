-- Rastreia de qual rota a sessão da Cibélia foi criada (ex.: /cibelia vs /movimentacoes)
ALTER TABLE public.ai_chat_sessions
  ADD COLUMN IF NOT EXISTS source_page text;

COMMENT ON COLUMN public.ai_chat_sessions.source_page IS 'Pathname da rota no momento do INSERT (ex.: /cibelia, /movimentacoes)';
