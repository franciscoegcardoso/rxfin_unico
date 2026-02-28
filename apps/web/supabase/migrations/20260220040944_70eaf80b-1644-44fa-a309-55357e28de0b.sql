
-- Fix: unique_user_month is a CONSTRAINT, not a plain index
ALTER TABLE public.monthly_goals DROP CONSTRAINT IF EXISTS unique_user_month;
