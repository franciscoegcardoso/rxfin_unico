-- Storage policies for ir-imports bucket (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload IR files' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload IR files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ir-imports' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view IR files' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can view IR files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ir-imports' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete IR files' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete IR files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ir-imports' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END
$$;