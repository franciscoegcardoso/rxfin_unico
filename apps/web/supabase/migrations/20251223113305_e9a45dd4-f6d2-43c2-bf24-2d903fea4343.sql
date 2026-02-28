-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-contas', 'comprovantes-contas', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for comprovantes-contas bucket
CREATE POLICY "Users can upload their own comprovantes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes-contas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own comprovantes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes-contas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own comprovantes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'comprovantes-contas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);