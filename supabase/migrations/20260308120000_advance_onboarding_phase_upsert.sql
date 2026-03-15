-- Garantir que advance_onboarding_phase aceita qualquer transição (ex.: not_started -> block_a_done).
-- Evita "Erro ao avançar etapa" quando o usuário completa o Block A sem ter passado por 'started'.

CREATE OR REPLACE FUNCTION public.advance_onboarding_phase(new_phase text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_state (user_id, onboarding_phase)
  VALUES (auth.uid(), new_phase)
  ON CONFLICT (user_id)
  DO UPDATE SET onboarding_phase = new_phase;
END;
$$;
