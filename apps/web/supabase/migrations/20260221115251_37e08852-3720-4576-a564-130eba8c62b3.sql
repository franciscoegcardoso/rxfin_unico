-- Enable the http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Recreate trigger function using the correct http extension function
CREATE OR REPLACE FUNCTION public.notify_n8n_daily_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action = 'daily_auto' AND NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://rxfin.app.n8n.cloud/webhook/5661ce30-b55f-49fa-a003-68a8bbb9d6ed',
      body := jsonb_build_object(
        'job_id', NEW.id,
        'user_id', NEW.user_id,
        'item_id', NEW.item_id,
        'sync_date', NEW.sync_date,
        'created_at', NEW.created_at
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  END IF;
  RETURN NEW;
END;
$$;