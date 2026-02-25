-- Allow anyone (including anonymous) to read active simulators
-- This is needed because the access control logic is handled in the application layer
CREATE POLICY "Anyone can view active simulators"
ON public.simulators
FOR SELECT
USING (status = 'active');