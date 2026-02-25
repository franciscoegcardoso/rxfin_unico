-- Create storage bucket for credit card statements
INSERT INTO storage.buckets (id, name, public)
VALUES ('credit-card-statements', 'credit-card-statements', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Users can upload their own statements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'credit-card-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own statements"
ON storage.objects FOR SELECT
USING (bucket_id = 'credit-card-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own statements"
ON storage.objects FOR DELETE
USING (bucket_id = 'credit-card-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track imported statement files
CREATE TABLE public.credit_card_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  card_id TEXT,
  import_batch_id UUID NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_card_imports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own imports"
ON public.credit_card_imports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imports"
ON public.credit_card_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imports"
ON public.credit_card_imports FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_credit_card_imports_user_id ON public.credit_card_imports(user_id);
CREATE INDEX idx_credit_card_imports_batch_id ON public.credit_card_imports(import_batch_id);