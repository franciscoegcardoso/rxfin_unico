-- Add image_url column to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for plan images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('plan-assets', 'plan-assets', true, 2097152) -- 2MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage policies for plan-assets bucket
-- Everyone can view plan images (public bucket)
CREATE POLICY "Plan images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'plan-assets');

-- Only admins can upload plan images
CREATE POLICY "Only admins can upload plan images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'plan-assets' AND is_admin(auth.uid()));

-- Only admins can update plan images
CREATE POLICY "Only admins can update plan images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'plan-assets' AND is_admin(auth.uid()));

-- Only admins can delete plan images
CREATE POLICY "Only admins can delete plan images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'plan-assets' AND is_admin(auth.uid()));

-- Add comment explaining the field
COMMENT ON COLUMN public.subscription_plans.image_url IS 'URL da imagem personalizada do plano. Formatos aceitos: PNG, JPG, WEBP. Tamanho recomendado: 512x512px. Máximo: 2MB.';