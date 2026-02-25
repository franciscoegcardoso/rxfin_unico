-- Create storage bucket for temporary IR file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('ir-imports', 'ir-imports', false);

-- RLS policy: users can only upload their own files
CREATE POLICY "Users can upload their own IR files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ir-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: users can only read their own files
CREATE POLICY "Users can read their own IR files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ir-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: users can delete their own files
CREATE POLICY "Users can delete their own IR files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ir-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Table to store imported IR data history
CREATE TABLE public.ir_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ano_exercicio INTEGER NOT NULL,
  ano_calendario INTEGER NOT NULL,
  bens_direitos JSONB DEFAULT '[]'::jsonb,
  rendimentos_tributaveis JSONB DEFAULT '[]'::jsonb,
  rendimentos_isentos JSONB DEFAULT '[]'::jsonb,
  dividas JSONB DEFAULT '[]'::jsonb,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_type TEXT NOT NULL CHECK (source_type IN ('xml', 'pdf')),
  UNIQUE(user_id, ano_exercicio)
);

-- Enable RLS
ALTER TABLE public.ir_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own IR imports"
ON public.ir_imports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IR imports"
ON public.ir_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IR imports"
ON public.ir_imports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IR imports"
ON public.ir_imports FOR DELETE
USING (auth.uid() = user_id);