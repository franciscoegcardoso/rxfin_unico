INSERT INTO pages (title, slug, path, icon, group_id, order_in_group, access_level, is_active_users, is_active_admin)
VALUES (
  'Financeiro',
  'financeiro',
  '/financeiro/planos',
  'Wallet',
  'cc820566-3d75-461c-ae78-f218d06ebc7a',
  53,
  'free',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  is_active_users = EXCLUDED.is_active_users,
  is_active_admin = EXCLUDED.is_active_admin;

UPDATE pages SET order_in_group = 54 WHERE slug = 'instituicoes-financeiras';
UPDATE pages SET order_in_group = 55 WHERE slug = 'configuracoes-fiscais';