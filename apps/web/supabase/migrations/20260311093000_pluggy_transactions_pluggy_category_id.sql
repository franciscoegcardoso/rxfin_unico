-- pluggy_transactions: ID numérico Pluggy (ex. "05080000") vindo da API (categoryId)
ALTER TABLE public.pluggy_transactions
  ADD COLUMN IF NOT EXISTS pluggy_category_id TEXT;

-- pluggy_category_map: mapeamento direto por ID Pluggy (além do texto pluggy_category)
ALTER TABLE public.pluggy_category_map
  ADD COLUMN IF NOT EXISTS pluggy_category_id_raw TEXT;

-- RXFin category resolvida via pluggy_category_map (sync preenche quando há match)
ALTER TABLE public.pluggy_transactions
  ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.expense_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pluggy_category_map_id_raw
  ON public.pluggy_category_map (pluggy_category_id_raw)
  WHERE pluggy_category_id_raw IS NOT NULL;

COMMENT ON COLUMN public.pluggy_transactions.pluggy_category_id IS 'Pluggy API categoryId (string, ex. 05080000)';
COMMENT ON COLUMN public.pluggy_category_map.pluggy_category_id_raw IS 'Pluggy categoryId for lookup before pluggy_category text';

-- Se existir RPC batch_upsert_pluggy_transactions no projeto, atualizar o INSERT/ON CONFLICT
-- para incluir pluggy_category_id e category_id (EXCLUDED.*) — não versionado neste repo.
