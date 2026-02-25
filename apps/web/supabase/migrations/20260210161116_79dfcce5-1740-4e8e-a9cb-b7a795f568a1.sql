
-- Table to track async sync job progress
CREATE TABLE public.sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL, -- 'historical-load', 'incremental-sync'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'error'
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100
  accounts_total INTEGER DEFAULT 0,
  accounts_processed INTEGER DEFAULT 0,
  transactions_saved INTEGER DEFAULT 0,
  bills_linked INTEGER DEFAULT 0,
  current_step TEXT DEFAULT '',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync jobs"
  ON public.sync_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sync jobs"
  ON public.sync_jobs FOR ALL USING (true);

CREATE INDEX idx_sync_jobs_user_status ON public.sync_jobs (user_id, status);
