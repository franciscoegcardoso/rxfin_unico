
-- Cleanup: delete orphaned credit_card_bills where card_id has no matching institution or active pluggy account
DELETE FROM credit_card_bills
WHERE card_id IN ('80558d05-9e17-4356-bfd5-c5a3f7225b5f', '06a84124-2da2-4070-b01f-12f18999f62f')
AND NOT EXISTS (
  SELECT 1 FROM user_financial_institutions ufi WHERE ufi.id::text = credit_card_bills.card_id
)
AND NOT EXISTS (
  SELECT 1 FROM pluggy_accounts pa WHERE pa.id::text = credit_card_bills.card_id AND pa.deleted_at IS NULL
);
