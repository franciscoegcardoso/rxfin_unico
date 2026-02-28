ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS notify_due_dates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_weekly_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_news boolean NOT NULL DEFAULT false;