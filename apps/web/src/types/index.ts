/**
 * Central type exports. Database table interfaces + UI/dashboard types.
 */
export * from './database';

export * from './financial';
export * from './credito';
export * from './vehicle';
export * from './seguro';

/** Aggregates for dashboard / home (RPC get_dashboard_enhanced, get_home_dashboard) */
export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  prev_month?: number;
  variation?: number;
}

export interface CreditCardSummary {
  total_value: number;
  paid_amount: number | null;
  status: string;
  due_date: string;
  card_name: string | null;
  billing_month: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
  percentage?: number;
}

export interface TransactionItem {
  id: string;
  nome: string;
  valor_realizado: number;
  tipo: string;
  categoria: string;
  data_pagamento: string | null;
  data_vencimento: string | null;
}

export interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface DashboardData {
  month: string;
  summary: MonthSummary;
  credit_cards: CreditCardSummary[];
  top_categories: CategoryTotal[];
  recent_transactions: TransactionItem[];
  user_info: UserInfo;
}
