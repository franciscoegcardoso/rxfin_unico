-- =====================================================
-- MIGRATION: Inserir Page Groups e Pages
-- =====================================================

-- 1. INSERIR GRUPOS DE PÁGINAS
INSERT INTO page_groups (slug, name, icon, order_index, is_collapsible) VALUES
('menu-principal', 'Menu Principal', 'Home', 0, true),
('lancamentos', 'Lançamentos', 'ArrowLeftRight', 1, true),
('planejamento', 'Planejamento', 'CalendarRange', 2, true),
('simuladores', 'Simuladores', 'Calculator', 3, true),
('configuracoes', 'Configurações', 'Settings', 4, true),
('administracao', 'Administração', 'ShieldCheck', 5, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_collapsible = EXCLUDED.is_collapsible,
  updated_at = now();

-- 2. INSERIR PÁGINAS PÚBLICAS (sem grupo)
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category) VALUES
('landing', '/', 'Landing Page', 'Rocket', 'public', true, true, 0, 'free', 'public'),
('login', '/login', 'Login', 'LogIn', 'public', true, true, 1, 'free', 'auth'),
('signup', '/signup', 'Cadastro', 'UserPlus', 'public', true, true, 2, 'free', 'auth'),
('reset-password', '/reset-password', 'Recuperar Senha', 'Key', 'public', true, true, 3, 'free', 'auth'),
('update-password', '/update-password', 'Atualizar Senha', 'Key', 'public', true, true, 4, 'free', 'auth'),
('verificar-email', '/verificar-email', 'Verificar Email', 'Mail', 'public', true, true, 5, 'free', 'auth'),
('termos-de-uso', '/termos-de-uso', 'Termos de Uso', 'FileText', 'public', true, true, 6, 'free', 'legal'),
('politica-privacidade', '/politica-privacidade', 'Política de Privacidade', 'Shield', 'public', true, true, 7, 'free', 'legal'),
('simulador-fipe', '/simulador-fipe', 'Simulador FIPE', 'Car', 'public', true, true, 8, 'free', 'simuladores')
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  access_level = EXCLUDED.access_level,
  is_active_users = EXCLUDED.is_active_users,
  is_active_admin = EXCLUDED.is_active_admin,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  category = EXCLUDED.category,
  updated_at = now();

-- 3. INSERIR PÁGINAS DO MENU PRINCIPAL
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'free'::text, true, true, v.order_idx, v.min_plan, 'menu-principal', pg.id, v.order_in_grp
FROM (VALUES
  ('inicio', '/inicio', 'Início', 'Home', 10, 'free', 0),
  ('dashboard', '/dashboard', 'Dashboard', 'LayoutDashboard', 11, 'free', 1),
  ('parametros', '/parametros', 'Parâmetros', 'Sliders', 12, 'free', 2),
  ('perfil', '/perfil', 'Meu Perfil', 'User', 13, 'free', 3),
  ('planos', '/planos', 'Planos', 'CreditCard', 14, 'free', 4)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'menu-principal'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();

-- 4. INSERIR PÁGINAS DE LANÇAMENTOS
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'free'::text, true, true, v.order_idx, v.min_plan, 'lancamentos', pg.id, v.order_in_grp
FROM (VALUES
  ('lancamentos', '/lancamentos', 'Lançamentos', 'Receipt', 20, 'free', 0),
  ('contas', '/contas', 'Contas a Pagar/Receber', 'Wallet', 21, 'basic', 1),
  ('fluxo-financeiro', '/fluxo-financeiro', 'Fluxo Financeiro', 'TrendingUp', 22, 'basic', 2),
  ('bens-investimentos', '/bens-investimentos', 'Bens e Investimentos', 'PiggyBank', 23, 'basic', 3),
  ('gestao-veiculos', '/gestao-veiculos', 'Gestão de Veículos', 'Car', 24, 'premium', 4),
  ('seguros', '/seguros', 'Seguros', 'Shield', 25, 'basic', 5)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'lancamentos'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();

-- 5. INSERIR PÁGINAS DE PLANEJAMENTO
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'free'::text, true, true, v.order_idx, v.min_plan, 'planejamento', pg.id, v.order_in_grp
FROM (VALUES
  ('planejamento', '/planejamento', 'Planejamento Mensal', 'Calendar', 30, 'free', 0),
  ('planejamento-anual', '/planejamento-anual', 'Planejamento Anual', 'CalendarRange', 31, 'basic', 1),
  ('metas-mensais', '/metas-mensais', 'Metas Mensais', 'Target', 32, 'basic', 2),
  ('registro-compras', '/registro-compras', 'Registro de Compras', 'ShoppingCart', 33, 'basic', 3),
  ('pacotes-orcamento', '/pacotes-orcamento', 'Pacotes de Orçamento', 'Package', 34, 'basic', 4),
  ('sonhos', '/sonhos', 'Sonhos', 'Star', 35, 'basic', 5),
  ('presentes', '/presentes', 'Presentes', 'Gift', 36, 'basic', 6),
  ('meu-ir', '/meu-ir', 'Meu IR', 'FileText', 37, 'premium', 7)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'planejamento'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();

-- 6. INSERIR PÁGINAS DE SIMULADORES
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'free'::text, true, true, v.order_idx, v.min_plan, 'simuladores', pg.id, v.order_in_grp
FROM (VALUES
  ('simuladores', '/simuladores', 'Hub de Simuladores', 'Calculator', 40, 'free', 0),
  ('simulador-financiamento', '/simulador-financiamento', 'Simulador Financiamento', 'Building', 41, 'basic', 1),
  ('simulador-custo-hora', '/simulador-custo-hora', 'Simulador Custo Hora', 'Clock', 42, 'basic', 2),
  ('simulador-custo-oportunidade-carro', '/simulador-custo-oportunidade-carro', 'Custo Oportunidade Carro', 'TrendingDown', 43, 'basic', 3),
  ('simulador-comparativo-carro', '/simulador-comparativo-carro', 'Comparativo de Carros', 'BarChart2', 44, 'basic', 4),
  ('simulador-carro-ab', '/simulador-carro-ab', 'Carro A vs B', 'ArrowLeftRight', 45, 'basic', 5),
  ('simulador-desconto-justo', '/simulador-desconto-justo', 'Desconto Justo', 'Percent', 46, 'basic', 6),
  ('econograph', '/econograph', 'EconoGraph', 'LineChart', 47, 'premium', 7)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'simuladores'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();

-- 7. INSERIR PÁGINAS DE CONFIGURAÇÕES
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'free'::text, true, true, v.order_idx, v.min_plan, 'configuracoes', pg.id, v.order_in_grp
FROM (VALUES
  ('configuracoes', '/configuracoes', 'Configurações', 'Settings', 50, 'free', 0),
  ('configuracoes-hub', '/configuracoes-hub', 'Hub Configurações', 'LayoutGrid', 51, 'free', 1),
  ('configuracoes-fiscais', '/configuracoes-fiscais', 'Configurações Fiscais', 'FileText', 52, 'basic', 2),
  ('instituicoes-financeiras', '/instituicoes-financeiras', 'Instituições Financeiras', 'Building2', 53, 'free', 3)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'configuracoes'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();

-- 8. INSERIR PÁGINAS DE ADMINISTRAÇÃO
INSERT INTO pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group) 
SELECT 
  v.slug, v.path, v.title, v.icon, 'admin'::text, false, true, v.order_idx, v.min_plan, 'administracao', pg.id, v.order_in_grp
FROM (VALUES
  ('admin', '/admin', 'Painel Admin', 'ShieldCheck', 60, 'admin', 0)
) AS v(slug, path, title, icon, order_idx, min_plan, order_in_grp)
CROSS JOIN page_groups pg WHERE pg.slug = 'administracao'
ON CONFLICT (slug) DO UPDATE SET
  path = EXCLUDED.path,
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  access_level = EXCLUDED.access_level,
  is_active_users = EXCLUDED.is_active_users,
  order_index = EXCLUDED.order_index,
  min_plan_slug = EXCLUDED.min_plan_slug,
  group_id = EXCLUDED.group_id,
  order_in_group = EXCLUDED.order_in_group,
  updated_at = now();