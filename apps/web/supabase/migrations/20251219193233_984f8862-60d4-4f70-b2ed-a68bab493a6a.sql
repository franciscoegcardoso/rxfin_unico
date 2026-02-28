-- Create storage bucket for fiscal receipts (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ir-comprovantes', 
  'ir-comprovantes', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS policies for ir-comprovantes bucket
CREATE POLICY "Users can view their own comprovantes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ir-comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own comprovantes files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ir-comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own comprovantes files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ir-comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own comprovantes files"
ON storage.objects FOR DELETE
USING (bucket_id = 'ir-comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);