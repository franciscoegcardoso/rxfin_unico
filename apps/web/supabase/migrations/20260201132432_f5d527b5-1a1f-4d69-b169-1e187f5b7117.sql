-- Create subscription_plans table for managing plan offerings
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  allowed_pages text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true, -- false for 'sem_cadastro' plan
  order_index integer DEFAULT 0,
  highlight_label text, -- e.g., "Mais popular"
  checkout_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active public plans
CREATE POLICY "Anyone can view active public plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true AND is_public = true);

-- Admins can view all plans
CREATE POLICY "Admins can view all plans"
ON public.subscription_plans
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can manage plans
CREATE POLICY "Admins can insert plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update plans"
ON public.subscription_plans
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete plans"
ON public.subscription_plans
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, is_public, order_index, allowed_pages) VALUES
('Sem Cadastro', 'sem_cadastro', 'Acesso limitado para visitantes não cadastrados', 0, 0, false, 0, ARRAY['simuladores']),
('Free', 'free', 'Plano gratuito com funcionalidades básicas', 0, 0, true, 1, ARRAY['inicio', 'bens-investimentos', 'meu-ir', 'configuracoes', 'parametros', 'instituicoes-financeiras', 'planos', 'simuladores']),
('RX Starter', 'basic', 'Plano inicial com mais recursos', 29.90, 299, true, 2, ARRAY['inicio', 'bens-investimentos', 'meu-ir', 'configuracoes', 'parametros', 'instituicoes-financeiras', 'planos', 'simuladores', 'fluxo-financeiro', 'gestao-veiculos', 'seguros']),
('RX Pro', 'pro', 'Plano completo com todas as funcionalidades', 49.90, 499, true, 3, ARRAY['*']);