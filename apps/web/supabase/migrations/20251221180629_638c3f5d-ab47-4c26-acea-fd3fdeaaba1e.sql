-- Create table for imported credit card transactions
CREATE TABLE public.credit_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  category TEXT DEFAULT 'Não atribuído',
  category_id TEXT DEFAULT 'outros',
  is_category_confirmed BOOLEAN DEFAULT false,
  ai_suggested_category TEXT,
  ai_suggested_category_id TEXT,
  card_id TEXT,
  import_batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own transactions" 
ON public.credit_card_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.credit_card_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.credit_card_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.credit_card_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_credit_card_transactions_updated_at
BEFORE UPDATE ON public.credit_card_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();