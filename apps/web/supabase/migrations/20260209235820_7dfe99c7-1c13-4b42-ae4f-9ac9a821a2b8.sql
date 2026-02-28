-- Add pluggy_bill_id to pluggy_transactions to track which Pluggy bill each transaction belongs to
ALTER TABLE public.pluggy_transactions
ADD COLUMN IF NOT EXISTS pluggy_bill_id text;

-- Add credit_card_metadata to store installment info from Pluggy
ALTER TABLE public.pluggy_transactions
ADD COLUMN IF NOT EXISTS credit_card_metadata jsonb;