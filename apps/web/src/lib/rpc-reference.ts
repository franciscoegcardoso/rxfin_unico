/**
 * Main Supabase RPCs used by the app. Prefer calling these over direct table queries.
 * All RPCs use auth.uid() when p_user_id is not passed.
 *
 * Dashboard/Home:
 * - get_home_dashboard(p_user_id?, p_month?) — user, month_summary, expenses_by_category, category_goals, credit_cards, insurance_alerts, upcoming_events, budget_composition, features, packages, onboarding
 * - get_dashboard_summary(p_user_id?, p_month?) — income, expense, balance, prev_month, variation, expense_by_category, payment_status, credit_card
 * - get_dashboard_enhanced(p_user_id?, p_month?) — summary, credit_cards, top_categories, recent_transactions, user_info
 *
 * Lançamentos:
 * - get_lancamentos_summary(p_user_id?, p_month?) — summary (total_income, total_expense), top_categories, by_payment_method (used by Análise modal)
 *
 * Planejamento:
 * - get_budget_vs_actual(p_user_id?, p_month?) — income, expenses, savings, credit_cards (planned vs actual)
 *
 * Cartão de crédito:
 * - get_credit_card_dashboard(p_user_id?, p_month?) — bills, transactions, summary
 *
 * Bens/Patrimônio:
 * - get_patrimonio_overview(p_user_id?) — assets, vehicles, financiamentos, consorcios, seguros, goals, net_worth
 *
 * Veículos:
 * - get_vehicle_dashboard(p_user_id?) — vehicles, records, summary
 *
 * Alertas / Recorrentes:
 * - get_smart_alerts(p_user_id?, p_month?)
 * - get_recurring_expenses_overview(p_user_id?, p_months?)
 *
 * Financeiro:
 * - get_budget_vs_actual(p_user_id?, p_month?) — orçado vs realizado
 * - get_financial_report(p_user_id?, p_start_month?, p_end_month?) — relatório financeiro
 * - get_smart_alerts(p_user_id?, p_month?) — alertas inteligentes
 *
 * Admin/Landing:
 * - get_landing_analytics(p_days?) — analytics da landing
 * - get_database_health() — saúde do banco
 */

export const RPC_NAMES = {
  get_home_dashboard: 'get_home_dashboard',
  get_dashboard_summary: 'get_dashboard_summary',
  get_dashboard_enhanced: 'get_dashboard_enhanced',
  get_lancamentos_summary: 'get_lancamentos_summary',
  get_budget_vs_actual: 'get_budget_vs_actual',
  get_credit_card_dashboard: 'get_credit_card_dashboard',
  get_patrimonio_overview: 'get_patrimonio_overview',
  get_vehicle_dashboard: 'get_vehicle_dashboard',
  get_smart_alerts: 'get_smart_alerts',
  get_recurring_expenses_overview: 'get_recurring_expenses_overview',
  get_financial_report: 'get_financial_report',
  get_landing_analytics: 'get_landing_analytics',
  get_database_health: 'get_database_health',
} as const;
