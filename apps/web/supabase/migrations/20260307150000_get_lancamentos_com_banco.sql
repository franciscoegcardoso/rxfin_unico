-- RPC: lançamentos por conta/cartão com dados de banco (logo) para aba "Por lançamento"
CREATE OR REPLACE FUNCTION public.get_lancamentos_com_banco(
  p_source text,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM (
    SELECT
      lr.id AS transaction_id,
      to_char(COALESCE(lr.data_pagamento::date, lr.data_registro::date), 'YYYY-MM-DD') AS tx_date,
      COALESCE(NULLIF(btrim(lm.friendly_name), ''), lr.nome) AS estabelecimento,
      lr.valor_realizado AS amount,
      CASE
        WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN 'receita'
        ELSE 'despesa'
      END AS transaction_type,
      COALESCE(pc.connector_name, NULLIF(btrim(lr.forma_pagamento), ''), 'Conta')::text AS connector_name,
      pc.connector_image_url::text AS connector_image_url,
      pa.name::text AS account_name,
      CASE
        WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN NULL
        ELSE ec.id::text
      END AS grupo_categoria_id,
      CASE
        WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN NULL
        ELSE ec.name::text
      END AS grupo_categoria_nome,
      CASE
        WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN uii.id::text
        ELSE COALESCE(dei_id.id, dei_name.id)::text
      END AS categoria_id,
      CASE
        WHEN lr.tipo = 'receita' OR lr.valor_realizado > 0 THEN uii.name::text
        ELSE COALESCE(dei_id.name, dei_name.name, NULLIF(btrim(lr.categoria), ''))::text
      END AS categoria_nome,
      COALESCE(lr.is_category_confirmed, false) AS is_category_confirmed,
      NULL::text AS ai_sugestao_categoria,
      NULL::text AS ai_sugestao_id,
      NOT COALESCE(lr.is_category_confirmed, false) AS is_pending,
      (lr.tipo = 'receita' OR lr.valor_realizado > 0) AS is_income,
      NULL::uuid AS card_id
    FROM public.lancamentos_realizados lr
    LEFT JOIN public.lancamento_metadata lm ON lm.lancamento_id = lr.id
    LEFT JOIN public.pluggy_transactions pt
      ON pt.pluggy_transaction_id = lm.source_id AND lm.source_type = 'pluggy_bank'
    LEFT JOIN public.pluggy_accounts pa ON pa.id = pt.account_id AND pa.deleted_at IS NULL
    LEFT JOIN public.pluggy_connections pc ON pc.id = pa.connection_id AND pc.deleted_at IS NULL
    LEFT JOIN public.expense_categories ec
      ON ec.id = lr.category_id AND ec.is_active = true
      AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.default_expense_items dei_id
      ON dei_id.id = lr.category_id AND dei_id.is_active = true
      AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.default_expense_items dei_name
      ON dei_name.category_name = ec.name
      AND btrim(dei_name.name) = btrim(lr.categoria)
      AND dei_name.is_active = true
      AND lr.tipo <> 'receita' AND lr.valor_realizado <= 0
    LEFT JOIN public.user_income_items uii
      ON uii.id = lr.category_id AND uii.user_id = lr.user_id AND uii.enabled = true
      AND (lr.tipo = 'receita' OR lr.valor_realizado > 0)
    WHERE lr.user_id = auth.uid()
      AND p_source = 'bank'
      AND (p_date_from IS NULL OR COALESCE(lr.data_pagamento::date, lr.data_registro::date) >= p_date_from)
      AND (p_date_to IS NULL OR COALESCE(lr.data_pagamento::date, lr.data_registro::date) <= p_date_to)

    UNION ALL

    SELECT
      t.id AS transaction_id,
      to_char(t.transaction_date::date, 'YYYY-MM-DD') AS tx_date,
      COALESCE(NULLIF(btrim(t.friendly_name), ''), t.store_name) AS estabelecimento,
      t.value AS amount,
      CASE WHEN t.value > 0 THEN 'receita' ELSE 'despesa' END AS transaction_type,
      COALESCE(pc.connector_name, 'Cartão')::text AS connector_name,
      pc.connector_image_url::text AS connector_image_url,
      pa.name::text AS account_name,
      CASE WHEN t.value > 0 THEN NULL ELSE ec.id::text END AS grupo_categoria_id,
      CASE WHEN t.value > 0 THEN NULL ELSE ec.name::text END AS grupo_categoria_nome,
      CASE WHEN t.value > 0 THEN uii.id::text ELSE COALESCE(dei.id, t.category_id::text) END AS categoria_id,
      CASE
        WHEN t.value > 0 THEN uii.name::text
        ELSE COALESCE(dei.name, NULLIF(btrim(t.category), ''))::text
      END AS categoria_nome,
      COALESCE(t.is_category_confirmed, false) AS is_category_confirmed,
      t.ai_suggested_category::text AS ai_sugestao_categoria,
      t.ai_suggested_category_id::text AS ai_sugestao_id,
      NOT COALESCE(t.is_category_confirmed, false) AS is_pending,
      (t.value > 0) AS is_income,
      t.card_id
    FROM public.credit_card_transactions t
    LEFT JOIN public.default_expense_items dei ON dei.id = t.category_id AND dei.is_active = true AND t.value <= 0
    LEFT JOIN public.expense_categories ec ON ec.name = dei.category_name AND ec.is_active = true AND t.value <= 0
    LEFT JOIN public.pluggy_accounts pa ON pa.id = t.card_id AND pa.type = 'CREDIT' AND pa.deleted_at IS NULL
    LEFT JOIN public.pluggy_connections pc ON pc.id = pa.connection_id AND pc.deleted_at IS NULL
    LEFT JOIN public.user_income_items uii
      ON uii.id = t.category_id AND uii.user_id = t.user_id AND uii.enabled = true AND t.value > 0
    WHERE t.user_id = auth.uid()
      AND p_source = 'card'
      AND (p_date_from IS NULL OR t.transaction_date::date >= p_date_from)
      AND (p_date_to IS NULL OR t.transaction_date::date <= p_date_to)
  ) x
  ORDER BY x.tx_date DESC, x.transaction_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_lancamentos_com_banco(text, date, date) TO authenticated;

COMMENT ON FUNCTION public.get_lancamentos_com_banco IS
  'Lista lançamentos (conta ou cartão) com logo/nome do banco para categorização em massa.';
