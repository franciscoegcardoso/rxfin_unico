-- Fix: Unschedule cron job that uses anon key (will fail with 401)
-- The user must reschedule manually with the service_role key in SQL Editor
SELECT cron.unschedule('fipe-catalog-fill-models');