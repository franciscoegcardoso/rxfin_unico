# Parte A — Resultado da execução do diagnóstico

Documento gerado pela execução da **Parte A** do plano de refatoração (UI e backend). Contém o estado atual do menu/navegação e o inventário de uso do backend no frontend.

---

## A.1 Menu e navegação — estado atual

### Desktop
- **Fonte:** TopNavbar usa `useNavMenuPages()`.
- **Dados:** Query em `pages` + `page_groups`; se vazio, usa `getStaticFallbackItems()`.
- **Fallback atual:**  
  - **mainItems:** Início, Bens e Investimentos, Lançamentos, Meu IR (4 itens).  
  - **groupedSections:** Planejamento (3 itens), Controles (2), Simuladores (2), Configurações (2).
- **Conclusão:** Estrutura do fallback está alinhada à desejada (Bens e Investimentos, Lançamentos, grupos). Se o DB retornar vazio ou desatualizado, o menu já fica correto pelo fallback.

### Mobile
- **Fonte:** MobileShell usa `nav-config.tsx` → `NAV_ITEMS` (5 itens fixos).
- **Itens atuais:**

| path                  | label exibido   | Observação                                      |
|-----------------------|-----------------|-------------------------------------------------|
| /inicio               | Home            | OK (poderia ser "Início").                      |
| /lancamentos          | Lançamentos     | OK.                                             |
| /bens-investimentos   | **Investimentos** | **Errado:** deveria ser "Bens e Investimentos". |
| /simuladores          | **FIPE**        | **Errado:** deveria ser "Simuladores" (hub).    |
| /minha-conta          | **Perfil**      | **Errado:** deveria ser "Minha Conta".          |

- **Conclusão:** Labels incorretos (Investimentos, FIPE, Perfil). Sem grupos; apenas 5 itens na bottom nav.

### Sidebar (design-system)
- **Fonte:** `nav-config.tsx` → `NAV_ITEMS` (mesmos 5 itens).
- **Uso:** Sidebar.tsx (ex.: quando usado em layout que ainda renderiza Sidebar).
- **Conclusão:** Mesmos problemas de label que no mobile.

### TITLE_MAP (nav-config.tsx)
- **Estado:** Correto para rotas conhecidas (Bens e Investimentos, Consolidado, Patrimônio, Investimentos, Crédito, Seguros, Simuladores, Simulador FIPE, Minha Conta).
- **Função:** `getPageTitle(pathname)` usa TITLE_MAP; usado no header do MobileShell. Não corrige os labels dos itens da bottom nav (NAV_ITEMS).

### Estrutura desejada (referência)
- **Itens principais:** Início, Bens e Investimentos, Lançamentos.
- **Grupos (dropdowns):** Planejamento, Controles, Simuladores, Configurações (cada um com suas páginas).
- **Gap:** nav-config não reflete essa estrutura e usa labels errados; mobile/sidebar não têm grupos.

---

## A.2 Backend — inventário de uso no frontend

### Tabelas / views usadas em `supabase.from(...)`

Lista única extraída do código (inclui ` as any` onde aplicável):

| Tabela / view                     | Uso típico / observação |
|-----------------------------------|--------------------------|
| ai_feedback                       | Admin dashboard, feedback Cibélia |
| ai_onboarding_events              | RaioX, onboarding, steps |
| app_settings                      | Admin deferred mutations |
| budget_packages                   | orcamento.ts |
| bill_splits                       | billsplit.ts |
| contas_pagar_receber             | contas, useUserFinancialInstitutions |
| consorcios                       | useCreditos |
| credit_card_bills                 | Cartão, InstallmentEditDialog, useUserFinancialInstitutions |
| credit_card_imports              | useUserFinancialInstitutions |
| credit_card_transactions_v       | View; cartão, sync, consolidação |
| crm_activities                    | CrmUserDetailSheet |
| crm_automations                   | Admin dashboard, useCrmAutomations |
| crm_notes                         | CrmUserDetailSheet |
| default_income_items              | FinancialContext |
| default_expense_items             | FinancialContext |
| deletion_audit_log                | useUserTrash (fetch + insert). **Problema conhecido:** 404 PGRST205 em produção (tabela não encontrada no schema cache). Migração existe (20260108053030). |
| deploy_history                    | RollbackPanel |
| email_campaigns                   | Admin deferred mutations |
| email_templates                   | Admin deferred mutations |
| favorite_vehicles                 | (migrations) |
| financiamentos                   | useCreditos, ativos |
| legal_document_versions           | Admin deferred mutations |
| migration_rollbacks               | RollbacksTab |
| market_regime_annual              | useMarketRegimeData |
| notification_templates           | Admin deferred mutations |
| onboarding_phase_history          | AdminOnboardingTab |
| page_groups                       | useNavMenuPages, useAdminDeferredMutations, Admin dashboard |
| pages                             | useNavMenuPages, useSimulatorBySlug, Admin dashboard, useAdminDeferredMutations |
| page_views                        | Hub, SimuladorFipe, SimuladorCustoHora (insert). **Problema conhecido:** 403 Forbidden (RLS). CREATE TABLE não localizado nas migrations com grep; tabela pode existir em outro arquivo ou projeto. |
| plan_comparison_features          | Admin deferred mutations |
| pluggy_accounts                   | useUserFinancialInstitutions |
| pluggy_connections                | StepFluxo |
| pluggy_transactions               | useCreditCardTransactions |
| profiles                          | Vários (auth, onboarding, CRM, admin) |
| purchase_registry                 | metas.ts |
| store_category_rules              | useStoreCategoryRules, useCreditCardTransactions |
| store_friendly_name_rules         | useCreditCardTransactions |
| subscription_plans               | Admin, useAdminUsers |
| sync_jobs_v                       | usePluggyCreditCardSync (update) |
| transactions                      | StepFluxo |
| user_assets                       | ativos, useUserAssets, StepPatrimonio |
| user_asset_monthly_entries       | useUserAssetMonthlyEntries |
| user_consents                     | Signup |
| user_dreams                       | useUserDreams, StepMetas, metas |
| user_expense_items                | FinancialContext, onboardingV3, default params |
| user_financial_institutions       | useUserFinancialInstitutions |
| user_income_items                 | FinancialContext, onboardingV3 |
| user_kv_store                     | onboardingV3Persistence |
| user_monthly_entries              | StepPlanejamento, useUserMonthlyEntries |
| user_roles                        | useAdminUsers |
| user_shared_persons               | useUserSharedPersons |
| user_trash                        | useUserTrash, core/trash. Código e tipos (integrations/types, supabase/types) usam `user_trash`; migrations criam apenas `asset_trash`. Possível view/alias `user_trash` no DB ou inconsistência de nome. |
| user_vehicle_records              | useUserVehicleRecords |
| vehicle_segments                  | useMarketRegimeData |
| v_crm_kanban                      | View; AdminCRM |
| v_user_plan                       | useAdminUsers |
| workspaces                        | useAdminUsers, useSimulatorBySlug |
| lancamentos_realizados_v         | View; lancamentos, useConsolidatedData, usePluggyBankSync |
| lancamento_metadata               | usePluggyBankSync |
| ir_comprovantes                   | core/ir |
| ir_fiscal_chat                    | useFiscalOrganizer |
| rxsplit_* (contacts, groups, etc.)| core/rxsplit |
| fipe_price_history               | useFipe |

### RPCs usados em `supabase.rpc(...)`

Lista única:

| RPC | Uso / observação |
|-----|-------------------|
| get_user_profile_settings | ProtectedRoute, onboarding, AuthCallback, MagicLinkHandler, useAuthRedirect, useProfileSettings, useAIOnboarding, RaioXChat, onboardingPersistence, FinancialContext. **Crítico.** Problema conhecido: timeout/erro em alguns ambientes. |
| get_notifications_page | Notificacoes.tsx |
| get_unread_notification_count | Notificacoes.tsx |
| mark_notification_read / mark_all_notifications_read | Notificacoes, useNotifications |
| get_bell_notifications | useNotifications |
| get_trash_items | core/trash (useUserTrash usa .from + .rpc move_to_trash/restore) |
| restore_from_trash | useUserTrash, core/trash |
| move_to_trash | useUserTrash |
| empty_trash | core/trash |
| log_crud_operation | useAuditLog, auditLog.ts |
| get_ai_mvp_metrics | AIMetrics |
| get_admin_strategic_dashboard | useAdminStrategicDashboard |
| get_architecture_health_snapshot | useArchitectureHealth |
| check_and_create_sync_job | AuthContext |
| get_gifts_planner | useGiftsPlanner |
| log_admin_action | useAdminAudit |
| get_lancamentos_summary | useLancamentosSummary |
| get_dashboard_enhanced | useDashboardEnhanced |
| get_user_plan_slug | useAffiliateReferralTracker |
| get_expense_trends | useExpenseTrends |
| get_credit_card_dashboard | useCreditCardDashboard |
| get_onboarding_contextual_insight | OnboardingInsightCard |
| get_onboarding_categories | StepFluxo, StepPlanejamento, BlockA |
| advance_onboarding_phase | useOnboardingCheckpoint |
| advance_onboarding_control_phase | useOnboardingControlCheckpoint |
| calculate_milestone_* (identity, patrimony, cashflow, mastery) | Blocks A–D, StepMetas, StepGrandFinale |
| save_onboarding_block_a | BlockA |
| get_fipe_safra_analysis | fipeSafra |
| get_financial_report | useFinancialReport |
| apply_store_category_rule | useStoreCategoryRules, storeCategoryRules |
| apply_store_friendly_name_rule | storeFriendlyNameRules |
| split_transaction | InstallmentEditDialog |
| get_admin_dashboard_metrics_30d / get_admin_dashboard_chart_data | AdminDashboard |
| admin_delete_user | UserDeleteDialog |
| get_admin_users_with_roles | useAdminRoles |
| owner_set_admin_role | useAdminRoles |
| get_role_change_history | useAdminRoles |
| admin_manage_role | useAdminUsers, useAdminDeferredMutations |
| get_vehicle_dashboard | useVehicleDashboard |
| get_pluggy_date_coverage | usePluggyCreditCardSync |
| get_unsynced_pluggy_transactions | usePluggyCreditCardSync |
| repair_pluggy_installment_data / repair_orphan_bill_links | usePluggyCreditCardSync |
| get_unsynced_bank_transactions | usePluggyBankSync |
| get_pluggy_bank_date_coverage | usePluggyBankSync |
| get_monthly_consolidation | useMonthlyConsolidation |
| get_recurring_expenses_overview | useRecurringExpenses |
| get_smart_alerts | useSmartAlerts |
| get_fipe_years | useFipeYears |
| get_annual_overview | useAnnualOverview |
| get_banking_overview | useBankingOverview |
| get_patrimonio_overview | usePatrimonioOverview |
| get_home_dashboard | useHomeDashboard |
| get_budget_vs_actual | useBudgetVsActual |
| get_fipe_models | useFipeModels |
| get_fipe_brands | useFipeBrands |
| get_fipe_price_history | useFipeFullHistory |
| get_fipe_admin_summary | useFipeAdminSummary |
| get_subscription_plans_public | Planos |
| admin_send_notification | SendNotificationForm |
| admin_get_notifications_with_stats | NotificationsHistory |
| admin_rollback_migration | RollbacksTab |
| get_connection_pool_health / get_long_blocking_activity | DatabaseHealthDashboard |
| create_lancamento, upsert_lancamento, update_lancamento, mark_lancamento_paid, duplicate_lancamento_next_month, soft_delete_lancamento | core/lancamentos |
| apply_lancamento_friendly_name_rule | core/lancamentos |

---

## A.3 Backend — problemas conhecidos (resumo)

| Item | Tipo | Evidência | Prioridade |
|------|------|-----------|------------|
| deletion_audit_log | Tabela | 404 PGRST205 "Could not find the table 'public.deletion_audit_log'". Migração 20260108053030 cria a tabela. | **Alta** (uso em Lixeira). Possível causa: migração não aplicada no ambiente que retorna 404. |
| page_views | Tabela + RLS | POST 403. Só há política SELECT para admins em migrations; não há CREATE TABLE encontrado no grep. | **Média** (analytics; insert já tem .catch no frontend). Verificar se tabela existe no projeto/Supabase e qual política de INSERT. |
| get_user_profile_settings | RPC | Timeout/erro em alguns acessos; usado em onboarding e auth. | **Crítica**. Já existe timeout e fallback no frontend; validar existência e performance no backend. |
| user_trash vs asset_trash | Nome | Frontend usa `user_trash`; migrations criam `asset_trash`. | **Alta**. Confirmar se existe view/alias `user_trash` ou migração que renomeia. |

---

## A.4 Próximos passos (conforme plano)

- **Fase 1:** Corrigir labels e estrutura do menu (nav-config.tsx e, se necessário, fallback em useNavMenuPages); alinhar mobile/sidebar à estrutura desejada.
- **Fase 2:** Confirmar no schema real (Supabase ou migrations completas) quais tabelas/views e RPCs existem; marcar existente/não existente/nome diferente.
- **Fase 3:** Resolver deletion_audit_log (aplicar migração ou criar tabela no ambiente que retorna 404), page_views (tabela + RLS INSERT), get_user_profile_settings (existência/performance), e user_trash/asset_trash (nome correto no código ou no DB).

Este documento deve ser usado como referência para as Fases 1 a 6 do plano principal (`PLANO-REFATORACAO-UI-E-BACKEND.md`).
