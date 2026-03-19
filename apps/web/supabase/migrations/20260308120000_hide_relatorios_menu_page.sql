-- Página /relatorios não existe na app; remove do menu (Planejamento) desativando a linha em `pages`.
-- Idempotente: se o slug/path não existir, 0 linhas afetadas.

UPDATE public.pages
SET
  is_active_users = false,
  is_active_admin = false,
  show_when_unavailable = false
WHERE slug = 'relatorios'
   OR path IN ('/relatorios', 'relatorios');
