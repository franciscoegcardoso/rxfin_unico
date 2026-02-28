-- Add admin-controlled settings for account type and notifications
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES 
  ('shared_account_enabled', 'false', 'Habilita a funcionalidade de conta compartilhada para os usuários'),
  ('notifications_enabled', 'false', 'Habilita a seção de notificações nas preferências do usuário')
ON CONFLICT (setting_key) DO NOTHING;