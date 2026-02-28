-- Create table for plan comparison features
CREATE TABLE public.plan_comparison_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  category TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  free_value TEXT NOT NULL DEFAULT 'false', -- 'true', 'false', 'partial', or custom text
  starter_value TEXT NOT NULL DEFAULT 'false',
  pro_value TEXT NOT NULL DEFAULT 'true',
  is_default BOOLEAN NOT NULL DEFAULT false, -- marks items from default set
  is_active BOOLEAN NOT NULL DEFAULT true, -- false = moved to "not inserted" section
  page_slug TEXT, -- optional: link to pages table
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_comparison_features ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can see comparison)
CREATE POLICY "Plan comparison features are viewable by everyone" 
ON public.plan_comparison_features 
FOR SELECT 
USING (true);

-- Admin-only write access
CREATE POLICY "Only admins can insert comparison features" 
ON public.plan_comparison_features 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update comparison features" 
ON public.plan_comparison_features 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete comparison features" 
ON public.plan_comparison_features 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Insert default comparison data
INSERT INTO public.plan_comparison_features (feature_name, category, order_index, free_value, starter_value, pro_value, is_default, page_slug) VALUES
-- Gestão Básica
('Início (Dashboard)', 'Gestão Básica', 1, 'true', 'true', 'true', true, 'dashboard'),
('Parâmetros Financeiros', 'Gestão Básica', 2, 'true', 'true', 'true', true, 'parametros'),
('Instituições Financeiras', 'Gestão Básica', 3, 'true', 'true', 'true', true, 'instituicoes'),

-- Patrimônio
('Bens e Investimentos', 'Patrimônio', 10, 'true', 'true', 'true', true, 'patrimonio'),
('Gestão de Veículos', 'Patrimônio', 11, 'false', 'true', 'true', true, 'veiculos'),
('Seguros', 'Patrimônio', 12, 'false', 'true', 'true', true, 'seguros'),

-- Fluxo Financeiro
('Lançamentos', 'Fluxo Financeiro', 20, 'false', 'true', 'true', true, 'lancamentos'),
('Contas a Pagar/Receber', 'Fluxo Financeiro', 21, 'false', 'true', 'true', true, 'contas'),
('Fluxo Financeiro', 'Fluxo Financeiro', 22, 'false', 'true', 'true', true, 'fluxo'),
('Cartão de Crédito', 'Fluxo Financeiro', 23, 'false', 'true', 'true', true, 'cartao'),

-- Planejamento
('Planejamento Anual', 'Planejamento', 30, 'false', 'true', 'true', true, 'planejamento'),
('Metas Mensais', 'Planejamento', 31, 'false', 'true', 'true', true, 'metas'),
('Pacotes de Orçamento', 'Planejamento', 32, 'false', 'true', 'true', true, 'pacotes'),

-- Recursos Avançados
('Meu IR (Imposto de Renda)', 'Recursos Avançados', 40, 'false', 'false', 'true', true, 'ir'),
('Presentes', 'Recursos Avançados', 41, 'false', 'false', 'true', true, 'presentes'),
('Sonhos e Objetivos', 'Recursos Avançados', 42, 'false', 'false', 'true', true, 'sonhos'),
('Open Finance', 'Recursos Avançados', 43, 'false', 'false', 'true', true, 'open-finance'),

-- Simuladores
('Simuladores Básicos', 'Simuladores', 50, 'true', 'true', 'true', true, 'simuladores'),
('Simuladores Avançados', 'Simuladores', 51, 'false', 'partial', 'true', true, NULL),
('Indicadores Econômicos', 'Simuladores', 52, 'false', 'true', 'true', true, 'indicadores'),

-- Suporte
('Suporte por Email', 'Suporte', 60, 'true', 'true', 'true', true, NULL),
('Suporte Prioritário', 'Suporte', 61, 'false', 'false', 'true', true, NULL);