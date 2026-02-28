
-- Etapa 5: Re-link orphan credit_card_transactions using pluggy_bill_id from pluggy_transactions
-- This matches transactions by pluggy_transaction_id and uses the authoritative bill_id

UPDATE credit_card_transactions ct
SET credit_card_bill_id = pt.bill_id
FROM pluggy_transactions pt
WHERE ct.pluggy_transaction_id = pt.pluggy_transaction_id
  AND pt.bill_id IS NOT NULL
  AND ct.credit_card_bill_id IS NULL;
