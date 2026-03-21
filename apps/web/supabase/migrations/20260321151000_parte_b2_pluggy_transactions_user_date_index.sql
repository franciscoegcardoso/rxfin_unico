-- Parte B.2 — Preparação para listagens por usuário + data (antes de particionar em HASH+range).
-- Índice composto alinha-se a filtros frequentes em relatórios e sync.

CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user_date
  ON public.pluggy_transactions (user_id, date DESC NULLS LAST);

COMMENT ON INDEX public.idx_pluggy_transactions_user_date IS
  'Parte B.2 — suporte a range por user; particionamento futuro em pluggy_transactions_v2.';
