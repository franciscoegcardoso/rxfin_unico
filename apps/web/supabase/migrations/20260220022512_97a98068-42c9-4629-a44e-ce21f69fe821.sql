
-- 1. Soft-delete columns for pluggy_connections and pluggy_accounts
ALTER TABLE pluggy_connections ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE pluggy_accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Partial indices for filtering active records efficiently
CREATE INDEX IF NOT EXISTS idx_pluggy_connections_active ON pluggy_connections (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pluggy_accounts_active ON pluggy_accounts (connection_id) WHERE deleted_at IS NULL;

-- 3. Validation trigger (WARNING only, non-blocking) for card_id integrity
CREATE OR REPLACE FUNCTION validate_card_id()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.card_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pluggy_accounts WHERE id::text = NEW.card_id)
       AND NOT EXISTS (SELECT 1 FROM user_financial_institutions WHERE id::text = NEW.card_id)
    THEN
      RAISE WARNING 'card_id % does not match any known account', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validate_card_id_cct
  BEFORE INSERT OR UPDATE OF card_id ON credit_card_transactions
  FOR EACH ROW
  WHEN (NEW.card_id IS NOT NULL)
  EXECUTE FUNCTION validate_card_id();

CREATE OR REPLACE TRIGGER trg_validate_card_id_ccb
  BEFORE INSERT OR UPDATE OF card_id ON credit_card_bills
  FOR EACH ROW
  WHEN (NEW.card_id IS NOT NULL)
  EXECUTE FUNCTION validate_card_id();

-- 4. Repair function for orphan card_ids and duplicate transactions
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
BEGIN
  -- Find active credit account for this user
  SELECT id::text INTO v_active_credit_account_id
  FROM pluggy_accounts
  WHERE user_id = p_user_id AND type = 'CREDIT' AND deleted_at IS NULL
  LIMIT 1;

  -- Find orphan card_ids (card_ids that don't exist in pluggy_accounts for this user)
  SELECT ARRAY_AGG(DISTINCT card_id) INTO v_orphan_ids
  FROM credit_card_transactions
  WHERE user_id = p_user_id AND card_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pluggy_accounts pa WHERE pa.id::text = credit_card_transactions.card_id AND pa.user_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_financial_institutions ufi WHERE ufi.id::text = credit_card_transactions.card_id
    );

  -- Remap orphan transactions to active account
  IF v_active_credit_account_id IS NOT NULL AND v_orphan_ids IS NOT NULL AND array_length(v_orphan_ids, 1) > 0 THEN
    UPDATE credit_card_transactions
    SET card_id = v_active_credit_account_id, updated_at = now()
    WHERE user_id = p_user_id AND card_id = ANY(v_orphan_ids);
    GET DIAGNOSTICS v_remapped_tx = ROW_COUNT;

    UPDATE credit_card_bills
    SET card_id = v_active_credit_account_id, updated_at = now()
    WHERE user_id = p_user_id AND card_id = ANY(v_orphan_ids);
    GET DIAGNOSTICS v_remapped_bills = ROW_COUNT;
  END IF;

  -- Remove duplicate credit_card_transactions by pluggy_transaction_id (keep oldest)
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
    'remapped_bills', v_remapped_bills,
    'duplicates_removed', v_dupes_removed
  );
END;
$$;
