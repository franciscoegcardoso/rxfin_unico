-- Dashboard de Saúde do Banco (RXFin)
-- Monitoramento de: Uso do pool de conexões e Bloqueios longos.
-- Aplicar via: supabase db push OU SQL Editor no Supabase Dashboard.

-- =============================================================================
-- 1) Função: Uso do pool de conexões (pg_stat_activity + max_connections)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_connection_pool_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_total int;
  v_by_state jsonb;
  v_result jsonb;
BEGIN
  SELECT (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') INTO v_max;

  SELECT
    count(*)::int,
    jsonb_object_agg(coalesce(state, 'unknown'), cnt)
  INTO v_total, v_by_state
  FROM (
    SELECT state, count(*) AS cnt
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
  ) t;

  IF v_by_state IS NULL THEN
    v_by_state := '{}'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'max_connections', v_max,
    'total_connections', coalesce(v_total, 0),
    'usage_pct', CASE WHEN v_max > 0 THEN round(100.0 * coalesce(v_total, 0) / v_max, 1) ELSE 0 END,
    'by_state', v_by_state,
    'collected_at', now()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_connection_pool_health() IS
  'Retorna uso atual do pool (total, máximo, % e por estado). Usado pelo Dashboard de Saúde no Admin.';

-- Permissão: apenas roles autenticados (admin usa mesmo client)
GRANT EXECUTE ON FUNCTION public.get_connection_pool_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connection_pool_health() TO service_role;


-- =============================================================================
-- 2) View: Bloqueios longos (sessões esperando em lock há mais de N segundos)
-- Usamos função com parâmetro para threshold; a view não aceita parâmetro.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_long_blocking_activity(p_threshold_seconds int DEFAULT 5)
RETURNS TABLE (
  blocked_pid int,
  blocking_pid int,
  wait_duration_seconds numeric,
  blocked_state text,
  blocked_query_preview text,
  blocking_state text,
  blocking_query_preview text,
  blocked_usename text,
  blocking_usename text,
  blocked_application_name text,
  blocked_client_addr inet
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.pid::int AS blocked_pid,
    (pg_blocking_pids(a.pid))[1]::int AS blocking_pid,
    round(extract(epoch from (now() - a.state_change))::numeric, 1) AS wait_duration_seconds,
    coalesce(a.state, '')::text AS blocked_state,
    left(coalesce(a.query, ''), 120)::text AS blocked_query_preview,
    coalesce(b.state, '')::text AS blocking_state,
    left(coalesce(b.query, ''), 120)::text AS blocking_query_preview,
    a.usename::text AS blocked_usename,
    b.usename::text AS blocking_usename,
    coalesce(a.application_name, '')::text AS blocked_application_name,
    a.client_addr AS blocked_client_addr
  FROM pg_stat_activity a
  LEFT JOIN pg_stat_activity b ON b.pid = (pg_blocking_pids(a.pid))[1]
  WHERE cardinality(pg_blocking_pids(a.pid)) > 0
    AND a.pid <> pg_backend_pid()
    AND extract(epoch from (now() - a.state_change)) >= p_threshold_seconds
  ORDER BY (now() - a.state_change) DESC;
END;
$$;

COMMENT ON FUNCTION public.get_long_blocking_activity(int) IS
  'Retorna sessões bloqueadas há mais de p_threshold_seconds segundos. Usado pelo Dashboard de Saúde no Admin.';

GRANT EXECUTE ON FUNCTION public.get_long_blocking_activity(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_long_blocking_activity(int) TO service_role;


-- =============================================================================
-- 3) View materializada opcional: snapshot do pool (para histórico via cron)
-- Não é obrigatória para o dashboard em tempo real; o admin chama as funções.
-- =============================================================================
-- Comentado: criar apenas se quiser histórico no próprio Postgres.
-- CREATE TABLE IF NOT EXISTS public.database_health_snapshots (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   pool_health jsonb NOT NULL,
--   blocking_count int NOT NULL DEFAULT 0,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS idx_database_health_snapshots_created ON public.database_health_snapshots(created_at);
