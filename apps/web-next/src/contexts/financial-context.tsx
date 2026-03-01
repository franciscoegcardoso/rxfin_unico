'use client';

import React, { createContext, useContext } from 'react';
import type { FinancialConfig } from '@/types/financial';

// Stub: full FinancialContext will be ported when migrating pages (Fase 3).
// This allows the provider tree to render without errors.
const stubConfig: FinancialConfig = {
  accountType: 'individual',
  userProfile: {
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
  },
  sharedWith: [],
  incomeItems: [],
  expenseItems: [],
  goals: [],
  assets: [],
  monthlyEntries: [],
  assetMonthlyEntries: [],
  financialInstitutions: [],
  drivers: [],
};

const FinancialContext = createContext<{ config: FinancialConfig } | undefined>(undefined);

export function FinancialProvider({ children }: { children: React.ReactNode }) {
  return (
    <FinancialContext.Provider value={{ config: stubConfig }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const ctx = useContext(FinancialContext);
  if (ctx === undefined) {
    throw new Error('useFinancial must be used within FinancialProvider');
  }
  return ctx;
}
