-- 1. Insert missing 'minha-conta' page record
INSERT INTO public.pages (slug, title, path, icon, access_level, is_active_users, show_when_unavailable, group_id, order_in_group)
VALUES ('minha-conta', 'Minha Conta', '/minha-conta', 'UserCog', 'free', true, true, 'cc820566-3d75-461c-ae78-f218d06ebc7a', 1);

-- 2. Delete orphan record: 'perfil' (route is just a redirect to /minha-conta)
DELETE FROM public.pages WHERE slug = 'perfil';

-- 3. Delete orphan record: 'politica-privacidade' (served by LegalDocument.tsx, not a standalone page)
DELETE FROM public.pages WHERE slug = 'politica-privacidade';

-- 4. Delete orphan record: 'simulador-carro-alternativas' (no corresponding file exists)
DELETE FROM public.pages WHERE slug = 'simulador-carro-alternativas';