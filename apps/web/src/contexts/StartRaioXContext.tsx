import React, { createContext, useContext } from 'react';
import type { StartRaioXSource } from '@/hooks/useStartRaioX';

export interface StartRaioXValue {
  handleStartRaioX: (source: StartRaioXSource) => Promise<void>;
  isStartingOnboarding: boolean;
  raioxPath: string;
}

export const StartRaioXContext = createContext<StartRaioXValue | null>(null);

export function useStartRaioXContext(): StartRaioXValue | null {
  return useContext(StartRaioXContext);
}
