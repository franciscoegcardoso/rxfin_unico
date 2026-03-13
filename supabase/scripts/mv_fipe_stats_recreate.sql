-- Executar diretamente no Supabase SQL Editor (não dentro de migração).
-- 1. Dropar e recriar mv_fipe_stats com schema correto

DROP MATERIALIZED VIEW IF EXISTS public.mv_fipe_stats CASCADE;

CREATE MATERIALIZED VIEW public.mv_fipe_stats AS
SELECT
  (SELECT count(*) FROM fipe.fipe_catalog)       AS total_veiculos,
  (SELECT count(*) FROM fipe.fipe_price_history) AS total_precos,
  (SELECT min(reference_label) FROM fipe.fipe_price_history) AS data_mais_antiga,
  (SELECT max(reference_label) FROM fipe.fipe_price_history) AS data_mais_recente,
  now() AS refreshed_at
WITH NO DATA;

CREATE UNIQUE INDEX idx_mv_fipe_stats_unique ON public.mv_fipe_stats (total_veiculos);

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_fipe_stats;
