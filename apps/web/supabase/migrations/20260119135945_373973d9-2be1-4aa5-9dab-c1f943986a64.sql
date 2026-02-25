-- Create storage bucket for insurance policy documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('seguros-apolices', 'seguros-apolices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "Users can upload their own insurance policies"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'seguros-apolices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own insurance policies"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'seguros-apolices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own insurance policies"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'seguros-apolices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add file columns to seguros table
ALTER TABLE public.seguros
ADD COLUMN IF NOT EXISTS arquivo_path TEXT,
ADD COLUMN IF NOT EXISTS arquivo_nome TEXT;