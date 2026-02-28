
-- Add planned purchase date, payment method, and installments to purchase_registry
ALTER TABLE public.purchase_registry
  ADD COLUMN IF NOT EXISTS planned_date text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1;
