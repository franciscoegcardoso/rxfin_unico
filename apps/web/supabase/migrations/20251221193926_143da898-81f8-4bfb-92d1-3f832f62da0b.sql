-- Add installment tracking and recurring transaction fields to credit_card_transactions
ALTER TABLE public.credit_card_transactions
ADD COLUMN IF NOT EXISTS installment_current integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installment_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_group_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installment_group_id uuid DEFAULT NULL;

-- Create index for performance on installment and recurring queries
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_installment 
ON public.credit_card_transactions (user_id, installment_group_id) 
WHERE installment_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_recurring 
ON public.credit_card_transactions (user_id, is_recurring) 
WHERE is_recurring = true;

-- Add comments for documentation
COMMENT ON COLUMN public.credit_card_transactions.installment_current IS 'Current installment number (e.g., 2 in 2/12)';
COMMENT ON COLUMN public.credit_card_transactions.installment_total IS 'Total number of installments (e.g., 12 in 2/12)';
COMMENT ON COLUMN public.credit_card_transactions.is_recurring IS 'Whether this is a recurring/subscription transaction';
COMMENT ON COLUMN public.credit_card_transactions.recurring_group_id IS 'Groups recurring transactions from the same subscription';
COMMENT ON COLUMN public.credit_card_transactions.installment_group_id IS 'Groups all installments from the same purchase';