-- Adjust defaults on pluggy_sync_jobs
ALTER TABLE public.pluggy_sync_jobs
  ALTER COLUMN action SET DEFAULT 'initial-sync',
  ALTER COLUMN priority SET DEFAULT 1;

-- Drop existing narrow policy
DROP POLICY IF EXISTS "Users see own jobs" ON public.pluggy_sync_jobs;

-- Authenticated users: read own jobs only
CREATE POLICY "Users can view own jobs"
  ON public.pluggy_sync_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Authenticated users: insert own jobs (for queueing from edge functions via user token)
CREATE POLICY "Users can insert own jobs"
  ON public.pluggy_sync_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role: full access (handled automatically by Supabase when RLS is enabled,
-- service_role bypasses RLS by default, but explicit policies ensure clarity)
CREATE POLICY "Service role full access"
  ON public.pluggy_sync_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);