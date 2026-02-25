
-- Fix: Add owner verification to get_user_cpf to prevent unauthorized CPF access
CREATE OR REPLACE FUNCTION public.get_user_cpf(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cpf text;
BEGIN
  -- Owner verification: only allow users to access their own CPF
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: can only access own CPF';
  END IF;

  SELECT extensions.pgp_sym_decrypt(
    cpf_encrypted,
    current_setting('app.settings.service_role_key')
  ) INTO v_cpf
  FROM public.profiles
  WHERE id = p_user_id
    AND cpf_encrypted IS NOT NULL;

  RETURN v_cpf;
END;
$function$;
