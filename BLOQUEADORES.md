# BLOQUEADORES — Ação humana necessária

---

## REPAIR — Fallback se `db push` falhar (F1-E e F1-A)

Se após o `repair_migrations.ps1` o comando `supabase db push` falhar, aplicar manualmente no **Supabase SQL Editor**:

### F1-E — pg_stat_statements

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT count(*) AS total_queries_monitoradas FROM pg_stat_statements;
```

### F1-A — Índices de performance

Copiar e colar o conteúdo de `apps/web/supabase/migrations/20260326100001_f1a_indexes_user_id.sql` no SQL Editor. Ou executar (em transação única, sem CONCURRENTLY):

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user_id ON public.pluggy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user_created ON public.pluggy_transactions(user_id, created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pluggy_connections_user_id ON public.pluggy_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_user_id ON public.credit_card_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_user_due ON public.credit_card_bills(user_id, due_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_receber_user_id ON public.contas_pagar_receber(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created ON public.ai_chat_messages(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_budget_packages_user_id ON public.budget_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_id ON public.monthly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
```

---

## F1-E (se aplicável)

Se ao executar `CREATE EXTENSION pg_stat_statements` aparecer erro relacionado a `shared_preload_libraries`:

- **Ação:** Ativar a extensão manualmente no painel Supabase: **Database > Extensions** e ativar `pg_stat_statements`.

---

## F1-C (se aplicável)

Se `git log --all --oneline -- .env .env.local .env.production` retornar commits:

- **Ação:** Rotacionar TODAS as chaves (Supabase service_role, Pluggy client_secret) e considerar `git-filter-repo` para limpar histórico antes do lançamento.

---

## F1-D

- **Ação manual necessária:**
  1. Criar conta em sentry.io (plano gratuito).
  2. Criar projeto `rxfin-production` (tipo: React).
  3. Copiar o DSN fornecido pelo Sentry.
  4. Na Vercel: Settings > Environment Variables > adicionar `VITE_SENTRY_DSN` = [seu DSN] para Production (e Preview se quiser).
  5. Para testar em dev: adicionar `VITE_SENTRY_DSN` no `apps/web/.env.local` (deixar vazio para não enviar eventos em desenvolvimento).

---
