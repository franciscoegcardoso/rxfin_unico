-- Fase 2 PROMPT 6/9: após REVOKE SELECT em mv_portfolio_allocation_status para authenticated,
-- o frontend passa a consumir apenas via esta RPC (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.get_portfolio_allocation_status()
RETURNS SETOF public.mv_portfolio_allocation_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.mv_portfolio_allocation_status
  WHERE user_id = auth.uid()
  ORDER BY drift_priority_score DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_portfolio_allocation_status() IS
  'Substitui SELECT direto na MV mv_portfolio_allocation_status; filtra por auth.uid().';

GRANT EXECUTE ON FUNCTION public.get_portfolio_allocation_status() TO authenticated;
REVOKE ALL ON FUNCTION public.get_portfolio_allocation_status() FROM PUBLIC;
