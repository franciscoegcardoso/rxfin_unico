-- Confirmar recorrência (counts toward monthly total)
CREATE OR REPLACE FUNCTION public.confirmar_recorrente_cartao(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE pluggy_recurring_payments
  SET confirmed_by_user = true, updated_at = now()
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Ignorar/remover recorrência (set is_active = false)
CREATE OR REPLACE FUNCTION public.ignorar_recorrente_cartao(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE pluggy_recurring_payments
  SET is_active = false, updated_at = now()
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;
