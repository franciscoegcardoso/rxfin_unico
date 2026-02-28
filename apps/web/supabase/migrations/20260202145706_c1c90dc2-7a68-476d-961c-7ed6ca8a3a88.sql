-- Add min_plan_slug column to pages table to link with subscription_plans hierarchy
-- The column stores the slug of the minimum plan required to access the page
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS min_plan_slug text DEFAULT 'free';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pages_min_plan_slug ON public.pages(min_plan_slug);

-- Add order_index to subscription_plans if not exists (to define hierarchy)
-- Lower order_index = more restricted, higher = more access
-- This will be used to determine plan hierarchy:
-- 1: sem_cadastro (most restricted)
-- 2: free
-- 3: basic (RX Starter)
-- 4: pro (RX Pro)
-- Update existing plans with correct hierarchy order
UPDATE public.subscription_plans SET order_index = 1 WHERE slug = 'sem_cadastro';
UPDATE public.subscription_plans SET order_index = 2 WHERE slug = 'free';
UPDATE public.subscription_plans SET order_index = 3 WHERE slug = 'basic';
UPDATE public.subscription_plans SET order_index = 4 WHERE slug = 'pro';

-- Migrate existing access_level data to min_plan_slug
UPDATE public.pages SET min_plan_slug = 
  CASE 
    WHEN access_level = 'public' THEN 'sem_cadastro'
    WHEN access_level = 'free' THEN 'free'
    WHEN access_level = 'premium' THEN 'basic'
    WHEN access_level = 'admin' THEN 'pro'
    ELSE 'free'
  END;

-- Add a comment to document the hierarchy
COMMENT ON COLUMN public.pages.min_plan_slug IS 'Minimum subscription plan slug required to access this page. Higher order_index plans in subscription_plans inherit access from lower ones.';