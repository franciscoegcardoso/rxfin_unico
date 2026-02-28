
-- Affiliate program types
CREATE TYPE public.affiliate_program_type AS ENUM ('standard', 'influencer');

-- Programs table
CREATE TABLE public.affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type public.affiliate_program_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_active_plan BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tiers for standard program
CREATE TABLE public.affiliate_program_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  min_referrals INTEGER NOT NULL,
  max_referrals INTEGER,
  commission_value NUMERIC(10,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Influencers
CREATE TABLE public.affiliate_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.affiliate_programs(id),
  name TEXT NOT NULL,
  email TEXT,
  slug TEXT NOT NULL UNIQUE,
  commission_per_referral NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend affiliate_referrals
ALTER TABLE public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS program_type public.affiliate_program_type DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES public.affiliate_influencers(id),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_value NUMERIC(10,2);

-- RLS
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_program_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_influencers ENABLE ROW LEVEL SECURITY;

-- Programs policies
CREATE POLICY "Anyone can read programs"
  ON public.affiliate_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage programs"
  ON public.affiliate_programs FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- Tiers policies
CREATE POLICY "Anyone can read tiers"
  ON public.affiliate_program_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tiers"
  ON public.affiliate_program_tiers FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- Influencers policies
CREATE POLICY "Read own or admin influencers"
  ON public.affiliate_influencers FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_admin((select auth.uid())));
CREATE POLICY "Admins manage influencers"
  ON public.affiliate_influencers FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- Seed programs
INSERT INTO public.affiliate_programs (program_type, name, description, requires_active_plan, retention_days)
VALUES 
  ('standard', 'Indique & Ganhe', 'Programa de indicações para usuários ativos. Comissão escalonada por faixa de indicações.', true, 30),
  ('influencer', 'Programa Influencer', 'Programa para influenciadores com valor fixo negociado por indicação.', false, 30);

-- Seed default tiers
INSERT INTO public.affiliate_program_tiers (program_id, min_referrals, max_referrals, commission_value, sort_order)
VALUES
  ((SELECT id FROM public.affiliate_programs WHERE program_type = 'standard'), 1, 5, 10.00, 1),
  ((SELECT id FROM public.affiliate_programs WHERE program_type = 'standard'), 6, 10, 20.00, 2),
  ((SELECT id FROM public.affiliate_programs WHERE program_type = 'standard'), 11, NULL, 50.00, 3);
