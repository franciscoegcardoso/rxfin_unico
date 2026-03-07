-- Controles: Gestão de Veículos como primeiro item (acima de Registro de Compras).
-- Ordem: 0 Gestão de Veículos, 1 Registro de Compras, 2 Recorrentes, 3 Contas.

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1),
  order_in_group = 0,
  title = 'Gestão de Veículos',
  path = '/gestao-veiculos',
  is_active_users = true
WHERE slug = 'gestao-veiculos';

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1),
  order_in_group = 1,
  title = 'Registro de Compras',
  path = '/registro-compras',
  is_active_users = true
WHERE slug = 'registro-compras';

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1),
  order_in_group = 2
WHERE slug = 'recorrentes';

UPDATE public.pages
SET order_in_group = 3
WHERE slug = 'contas' AND group_id = (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1);
