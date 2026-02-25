import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { useAuth } from '@/contexts/AuthContext';

interface VisibilityContextType {
  isHidden: boolean;
  toggle: () => void;
  formatValue: (value: number) => string;
}

const VisibilityContext = createContext<VisibilityContextType | undefined>(undefined);

export const VisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { value: isHidden, setValue: setIsHidden } = useUserKV<boolean>('valuesHidden', false);

  const toggle = () => setIsHidden(prev => !prev);

  const formatValue = (value: number): string => {
    if (isHidden) return '••••••';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <VisibilityContext.Provider value={{ isHidden, toggle, formatValue }}>
      {children}
    </VisibilityContext.Provider>
  );
};

export const useVisibility = () => {
  const context = useContext(VisibilityContext);
  if (context === undefined) {
    throw new Error('useVisibility must be used within a VisibilityProvider');
  }
  return context;
};
