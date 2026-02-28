
-- Remove invalid "sem_historico" sentinels for fipe_codes that have real history under another model_year
-- These will be re-processed by the new model-level Phase 2 and get proper "dados_em_outro_model_year" labels
DELETE FROM fipe_price_history
WHERE reference_code = 0 
  AND price = 0
  AND reference_label = 'sem_historico'
  AND EXISTS (
    SELECT 1 FROM fipe_price_history real
    WHERE real.fipe_code = fipe_price_history.fipe_code
      AND real.model_year != fipe_price_history.model_year
      AND real.price > 0
  );
