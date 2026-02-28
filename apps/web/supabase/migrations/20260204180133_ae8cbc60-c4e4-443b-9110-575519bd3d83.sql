-- =====================================================
-- FIX: System/Log tables - Replace 'always true' with service_role access
-- =====================================================

-- 1. email_campaign_logs - Fix INSERT policy that allows anyone
DROP POLICY IF EXISTS "campaign_logs_system_insert" ON public.email_campaign_logs;

-- Only service_role can insert (edge functions use service_role)
-- Regular users cannot insert directly
CREATE POLICY "Service role can insert campaign logs"
ON public.email_campaign_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins can still read
DROP POLICY IF EXISTS "campaign_logs_owners_select" ON public.email_campaign_logs;
CREATE POLICY "Admins can view campaign logs"
ON public.email_campaign_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- 2. email_queue - Enable RLS and restrict to service_role only
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for email queue" ON public.email_queue;
CREATE POLICY "Service role only for email queue"
ON public.email_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view queue status
CREATE POLICY "Admins can view email queue"
ON public.email_queue
FOR SELECT
USING (is_admin(auth.uid()));

-- 3. email_unsubscribes - Fix the "Anyone can unsubscribe" policy
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON public.email_unsubscribes;

-- Allow authenticated users to unsubscribe themselves only
CREATE POLICY "Authenticated users can unsubscribe themselves"
ON public.email_unsubscribes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. fipe_price_history - Restrict INSERT/UPDATE/DELETE to service_role
-- (SELECT is already public which is fine for cache)
CREATE POLICY "Service role can manage FIPE cache"
ON public.fipe_price_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. fipe_sibling_cache - Same as above
CREATE POLICY "Service role can manage sibling cache"
ON public.fipe_sibling_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. leads - Ensure only service_role can insert (from edge functions)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert leads" ON public.leads;
CREATE POLICY "Service role can insert leads"
ON public.leads
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads"
ON public.leads
FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Admins can manage leads"
ON public.leads
FOR ALL
USING (is_admin(auth.uid()));

-- 7. login_attempts - Service role only (security sensitive)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for login attempts" ON public.login_attempts;
CREATE POLICY "Service role only for login attempts"
ON public.login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view for security monitoring
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (is_admin(auth.uid()));