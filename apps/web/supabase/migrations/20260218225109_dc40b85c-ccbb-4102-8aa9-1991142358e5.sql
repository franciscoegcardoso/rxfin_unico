-- Limpar cron jobs FIPE redundantes, mantendo apenas: fipe-catalog-resume, fipe-history-fill, fipe-monthly-sync
SELECT cron.unschedule('fipe-catalog-auto');
SELECT cron.unschedule('fipe-catalog-cars');
SELECT cron.unschedule('fipe-catalog-motos');
SELECT cron.unschedule('fipe-catalog-trucks');
SELECT cron.unschedule('fipe-history-backfill');
SELECT cron.unschedule('fipe-history-fill-v2');
SELECT cron.unschedule('fipe-monthly-check');