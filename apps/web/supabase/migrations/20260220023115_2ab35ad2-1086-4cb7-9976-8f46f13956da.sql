
-- Fix repair function: delete ALL orphan bills before remapping to avoid any unique constraint violations
CREATE OR REPLACE FUNCTION repair_orphan_card_ids(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_credit_account_id text;
  v_orphan_ids text[];
  v_remapped_tx int := 0;
  v_remapped_bills int := 0;
  v_dupes_removed int := 0;
  v_orphan_bills_deleted int := 0;
BEGIN
  SELECT id::text INTO v_active_credit_account_id
  FROM pluggy_accounts
  WHERE user_id = p_user_id AND type = 'CREDIT' AND deleted_at IS NULL
  LIMIT 1;

  SELECT ARRAY_AGG(DISTINCT card_id) INTO v_orphan_ids
  FROM credit_card_transactions
  WHERE user_id = p_user_id AND card_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pluggy_accounts pa WHERE pa.id::text = credit_card_transactions.card_id AND pa.user_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_financial_institutions ufi WHERE ufi.id::text = credit_card_transactions.card_id
    );

  -- Also collect orphan card_ids from bills
  IF v_orphan_ids IS NULL THEN
    SELECT ARRAY_AGG(DISTINCT card_id) INTO v_orphan_ids
    FROM credit_card_bills
    WHERE user_id = p_user_id AND card_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pluggy_accounts pa WHERE pa.id::text = credit_card_bills.card_id AND pa.user_id = p_user_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_financial_institutions ufi WHERE ufi.id::text = credit_card_bills.card_id
      );
  END IF;

  IF v_active_credit_account_id IS NOT NULL AND v_orphan_ids IS NOT NULL AND array_length(v_orphan_ids, 1) > 0 THEN
    -- Step 1: Remap all orphan transactions to active card first
    UPDATE credit_card_transactions
    SET card_id = v_active_credit_account_id, updated_at = now()
    WHERE user_id = p_user_id AND card_id = ANY(v_orphan_ids);
    GET DIAGNOSTICS v_remapped_tx = ROW_COUNT;

    -- Step 2: For orphan bills that conflict with active card bills,
    -- remap their linked transactions to the active bill, then delete orphan bill
    UPDATE credit_card_transactions ct
    SET credit_card_bill_id = ab.id, updated_at = now()
    FROM credit_card_bills ob
    JOIN credit_card_bills ab ON ab.card_id = v_active_credit_account_id AND ab.due_date = ob.due_date AND ab.id != ob.id
    WHERE ob.user_id = p_user_id AND ob.card_id = ANY(v_orphan_ids)
      AND ct.credit_card_bill_id = ob.id;

    -- Step 3: Delete all orphan bills (they are now either merged or no longer needed)
    DELETE FROM credit_card_bills
    WHERE user_id = p_user_id AND card_id = ANY(v_orphan_ids);
    GET DIAGNOSTICS v_orphan_bills_deleted = ROW_COUNT;
  END IF;

  -- Step 4: Remove duplicate credit_card_transactions by pluggy_transaction_id (keep oldest)
  WITH dupes AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY pluggy_transaction_id
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE user_id = p_user_id AND pluggy_transaction_id IS NOT NULL
  )
  DELETE FROM credit_card_transactions WHERE id IN (
    SELECT id FROM dupes WHERE rn > 1
  );
  GET DIAGNOSTICS v_dupes_removed = ROW_COUNT;

  RETURN jsonb_build_object(
    'orphan_card_ids', COALESCE(v_orphan_ids, ARRAY[]::text[]),
    'remapped_transactions', v_remapped_tx,
    'orphan_bills_deleted', v_orphan_bills_deleted,
    'duplicates_removed', v_dupes_removed
  );
END;
$$;

-- Execute repair
SELECT repair_orphan_card_ids('b9414650-22c0-46f0-b757-351e6518decb'::uuid);
