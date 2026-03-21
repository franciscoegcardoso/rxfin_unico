# RXFin — Fase 2: relatório PROMPTs 6–9

Referência: `rxfin_fase2_cursor_e_fase3_plano.md` (2026-03-21).

---

## PROMPT 6 — MVs financeiras (`mv_monthly_summary`, `mv_category_breakdown`, `mv_portfolio_allocation_status`)

### Ocorrências encontradas (antes das alterações)

| Arquivo | MV |
|---------|-----|
| `apps/web/src/hooks/useAllocationStatus.ts` | `mv_portfolio_allocation_status` |

**Nenhuma** ocorrência em TypeScript/TSX para `mv_monthly_summary` ou `mv_category_breakdown` (o projeto não consulta essas MVs diretamente no cliente).

### Ação

- Criada RPC `get_portfolio_allocation_status()` em `supabase/migrations/20260321130000_get_portfolio_allocation_status_rpc.sql` (SECURITY DEFINER, `WHERE user_id = auth.uid()`).
- `useAllocationStatus` passou a usar `supabase.rpc('get_portfolio_allocation_status')`.

**Aplicar a migration** no projeto Supabase antes de depender do hook em produção.

---

## PROMPT 7 — Edge Functions `verify_jwt: false` (diagnóstico)

Instrução do plano: **não alterar código — apenas diagnosticar**.

### Amostra verificada (padrão JWT)

| Função | Authorization + `getUser()` + 401 |
|--------|-----------------------------------|
| `ai-chat/index.ts` | Sim (`authHeader`, cliente com header, `getUser`) |
| `pluggy-sync/index.ts` | Sim |

### Recomendação

Auditar as demais funções críticas da lista (pluggy-connect, pluggy-webhook, save-user-cpf, etc.) com o mesmo checklist do documento antes de mudar `verify_jwt` no `config.toml`.

---

## PROMPT 8 — `pluggy_connections` / `pluggy_accounts` + `user_id` + `is_active`

### Busca

Combinações do tipo `.eq('user_id', …).eq('is_active', true)` em `pluggy_*` **não** encontradas no `apps/web/src`.

O código tende a filtrar conexões/contas com `.is('deleted_at', null)` (ex.: `core/services/pluggy.ts`, `usePluggyConnect.ts`).

### Conclusão

Nenhuma alteração necessária; índice em `user_id` continua adequado para os filtros atuais.

---

## PROMPT 9 — `mv_portfolio_allocation_status` em Bens & Investimentos

- **Consumo:** `useAllocationStatus.ts` (alocação / drift / health score).
- **RPC:** `get_portfolio_allocation_status()` (mesma migration do PROMPT 6).
- Campos esperados pelo frontend: ver `AllocationStatusRow` em `apps/web/src/types/allocation.ts` (`asset_class`, `target_pct`, `current_pct`, `drift_pct`, `drift_priority_score`, etc.).

---

## PARTE B — Plano Fase 3

Documento de referência apenas (PgBouncer, particionamento, MVs por usuário, read replica, schemas, archiving). **Sem tarefas de implementação neste relatório.**
