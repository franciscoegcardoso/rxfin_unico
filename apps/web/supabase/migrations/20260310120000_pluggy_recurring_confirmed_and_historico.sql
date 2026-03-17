-- Add confirmed_by_user to pluggy_recurring_payments for "Confirmadas" vs "Sugestões"
ALTER TABLE public.pluggy_recurring_payments
ADD COLUMN IF NOT EXISTS confirmed_by_user boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pluggy_recurring_payments.confirmed_by_user IS 'User confirmed this recurrence; only confirmed items count toward monthly total.';

-- RPC: get_recorrentes_cartao_historico(p_user_id) → last 13 months presence per recurring item
-- Returns: [{ recurring_id, months: [{ month: 'YYYY-MM', amount: numeric|null, present: boolean }] }]
CREATE OR REPLACE FUNCTION public.get_recorrentes_cartao_historico(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_row record;
  v_months text[] := ARRAY[]::text[];
  v_i int;
  v_ym text;
  v_month_objs jsonb;
  v_occurrence_ids text[];
  v_present boolean;
  v_amount numeric;
BEGIN
  FOR v_i IN 0..12 LOOP
    v_months := array_append(v_months, to_char(date_trunc('month', current_date) - (v_i || ' months')::interval, 'YYYY-MM'));
  END LOOP;

  FOR v_row IN
    SELECT id, raw_data, last_occurrence_date, average_amount
    FROM pluggy_recurring_payments
    WHERE user_id = p_user_id AND is_active = true
  LOOP
    v_month_objs := '[]'::jsonb;
    v_occurrence_ids := ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(v_row.raw_data->'occurrence_ids', '[]'::jsonb))
    );

    FOR v_i IN 1..array_length(v_months, 1) LOOP
      v_ym := v_months[v_i];
      v_present := false;
      v_amount := null;
      IF array_length(v_occurrence_ids, 1) > 0 THEN
        SELECT EXISTS (
          SELECT 1 FROM pluggy_transactions pt
          WHERE pt.pluggy_transaction_id = ANY(v_occurrence_ids)
            AND pt.user_id = p_user_id
            AND to_char(pt.date::date, 'YYYY-MM') = v_ym
        ) INTO v_present;
        IF v_present THEN
          SELECT pt.amount INTO v_amount
          FROM pluggy_transactions pt
          WHERE pt.pluggy_transaction_id = ANY(v_occurrence_ids)
            AND pt.user_id = p_user_id
            AND to_char(pt.date::date, 'YYYY-MM') = v_ym
          LIMIT 1;
        END IF;
      ELSIF v_row.last_occurrence_date IS NOT NULL AND to_char(v_row.last_occurrence_date::date, 'YYYY-MM') = v_ym THEN
        v_present := true;
        v_amount := v_row.average_amount;
      END IF;
      v_month_objs := v_month_objs || jsonb_build_object('month', v_ym, 'amount', v_amount, 'present', v_present);
    END LOOP;
    v_result := v_result || jsonb_build_array(jsonb_build_object('recurring_id', v_row.id, 'months', v_month_objs));
  END LOOP;
  RETURN v_result;
END;
$$;
