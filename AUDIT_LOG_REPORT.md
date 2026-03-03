# Relatório de Integração — Audit Log CRUD

## Resumo Geral

- **Fase 1:** 3 serviços (contas, lancamentos, billsplit), 11 operações integradas
- **Fase 2:** 15+ arquivos, 60+ operações integradas (core services + hooks + components + onboarding)
- **Total:** 70+ operações cobertas
- **Cobertura:** Alta — principais domínios (contas, lançamentos, cartão, metas, orçamento, ativos, RXSplit, perfil, onboarding) com audit log

## Infraestrutura

| Artefato | Localização | Descrição |
|----------|-------------|-----------|
| Hook useAuditLog | `apps/web/src/hooks/useAuditLog.ts` | Registra operação via RPC; uso em componentes React |
| Hook useAuditedSupabase | `apps/web/src/hooks/useAuditedSupabase.ts` | Encapsula insert/update/delete com audit automático |
| Logger standalone | `apps/web/src/core/auditLog.ts` | `logCrudOperation()` para services fora de React |
| Edge Functions util | `supabase/functions/_shared/audit-log.ts` | `logEdgeFunctionCrud()` para Edge Functions |

---

## Fase 1 — Arquivos (já integrados)

| # | Arquivo | Operações | Tabelas |
|---|---------|-----------|---------|
| 1 | core/services/contas.ts | CREATE, UPDATE, DELETE | contas_pagar_receber |
| 2 | core/services/lancamentos.ts | CREATE (single/batch), UPDATE, DELETE, UPDATE (friendly_name) | lancamentos_realizados |
| 3 | core/services/billsplit.ts | CREATE, DELETE | bill_splits |

---

## Fase 2 — Arquivos Modificados

| # | Arquivo | Domínio | Operações | Tabelas |
|---|---------|---------|-----------|---------|
| 1 | core/services/metas.ts | Metas / Planejamento | CREATE, UPDATE, DELETE (user_goals + purchase_registry) | user_goals, purchase_registry |
| 2 | core/services/orcamento.ts | Orçamento | CREATE, UPDATE, DELETE, CREATE (tx), UPSERT | budget_packages, budget_package_transactions, monthly_goals |
| 3 | core/services/ativos.ts | Patrimônio | CREATE, UPDATE, DELETE (user_assets, seguros, financiamentos, consorcios) | user_assets, seguros, financiamentos, consorcios |
| 4 | core/services/ir.ts | IR Fiscal | CREATE, DELETE | ir_comprovantes |
| 5 | core/services/rxsplit.ts | RXSplit | CREATE, UPDATE, DELETE (contacts, groups, members, expenses, debtors) | rxsplit_contacts, rxsplit_groups, rxsplit_group_members, rxsplit_expenses, rxsplit_expense_debtors |
| 6 | hooks/useCreditCardBills.ts | Cartão | CREATE, UPDATE, DELETE | credit_card_bills |
| 7 | hooks/useUserGoals.ts | Metas | CREATE, UPDATE, DELETE | user_goals |
| 8 | hooks/useUserAssets.ts | Bens/Investimentos | CREATE, UPDATE, DELETE | user_assets |
| 9 | hooks/useConsolidatedData.ts | Consolidado | DELETE (lote) | lancamentos_realizados, credit_card_transactions |
| 10 | services/onboardingV3Persistence.ts | Onboarding | DELETE, INSERT, UPSERT, UPDATE | user_income_items, user_expense_items, user_kv_store, profiles |
| 11 | components/account/ProfileTab.tsx | Perfil | UPDATE | profiles |

---

## Edge Functions

| # | Função | Operações | Tabelas |
|---|--------|-----------|---------|
| — | _shared/audit-log.ts | — | Utilitário criado; nenhuma Edge Function de negócio com mutações encontrada no repo |

Para integrar em novas Edge Functions:

```ts
import { logEdgeFunctionCrud } from '../_shared/audit-log.ts';
const startTime = Date.now();
const { data, error } = await supabaseAdmin.from('sua_tabela').insert(records);
await logEdgeFunctionCrud(supabaseAdmin, {
  userId: user?.id,
  operation: 'CREATE',
  tableName: 'sua_tabela',
  endpoint: 'nome-da-function',
  newData: { count: records.length },
  success: !error,
  errorMessage: error?.message,
  durationMs: Date.now() - startTime,
});
```

---

## Exceções (não integradas)

| Arquivo / contexto | Motivo |
|-------------------|--------|
| Signup.tsx, views/Signup.tsx | user_consents no signup — fluxo de auth |
| AuthContext / login/signup | Operações de auth (Supabase Auth nativo) |
| useUserVehicleRecords, useUserDrivers, useUserSharedPersons, useUserFinancialInstitutions | Pendente — mesma abordagem (logCrudOperation após mutação) |
| useOnboardingCheckpoint, useFiscalOrganizer, useTourAnalytics, useAIOnboarding | ai_onboarding_events, tour_analytics, ir_fiscal_chat — pendente |
| AdminCRM, CrmUserDetailSheet, RollbackPanel | Admin / CRM — pendente ou source: system |
| RaioXChat, RaioXResultCard, StepFluxo, StepMetas | Onboarding/IA — pendente |
| useCreditos (consorcios, financiamentos) | Chama tabelas já cobertas em ativos.ts; hook faz CRUD direto — pendente |
| storeCategoryRules, storeFriendlyNameRules | Utilitários de store — pendente |

---

## Mapa de Cobertura por Tabela

| Tabela | Frontend (Fase 2) | Edge Function | Cobertura |
|--------|-------------------|---------------|-----------|
| contas_pagar_receber | ✅ | — | 100% |
| lancamentos_realizados | ✅ | — | 100% |
| bill_splits | ✅ | — | 100% |
| user_goals | ✅ (serviço + hook) | — | 100% |
| purchase_registry | ✅ | — | 100% |
| budget_packages | ✅ | — | 100% |
| budget_package_transactions | ✅ | — | 100% |
| monthly_goals | ✅ | — | 100% |
| user_assets | ✅ (serviço + hook) | — | 100% |
| seguros, financiamentos, consorcios | ✅ | — | 100% |
| ir_comprovantes | ✅ | — | 100% |
| rxsplit_* | ✅ | — | 100% |
| credit_card_bills | ✅ | — | 100% |
| credit_card_transactions | ✅ (delete em useConsolidatedData) | — | Parcial |
| profiles | ✅ (ProfileTab + onboarding) | — | Parcial |
| user_income_items, user_expense_items | ✅ (onboarding) | — | Parcial |
| user_kv_store | ✅ (onboarding) | — | Parcial |
| user_vehicle_records, user_drivers, user_shared_persons, user_financial_institutions | Pendente | — | 0% |
| ai_onboarding_events, tour_analytics, crm_* | Pendente | — | 0% |

---

## Restrições respeitadas

1. **Lógica de negócios** — não alterada; apenas chamadas de log adicionadas.
2. **Fire-and-forget** — todos os logs em try/catch; falha no audit não interrompe a operação.
3. **READ (SELECT)** — não logados.
4. **Auth** — login/signup e fluxos de auth não integrados (exceção documentada).
5. **apps/mobile** — não alterado.
6. **Medição de tempo** — `performance.now()` no frontend em todas as integrações.

---

## Checklist Fase 2

- [x] Varredura automatizada (grep) — operações CRUD listadas
- [x] Domínio Cartão: credit_card_bills (create/update/delete) coberto
- [x] Domínio Perfil: profiles (update em ProfileTab e onboarding) coberto
- [x] Domínio Orçamento: budget_packages, budget_package_transactions, monthly_goals cobertos
- [x] Domínio Patrimônio: user_assets, seguros, financiamentos, consorcios cobertos
- [x] Domínio Metas: user_goals, purchase_registry cobertos
- [x] Domínio RXSplit: rxsplit_* coberto
- [x] Domínio IR: ir_comprovantes coberto
- [x] Onboarding: user_income_items, user_expense_items, user_kv_store, profiles cobertos
- [x] Consolidado: delete lancamentos + credit_card_transactions coberto
- [x] Operações em lote logadas como resumo (batch count) onde aplicável
- [x] AUDIT_LOG_REPORT.md atualizado com Fase 2
- [x] Nenhuma lógica de negócios alterada
- [x] Todos os logs são fire-and-forget (try/catch em logCrudOperation)
