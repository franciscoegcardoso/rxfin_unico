/**
 * @rxfin/shared — Tipos compartilhados entre mobile, web e Edge Functions
 *
 * Este pacote é a fonte de verdade para tipos que cruzam fronteiras.
 * Importar sempre daqui, nunca duplicar.
 */

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

export const PLAN_SLUGS = ['free', 'starter', 'pro', 'admin'] as const;
export type PlanSlug = typeof PLAN_SLUGS[number];

export const USER_TYPES = ['principal', 'convidado'] as const;
export type UserType = typeof USER_TYPES[number];

export const EXPENSE_TYPES = ['variable_non_essential', 'variable_essential', 'fixed'] as const;
export type ExpenseType = typeof EXPENSE_TYPES[number];

export const PAYMENT_METHODS = ['credit_card', 'debit', 'pix', 'boleto', 'cash', 'transfer'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const TRANSACTION_TYPES = ['receita', 'despesa'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

export const BILL_STATUS = ['open', 'closed', 'paid'] as const;
export type BillStatus = typeof BILL_STATUS[number];

export const AMORTIZATION_SYSTEMS = ['PRICE', 'SAC'] as const;
export type AmortizationSystem = typeof AMORTIZATION_SYSTEMS[number];

export const APP_ROLES = ['owner', 'shared_user', 'driver', 'admin'] as const;
export type AppRole = typeof APP_ROLES[number];

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  user_type: UserType;
  status: 'pending' | 'active' | 'suspended';
  theme_preference: 'light' | 'dark' | 'system';
  onboarding_completed: boolean;
  finance_mode: string | null;
  account_type: string;
  notify_due_dates: boolean;
  notify_weekly_summary: boolean;
  notify_news: boolean;
  push_notifications_enabled: boolean;
  last_auth_platform: 'web' | 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan_id: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  fiscal_config: Record<string, unknown>;
  created_at: string;
}

export interface LancamentoRealizado {
  id: string;
  user_id: string;
  tipo: TransactionType;
  categoria: string;
  nome: string;
  valor_previsto: number;
  valor_realizado: number;
  mes_referencia: string; // formato: "2026-02"
  data_vencimento: string | null;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  source_type: 'manual' | 'credit_card_bill' | 'conta_pagar' | 'conta_receber' | 'pluggy_bank' | null;
  friendly_name: string | null;
  category_id: string | null;
}

export interface CreditCardTransaction {
  id: string;
  user_id: string;
  store_name: string;
  value: number;
  transaction_date: string;
  category: string | null;
  category_id: string | null;
  is_category_confirmed: boolean;
  card_id: string | null;
  installment_current: number | null;
  installment_total: number | null;
  is_recurring: boolean;
  friendly_name: string | null;
  status: string;
  credit_card_bill_id: string | null;
}

export interface CreditCardBill {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string | null;
  closing_date: string;
  due_date: string;
  total_value: number;
  status: BillStatus;
  billing_month: string;
  paid_amount: number | null;
  pluggy_bill_id: string | null;
}

export interface PluggyConnection {
  id: string;
  user_id: string;
  item_id: string;
  connector_id: number;
  connector_name: string;
  status: string;
  last_sync_at: string | null;
  connector_image_url: string | null;
  connector_primary_color: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: PlanSlug;
  price_monthly: number;
  price_yearly: number;
  features: unknown[];
  is_active: boolean;
  is_public: boolean;
  order_index: number;
  has_promo: boolean;
  duration_days: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Formata valor em BRL */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Formata mês de referência (2026-02 → "Fevereiro 2026") */
export function formatMonthReference(mes: string): string {
  const [year, month] = mes.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}
