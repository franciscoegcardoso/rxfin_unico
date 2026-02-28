
-- Clean up duplicate ghost records (card_id IS NULL, no pluggy_transaction_id)
-- These are duplicates of real records that have card_id and pluggy_transaction_id set
DELETE FROM credit_card_transactions
WHERE card_id IS NULL
  AND pluggy_transaction_id IS NULL
  AND EXISTS (
    SELECT 1 FROM credit_card_transactions real
    WHERE real.store_name = credit_card_transactions.store_name
      AND real.transaction_date = credit_card_transactions.transaction_date
      AND real.value = credit_card_transactions.value
      AND real.card_id IS NOT NULL
      AND real.pluggy_transaction_id IS NOT NULL
      AND real.id != credit_card_transactions.id
  );
