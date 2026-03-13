/**
 * @deprecated
 * Este arquivo foi substituído pela conta demo real no Supabase.
 * UUID da conta demo: a1b2c3d4-e5f6-4a7b-8c9d-000000000001
 * Registrado em app_config com key = 'demo_user_id'
 *
 * Manter como referência dos valores originais usados para seed.
 * Pode ser deletado após validação completa em produção.
 *
 * ---
 * Dados fictícios centralizados para o Modo Demo.
 * Perfil base: renda média brasileira (~R$ 8.500/mês).
 * Estes dados NUNCA são inseridos no banco — são retornados em memória pelos hooks.
 */

// ─── Receitas ──────────────────────────────────────────────────────────────────

export interface DemoIncome {
  id: string;
  name: string;
  value: number;
  method: string;
  is_recurring: boolean;
}

export const demoIncomes: DemoIncome[] = [
  { id: 'demo-inc-1', name: 'Salário CLT', value: 7200, method: 'bank_transfer', is_recurring: true },
  { id: 'demo-inc-2', name: 'Freelance Design', value: 1800, method: 'pix', is_recurring: false },
  { id: 'demo-inc-3', name: 'Rendimento CDB', value: 320, method: 'investment', is_recurring: true },
];

// ─── Despesas ──────────────────────────────────────────────────────────────────

export interface DemoExpense {
  id: string;
  name: string;
  value: number;
  category: string;
  category_id: string;
  is_recurring: boolean;
  payment_method: string;
}

export const demoExpenses: DemoExpense[] = [
  { id: 'demo-exp-1', name: 'Aluguel', value: 2200, category: 'Moradia', category_id: 'cat-moradia', is_recurring: true, payment_method: 'debit' },
  { id: 'demo-exp-2', name: 'Condomínio', value: 580, category: 'Moradia', category_id: 'cat-moradia', is_recurring: true, payment_method: 'debit' },
  { id: 'demo-exp-3', name: 'Supermercado', value: 1400, category: 'Alimentação', category_id: 'cat-alimentacao', is_recurring: true, payment_method: 'credit_card' },
  { id: 'demo-exp-4', name: 'Combustível', value: 450, category: 'Transporte', category_id: 'cat-transporte', is_recurring: true, payment_method: 'credit_card' },
  { id: 'demo-exp-5', name: 'Plano de Saúde', value: 680, category: 'Saúde', category_id: 'cat-saude', is_recurring: true, payment_method: 'debit' },
  { id: 'demo-exp-6', name: 'Streaming + Internet', value: 250, category: 'Lazer', category_id: 'cat-lazer', is_recurring: true, payment_method: 'credit_card' },
  { id: 'demo-exp-7', name: 'Restaurantes', value: 600, category: 'Alimentação', category_id: 'cat-alimentacao', is_recurring: false, payment_method: 'credit_card' },
  { id: 'demo-exp-8', name: 'Academia', value: 180, category: 'Saúde', category_id: 'cat-saude', is_recurring: true, payment_method: 'debit' },
];

// ─── Patrimônio ────────────────────────────────────────────────────────────────

export interface DemoAsset {
  id: string;
  name: string;
  value: number;
  type: string;
  institution?: string;
}

export const demoAssets: DemoAsset[] = [
  { id: 'demo-asset-1', name: 'Apartamento (50%)', value: 280000, type: 'imovel' },
  { id: 'demo-asset-2', name: 'Carro HB20 2021', value: 58000, type: 'veiculo' },
  { id: 'demo-asset-3', name: 'CDB Banco Inter', value: 45000, type: 'investimento', institution: 'Banco Inter' },
  { id: 'demo-asset-4', name: 'Ações (ITUB4, VALE3)', value: 22000, type: 'investimento', institution: 'XP' },
  { id: 'demo-asset-5', name: 'Tesouro Selic', value: 18000, type: 'investimento', institution: 'Tesouro Direto' },
  { id: 'demo-asset-6', name: 'Reserva Emergência', value: 15000, type: 'investimento', institution: 'Nubank' },
];

// ─── Dívidas ───────────────────────────────────────────────────────────────────

export interface DemoDebt {
  id: string;
  name: string;
  total_value: number;
  remaining_value: number;
  monthly_payment: number;
  remaining_months: number;
  interest_rate: number;
}

export const demoDebts: DemoDebt[] = [
  { id: 'demo-debt-1', name: 'Financiamento Imobiliário', total_value: 320000, remaining_value: 245000, monthly_payment: 2800, remaining_months: 264, interest_rate: 9.5 },
  { id: 'demo-debt-2', name: 'Cartão de Crédito (parcelado)', total_value: 3600, remaining_value: 2400, monthly_payment: 600, remaining_months: 4, interest_rate: 0 },
];

// ─── Fluxo de Caixa (últimos 6 meses) ─────────────────────────────────────────

export interface DemoCashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

const now = new Date();
const getMonthLabel = (offset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return d.toISOString().slice(0, 7); // YYYY-MM
};

export const demoCashFlow: DemoCashFlowMonth[] = [
  { month: getMonthLabel(5), income: 8800, expenses: 7100, balance: 1700 },
  { month: getMonthLabel(4), income: 9100, expenses: 7400, balance: 1700 },
  { month: getMonthLabel(3), income: 8500, expenses: 6900, balance: 1600 },
  { month: getMonthLabel(2), income: 9320, expenses: 7800, balance: 1520 },
  { month: getMonthLabel(1), income: 9000, expenses: 7200, balance: 1800 },
  { month: getMonthLabel(0), income: 9320, expenses: 6340, balance: 2980 },
];

// ─── Metas ─────────────────────────────────────────────────────────────────────

export interface DemoGoal {
  id: string;
  name: string;
  target_value: number;
  current_value: number;
  deadline: string;
  icon: string;
}

export const demoGoals: DemoGoal[] = [
  { id: 'demo-goal-1', name: 'Reserva de Emergência (6 meses)', target_value: 42000, current_value: 15000, deadline: '2026-12-31', icon: 'Shield' },
  { id: 'demo-goal-2', name: 'Viagem Europa', target_value: 25000, current_value: 8500, deadline: '2027-06-30', icon: 'Plane' },
];

// ─── Resumo Consolidado ────────────────────────────────────────────────────────

export const demoSummary = {
  totalIncome: 9320,
  totalExpenses: 6340,
  savingsCapacity: 2980,
  savingsRate: 31.97, // %
  totalAssets: 438000,
  totalDebts: 247400,
  netWorth: 190600,
};

// ─── Export centralizado ───────────────────────────────────────────────────────

export const demoData = {
  incomes: demoIncomes,
  expenses: demoExpenses,
  assets: demoAssets,
  debts: demoDebts,
  cashFlow: demoCashFlow,
  goals: demoGoals,
  summary: demoSummary,
} as const;
