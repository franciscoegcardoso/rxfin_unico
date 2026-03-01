/**
 * Convenience interfaces for main Supabase tables used across the app.
 * For full generated types use @/integrations/supabase/types (Database, Tables, etc.).
 */

/** Lançamentos (receitas/despesas realizadas) */
export interface LancamentoRealizado {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  nome: string;
  valor_previsto: number;
  valor_realizado: number | null;
  mes_referencia: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  data_registro: string;
  observacoes: string | null;
  forma_pagamento: string | null;
  category_id: string | null;
  friendly_name: string | null;
  source_type: string | null;
  source_id: string | null;
}

/** Faturas de cartão de crédito (não existe tabela credit_cards, usar credit_card_bills) */
export interface CreditCardBill {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string | null;
  closing_date: string;
  due_date: string;
  total_value: number;
  status: string;
  billing_month: string;
  paid_amount: number | null;
  connector_image_url: string | null;
  connector_primary_color: string | null;
}

/** Perfil do usuário (campo é full_name, não display_name) */
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  onboarding_completed: boolean | null;
  onboarding_phase: string | null;
  finance_mode: string | null;
  theme_preference: string | null;
}

/** Papel do usuário (enum app_role) */
export type AppRole = 'owner' | 'shared_user' | 'driver' | 'admin';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  workspace_owner_id: string | null;
}

/** Categorias de despesa */
export interface ExpenseCategory {
  id: string;
  name: string;
  reference: string | null;
  order_index: number;
  is_active: boolean;
}

/** Itens de despesa do usuário (não tem coluna default_value) */
export interface UserExpenseItem {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  name: string;
  expense_type: string | null;
  expense_nature: string | null;
  recurrence_type: string | null;
  is_recurring: boolean;
  payment_method: string | null;
  enabled: boolean;
  order_index: number;
}
