
-- Fix infinite recursion: replace self-referencing policy with is_admin() function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Clean up duplicate SELECT policies (keep "Users can view own profile")
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Clean up duplicate UPDATE policies (keep "Users can update own profile")
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Clean up redundant UPDATE policy
DROP POLICY IF EXISTS "Usuarios podem atualizar o proprio onboarding" ON public.profiles;
