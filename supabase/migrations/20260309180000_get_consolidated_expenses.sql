-- F3 Visão Consolidada: RPC para despesas consolidadas (conta + cartão) por mês
-- Tabelas: lancamentos_realizados (débito), credit_card_transactions (crédito)
-- Aplicar em staging primeiro (rxefngokspcaibkvbjtt), validar, depois produção.

CREATE OR REPLACE FUNCTION public.get_consolidated_expenses(
  p_user_id UUID,
  p_month_ref TEXT  -- formato 'YYYY-MM', ex: '2026-03'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH
  -- Despesas de conta corrente (débito) — lancamentos_realizados
  debito AS (
    SELECT
      COALESCE(lr.categoria, 'Outros') AS category,
      SUM(ABS(COALESCE(lr.valor_realizado, lr.valor_previsto))) AS total
    FROM public.lancamentos_realizados lr
    WHERE lr.user_id = p_user_id
      AND lr.tipo = 'despesa'
      AND lr.mes_referencia = p_month_ref
    GROUP BY COALESCE(lr.categoria, 'Outros')
  ),
  -- Despesas de cartão de crédito — credit_card_transactions
  credito AS (
    SELECT
      COALESCE(cct.category, 'Outros') AS category,
      SUM(ABS(cct.value)) AS total
    FROM public.credit_card_transactions cct
    WHERE cct.user_id = p_user_id
      AND to_char(cct.transaction_date::date, 'YYYY-MM') = p_month_ref
    GROUP BY COALESCE(cct.category, 'Outros')
  ),
  -- União por categoria
  combined AS (
    SELECT
      COALESCE(d.category, c.category) AS category,
      COALESCE(d.total, 0)::numeric AS total_debito,
      COALESCE(c.total, 0)::numeric AS total_credito,
      (COALESCE(d.total, 0) + COALESCE(c.total, 0))::numeric AS total_combined
    FROM debito d
    FULL OUTER JOIN credito c ON d.category = c.category
  ),
  -- KPIs agregados
  kpis AS (
    SELECT
      COALESCE((
        SELECT SUM(COALESCE(lr.valor_realizado, lr.valor_previsto))
        FROM public.lancamentos_realizados lr
        WHERE lr.user_id = p_user_id
          AND lr.tipo = 'receita'
          AND lr.mes_referencia = p_month_ref
      ), 0)::numeric AS total_receitas,
      COALESCE((SELECT SUM(total_debito) FROM combined), 0)::numeric AS total_debito,
      COALESCE((SELECT SUM(total_credito) FROM combined), 0)::numeric AS total_credito,
      COALESCE((SELECT SUM(total_combined) FROM combined), 0)::numeric AS total_despesas
  )
  SELECT json_build_object(
    'kpis', (
      SELECT json_build_object(
        'total_receitas', total_receitas,
        'total_debito', total_debito,
        'total_credito', total_credito,
        'total_despesas', total_despesas,
        'saldo_real', total_receitas - total_despesas
      ) FROM kpis
    ),
    'by_category', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'category', category,
          'total_debito', total_debito,
          'total_credito', total_credito,
          'total_combined', total_combined
        ) ORDER BY total_combined DESC
      ), '[]'::json)
      FROM combined
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_consolidated_expenses(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION public.get_consolidated_expenses(UUID, TEXT) IS 'F3: despesas consolidadas por mês (conta + cartão), KPIs e por categoria';
