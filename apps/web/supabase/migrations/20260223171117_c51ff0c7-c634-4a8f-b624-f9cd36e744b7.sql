
-- Table to track referral journey
CREATE TABLE public.affiliate_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referred_name TEXT,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'visitou'
    CHECK (status IN ('visitou', 'cadastrou', 'free', 'ativo', 'cancelou', 'ja_cliente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, referred_user_id)
);

-- RLS
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Affiliates can read their own referrals
CREATE POLICY "affiliate_referrals_select_own"
  ON public.affiliate_referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

-- Authenticated users can insert referrals (self-registration when visiting with aff param)
CREATE POLICY "affiliate_referrals_insert"
  ON public.affiliate_referrals
  FOR INSERT
  WITH CHECK (referred_user_id = auth.uid());

-- Authenticated users can update their own referral status
CREATE POLICY "affiliate_referrals_update"
  ON public.affiliate_referrals
  FOR UPDATE
  USING (referred_user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_affiliate_referrals_referrer ON public.affiliate_referrals (referrer_id);
CREATE INDEX idx_affiliate_referrals_referred ON public.affiliate_referrals (referred_user_id);
