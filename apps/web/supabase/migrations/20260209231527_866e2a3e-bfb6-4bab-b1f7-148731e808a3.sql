UPDATE credit_card_transactions cct
SET card_id = pt.account_id
FROM pluggy_transactions pt
WHERE cct.pluggy_transaction_id = pt.pluggy_transaction_id
  AND cct.pluggy_transaction_id IS NOT NULL
  AND (cct.card_id IS NULL OR cct.card_id = '');