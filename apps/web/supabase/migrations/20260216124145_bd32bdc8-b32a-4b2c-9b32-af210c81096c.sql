-- Update app_settings routes to redirect to /inicio
UPDATE public.app_settings 
SET setting_value = '"/inicio"', updated_at = now()
WHERE setting_key = 'returning_user_route';

UPDATE public.app_settings 
SET setting_value = '"/inicio"', updated_at = now()
WHERE setting_key = 'onboarding_skip_route';

UPDATE public.app_settings 
SET setting_value = '"/inicio"', updated_at = now()
WHERE setting_key = 'coming_soon_fallback_route';

-- Insert if they don't exist yet
INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES 
  ('returning_user_route', '"/inicio"', now()),
  ('onboarding_skip_route', '"/inicio"', now()),
  ('coming_soon_fallback_route', '"/inicio"', now())
ON CONFLICT (setting_key) DO NOTHING;