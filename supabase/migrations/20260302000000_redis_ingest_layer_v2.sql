-- RXFin Redis Ingest Layer v2 — Tabelas de apoio e configuração para pg_cron
-- Aplicar via: supabase db push OU colar no SQL Editor do Supabase

-- 1) Tabela espelho para DLQ (dead-letter) de mensagens Redis que falharam
CREATE TABLE IF NOT EXISTS redis_dlq_mirror (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_name text NOT NULL,
  message_id text NOT NULL,
  payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stream_name, message_id)
);

CREATE INDEX IF NOT EXISTS idx_redis_dlq_created ON redis_dlq_mirror(created_at);

-- 2) Métricas de ingestão (opcional — para dashboard dispatch_health)
CREATE TABLE IF NOT EXISTS ingest_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline text NOT NULL,
  metric_type text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  bucket_ts timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_metrics_pipeline_ts ON ingest_metrics(pipeline, bucket_ts);

-- 3) Função que o pg_cron usará para enviar jobs ao ingest-dispatcher (requer pg_net)
-- Configure antes: ALTER DATABASE postgres SET "app.internal_secret" = '...'; SET "app.dispatcher_url" = 'https://<PROJECT_REF>.supabase.co/functions/v1/ingest-dispatcher';
CREATE OR REPLACE FUNCTION http_dispatch_job(
  p_type text,
  p_payload jsonb,
  p_priority int DEFAULT 2,
  p_idempotency_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_url text;
  v_body jsonb;
BEGIN
  SELECT current_setting('app.internal_secret', true) INTO v_secret;
  SELECT current_setting('app.dispatcher_url', true) INTO v_url;
  IF v_secret IS NULL OR v_secret = '' OR v_url IS NULL OR v_url = '' THEN
    RAISE NOTICE 'http_dispatch_job: app.internal_secret ou app.dispatcher_url não configurados.';
    RETURN;
  END IF;

  v_body := jsonb_build_object(
    'type', p_type,
    'payload', p_payload,
    'priority', p_priority
  );
  IF p_idempotency_key IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('idempotencyKey', p_idempotency_key);
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := v_body
  );
END;
$$;

COMMENT ON FUNCTION http_dispatch_job IS 'Envia job para o ingest-dispatcher (Redis). Requer pg_net e app.internal_secret/app.dispatcher_url configurados.';

-- Nota: os jobs pg_cron que chamam http_dispatch_job devem ser criados manualmente ou via cron extension
-- após configurar app.internal_secret e app.dispatcher_url no banco.
-- Exemplo (executar após configurar):
-- SELECT cron.schedule('rxfin-pluggy-daily', '0 3 * * *', $$SELECT http_dispatch_job('pluggy:daily_auto', jsonb_build_object('user_id', '<UUID>', 'item_id', '<ITEM_ID>'), 3, 'daily_auto:' || current_date::text)$$);

DO $$
BEGIN
  RAISE NOTICE 'OK: Tabelas redis_dlq_mirror e ingest_metrics criadas (ou já existiam).';
  RAISE NOTICE 'Configure app.internal_secret e app.dispatcher_url e, se usar pg_cron, agende jobs com prefixo rxfin-.';
END;
$$;
