-- Add marketing preferences column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT true;

-- Add onboarding_type setting to control which onboarding flow to use
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES ('onboarding_type', '"simple"', 'Tipo de onboarding: simple (uma página) ou complete (fluxo completo)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;