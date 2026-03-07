-- Meu IR: mover para o grupo Planejamento, após Planejamento Anual (order_in_group = 2).
-- Metas Mensais passa a ser order_in_group = 3.

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'planejamento' LIMIT 1),
  order_in_group = 2,
  title = 'Meu IR',
  path = '/meu-ir',
  is_active_users = true
WHERE slug = 'meu-ir';

-- Metas Mensais após Meu IR
UPDATE public.pages
SET order_in_group = 3
WHERE slug = 'metas-mensais' AND group_id = (SELECT id FROM public.page_groups WHERE slug = 'planejamento' LIMIT 1);
