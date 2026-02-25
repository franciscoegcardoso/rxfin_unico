-- Ensure subscription_role defaults to 'free' for all new users
ALTER TABLE public.profiles 
ALTER COLUMN subscription_role SET DEFAULT 'free';

-- Update any NULL values to 'free'
UPDATE public.profiles 
SET subscription_role = 'free' 
WHERE subscription_role IS NULL;