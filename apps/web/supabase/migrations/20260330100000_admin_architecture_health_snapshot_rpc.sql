-- RPC stub para a página Admin > Arquitetura (/admin/architecture).
-- Retorna um snapshot mínimo para a UI carregar; implementação completa pode consultar
-- information_schema, pg_policies, pg_proc etc. em versões futuras.

CREATE OR REPLACE FUNCTION public.get_architecture_health_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MSOF'),
    'rls', jsonb_build_object(
      'coverage_pct', 0,
      'total_tables', 0,
      'tables_with_rls', 0,
      'tables_with_policies', 0
    ),
    'data', jsonb_build_object(
      'jobs_pending', 0,
      'sync_errors_24h', 0,
      'transactions_total', 0,
      'transaction_partitions', 0,
      'pluggy_transactions_total', 0
    ),
    'security', jsonb_build_object(
      'total_policies', 0,
      'permissive_policies_count', 0,
      'unsafe_functions', jsonb_build_object(
        'pct_unsafe', 0,
        'unsafe_count', 0,
        'total_functions', 0
      )
    ),
    'performance', jsonb_build_object(
      'total_indexes', 0
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_architecture_health_snapshot() IS 'Stub for Admin Architecture page; returns minimal snapshot so UI loads.';

GRANT EXECUTE ON FUNCTION public.get_architecture_health_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_architecture_health_snapshot() TO service_role;
