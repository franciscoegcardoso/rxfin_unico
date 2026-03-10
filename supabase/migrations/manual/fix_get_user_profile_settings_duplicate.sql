-- =============================================================================
-- Corrigir duplicata: várias funções get_user_profile_settings()
-- Erro: "function get_user_profile_settings() is not unique"
-- =============================================================================
-- Execute no SQL Editor do Supabase, em 2 passos.
-- =============================================================================

-- PASSO 1: Listar todas as funções com esse nome (ver assinaturas)
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_catalog.format_type(p.prorettype, NULL) AS return_type
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_user_profile_settings'
ORDER BY n.nspname, p.proname;

-- PASSO 2: Dropar TODAS as sobrecargas (cada assinatura separadamente).
-- Cole e execute cada linha que fizer sentido conforme o resultado do PASSO 1.
-- Função sem argumentos (retorno JSONB):
DROP FUNCTION IF EXISTS public.get_user_profile_settings() CASCADE;
-- Se existir versão com 1 argumento (ex.: user_id):
DROP FUNCTION IF EXISTS public.get_user_profile_settings(uuid) CASCADE;
-- Outras assinaturas possíveis (descomente se o PASSO 1 mostrar):
-- DROP FUNCTION IF EXISTS public.get_user_profile_settings(text) CASCADE;

-- PASSO 3: Recriar a função única (retorno esperado: { "profile": { "onboarding_completed": ..., "onboarding_completed_at": ... } })
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

GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_settings() TO anon;

-- Testar (anon): deve retornar uma linha com {"profile": null}
-- SELECT public.get_user_profile_settings();
-- =============================================================================
