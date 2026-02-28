-- Create monthly_goals table for budget goals tracking
CREATE TABLE public.monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  
  -- Consolidated goals (stored in cents)
  income_goal BIGINT DEFAULT 0,
  expense_goal BIGINT DEFAULT 0,
  savings_goal BIGINT DEFAULT 0,
  credit_card_goal BIGINT DEFAULT 0,
  
  -- Base calculation settings
  calculation_base VARCHAR(20) DEFAULT 'avg_3_months', -- avg_1_month, avg_3_months, avg_6_months, avg_12_months
  challenge_percent DECIMAL(5,2) DEFAULT 0, -- Ex: -10 = challenge to reduce 10%
  
  -- Goals per item (JSON for flexibility)
  -- Structure: { "item_id": { "goal": 50000, "challenge": -5, "payment_breakdown": { "credit_card": 80, "pix": 20 } } }
  item_goals JSONB DEFAULT '{}',
  
  -- Goals per payment method (JSON)
  -- Structure: { "credit_card": 650000, "pix": 200000, "debit_card": 100000 }
  payment_method_goals JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_month UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
ON public.monthly_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
ON public.monthly_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.monthly_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.monthly_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_goals_updated_at
BEFORE UPDATE ON public.monthly_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();