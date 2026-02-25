-- Conceder papel de admin para o usuário principal franciscoegcardoso@gmail.com
INSERT INTO public.user_roles (user_id, role, workspace_owner_id)
VALUES (
  'd983e140-3bc8-4138-8df4-6bca9a7decb8',  -- user_id
  'admin',                                   -- role
  'd983e140-3bc8-4138-8df4-6bca9a7decb8'   -- workspace_owner_id (é o próprio usuário)
);