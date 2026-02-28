-- Fix search_path on calcular_variacao_fipe to resolve Supabase linter warning
ALTER FUNCTION public.calcular_variacao_fipe(text) SET search_path = public;