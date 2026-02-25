-- Conceder papel de admin para o usuário principal franciscoegcardoso@gmail.com
INSERT INTO public.user_roles (user_id, role, workspace_owner_id)
VALUES (
  'b9414650-22c0-46f0-b757-351e6518decb',  -- user_id
  'admin',                                   -- role
  'b9414650-22c0-46f0-b757-351e6518decb'   -- workspace_owner_id (é o próprio usuário)
);