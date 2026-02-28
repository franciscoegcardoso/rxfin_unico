
-- Add status column to credit_card_transactions for PENDING/COMPLETED tracking
ALTER TABLE public.credit_card_transactions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'COMPLETED';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_status 
ON public.credit_card_transactions(status);

-- Create table for Pluggy recurring payments
CREATE TABLE IF NOT EXISTS public.pluggy_recurring_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  description text NOT NULL,
  average_amount numeric NOT NULL DEFAULT 0,
  regularity_score numeric DEFAULT 0,
  frequency text DEFAULT 'monthly',
  last_occurrence_date text,
  next_expected_date text,
  category text,
  account_id text,
  is_active boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pluggy_recurring_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recurring payments"
ON public.pluggy_recurring_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring payments"
ON public.pluggy_recurring_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring payments"
ON public.pluggy_recurring_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring payments"
ON public.pluggy_recurring_payments FOR DELETE
USING (auth.uid() = user_id);

-- Unique constraint to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_pluggy_recurring_unique 
ON public.pluggy_recurring_payments(user_id, item_id, description);

-- Trigger for updated_at
CREATE TRIGGER update_pluggy_recurring_payments_updated_at
BEFORE UPDATE ON public.pluggy_recurring_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
