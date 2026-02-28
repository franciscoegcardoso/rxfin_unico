-- Drop the old catalog-resume cron job
SELECT cron.unschedule(14);

-- Create new catalog-fill-models cron job (runs every 3 minutes)
SELECT cron.schedule(
  'fipe-catalog-fill-models',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kneaniaifzgqibpajyji.supabase.co/functions/v1/fipe-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E"}'::jsonb,
    body := '{"action": "catalog-fill-models", "maxBrands": 2}'::jsonb
  ) AS request_id;
  $$
);