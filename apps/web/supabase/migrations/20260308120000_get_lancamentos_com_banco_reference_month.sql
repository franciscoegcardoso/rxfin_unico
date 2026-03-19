-- Substitui get_lancamentos_com_banco: mês de referência YYYY-MM + limite/paginação (PostgREST)
DROP FUNCTION IF EXISTS public.get_lancamentos_com_banco(text, date, date);

CREATE OR REPLACE FUNCTION public.get_lancamentos_com_banco(
  p_source_filter text,
  p_reference_month text DEFAULT NULL,
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  transaction_id uuid,
  tx_date text,
  estabelecimento text,
  amount numeric,
  transaction_type text,
  connector_name text,
  connector_image_url text,
  account_name text,
  grupo_categoria_id text,
  grupo_categoria_nome text,
  categoria_id text,
  categoria_nome text,
  is_category_confirmed boolean,
  ai_sugestao_categoria text,
  ai_sugestao_id text,
  is_pending boolean,
  is_income boolean,
  card_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_source_filter = 'bank' THEN
    RETURN QUERY
    SELECT
      lr.id,
      to_char(COALESCE(lr.data_pagamento::date, lr.data_registro::date), 'YYYY-MM-DD'),
      COALESCE(NULLIF(btrim(lm.friendly_name), ''), lr.nome),
      lr.valor_realizado,
      CASE WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN 'receita' ELSE 'despesa' END,
      COALESCE(pc.connector_name, NULLIF(btrim(lr.forma_pagamento), ''), 'Conta')::text,
      pc.connector_image_url::text,
      pa.name::text,
      CASE WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN NULL ELSE ec.id::text END,
      CASE WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN NULL ELSE ec.name::text END,
      CASE WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN uii.id::text ELSE COALESCE(dei_id.id, dei_name.id)::text END,
      CASE WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN uii.name::text ELSE COALESCE(dei_id.name, dei_name.name, NULLIF(btrim(lr.categoria), ''))::text END,
      COALESCE(lr.is_category_confirmed, false),
      NULL::text,
      NULL::text,
      NOT COALESCE(lr.is_category_confirmed, false),
      (lr.tipo = 'receita' OR lr.valor_realizado > 0),
      NULL::uuid
    FROM public.lancamentos_realizados lr
    LEFT JOIN public.lancamento_metadata lm ON lm.lancamento_id = lr.id
    LEFT JOIN public.pluggy_transactions pt ON pt.pluggy_transaction_id = lm.source_id AND lm.source_type = 'pluggy_bank'
    LEFT JOIN public.pluggy_accounts pa ON pa.id = pt.account_id AND pa.deleted_at IS NULL
    LEFT JOIN public.pluggy_connections pc ON pc.id = pa.connection_id AND pc.deleted_at IS NULL
    LEFT JOIN public.expense_categories ec ON ec.id = lr.category_id AND ec.is_active = true AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.default_expense_items dei_id ON dei_id.id = lr.category_id AND dei_id.is_active = true AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.default_expense_items dei_name ON dei_name.category_name = ec.name AND btrim(dei_name.name) = btrim(lr.categoria) AND dei_name.is_active = true AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.user_income_items uii ON uii.id = lr.category_id AND uii.user_id = lr.user_id AND uii.enabled = true AND (lr.tipo = 'receita' OR lr.valor_realizado > 0)
    WHERE lr.user_id = auth.uid()
      AND (
        p_reference_month IS NULL
        OR to_char(COALESCE(lr.data_pagamento::date, lr.data_registro::date), 'YYYY-MM') = p_reference_month
      )
    ORDER BY COALESCE(lr.data_pagamento::date, lr.data_registro::date) DESC, lr.id DESC
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  IF p_source_filter = 'card' THEN
    RETURN QUERY
    SELECT
      t.id,
      to_char(t.transaction_date::date, 'YYYY-MM-DD'),
      COALESCE(NULLIF(btrim(t.friendly_name), ''), t.store_name),
      t.value,
      CASE WHEN t.value > 0 THEN 'receita' ELSE 'despesa' END,
      COALESCE(pc.connector_name, 'Cartão')::text,
      pc.connector_image_url::text,
      pa.name::text,
      CASE WHEN t.value > 0 THEN NULL ELSE ec.id::text END,
      CASE WHEN t.value > 0 THEN NULL ELSE ec.name::text END,
      CASE WHEN t.value > 0 THEN uii.id::text ELSE COALESCE(dei.id, t.category_id::text) END,
      CASE WHEN t.value > 0 THEN uii.name::text ELSE COALESCE(dei.name, NULLIF(btrim(t.category), ''))::text END,
      COALESCE(t.is_category_confirmed, false),
      t.ai_suggested_category::text,
      t.ai_suggested_category_id::text,
      NOT COALESCE(t.is_category_confirmed, false),
      (t.value > 0),
      t.card_id
    FROM public.credit_card_transactions t
    LEFT JOIN public.default_expense_items dei ON dei.id = t.category_id AND dei.is_active = true AND t.value <= 0
    LEFT JOIN public.expense_categories ec ON ec.name = dei.category_name AND ec.is_active = true AND t.value <= 0
    LEFT JOIN public.pluggy_accounts pa ON pa.id = t.card_id AND pa.type = 'CREDIT' AND pa.deleted_at IS NULL
    LEFT JOIN public.pluggy_connections pc ON pc.id = pa.connection_id AND pc.deleted_at IS NULL
    LEFT JOIN public.user_income_items uii ON uii.id = t.category_id AND uii.user_id = t.user_id AND uii.enabled = true AND t.value > 0
    WHERE t.user_id = auth.uid()
      AND (
        p_reference_month IS NULL
        OR to_char(t.transaction_date::date, 'YYYY-MM') = p_reference_month
      )
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_lancamentos_com_banco(text, text, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_lancamentos_com_banco(text, text, integer, integer) IS
  'Lançamentos conta/cartão por mês YYYY-MM (null = sem filtro de mês) + limit/offset.';
