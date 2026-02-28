-- Add friendly_name column to credit_card_transactions table
ALTER TABLE public.credit_card_transactions 
ADD COLUMN IF NOT EXISTS friendly_name text;

-- Add comment for the column
COMMENT ON COLUMN public.credit_card_transactions.friendly_name IS 'User-defined friendly name for the transaction';