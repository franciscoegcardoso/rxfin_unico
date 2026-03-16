-- RPC: save onboarding shared account (conta compartilhada) for the current user.
-- Updates profile account_type and upserts the partner in user_shared_persons.
CREATE OR REPLACE FUNCTION public.save_onboarding_shared_account(
  p_partner_name text,
  p_partner_email text DEFAULT NULL,
  p_access_level text DEFAULT NULL,
  p_has_rxfin_access boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 1. Set account type to shared
  UPDATE public.profiles
  SET account_type = 'shared'
  WHERE id = v_user_id;

  -- 2. Replace existing shared person(s) for this user with a single partner row (onboarding: one partner)
  DELETE FROM public.user_shared_persons
  WHERE user_id = v_user_id;

  INSERT INTO public.user_shared_persons (user_id, name, email, is_owner)
  VALUES (v_user_id, TRIM(p_partner_name), NULLIF(TRIM(COALESCE(p_partner_email, '')), ''), false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_onboarding_shared_account(text, text, text, boolean) TO authenticated;
