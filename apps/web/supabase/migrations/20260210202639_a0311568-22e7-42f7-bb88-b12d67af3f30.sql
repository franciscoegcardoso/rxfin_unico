
-- Etapa 1: Add billing_month column to credit_card_bills
-- billing_month = competence month (1 month before due_date)

-- 1. Add column as nullable
ALTER TABLE public.credit_card_bills ADD COLUMN IF NOT EXISTS billing_month TEXT;

-- 2. Backfill existing records: due_date - 1 month = competence
UPDATE public.credit_card_bills
SET billing_month = to_char(due_date::date - interval '1 month', 'YYYY-MM')
WHERE billing_month IS NULL;

-- 3. Add NOT NULL constraint
ALTER TABLE public.credit_card_bills ALTER COLUMN billing_month SET NOT NULL;

-- 4. Add default for future inserts (will be overridden by code, but safety net)
ALTER TABLE public.credit_card_bills ALTER COLUMN billing_month SET DEFAULT '';
