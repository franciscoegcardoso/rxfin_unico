
-- Fix SECURITY DEFINER views - set them to SECURITY INVOKER
ALTER VIEW public.v_user_plan SET (security_invoker = on);
ALTER VIEW public.v_lancamentos_full SET (security_invoker = on);
