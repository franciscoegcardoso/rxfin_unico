-- Add promotional pricing fields to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS original_price_monthly numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS original_price_yearly numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_promo boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.original_price_monthly IS 'Preço original mensal (DE) - usado para exibir desconto';
COMMENT ON COLUMN public.subscription_plans.original_price_yearly IS 'Preço original anual (DE) - usado para exibir desconto';
COMMENT ON COLUMN public.subscription_plans.discount_reason IS 'Motivo do desconto (ex: Lançamento, Black Friday)';
COMMENT ON COLUMN public.subscription_plans.has_promo IS 'Se true, exibe o preço promocional DE/POR';