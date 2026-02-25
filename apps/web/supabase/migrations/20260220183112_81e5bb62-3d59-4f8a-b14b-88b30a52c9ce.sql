ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS checkout_url_yearly text;

COMMENT ON COLUMN public.subscription_plans.checkout_url IS 'URL de checkout para o plano mensal';
COMMENT ON COLUMN public.subscription_plans.checkout_url_yearly IS 'URL de checkout para o plano anual';