-- Inserir configuração da rota de fallback para páginas bloqueadas
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES (
  'coming_soon_fallback_route',
  '"/simuladores"',
  'Rota de fallback para o botão "Ir para Início" na página de funcionalidades em construção'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();