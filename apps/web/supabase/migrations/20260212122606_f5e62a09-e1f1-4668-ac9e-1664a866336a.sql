
-- Add reconciliation columns to credit_card_bills
ALTER TABLE public.credit_card_bills 
  ADD COLUMN IF NOT EXISTS requires_manual_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_source text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.credit_card_bills.requires_manual_check IS 'True when bill could not be automatically reconciled';
COMMENT ON COLUMN public.credit_card_bills.payment_source IS 'Source of payment confirmation: pluggy_api, bank_statement, manual';
