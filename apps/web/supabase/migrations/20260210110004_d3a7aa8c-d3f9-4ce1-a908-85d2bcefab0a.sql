
-- Database function to split a credit card transaction into installments
-- Runs atomically within a single transaction (Postgres default for functions)
CREATE OR REPLACE FUNCTION public.split_transaction(
  p_transaction_id UUID,
  p_total_installments INT,
  p_installment_current INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_total_cents BIGINT;
  v_base_cents BIGINT;
  v_remainder INT;
  v_installment_value NUMERIC(12,2);
  v_first_value NUMERIC(12,2);
  v_group_id UUID;
  v_new_date DATE;
  v_inserted_ids UUID[] := '{}';
  v_new_id UUID;
  i INT;
BEGIN
  -- Validate inputs
  IF p_total_installments < 2 OR p_total_installments > 48 THEN
    RAISE EXCEPTION 'total_installments must be between 2 and 48, got %', p_total_installments;
  END IF;

  IF p_installment_current < 1 OR p_installment_current > p_total_installments THEN
    RAISE EXCEPTION 'installment_current must be between 1 and total_installments';
  END IF;

  -- Fetch the original transaction (with row lock to prevent concurrent splits)
  SELECT * INTO v_tx
  FROM public.credit_card_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- Verify caller owns this transaction
  IF v_tx.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: transaction does not belong to current user';
  END IF;

  -- Prevent re-splitting an already split transaction
  IF v_tx.installment_total IS NOT NULL AND v_tx.installment_total > 1 THEN
    RAISE EXCEPTION 'Transaction is already split into % installments', v_tx.installment_total;
  END IF;

  -- Calculate per-installment values handling rounding (work in centavos)
  v_total_cents := ROUND(v_tx.value * 100)::BIGINT;
  v_base_cents := v_total_cents / p_total_installments;
  v_remainder := (v_total_cents % p_total_installments)::INT;

  -- First `v_remainder` installments get base+1 cent, rest get base cents
  -- This guarantees SUM of all installments = original value exactly
  v_installment_value := v_base_cents / 100.0;
  v_first_value := (v_base_cents + 1) / 100.0;

  -- Generate a shared group ID for all installments of this purchase
  v_group_id := gen_random_uuid();

  -- Update the parent transaction (becomes installment p_installment_current)
  UPDATE public.credit_card_transactions
  SET
    installment_current = p_installment_current,
    installment_total = p_total_installments,
    installment_group_id = v_group_id,
    value = CASE WHEN p_installment_current <= v_remainder THEN v_first_value ELSE v_installment_value END,
    updated_at = now()
  WHERE id = p_transaction_id;

  -- Insert the remaining installments
  FOR i IN 1..p_total_installments LOOP
    -- Skip the current installment (already handled by the parent update)
    IF i = p_installment_current THEN
      CONTINUE;
    END IF;

    -- Calculate date offset: each installment is 1 month apart
    v_new_date := (v_tx.transaction_date::DATE) + ((i - p_installment_current) * INTERVAL '1 month');

    v_new_id := gen_random_uuid();
    v_inserted_ids := v_inserted_ids || v_new_id;

    INSERT INTO public.credit_card_transactions (
      id, user_id, store_name, value, transaction_date,
      category, category_id, is_category_confirmed,
      ai_suggested_category, ai_suggested_category_id,
      card_id, import_batch_id, credit_card_bill_id,
      installment_current, installment_total, installment_group_id,
      is_recurring, recurring_group_id, friendly_name,
      pluggy_transaction_id, purchase_registry_id
    ) VALUES (
      v_new_id,
      v_tx.user_id,
      v_tx.store_name,
      CASE WHEN i <= v_remainder THEN v_first_value ELSE v_installment_value END,
      v_new_date,
      v_tx.category,
      v_tx.category_id,
      v_tx.is_category_confirmed,
      v_tx.ai_suggested_category,
      v_tx.ai_suggested_category_id,
      v_tx.card_id,
      v_tx.import_batch_id,
      NULL, -- future installments are not linked to a bill yet
      i,
      p_total_installments,
      v_group_id,
      false,
      NULL,
      v_tx.friendly_name,
      NULL, -- future installments have no pluggy_transaction_id
      v_tx.purchase_registry_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'group_id', v_group_id,
    'total_installments', p_total_installments,
    'installment_value', v_installment_value,
    'remainder_value', v_first_value,
    'remainder_count', v_remainder,
    'created_ids', to_jsonb(v_inserted_ids)
  );
END;
$$;
