-- Fase 3.3: RPC get_user_profile_settings para auth/onboarding.
-- Retorno esperado pelo frontend: { profile: { onboarding_completed?: boolean | null } }.

CREATE OR REPLACE FUNCTION public.get_user_profile_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  p_ready BOOLEAN;
  p_completed_at TIMESTAMPTZ;
BEGIN
  uid := auth.uid();
  -- Sempre retorna um objeto JSON (nunca NULL): anon → profile null, auth → profile com campos
  IF uid IS NULL THEN
    RETURN jsonb_build_object('profile', null);
  END IF;

  SELECT p.onboarding_completed, p.onboarding_completed_at
  INTO p_ready, p_completed_at
  FROM public.profiles p
  WHERE p.id = uid
  LIMIT 1;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'onboarding_completed', p_ready,
      'onboarding_completed_at', p_completed_at
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('profile', null);
END;
$$;

COMMENT ON FUNCTION public.get_user_profile_settings() IS 'Returns current user profile settings (onboarding_completed) for ProtectedRoute and onboarding flows.';

GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO anon;
