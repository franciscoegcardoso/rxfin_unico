-- RPC stub para a página Admin > Estratégico (/admin/estrategico).
-- Retorna estrutura mínima para a UI carregar; implementação completa pode
-- agregar dados reais de profiles, assinaturas, roadmap etc. em versões futuras.

CREATE OR REPLACE FUNCTION public.get_admin_strategic_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MSOF'),
    'valuation', jsonb_build_object(
      'current_arr', 0,
      'arr_target', 1000000,
      'current_mrr', 0,
      'mrr_target', 83333,
      'paying_users', 0,
      'paying_target', 3333,
      'free_users', 0,
      'free_target', 66600,
      'conversion_rate', 0,
      'conversion_target_pct', 5
    ),
    'roadmap', '[]'::jsonb,
    'aarrr', '{}'::jsonb,
    'campaigns', '[]'::jsonb,
    'cronograma', jsonb_build_object('milestones', '[]'::jsonb, 'today', to_char(now(), 'YYYY-MM-DD'))
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_admin_strategic_dashboard() IS 'Stub for Admin Estratégico page; returns minimal dashboard so UI loads.';

GRANT EXECUTE ON FUNCTION public.get_admin_strategic_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_strategic_dashboard() TO service_role;
