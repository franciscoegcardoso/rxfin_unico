-- Corrigir páginas com planos inválidos

-- 1. Mudar 'premium' para 'basic' (Econograph, Gestão de Veículos, Meu IR)
UPDATE pages SET 
  min_plan_slug = 'basic',
  updated_at = now()
WHERE min_plan_slug = 'premium';

-- 2. Mudar 'admin' para 'pro' na página de administração
UPDATE pages SET 
  min_plan_slug = 'pro',
  updated_at = now()
WHERE min_plan_slug = 'admin';