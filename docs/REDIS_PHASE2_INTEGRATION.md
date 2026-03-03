# RXFin · Fase 2 Redis Ingest Layer — Guia de integração

A pasta `rxfin-redis-phase2/` não foi encontrada no projeto. Os arquivos da camada Redis foram **criados diretamente** no monorepo conforme o prompt.

---

## O que foi criado

| Local | Descrição |
|-------|-----------|
| `supabase/functions/_shared-redis/index.ts` | Cliente Upstash Redis (XADD, XREADGROUP, XACK, XLEN) |
| `supabase/functions/ingest-dispatcher/index.ts` | POST → Redis Stream ou fallback `jobs_queue`; deduplicação por `idempotencyKey` |
| `supabase/functions/pluggy-worker-v2/index.ts` | Consome stream `rxfin:pluggy:sync` e insere em `jobs_queue` |
| `supabase/migrations/20260302000000_redis_ingest_layer_v2.sql` | Tabelas `redis_dlq_mirror`, `ingest_metrics` e função `http_dispatch_job` |
| `apps/web/supabase/functions/pluggy-sync/index.ts` | **Atualizado**: historical-load, incremental-sync e save-connection passam a chamar o ingest-dispatcher (com fallback para `pluggy_sync_jobs`) |

**Import path:** as Edge Functions na **raiz** `supabase/functions/` usam `from '../_shared-redis/index.ts'`. O projeto também tem funções em `apps/web/supabase/functions/` (pluggy-sync, etc.); o pluggy-sync chama o dispatcher via **HTTP** (`SUPABASE_URL/functions/v1/ingest-dispatcher`), então não precisa do import `_shared-redis`.

---

## TAREFA 1 — Secrets no Supabase

Execute no terminal (substitua os valores do Upstash pelos reais):

```bash
# Gerar INTERNAL_SECRET
export INTERNAL_SECRET="rxfin-$(openssl rand -hex 16)"
echo "Guarde este secret: $INTERNAL_SECRET"

# Configurar secrets (substitua SEU_ID e SEU_TOKEN pelo Upstash)
supabase secrets set \
  UPSTASH_REDIS_REST_URL="https://SEU_ID.upstash.io" \
  UPSTASH_REDIS_REST_TOKEN="SEU_TOKEN_UPSTASH" \
  INTERNAL_SECRET="$INTERNAL_SECRET"

# Confirmar
supabase secrets list
```

---

## TAREFA 2 — Deploy das Edge Functions (raiz do monorepo)

As funções estão em **`supabase/functions/`** (raiz). Se o deploy do projeto usar **`apps/web/supabase/`**, copie também para lá ou configure o CLI para a raiz:

```bash
cd "C:\Users\Francisco Cardoso\rxfin_unico"

# Deploy na ordem (shared primeiro)
supabase functions deploy _shared-redis --no-verify-jwt
supabase functions deploy ingest-dispatcher --no-verify-jwt
supabase functions deploy pluggy-worker-v2 --no-verify-jwt

supabase functions list
```

---

## TAREFA 3 — Import path do _shared-redis

Em **`supabase/functions/`** (raiz), os imports já estão corretos:

- `ingest-dispatcher/index.ts`: `from '../_shared-redis/index.ts'`
- `pluggy-worker-v2/index.ts`: `from '../_shared-redis/index.ts'`

Não é necessário alterar se a estrutura for `functions/_shared-redis/`, `functions/ingest-dispatcher/`, `functions/pluggy-worker-v2/`.

---

## TAREFA 4 — Migration SQL

```bash
cd "C:\Users\Francisco Cardoso\rxfin_unico"
supabase db push
```

**Ou** no Supabase Dashboard → SQL Editor: cole o conteúdo de `supabase/migrations/20260302000000_redis_ingest_layer_v2.sql` e execute.

A função `http_dispatch_job` usa **pg_net**. Se der erro, execute antes:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## TAREFA 5 — Smoke test do ingest-dispatcher

Substitua `<PROJECT_REF>`, `<INTERNAL_SECRET>`, `<USER_UUID>`, `<PLUGGY_ITEM_ID>`:

```bash
# Teste 1: enfileirar job Pluggy
curl -s -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-dispatcher" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <INTERNAL_SECRET>" \
  -d '{"type":"pluggy:daily_auto","payload":{"user_id":"<USER_UUID>","item_id":"<PLUGGY_ITEM_ID>"},"priority":3}' | jq .

# Esperado: { "success": true, "messageId": "1741...", "stream": "rxfin:pluggy:sync" }

# Teste 2: deduplicação (mesmo idempotencyKey)
curl -s -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-dispatcher" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <INTERNAL_SECRET>" \
  -d '{"type":"pluggy:daily_auto","payload":{"user_id":"<USER_UUID>","item_id":"<PLUGGY_ITEM_ID>"},"idempotencyKey":"daily_auto:<USER_UUID>:2026-03-02"}' | jq .

# Esperado: { "success": true, "messageId": "DUPLICATE_SUPPRESSED", ... }
```

---

## TAREFA 6 — Smoke test do pluggy-worker-v2

```bash
curl -s -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/pluggy-worker-v2" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <INTERNAL_SECRET>" \
  -d '{"consumer":"cursor-test-worker"}' | jq .
```

Esperado: `"source": "redis"`, `"processed": 1` (ou 0 se o stream já foi consumido).

---

## TAREFA 7 — pluggy-sync atualizado

O arquivo **`apps/web/supabase/functions/pluggy-sync/index.ts`** foi alterado:

- **historical-load**: tenta primeiro o ingest-dispatcher; em falha, usa `pluggy_sync_jobs`.
- **incremental-sync**: idem.
- **save-connection**: envia `pluggy:initial_sync` ao dispatcher; se falhar, insere em `pluggy_sync_jobs`.

É necessário que **INTERNAL_SECRET** esteja definido nas Edge Functions que rodam o pluggy-sync (mesmo projeto Supabase). O dispatcher deve estar deployado e acessível em `SUPABASE_URL/functions/v1/ingest-dispatcher`.

---

## TAREFA 8 — view `dispatch_health`

Se existir uma view `dispatch_health` no SQL do projeto, valide após os testes:

```sql
SELECT pipeline, health_status, redis_queue_depth,
       processed_last_hour, failed_last_hour, unresolved_dlq, avg_processing_ms
FROM dispatch_health;
```

(Caso a view não exista, a migration atual não a cria; pode ser adicionada numa migration futura.)

---

## TAREFA 9 — pg_cron e `http_dispatch_job`

No SQL Editor do Supabase:

```sql
ALTER DATABASE postgres SET "app.internal_secret" = '<INTERNAL_SECRET>';
ALTER DATABASE postgres SET "app.dispatcher_url" = 'https://<PROJECT_REF>.supabase.co/functions/v1/ingest-dispatcher';
```

Reiniciar a conexão e testar:

```sql
SELECT http_dispatch_job(
  'pluggy:daily_auto',
  jsonb_build_object('user_id', '<USER_UUID>', 'item_id', '<PLUGGY_ITEM_ID>'),
  3,
  'test:' || now()::text
);
```

---

## Checklist de conclusão

- [ ] Secrets configurados: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `INTERNAL_SECRET`
- [ ] 3 Edge Functions deployadas e ACTIVE: `_shared-redis`, `ingest-dispatcher`, `pluggy-worker-v2`
- [ ] Migration aplicada (tabelas `redis_dlq_mirror`, `ingest_metrics` e função `http_dispatch_job`)
- [ ] Smoke test dispatcher: retorna `messageId` válido (1ª chamada) e `DUPLICATE_SUPPRESSED` (2ª com mesmo idempotencyKey)
- [ ] Smoke test worker: retorna `source: "redis"`, `processed` >= 0
- [ ] pluggy-sync (apps/web) atualizado e com INTERNAL_SECRET no ambiente
- [ ] `app.internal_secret` e `app.dispatcher_url` configurados no banco para pg_cron
- [ ] (Opcional) Teste de fallback: com Redis indisponível, ingest-dispatcher retorna `fallback: true` e job em `jobs_queue`

---

## Troubleshooting

| Erro | Ação |
|------|------|
| `BUSYGROUP` no Redis | Normal; consumer group já existe. O _shared-redis trata. |
| `[UpstashRedis] HTTP 401` | Verificar `UPSTASH_REDIS_REST_TOKEN` e `supabase secrets list`. |
| Worker retorna `source: "postgres_fallback"` | Stream vazio (mensagem já consumida ou não enfileirada). Verificar com `XLEN rxfin:pluggy:sync` no Upstash. |
| `http_dispatch_job` → pg_net não instalado | `CREATE EXTENSION IF NOT EXISTS pg_net;` (Supabase Pro). |
| Import path no deploy | Confirmar que a estrutura é `functions/_shared-redis/index.ts` e que os outros imports usam `../_shared-redis/index.ts`. |
