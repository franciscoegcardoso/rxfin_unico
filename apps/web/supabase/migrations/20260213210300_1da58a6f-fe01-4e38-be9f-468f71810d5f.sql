
-- Add finance_mode column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS finance_mode text DEFAULT NULL;

-- Auto-detect: set existing users with active Pluggy connections to 'openfinance'
UPDATE public.profiles p
SET finance_mode = 'openfinance'
WHERE p.finance_mode IS NULL
  AND EXISTS (
    SELECT 1 FROM public.pluggy_connections pc
    WHERE pc.user_id = p.id
      AND pc.status NOT IN ('LOGIN_ERROR')
  );
