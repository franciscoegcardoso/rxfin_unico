
-- Add column to track which pluggy transaction originated each credit card transaction
ALTER TABLE public.credit_card_transactions 
  ADD COLUMN IF NOT EXISTS pluggy_transaction_id text UNIQUE;

-- Index for fast duplicate checking during sync
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_pluggy_tx_id 
  ON public.credit_card_transactions (pluggy_transaction_id) 
  WHERE pluggy_transaction_id IS NOT NULL;
