-- Add user type and principal_user_id columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'principal' 
CHECK (user_type IN ('principal', 'convidado'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS principal_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for faster lookups of guests by principal
CREATE INDEX IF NOT EXISTS idx_profiles_principal_user_id ON public.profiles(principal_user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.user_type IS 'Tipo de usuário: principal (paga a conta) ou convidado (conta compartilhada)';
COMMENT ON COLUMN public.profiles.principal_user_id IS 'ID do usuário principal para convidados (máximo 3 por principal no plano rxpro)';