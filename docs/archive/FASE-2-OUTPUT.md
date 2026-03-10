# Fase 2 — Backend: inventário e tabelas/RPCs críticos — Output

Documento gerado pela execução da **Fase 2** do plano de refatoração. Contém o inventário de uso do Supabase no frontend, o confronto com o schema (migrations + types) e a lista priorizada de itens inexistentes ou com assinatura diferente.

**Fontes de verdade usadas:**
- **Frontend:** `apps/web/src` — buscas por `supabase.from('...')` e `supabase.rpc('...')`.
- **Backend (migrations):** `apps/web/supabase/migrations` — `CREATE TABLE`, `CREATE VIEW`, `CREATE OR REPLACE FUNCTION`.
- **Backend (root):** `supabase/migrations` (quando aplicável, ex.: `get_notifications_page`).
- **Tipos:** `apps/web/src/integrations/supabase/types.ts` — `Tables`, `Views`, `Functions`.

---

## 2.1 Inventário — Tabelas e views usadas no frontend

Lista única de entidades referenciadas em `supabase.from('...')` no código, com arquivos principais e existência no backend.

| Tabela / view | Usado em (principais) | Em migrations (apps/web) | Em types | Existe? | Observação |
|---------------|------------------------|--------------------------|----------|---------|------------|
| ai_feedback | AdminDashboard, RaioXChat | — | sim | **Sim** | Table em types |
| ai_onboarding_events | RaioXChat, onboarding, steps | — | sim | **Sim** | Table em types |
| app_settings | useAdminDeferredMutations | — | sim | **Sim** | |
| budget_packages | orcamento.ts | sim | sim | **Sim** | |
| bill_splits | billsplit.ts, rxsplit | sim | sim | **Sim** | |
| contas_pagar_receber | contas, useUserFinancialInstitutions | sim | sim | **Sim** | |
| consorcios | useCreditos | sim | sim | **Sim** | |
| credit_card_bills | Cartão, useUserFinancialInstitutions | sim | sim | **Sim** | |
| credit_card_imports | useUserFinancialInstitutions | sim | sim | **Sim** | |
| credit_card_transactions_v | Cartão, sync, useConsolidatedData | não | sim | **Sim** | View; só em types (view no DB) |
| crm_activities | CrmUserDetailSheet | — | sim | **Sim** | |
| crm_automations | Admin, useCrmAutomations | sim | sim | **Sim** | |
| crm_notes | CrmUserDetailSheet | — | sim | **Sim** | |
| default_income_items | FinancialContext | sim | sim | **Sim** | |
| default_expense_items | FinancialContext | sim | sim | **Sim** | |
| deletion_audit_log | useUserTrash | sim (20260108) | sim | **Verificar** | 404 em produção; migração existe; pode não estar aplicada no ambiente |
| deploy_history | RollbackPanel | sim | sim | **Sim** | |
| email_campaigns | useAdminDeferredMutations | sim | sim | **Sim** | |
| email_templates | useAdminDeferredMutations | sim | sim | **Sim** | |
| financiamentos | useCreditos, ativos | sim | sim | **Sim** | |
| lancamentos_realizados_v | lancamentos.ts, useConsolidatedData, usePluggyBankSync | não | sim (refs) | **Sim** | View; não encontrada em apps/web/migrations; está em types como referência |
| legal_document_versions | useAdminDeferredMutations | sim | sim | **Sim** | |
| migration_rollbacks | RollbacksTab | sim | sim | **Sim** | |
| market_regime_annual | useMarketRegimeData | sim | sim | **Sim** | |
| notification_templates | useAdminDeferredMutations | sim | sim | **Sim** | |
| onboarding_phase_history | AdminOnboardingTab | sim | sim | **Sim** | |
| page_groups | useNavMenuPages, Admin | sim | sim | **Sim** | |
| pages | useNavMenuPages, Admin, useSimulatorBySlug | sim | sim | **Sim** | |
| page_views | Hub, SimuladorFipe, SimuladorCustoHora | não (só RLS) | não | **Verificar** | CREATE TABLE não encontrado; RLS em 20260220032922; 403 no INSERT |
| plan_comparison_features | useAdminDeferredMutations | sim | sim | **Sim** | |
| pluggy_accounts | useUserFinancialInstitutions | sim | sim | **Sim** | |
| pluggy_connections | StepFluxo | sim | sim | **Sim** | |
| pluggy_transactions | useCreditCardTransactions | sim | sim | **Sim** | |
| profiles | Vários (auth, CRM, onboarding) | sim | sim | **Sim** | |
| purchase_registry | metas.ts | sim | sim | **Sim** | |
| store_category_rules | useStoreCategoryRules, useCreditCardTransactions | sim | sim | **Sim** | |
| store_friendly_name_rules | useCreditCardTransactions | sim | sim | **Sim** | |
| subscription_plans | Admin, useAdminUsers | sim | sim | **Sim** | |
| sync_jobs_v | usePluggyCreditCardSync | não | sim (refs) | **Sim** | View; não em apps/web/migrations |
| transactions | StepFluxo | — | sim | **Sim** | |
| user_assets | ativos, useUserAssets, StepPatrimonio | sim | sim | **Sim** | |
| user_asset_monthly_entries | useUserAssetMonthlyEntries | sim | sim | **Sim** | |
| user_consents | Signup | sim | sim | **Sim** | |
| user_dreams | useUserDreams, StepMetas, metas | não (user_goals em migração) | sim | **Sim** | types têm user_dreams; migrations criam user_goals (backend pode ter renomeado) |
| user_expense_items | FinancialContext, onboardingV3 | sim | sim | **Sim** | |
| user_financial_institutions | useUserFinancialInstitutions | sim | sim | **Sim** | |
| user_income_items | FinancialContext, onboardingV3 | sim | sim | **Sim** | |
| user_kv_store | onboardingV3Persistence | sim | sim | **Sim** | |
| user_monthly_entries | StepPlanejamento, useUserMonthlyEntries | sim | sim | **Sim** | |
| user_roles | useAdminUsers | sim | sim | **Sim** | |
| user_shared_persons | useUserSharedPersons | sim | sim | **Sim** | |
| user_trash | useUserTrash, core/trash | não (asset_trash) | sim | **Verificar** | Migrations criam `asset_trash`; types e código usam `user_trash` (possível view/alias) |
| user_vehicle_records | useUserVehicleRecords | sim | sim | **Sim** | |
| vehicle_segments | useMarketRegimeData | sim | sim | **Sim** | |
| v_crm_kanban | AdminCRM | não | sim | **Sim** | View em types |
| v_user_plan | useAdminUsers | sim (view) | sim | **Sim** | 20260220015213 |
| workspaces | useAdminUsers, useSimulatorBySlug | — | sim | **Sim** | |
| lancamento_metadata | usePluggyBankSync | sim | sim | **Sim** | |
| ir_comprovantes | core/ir | sim | sim | **Sim** | |
| ir_fiscal_chat | useFiscalOrganizer | sim | sim | **Sim** | |
| rxsplit_* | core/rxsplit | sim | sim | **Sim** | |
| fipe_price_history | useFipe | sim | sim | **Sim** | |

---

## 2.2 Inventário — RPCs usados no frontend

Lista única de RPCs referenciados em `supabase.rpc('...')`, com existência em migrations (apps/web) e em types.

| RPC | Usado em (principais) | Em migrations | Em types | Existe? | Observação |
|-----|------------------------|---------------|----------|---------|------------|
| get_user_profile_settings | ProtectedRoute, onboarding, AuthCallback, useProfileSettings, RaioXChat, etc. | não | não | **Não** | Crítico; timeout/erro em produção; não encontrado em migrations nem types |
| get_notifications_page | Notificacoes.tsx | root supabase | não | **Verificar** | Criado em supabase/migrations (root); não em types |
| get_unread_notification_count | Notificacoes.tsx | sim | sim | **Sim** | 20260212194742 |
| mark_notification_read | Notificacoes, useNotifications | — | não | **Verificar** | Nome pode variar (mark_read, etc.); conferir migrations |
| mark_all_notifications_read | Notificacoes, useNotifications | — | não | **Verificar** | |
| get_bell_notifications | useNotifications | — | não | **Verificar** | |
| get_trash_items | core/trash | não | não | **Não** | Lixeira; não encontrado |
| restore_from_trash | useUserTrash, core/trash | não | sim | **Sim** | Em types |
| move_to_trash | useUserTrash | não | sim | **Sim** | Em types |
| empty_trash | core/trash | não | não | **Verificar** | |
| log_crud_operation | useAuditLog, auditLog | não | não | **Verificar** | |
| get_ai_mvp_metrics | AIMetrics | não | sim | **Sim** | |
| get_architecture_health_snapshot | useArchitectureHealth | não | não | **Verificar** | |
| check_and_create_sync_job | AuthContext | sim | sim | **Sim** | 20260221114823 |
| get_gifts_planner | useGiftsPlanner | não | não | **Verificar** | |
| log_admin_action | useAdminAudit | sim | sim | **Sim** | 20260204181522 |
| get_lancamentos_summary | useLancamentosSummary | não | não | **Verificar** | |
| get_dashboard_enhanced | useDashboardEnhanced | não | não | **Verificar** | |
| get_user_plan_slug | useAffiliateReferralTracker | sim | sim | **Sim** | 20260220014459 (get_user_plan_slug) |
| get_expense_trends | useExpenseTrends | não | não | **Verificar** | |
| get_credit_card_dashboard | useCreditCardDashboard | não | não | **Verificar** | |
| get_onboarding_contextual_insight | OnboardingInsightCard | não | sim | **Sim** | Em types |
| get_onboarding_categories | StepFluxo, StepPlanejamento, BlockA | não | sim | **Sim** | Em types |
| advance_onboarding_phase | useOnboardingCheckpoint | não | sim | **Sim** | Em types |
| advance_onboarding_control_phase | useOnboardingControlCheckpoint | não | sim | **Sim** | Em types |
| calculate_milestone_* | Blocks A–D, StepMetas, StepGrandFinale | não | sim | **Sim** | Em types |
| save_onboarding_block_a | BlockA | não | sim | **Sim** | Em types |
| get_fipe_safra_analysis | fipeSafra | não | não | **Verificar** | |
| get_financial_report | useFinancialReport | não | sim | **Sim** | Em types |
| apply_store_category_rule | useStoreCategoryRules | sim | sim | **Sim** | 20260212191259 |
| apply_store_friendly_name_rule | storeFriendlyNameRules | sim | sim | **Sim** | 20260212204846 |
| split_transaction | InstallmentEditDialog | sim | sim | **Sim** | 20260210110004 |
| get_admin_dashboard_metrics_30d | AdminDashboard | sim | sim | **Sim** | 20260226042111 |
| get_admin_dashboard_chart_data | AdminDashboard | sim | sim | **Sim** | 20260226042111 |
| admin_delete_user | UserDeleteDialog | sim | sim | **Sim** | 20260131153259 |
| get_admin_users_with_roles | useAdminRoles | não | sim | **Sim** | Em types (admin_* ) |
| owner_set_admin_role | useAdminRoles | não | sim | **Sim** | Em types |
| get_role_change_history | useAdminRoles | não | não | **Verificar** | |
| admin_manage_role | useAdminUsers, useAdminDeferredMutations | não | sim | **Sim** | Em types |
| get_vehicle_dashboard | useVehicleDashboard | não | não | **Verificar** | |
| get_pluggy_date_coverage | usePluggyCreditCardSync | sim | sim | **Sim** | 20260210183933 |
| get_unsynced_pluggy_transactions | usePluggyCreditCardSync | sim | sim | **Sim** | 20260210183933 |
| repair_pluggy_installment_data | usePluggyCreditCardSync | sim | sim | **Sim** | 20260210172911 |
| repair_orphan_bill_links | usePluggyCreditCardSync | sim | sim | **Sim** | 20260210163219 |
| get_unsynced_bank_transactions | usePluggyBankSync | sim | sim | **Sim** | 20260220015213, 20260220031944 |
| get_pluggy_bank_date_coverage | usePluggyBankSync | sim | sim | **Sim** | 20260211034238 |
| get_monthly_consolidation | useMonthlyConsolidation | não | não | **Verificar** | |
| get_recurring_expenses_overview | useRecurringExpenses | não | não | **Verificar** | |
| get_smart_alerts | useSmartAlerts | não | não | **Verificar** | |
| get_fipe_years | useFipeYears | sim | sim | **Sim** | 20260206131057 |
| get_annual_overview | useAnnualOverview | não | não | **Verificar** | |
| get_banking_overview | useBankingOverview | não | não | **Verificar** | |
| get_patrimonio_overview | usePatrimonioOverview | não | não | **Verificar** | |
| get_home_dashboard | useHomeDashboard | não | não | **Verificar** | |
| get_budget_vs_actual | useBudgetVsActual | não | não | **Verificar** | |
| get_fipe_models | useFipeModels | sim | sim | **Sim** | 20260206131057 |
| get_fipe_brands | useFipeBrands | sim | sim | **Sim** | 20260206131057 |
| get_fipe_price_history | useFipeFullHistory | não | não | **Verificar** | |
| get_fipe_admin_summary | useFipeAdminSummary | não | não | **Verificar** | |
| get_subscription_plans_public | Planos | não | não | **Verificar** | |
| admin_send_notification | SendNotificationForm | sim | sim | **Sim** | 20260212194742 |
| admin_get_notifications_with_stats | NotificationsHistory | sim | sim | **Sim** | 20260212194742 |
| admin_rollback_migration | RollbacksTab | não | sim | **Sim** | Em types |
| get_connection_pool_health | DatabaseHealthDashboard | não | não | **Verificar** | |
| get_long_blocking_activity | DatabaseHealthDashboard | não | não | **Verificar** | |
| create_lancamento, upsert_lancamento, update_lancamento, mark_lancamento_paid, duplicate_lancamento_next_month, soft_delete_lancamento | core/lancamentos | não (apply_* sim) | não | **Verificar** | apply_lancamento_friendly_name_rule em migrations; demais RPCs de lancamento não encontrados |
| apply_lancamento_friendly_name_rule | core/lancamentos | sim | não | **Sim** | 20260216112214 |

**Nota:** Vários RPCs aparecem em `types.ts` (Functions) mas não em `apps/web/supabase/migrations` — podem estar em migrations do **root** `supabase/` ou ter sido gerados a partir de um schema remoto. O projeto tem duas pastas de migrations: `apps/web/supabase/migrations` e `supabase/migrations`.

---

## 2.3 Lista priorizada — Itens inexistentes ou a verificar

### Crítico
| Item | Tipo | Problema | Ação sugerida |
|------|------|----------|----------------|
| get_user_profile_settings | RPC | Não encontrado em migrations nem em types; usado em auth/onboarding; timeout em produção | Criar RPC no backend ou apontar para função existente equivalente; validar no Supabase remoto se existe com outro nome. |
| deletion_audit_log | Tabela | Migração existe; 404 em produção (tabela não no schema cache) | Garantir que a migração 20260108053030 esteja aplicada no ambiente de produção; ou criar migração idempotente. |
| user_trash vs asset_trash | Tabela | Código usa `user_trash`; migrations criam `asset_trash` | Confirmar no DB se existe view/alias `user_trash`; se não, criar view ou alterar frontend para `asset_trash`. |

### Alto
| Item | Tipo | Problema | Ação sugerida |
|------|------|----------|----------------|
| page_views | Tabela | Só RLS encontrado; CREATE TABLE não localizado; 403 no INSERT | Verificar se tabela existe no projeto/DB; criar migração de tabela + política INSERT para auth. |
| get_trash_items | RPC | Não encontrado | Implementar RPC ou confirmar nome no backend (ex.: retorno de view user_trash). |
| empty_trash | RPC | Não encontrado | Idem; pode existir com outro nome. |
| mark_notification_read / mark_all_notifications_read / get_bell_notifications | RPC | Não encontrados em types | Conferir em migrations (incl. root) e no PostgREST exposto. |
| create_lancamento, upsert_lancamento, update_lancamento, mark_lancamento_paid, duplicate_lancamento_next_month, soft_delete_lancamento | RPC | Não encontrados em migrations (apps/web) | Verificar em root supabase/migrations ou no schema remoto; podem estar em outro schema. |

### Médio
| Item | Tipo | Problema | Ação sugerida |
|------|------|----------|----------------|
| get_notifications_page | RPC | Existe em root supabase/migrations; não em types | Garantir deploy das migrations do root no mesmo projeto; regenerar types se necessário. |
| get_fipe_price_history | RPC | Não encontrado | Verificar em migrations (root/apps) e no DB. |
| get_subscription_plans_public | RPC | Não encontrado | Idem. |
| get_home_dashboard, get_annual_overview, get_banking_overview, get_patrimonio_overview, get_vehicle_dashboard | RPC | Não encontrados em migrations (apps/web) | Conferir em types e no schema remoto; podem existir apenas no DB. |
| get_lancamentos_summary, get_monthly_consolidation, get_recurring_expenses_overview, get_smart_alerts, get_dashboard_enhanced, get_expense_trends, get_credit_card_dashboard, get_budget_vs_actual | RPC | Não encontrados em migrations (apps/web) | Idem. |
| get_fipe_safra_analysis, get_fipe_admin_summary | RPC | Não encontrados | Idem. |
| get_architecture_health_snapshot, get_admin_strategic_dashboard, get_connection_pool_health, get_long_blocking_activity | RPC | Não encontrados | Admin/ops; verificar em migrations ou extensões. |
| get_gifts_planner, get_role_change_history | RPC | Não encontrados | Verificar no backend. |
| log_crud_operation | RPC | Não encontrado | Pode ser log_audit_action ou outro nome; conferir. |

---

## Critérios de validação Fase 2 (atingidos)

- [x] Documento com: tabela/RPC, usado em (arquivos), existe no backend (sim/não/verificar), observação.
- [x] Lista de itens “não existente” ou “assinatura diferente” com prioridade (crítico/alto/médio).

---

## Próximo passo (Fase 3)

Conforme o plano: **Backend — correções pontuais (tabelas e RPCs)** — resolver deletion_audit_log, page_views (RLS/INSERT), get_user_profile_settings, user_trash/asset_trash e, em seguida, os itens de prioridade alta.
