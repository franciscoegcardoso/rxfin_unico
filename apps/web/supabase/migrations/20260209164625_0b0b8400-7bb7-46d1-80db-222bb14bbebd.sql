
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pluggy_investments' AND column_name='last_month_rate') THEN
    ALTER TABLE public.pluggy_investments ADD COLUMN last_month_rate NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pluggy_investments' AND column_name='last_twelve_months_rate') THEN
    ALTER TABLE public.pluggy_investments ADD COLUMN last_twelve_months_rate NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pluggy_investments' AND column_name='code') THEN
    ALTER TABLE public.pluggy_investments ADD COLUMN code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pluggy_investments' AND column_name='quantity') THEN
    ALTER TABLE public.pluggy_investments ADD COLUMN quantity NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pluggy_investments' AND column_name='unit_value') THEN
    ALTER TABLE public.pluggy_investments ADD COLUMN unit_value NUMERIC;
  END IF;
END $$;
