-- Trigger function: notify n8n when a daily_auto sync job is created
CREATE OR REPLACE FUNCTION public.notify_n8n_daily_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action = 'daily_auto' AND NEW.status = 'pending' THEN
    PERFORM extensions.http_post(
      'https://rxfin.app.n8n.cloud/webhook/5661ce30-b55f-49fa-a003-68a8bbb9d6ed',
      jsonb_build_object(
        'job_id', NEW.id,
        'user_id', NEW.user_id,
        'item_id', NEW.item_id,
        'sync_date', NEW.sync_date,
        'created_at', NEW.created_at
      )::text,
      'application/json'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: fires after insert on pluggy_sync_jobs
CREATE TRIGGER trg_notify_n8n_daily_sync
AFTER INSERT ON public.pluggy_sync_jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_n8n_daily_sync();