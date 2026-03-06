-- =====================================================
-- FASE 5: Menu canônico — page_groups e pages
-- Alinha o banco à estrutura da Fase 1:
-- Menu principal: Início, Bens e Investimentos, Lançamentos
-- Grupos: Planejamento, Controles, Simuladores, Configurações (e Administração)
-- =====================================================

-- 1. Garantir ordem dos page_groups (slug → order_index)
-- menu-principal 0, lancamentos 1, controles 2, planejamento 3, simuladores 4, configuracoes 5, administracao 6
UPDATE public.page_groups SET order_index = 0 WHERE slug = 'menu-principal';
UPDATE public.page_groups SET order_index = 1 WHERE slug = 'lancamentos';
UPDATE public.page_groups SET order_index = 2 WHERE slug = 'controles';
UPDATE public.page_groups SET order_index = 3 WHERE slug = 'planejamento';
UPDATE public.page_groups SET order_index = 4 WHERE slug = 'simuladores';
UPDATE public.page_groups SET order_index = 5 WHERE slug = 'configuracoes';
UPDATE public.page_groups SET order_index = 6 WHERE slug = 'administracao';

-- Garantir que o grupo "controles" exista (idempotente)
INSERT INTO public.page_groups (name, slug, icon, order_index, is_collapsible)
SELECT 'Controles', 'controles', 'ClipboardList', 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.page_groups WHERE slug = 'controles');
-- Re-aplicar ordem caso o insert tenha criado o grupo
UPDATE public.page_groups SET order_index = 2 WHERE slug = 'controles';

-- 2. Menu principal: apenas 3 itens — Início, Bens e Investimentos, Lançamentos
-- 2.1 Início no menu principal, ordem 0, título "Início"
UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'menu-principal' LIMIT 1),
  order_in_group = 0,
  title = 'Início',
  is_active_users = true
WHERE slug = 'inicio';

-- 2.2 Bens e Investimentos no menu principal, ordem 1
UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'menu-principal' LIMIT 1),
  order_in_group = 1,
  title = 'Bens e Investimentos',
  is_active_users = true
WHERE slug = 'bens-investimentos';

-- 2.3 Lançamentos no menu principal, ordem 2
UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'menu-principal' LIMIT 1),
  order_in_group = 2,
  title = 'Lançamentos',
  is_active_users = true
WHERE slug = 'lancamentos';

-- 2.4 Itens que não devem aparecer como principais: esconder do menu principal (não remover do grupo)
UPDATE public.pages
SET is_active_users = false
WHERE slug IN ('dashboard', 'parametros', 'planos') AND group_id = (SELECT id FROM public.page_groups WHERE slug = 'menu-principal' LIMIT 1);

-- 3. Grupo Controles: Recorrentes e Contas a pagar/receber
-- 3.1 Página Recorrentes (inserir se não existir)
INSERT INTO public.pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group)
SELECT 'recorrentes', '/recorrentes', 'Recorrentes', 'Receipt', 'free', true, true, 0, 'free', 'controles',
  (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1), 0
WHERE NOT EXISTS (SELECT 1 FROM public.pages WHERE slug = 'recorrentes');

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'controles' LIMIT 1),
  order_in_group = 1,
  title = 'Contas a pagar/receber',
  is_active_users = true
WHERE slug = 'contas';

-- 4. Grupo Planejamento: títulos e ordem (Meu IR vai para Configurações)
UPDATE public.pages SET title = 'Planejamento Mensal', order_in_group = 0 WHERE slug = 'planejamento';
UPDATE public.pages SET title = 'Planejamento Anual', order_in_group = 1 WHERE slug = 'planejamento-anual';
UPDATE public.pages SET title = 'Metas Mensais', order_in_group = 2 WHERE slug = 'metas-mensais';

-- 5. Grupo Simuladores: Hub e Simulador FIPE (path canônico)
UPDATE public.pages
SET
  title = 'Hub Simuladores',
  path = '/simuladores',
  order_in_group = 0,
  is_active_users = true
WHERE slug = 'simuladores';

UPDATE public.pages
SET
  title = 'Simulador FIPE',
  path = '/simuladores/veiculos/simulador-fipe',
  order_in_group = 1,
  is_active_users = true
WHERE slug = 'simulador-fipe';

-- 6. Grupo Configurações: Minha Conta, Assinatura, Meu IR (estrutura canônica Fase 1)
-- 6.1 Minha Conta em configuracoes, ordem 0
UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'configuracoes' LIMIT 1),
  order_in_group = 0,
  title = 'Minha Conta',
  path = '/minha-conta',
  is_active_users = true
WHERE slug = 'minha-conta';

-- 6.2 Assinatura (página que aponta para /planos); inserir se não existir
INSERT INTO public.pages (slug, path, title, icon, access_level, is_active_users, is_active_admin, order_index, min_plan_slug, category, group_id, order_in_group)
SELECT 'assinatura', '/planos', 'Assinatura', 'Crown', 'free', true, true, 0, 'free', 'configuracoes',
  (SELECT id FROM public.page_groups WHERE slug = 'configuracoes' LIMIT 1), 1
WHERE NOT EXISTS (SELECT 1 FROM public.pages WHERE slug = 'assinatura');

UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'configuracoes' LIMIT 1),
  order_in_group = 1,
  title = 'Assinatura',
  path = '/planos',
  is_active_users = true
WHERE slug = 'assinatura';

-- 6.3 Meu IR em configuracoes, ordem 2 (mover de planejamento se estiver lá)
UPDATE public.pages
SET
  group_id = (SELECT id FROM public.page_groups WHERE slug = 'configuracoes' LIMIT 1),
  order_in_group = 2,
  title = 'Meu IR',
  path = '/meu-ir',
  is_active_users = true
WHERE slug = 'meu-ir';
