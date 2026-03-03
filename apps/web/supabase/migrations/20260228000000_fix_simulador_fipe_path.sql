-- Correção definitiva: path do Simulador FIPE no menu (pages.path)
-- Antes: /simulador-fipe → Depois: /simuladores/veiculos/simulador-fipe
UPDATE public.pages
SET path = '/simuladores/veiculos/simulador-fipe'
WHERE slug = 'simulador-fipe';
