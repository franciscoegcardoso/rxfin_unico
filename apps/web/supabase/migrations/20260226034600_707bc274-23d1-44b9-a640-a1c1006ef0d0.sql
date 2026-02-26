
-- CRM Automations table
CREATE TABLE public.crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_description TEXT NOT NULL,
  action_description TEXT NOT NULL,
  delay TEXT NOT NULL DEFAULT 'Imediato',
  channels TEXT[] NOT NULL DEFAULT '{Email}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  icon_name TEXT NOT NULL DEFAULT 'Zap',
  icon_color TEXT NOT NULL DEFAULT 'text-primary',
  n8n_workflow_id TEXT,
  n8n_workflow_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read automations"
  ON public.crm_automations FOR SELECT TO authenticated
  USING (public.is_admin((select auth.uid())));

CREATE POLICY "Admins can manage automations"
  ON public.crm_automations FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- Seed existing rules
INSERT INTO public.crm_automations (name, trigger_description, action_description, delay, channels, is_active, icon_name, icon_color, sort_order)
VALUES
  ('Boas-vindas', 'Novo cadastro (status = ''lead'')', 'Enviar email de boas-vindas', 'Imediato', '{Email}', true, 'UserPlus', 'text-primary', 1),
  ('Nudge Onboarding', 'Status = ''onboarding'' há mais de 3 dias', 'Enviar email "Complete seu perfil"', '3 dias', '{Email,Push}', true, 'Compass', 'text-amber-500', 2),
  ('Ativação Pluggy', 'Status = ''ativo'' sem contas Pluggy conectadas', 'Enviar email "Conecte seu banco"', '1 dia após ativação', '{Email}', true, 'Plug', 'text-emerald-500', 3),
  ('Upgrade Trial', 'Status = ''trial'' há mais de 7 dias + score > 30', 'Enviar oferta de upgrade', '7 dias', '{Email}', true, 'TrendingUp', 'text-blue-500', 4),
  ('Alerta de Risco', 'Sem login há 14 dias', 'Enviar email "Sentimos sua falta" + Notificar admin', '14 dias sem login', '{Email,Push,Admin Alert}', true, 'AlertTriangle', 'text-orange-500', 5),
  ('Reconquista', 'Status = ''churned'' há mais de 30 dias', 'Enviar oferta especial de retorno', '30 dias', '{Email}', true, 'RefreshCw', 'text-teal-500', 6),
  ('Google Ads Conversion', 'Usuário com gclid faz upgrade para plano pago', 'Enviar offline conversion para Google Ads', 'Imediato', '{API}', false, 'Globe', 'text-muted-foreground', 7),
  ('Meta CAPI Conversion', 'Usuário com fbclid faz upgrade para plano pago', 'Enviar purchase event para Meta Conversions API', 'Imediato', '{API}', false, 'Globe', 'text-muted-foreground', 8);
