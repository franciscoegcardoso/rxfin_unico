/**
 * Mock Data Handlers
 * 
 * Provides mock data for testing without hitting the real database.
 * Following best practices from companies like Stripe, Vercel, and GitHub.
 */

import { vi } from "vitest";

// ============================================
// Mock Financial Data
// ============================================

export const mockIncomeItems = [
  {
    id: "income-1",
    name: "Salário",
    categoryId: "salary",
    value: 5000,
    enabled: true,
    paymentMethod: "pix",
  },
  {
    id: "income-2",
    name: "Freelance",
    categoryId: "extra",
    value: 1500,
    enabled: true,
    paymentMethod: "transfer",
  },
];

export const mockExpenseItems = [
  {
    id: "expense-1",
    name: "Aluguel",
    categoryId: "home",
    value: 1800,
    enabled: true,
    paymentMethod: "boleto",
  },
  {
    id: "expense-2",
    name: "Mercado",
    categoryId: "food",
    value: 800,
    enabled: true,
    paymentMethod: "credit",
  },
  {
    id: "expense-3",
    name: "Internet",
    categoryId: "utilities",
    value: 120,
    enabled: true,
    paymentMethod: "debit",
  },
];

export const mockDrivers = [
  {
    id: "driver-1",
    name: "Férias",
    categoryId: "goals",
    value: 500,
    enabled: true,
  },
  {
    id: "driver-2",
    name: "Reserva de Emergência",
    categoryId: "savings",
    value: 1000,
    enabled: true,
  },
];

export const mockSharedPeople = [
  {
    id: "person-owner",
    name: "João",
    isOwner: true,
    color: "#3B82F6",
  },
  {
    id: "person-2",
    name: "Maria",
    isOwner: false,
    color: "#EC4899",
  },
];

export const mockGoals = [
  {
    id: "goal-1",
    name: "Viagem para Europa",
    targetValue: 15000,
    currentValue: 5000,
    deadline: "2026-12-01",
  },
  {
    id: "goal-2",
    name: "Carro Novo",
    targetValue: 50000,
    currentValue: 10000,
    deadline: "2027-06-01",
  },
];

// ============================================
// Mock User Profile Data
// ============================================

export const mockProfile = {
  id: "test-user-id-123",
  email: "test@example.com",
  full_name: "Test User",
  phone: "+5511999999999",
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

export const mockAdminProfile = {
  ...mockProfile,
  id: "admin-user-id-456",
  email: "admin@example.com",
  full_name: "Admin User",
};

// ============================================
// Mock Financial Config
// ============================================

export const mockFinancialConfig = {
  accountType: "individual" as const,
  incomeItems: mockIncomeItems,
  expenseItems: mockExpenseItems,
  drivers: mockDrivers,
  goals: mockGoals,
  sharedWith: [],
  userProfile: {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "+5511999999999",
    birthDate: "1990-01-15",
  },
};

export const mockSharedFinancialConfig = {
  ...mockFinancialConfig,
  accountType: "shared" as const,
  sharedWith: mockSharedPeople,
};

// ============================================
// Mock Transactions
// ============================================

export const mockLancamentos = [
  {
    id: "lanc-1",
    user_id: "test-user-id-123",
    tipo: "despesa",
    categoria: "home",
    nome: "Aluguel Janeiro",
    valor_previsto: 1800,
    valor_realizado: 1800,
    mes_referencia: "2026-01",
    data_vencimento: "2026-01-05",
    data_pagamento: "2026-01-05",
    forma_pagamento: "boleto",
  },
  {
    id: "lanc-2",
    user_id: "test-user-id-123",
    tipo: "receita",
    categoria: "salary",
    nome: "Salário Janeiro",
    valor_previsto: 5000,
    valor_realizado: 5000,
    mes_referencia: "2026-01",
    data_vencimento: "2026-01-05",
    data_pagamento: "2026-01-05",
    forma_pagamento: "pix",
  },
];

export const mockCreditCardTransactions = [
  {
    id: "cc-1",
    user_id: "test-user-id-123",
    store_name: "Supermercado ABC",
    value: 250.5,
    transaction_date: "2026-01-15",
    category: "Alimentação",
    category_id: "food",
    card_id: "card-1",
  },
  {
    id: "cc-2",
    user_id: "test-user-id-123",
    store_name: "Farmácia XYZ",
    value: 89.9,
    transaction_date: "2026-01-16",
    category: "Saúde",
    category_id: "health",
    card_id: "card-1",
  },
];

// ============================================
// Test Data Factory
// ============================================

let idCounter = 0;

export const createMockUser = (overrides = {}) => ({
  id: `user-${++idCounter}-${Date.now()}`,
  email: `test-${idCounter}@example.com`,
  full_name: "Test User",
  ...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
  id: `tx-${++idCounter}-${Date.now()}`,
  user_id: "test-user-id-123",
  tipo: "despesa",
  categoria: "outros",
  nome: "Test Transaction",
  valor_previsto: 100,
  valor_realizado: 100,
  mes_referencia: "2026-01",
  ...overrides,
});

export const createMockGoal = (overrides = {}) => ({
  id: `goal-${++idCounter}-${Date.now()}`,
  name: "Test Goal",
  targetValue: 10000,
  currentValue: 0,
  deadline: "2027-01-01",
  ...overrides,
});

// Reset counter for tests
export const resetMockCounter = () => {
  idCounter = 0;
};
