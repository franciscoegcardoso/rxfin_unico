-- Inserir configurações de onboarding e rotas pós-autenticação
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES 
  ('onboarding_enabled', 'true', 'Se habilitado, novos usuários passam pelo onboarding no primeiro login'),
  ('first_login_route', '"/onboarding"', 'Rota para onde novos usuários são redirecionados no primeiro login (quando onboarding habilitado)'),
  ('returning_user_route', '"/inicio"', 'Rota para onde usuários recorrentes são redirecionados após login'),
  ('onboarding_skip_route', '"/inicio"', 'Rota para onde o usuário vai se pular o onboarding')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();