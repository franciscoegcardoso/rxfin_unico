
-- Adicionar coluna cpf_encrypted na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_encrypted bytea;

-- Função para salvar CPF criptografado
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
  -- Remove formatação (pontos, traços)
  clean_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  
  -- Valida que tem exatamente 11 dígitos
  IF length(clean_cpf) != 11 THEN
    RAISE EXCEPTION 'CPF deve ter exatamente 11 dígitos';
  END IF;
  
  -- Usa SUPABASE_SERVICE_ROLE_KEY como chave de criptografia
  encryption_key := current_setting('app.settings.service_role_key', true);
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- Fallback: usa uma chave derivada do user_id para não falhar
    encryption_key := p_user_id::text;
  END IF;
  
  UPDATE public.profiles
  SET cpf_encrypted = pgp_sym_encrypt(clean_cpf, encryption_key),
      updated_at = now()
  WHERE id = p_user_id;
END;
$function$;

-- Função para recuperar CPF descriptografado
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
  
  RETURN pgp_sym_decrypt(encrypted_cpf, encryption_key);
END;
$function$;
