-- Add columns for error tracking and consent management
ALTER TABLE public.pluggy_connections
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS execution_status text,
  ADD COLUMN IF NOT EXISTS consent_expires_at timestamp with time zone;

-- Add an index for quick lookup of expired/errored connections
CREATE INDEX IF NOT EXISTS idx_pluggy_connections_status ON public.pluggy_connections (status);