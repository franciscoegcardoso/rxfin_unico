-- Passo 4: Inserir/atualizar página Passivos no menu principal (executar no Supabase SQL Editor ou Admin > Páginas)
INSERT INTO pages (slug, title, path, icon, access_level, is_active_users, show_when_unavailable, order_in_group, group_id)
SELECT
  'passivos',
  'Passivos',
  '/passivos',
  'wallet',
  'free',
  true,
  true,
  3,
  g.id
FROM page_groups g
WHERE g.slug = 'menu-principal'
ON CONFLICT (slug) DO UPDATE SET
  path = '/passivos',
  title = 'Passivos',
  icon = 'wallet',
  is_active_users = true;
