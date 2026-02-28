-- Add guru_product_id column to subscription_plans for product mapping
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS guru_product_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.guru_product_id IS 'Product ID(s) from Guru checkout. Supports multiple IDs separated by comma.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_guru_product_id 
ON public.subscription_plans(guru_product_id) 
WHERE guru_product_id IS NOT NULL;