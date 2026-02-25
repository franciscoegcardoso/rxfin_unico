
ALTER TABLE credit_card_transactions ADD COLUMN purchase_date DATE;

-- Backfill from pluggy metadata
UPDATE credit_card_transactions ct
SET purchase_date = (
  SELECT (pt.credit_card_metadata::jsonb->>'purchaseDate')::date
  FROM pluggy_transactions pt
  WHERE pt.pluggy_transaction_id = ct.pluggy_transaction_id
    AND pt.credit_card_metadata IS NOT NULL
    AND (pt.credit_card_metadata::jsonb->>'purchaseDate') IS NOT NULL
  LIMIT 1
)
WHERE ct.pluggy_transaction_id IS NOT NULL;
