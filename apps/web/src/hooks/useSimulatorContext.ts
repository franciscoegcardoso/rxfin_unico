import { useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setUserKVValue, getUserKVValue } from '@/hooks/useUserKV';

/**
 * Context data shared between automotive simulators
 */
export interface SimulatorVehicleContext {
  fipeCode?: string;
  vehicleType?: 'carros' | 'motos' | 'caminhoes';
  brandCode?: string;
  modelCode?: string;
  yearCode?: string;
  priceValue?: number;
  modelName?: string;
  brandName?: string;
  yearLabel?: string;
  savedAt?: string;
}

const STORAGE_KEY = 'simulator-vehicle-context';
const KV_KEY = 'simulator-vehicle-context';

/**
 * Hook for managing shared vehicle context between automotive simulators.
 * Uses useUserKV for persistence + localStorage for synchronous reads.
 */
export function useSimulatorContext() {
  const { user } = useAuth();

  // On mount, sync from Supabase to localStorage if logged in
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getUserKVValue<SimulatorVehicleContext>(user.id, KV_KEY).then(data => {
      if (!cancelled && data) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { /* ignore */ }
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const save = useCallback((data: Omit<SimulatorVehicleContext, 'savedAt'>) => {
    const contextData: SimulatorVehicleContext = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contextData));
    } catch (e) {
      console.warn('Failed to save simulator context:', e);
    }
    // Persist to Supabase in background
    if (user?.id) {
      setUserKVValue(user.id, KV_KEY, contextData).catch(() => {});
    }
  }, [user?.id]);

  const load = useCallback((): SimulatorVehicleContext | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load simulator context:', e);
    }
    return null;
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear simulator context:', e);
    }
    if (user?.id) {
      import('@/hooks/useUserKV').then(({ deleteUserKVValue }) => {
        deleteUserKVValue(user!.id, KV_KEY).catch(() => {});
      });
    }
  }, [user?.id]);

  const isFresh = useCallback((): boolean => {
    const context = load();
    if (!context?.savedAt) return false;
    
    const savedTime = new Date(context.savedAt).getTime();
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    return now - savedTime < thirtyMinutes;
  }, [load]);

  return { save, load, clear, isFresh };
}
