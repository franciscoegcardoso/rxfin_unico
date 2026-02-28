import { useState, useCallback } from 'react';
import { useUserKV } from '@/hooks/useUserKV';

const MAX_RECENT = 5;

export interface RecentSimulation {
  slug: string;
  title: string;
  path: string;
  visitedAt: number;
}

export function useRecentSimulations() {
  const { value: recentSimulations, setValue: setRecent } = useUserKV<RecentSimulation[]>('rxfin-recent-simulations', []);

  const addRecentSimulation = useCallback((sim: Omit<RecentSimulation, 'visitedAt'>) => {
    setRecent(prev => {
      const updated = [
        { ...sim, visitedAt: Date.now() },
        ...prev.filter(r => r.slug !== sim.slug),
      ].slice(0, MAX_RECENT);
      return updated;
    });
  }, [setRecent]);

  return { recentSimulations, addRecentSimulation };
}
