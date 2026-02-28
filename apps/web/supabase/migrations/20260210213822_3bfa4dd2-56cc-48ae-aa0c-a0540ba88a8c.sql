
ALTER TABLE public.pluggy_transactions ADD COLUMN IF NOT EXISTS amount_in_account_currency NUMERIC;
ALTER TABLE public.pluggy_transactions ADD COLUMN IF NOT EXISTS currency_code TEXT;
