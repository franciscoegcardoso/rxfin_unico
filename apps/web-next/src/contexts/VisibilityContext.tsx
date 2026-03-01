'use client';

import React, { createContext, useContext, useState } from 'react';

interface VisibilityContextType {
  isHidden: boolean;
  toggle: () => void;
  formatValue: (value: number) => string;
}

const VisibilityContext = createContext<VisibilityContextType | undefined>(undefined);

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);
  const toggle = () => setIsHidden((prev) => !prev);
  const formatValue = (value: number): string => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  return (
    <VisibilityContext.Provider value={{ isHidden, toggle, formatValue }}>
      {children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility() {
  const context = useContext(VisibilityContext);
  if (context === undefined) {
    throw new Error('useVisibility must be used within a VisibilityProvider');
  }
  return context;
}
