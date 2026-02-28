-- Add category confirmation tracking to lancamentos_realizados
ALTER TABLE public.lancamentos_realizados 
ADD COLUMN IF NOT EXISTS is_category_confirmed boolean DEFAULT false;

-- Create a function to apply category rules for lancamentos by name
CREATE OR REPLACE FUNCTION public.apply_lancamento_category_rule(
  p_nome_pattern text,
  p_categoria text,
  p_tipo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated int;
BEGIN
  UPDATE lancamentos_realizados
  SET categoria = p_categoria,
      is_category_confirmed = true,
      updated_at = now()
  WHERE user_id = v_user_id
    AND tipo = p_tipo
    AND lower(nome) = lower(p_nome_pattern)
    AND (is_category_confirmed = false OR is_category_confirmed IS NULL);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;