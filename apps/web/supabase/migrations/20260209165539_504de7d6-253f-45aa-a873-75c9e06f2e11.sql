
CREATE OR REPLACE FUNCTION public.save_user_cpf(p_user_id uuid, p_cpf text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clean_cpf text;
  encryption_key text;
BEGIN
  clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  
  IF length(clean_cpf) != 11 THEN
    RAISE EXCEPTION 'CPF deve ter exatamente 11 dígitos';
  END IF;
  
  encryption_key := current_setting('app.settings.service_role_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := p_user_id::text;
  END IF;
  
  UPDATE public.profiles
  SET cpf_encrypted = extensions.pgp_sym_encrypt(clean_cpf, encryption_key),
      updated_at = now()
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_cpf(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encrypted_cpf bytea;
  encryption_key text;
BEGIN
  SELECT cpf_encrypted INTO encrypted_cpf
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF encrypted_cpf IS NULL THEN
    RETURN NULL;
  END IF;
  
  encryption_key := current_setting('app.settings.service_role_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := p_user_id::text;
  END IF;
  
  RETURN extensions.pgp_sym_decrypt(encrypted_cpf, encryption_key);
END;
$function$;
