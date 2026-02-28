-- Fix 1: Replace overly permissive RLS INSERT policies with proper service_role checks

-- email_campaign_logs: only service_role should insert (from edge functions)
DROP POLICY IF EXISTS "Service role can insert campaign logs" ON public.email_campaign_logs;
CREATE POLICY "Service role can insert campaign logs"
  ON public.email_campaign_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- leads: only service_role should insert
DROP POLICY IF EXISTS "Service role can insert leads" ON public.leads;
CREATE POLICY "Service role can insert leads"
  ON public.leads
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix 2: Set search_path on rescue_stuck_jobs function
CREATE OR REPLACE FUNCTION public.rescue_stuck_jobs()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE rescued INTEGER;
BEGIN
  UPDATE pluggy_sync_jobs
  SET status = 'pending', started_at = NULL, updated_at = NOW()
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS rescued = ROW_COUNT;
  RETURN rescued;
END;
$function$;