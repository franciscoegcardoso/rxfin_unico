
-- Add is_favorite to groups (max 2 favorites enforced in app)
ALTER TABLE public.rxsplit_groups ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add establishment_name and receipt_url to expenses
ALTER TABLE public.rxsplit_expenses ADD COLUMN IF NOT EXISTS establishment_name TEXT;
ALTER TABLE public.rxsplit_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add parse-receipt to config
