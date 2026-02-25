
-- Function to repair installment data and bill links from pluggy metadata
CREATE OR REPLACE FUNCTION public.repair_pluggy_installment_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  installments_fixed int := 0;
  bills_fixed int := 0;
BEGIN
  -- 1. Backfill installment_current and installment_total from pluggy metadata
  WITH updates AS (
    UPDATE credit_card_transactions ct
    SET 
      installment_current = ((pt.credit_card_metadata::jsonb)->>'installmentNumber')::int,
      installment_total = ((pt.credit_card_metadata::jsonb)->>'totalInstallments')::int,
      updated_at = now()
    FROM pluggy_transactions pt
    WHERE pt.pluggy_transaction_id = ct.pluggy_transaction_id
      AND ct.installment_current IS NULL
      AND pt.credit_card_metadata IS NOT NULL
      AND (pt.credit_card_metadata::jsonb)->>'totalInstallments' IS NOT NULL
      AND ((pt.credit_card_metadata::jsonb)->>'totalInstallments')::int > 1
    RETURNING ct.id
  )
  SELECT count(*) INTO installments_fixed FROM updates;

  -- 2. Fix bill linking using pluggy_transactions.bill_id (authoritative source)
  WITH bill_fixes AS (
    UPDATE credit_card_transactions ct
    SET 
      credit_card_bill_id = pt.bill_id,
      updated_at = now()
    FROM pluggy_transactions pt
    WHERE pt.pluggy_transaction_id = ct.pluggy_transaction_id
      AND pt.bill_id IS NOT NULL
      AND (ct.credit_card_bill_id IS NULL OR ct.credit_card_bill_id != pt.bill_id)
    RETURNING ct.id
  )
  SELECT count(*) INTO bills_fixed FROM bill_fixes;

  RETURN jsonb_build_object(
    'installments_fixed', installments_fixed,
    'bills_fixed', bills_fixed
  );
END;
$$;
