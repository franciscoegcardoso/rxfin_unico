# Auditoria infra (PROMPT 4 e 5)

Data: 2026-03-21

## PROMPT 4 — Realtime em tabelas de log

**Busca:** `supabase.channel(` e `.on('postgres_changes'` em `*.ts` / `*.tsx` do monorepo.

**Resultado:**

| Arquivo | Tabela observada |
|---------|------------------|
| `apps/web/src/hooks/useOnboardingCheckpoint.ts` | `onboarding_state` |
| `apps/web/src/hooks/useBannerState.ts` | `onboarding_state` |

Nenhuma subscription aponta para: `service_health_log`, `pluggy_sync_logs`, `audit_trail`, `mv_refresh_log`, `analytics_events`, `admin_sessions`.

**Ação:** nenhuma remoção necessária.

---

## PROMPT 5 — Queries diretas a tabelas RLS

**Busca:** referências a `cdi_monthly`, `ibov_monthly`, `ir_pluggy_type_map`, `asset_price_history`, `db_registry`, `growth_trigger_log`, `api_admin_activity`, `api_reveal_rate_limit` no código TypeScript/TSX do repo.

**Resultado:** nenhuma ocorrência no frontend (`apps/web/src`).

**Ação:** nenhuma alteração de código. Se surgirem queries a tabelas admin-only, restringir ao portal admin ou checar role antes da query.

---

## PROMPT 2 — Ocorrências `v_user_plan` (referência)

| Local | Filtro |
|-------|--------|
| `apps/web/src/hooks/useAdminUsers.ts` | `.in('user_id', userIds)` |
| `apps/mobile/lib/auth-context.tsx` | `.eq('user_id', userId).single()` |
| `apps/web/supabase/functions/send-email-n8n/index.ts` | Edge (service role) |
| `apps/web/supabase/functions/send-campaign-email/index.ts` | Edge (service role) |
