-- Parte B.6 — Arquivo frio de transações Pluggy (além de N meses).
-- O job só move dados quando a tabela principal atinge o limiar (default 10M linhas),
-- salvo p_force = true (testes). Agendar via pg_cron ou Supabase Scheduler quando apropriado.

CREATE TABLE IF NOT EXISTS public.pluggy_transactions_archive (
  LIKE public.pluggy_transactions INCLUDING ALL
);

COMMENT ON TABLE public.pluggy_transactions_archive IS
  'Cópia de linhas antigas de pluggy_transactions; ver run_pluggy_transactions_archive_job.';

ALTER TABLE public.pluggy_transactions_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions archive" ON public.pluggy_transactions_archive;
CREATE POLICY "Users can view their own transactions archive"
  ON public.pluggy_transactions_archive
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Visão analítica (listagens longas); RLS aplica-se às tabelas base.
CREATE OR REPLACE VIEW public.pluggy_transactions_all
WITH (security_invoker = true) AS
  SELECT * FROM public.pluggy_transactions
  UNION ALL
  SELECT * FROM public.pluggy_transactions_archive;

COMMENT ON VIEW public.pluggy_transactions_all IS
  'UNION hot + archive. Não substitui pluggy_transactions nas rotas de escrita.';

GRANT SELECT ON public.pluggy_transactions_all TO authenticated;
GRANT SELECT ON public.pluggy_transactions_all TO service_role;

CREATE OR REPLACE FUNCTION public.run_pluggy_transactions_archive_job(
  p_months int DEFAULT 24,
  p_batch_size int DEFAULT 50000,
  p_min_total_rows bigint DEFAULT 10000000,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_cutoff date;
  v_ins int := 0;
  v_del int := 0;
BEGIN
  SELECT count(*) INTO v_total FROM public.pluggy_transactions;

  IF NOT p_force AND v_total < p_min_total_rows THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'below_min_rows_threshold',
      'rows', v_total,
      'min_required', p_min_total_rows,
      'hint', 'Pass p_force := true to run in smaller databases (tests only).'
    );
  END IF;

  v_cutoff := (CURRENT_DATE - (p_months || ' months')::interval)::date;

  WITH batch AS (
    SELECT *
    FROM public.pluggy_transactions
    WHERE date < v_cutoff
    LIMIT p_batch_size
  ),
  ins AS (
    INSERT INTO public.pluggy_transactions_archive
    SELECT * FROM batch
    RETURNING id
  ),
  del AS (
    DELETE FROM public.pluggy_transactions t
    WHERE t.id IN (SELECT id FROM ins)
    RETURNING t.id
  )
  SELECT
    (SELECT count(*)::int FROM ins),
    (SELECT count(*)::int FROM del)
  INTO v_ins, v_del;

  RETURN jsonb_build_object(
    'skipped', false,
    'cutoff', v_cutoff,
    'inserted', v_ins,
    'deleted', v_del
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'hint', 'Verifique FKs ou referências a pluggy_transactions.id antes de arquivar.'
    );
END;
$$;

COMMENT ON FUNCTION public.run_pluggy_transactions_archive_job IS
  'Move um lote de transações com date < now - p_months para pluggy_transactions_archive.';

REVOKE ALL ON FUNCTION public.run_pluggy_transactions_archive_job FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_pluggy_transactions_archive_job TO service_role;
GRANT EXECUTE ON FUNCTION public.run_pluggy_transactions_archive_job TO postgres;
