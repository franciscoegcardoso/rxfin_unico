# RXFin — Parte B (Fase 3): implementação no repositório

Referência: `rxfin_fase2_cursor_e_fase3_plano.md`.

## B.1 — PgBouncer / pooling nas Edge Functions

- **Dashboard:** Supabase → Settings → Database → Connection pooling → **Transaction mode** (porta **6543**).
- **Secret nas Edge Functions:** `DATABASE_URL_POOLED` = URI de conexão pooled (Session mode vs Transaction mode conforme doc Supabase).
- **Código:** `apps/web/supabase/functions/_shared/db-pooled-url.ts` — função `getPooledOrDirectDatabaseUrl()` usa `DATABASE_URL_POOLED` quando definida, senão `DATABASE_URL`.
- **Nota:** As Edge Functions atuais usam sobretudo o cliente `@supabase/supabase-js` (HTTP), não `postgres.js`. O helper existe para quando introduzirem `Pool` / queries SQL diretas.

Mantenha `DATABASE_URL` (5432) para **migrations** e operações que precisam de recursos de **sessão** (temp tables, `SET`, etc.).

---

## B.2 — `pluggy_transactions` (particionamento + índice)

- **Implementado:** índice `idx_pluggy_transactions_user_date` em `(user_id, date DESC)` — `20260321151000_parte_b2_pluggy_transactions_user_date_index.sql`.
- **Particionamento HASH + range:** não aplicado no banco (alto risco / sprint dedicado). Blueprint de referência: `docs/sql/planned/b2_pluggy_transactions_partition_blueprint.sql`.

---

## B.3 — Cache de RPCs no cliente

- **Constantes:** `apps/web/src/lib/rpcQueryDefaults.ts` — `STALE_RPC_ANALYTICS_MS` (5 min), `STALE_RPC_INVESTMENTS_PAGE_MS` (10 min).
- **Uso:** `useOverviewSummary` e `usePluggyInvestments` passam a referenciar essas constantes (Parte B.3 alinhada ao plano).

---

## B.4 — Read replica

- **Não há** cliente Postgres direto no app web para apontar a uma réplica; RPCs (`get_investments_page_data`, etc.) executam no **Postgres via PostgREST** no projeto primário.
- **Quando usar Pro + read replica:** configurar no Supabase a réplica e, para workloads futuros com driver SQL direto (Edge Function + `postgres.js`), usar uma variável `SUPABASE_DB_READER_URL` ou equivalente **somente** nesse caminho — documentar no Dashboard de secrets.

---

## B.5 — Schemas por domínio

- **Implementado:** schemas vazios `rxfin_finance`, `rxfin_pluggy`, `rxfin_ir`, `rxfin_admin` + `GRANT USAGE` — migration `20260321150000_parte_b5_domain_schemas.sql`.
- **Próximos passos (sprint):** `ALTER TABLE ... SET SCHEMA` + views de compatibilidade em `public`, conforme plano original.

---

## B.6 — Arquivo de `pluggy_transactions`

- **Tabelas/views:** `pluggy_transactions_archive`, view `pluggy_transactions_all` (UNION hot + archive).
- **Função:** `run_pluggy_transactions_archive_job(p_months, p_batch_size, p_min_total_rows, p_force)` — por defeito **não move dados** enquanto `count(*) < 10_000_000` (evita efeitos em bases pequenas). Para testes: `p_force := true`.
- **Cron:** não agendado automaticamente; quando o volume justificar, agendar chamada mensal (pg_cron ou Scheduler) a esta função.
- **Antes de ativar em produção:** validar FKs / referências a `pluggy_transactions.id` (ex.: cartão, conciliação).

---

## Variáveis de ambiente (referência)

| Onde | Variável | Uso |
|------|----------|-----|
| Edge (secrets) | `DATABASE_URL_POOLED` | Pool transacional 6543 para `postgres.js` |
| Edge (secrets) | `DATABASE_URL` | Direto 5432 / migrations |
| Edge (futuro) | `SUPABASE_DB_READER_URL` | Réplica read-only (SQL direto) |
