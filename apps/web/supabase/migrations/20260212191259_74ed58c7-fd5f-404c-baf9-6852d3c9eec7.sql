
-- Tabela de regras de categoria por estabelecimento
CREATE TABLE public.store_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  normalized_store_name text NOT NULL,
  original_store_name text,
  category_id text NOT NULL,
  category_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, normalized_store_name)
);

ALTER TABLE public.store_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rules"
  ON public.store_category_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função RPC atômica: insere regra + atualiza transações passadas
CREATE OR REPLACE FUNCTION public.apply_store_category_rule(
  p_normalized_name text,
  p_original_name text,
  p_category_id text,
  p_category_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated int;
BEGIN
  INSERT INTO store_category_rules (user_id, normalized_store_name, original_store_name, category_id, category_name)
  VALUES (v_user_id, p_normalized_name, p_original_name, p_category_id, p_category_name)
  ON CONFLICT (user_id, normalized_store_name)
  DO UPDATE SET category_id = EXCLUDED.category_id, category_name = EXCLUDED.category_name, original_store_name = EXCLUDED.original_store_name;

  UPDATE credit_card_transactions
  SET category_id = p_category_id,
      category = p_category_name,
      is_category_confirmed = true,
      updated_at = now()
  WHERE user_id = v_user_id
    AND normalize_store_name_sql(store_name) ILIKE '%' || p_normalized_name || '%';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;
