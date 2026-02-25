import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Generic key-value store backed by Supabase `user_kv_store` table.
 * Replaces all localStorage usage across the app.
 * 
 * - Authenticated users: reads/writes from Supabase
 * - Unauthenticated: falls back to localStorage
 * - Debounced writes to avoid excessive DB calls
 */
export function useUserKV<T>(key: string, defaultValue: T): {
  value: T;
  setValue: (val: T | ((prev: T) => T)) => void;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [value, setValueState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef<T>(defaultValue);
  const initialLoadDone = useRef(false);

  // Load from Supabase on mount / user change
  useEffect(() => {
    let cancelled = false;
    initialLoadDone.current = false;

    const load = async () => {
      if (!user?.id) {
        // Fallback: localStorage for unauthenticated
        try {
          const stored = localStorage.getItem(`kv:${key}`);
          if (stored !== null) {
            const parsed = JSON.parse(stored) as T;
            if (!cancelled) {
              setValueState(parsed);
              latestValueRef.current = parsed;
            }
          }
        } catch { /* ignore */ }
        if (!cancelled) {
          setIsLoading(false);
          initialLoadDone.current = true;
        }
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('user_kv_store')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', key)
          .maybeSingle();

        if (!cancelled && !error && data?.value !== undefined && data?.value !== null) {
          const val = data.value as T;
          setValueState(val);
          latestValueRef.current = val;
        }
      } catch {
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(`kv:${user.id}:${key}`);
          if (stored !== null && !cancelled) {
            const parsed = JSON.parse(stored) as T;
            setValueState(parsed);
            latestValueRef.current = parsed;
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    };

    setIsLoading(true);
    load();
    return () => { cancelled = true; };
  }, [user?.id, key]);

  // Save to Supabase (debounced)
  const persistToSupabase = useCallback((val: T) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const userId = user?.id;
      if (!userId) {
        // Fallback: localStorage
        try {
          localStorage.setItem(`kv:${key}`, JSON.stringify(val));
        } catch { /* ignore */ }
        return;
      }

      try {
        // Also save to localStorage as cache
        localStorage.setItem(`kv:${userId}:${key}`, JSON.stringify(val));

        await (supabase as any)
          .from('user_kv_store')
          .upsert(
            { user_id: userId, key, value: val as any },
            { onConflict: 'user_id,key' }
          );
      } catch (err) {
        console.warn(`[useUserKV] Failed to persist key "${key}":`, err);
      }
    }, 500); // 500ms debounce
  }, [user?.id, key]);

  const setValue = useCallback((val: T | ((prev: T) => T)) => {
    setValueState(prev => {
      const newVal = typeof val === 'function' ? (val as (prev: T) => T)(prev) : val;
      latestValueRef.current = newVal;
      persistToSupabase(newVal);
      return newVal;
    });
  }, [persistToSupabase]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { value, setValue, isLoading };
}

/**
 * Standalone functions for reading/writing KV outside of React components.
 * Used for exported utility functions (e.g., saveConsolidationInfo).
 */
export async function getUserKVValue<T>(userId: string, key: string): Promise<T | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('user_kv_store')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();

    if (!error && data?.value !== undefined) {
      return data.value as T;
    }
  } catch { /* ignore */ }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(`kv:${userId}:${key}`);
    if (stored) return JSON.parse(stored) as T;
  } catch { /* ignore */ }

  return null;
}

export async function setUserKVValue<T>(userId: string, key: string, value: T): Promise<void> {
  // Save to localStorage as cache
  try {
    localStorage.setItem(`kv:${userId}:${key}`, JSON.stringify(value));
  } catch { /* ignore */ }

  try {
    await (supabase as any)
      .from('user_kv_store')
      .upsert(
        { user_id: userId, key, value: value as any },
        { onConflict: 'user_id,key' }
      );
  } catch (err) {
    console.warn(`[setUserKVValue] Failed to persist key "${key}":`, err);
  }
}

export async function deleteUserKVValue(userId: string, key: string): Promise<void> {
  try {
    localStorage.removeItem(`kv:${userId}:${key}`);
  } catch { /* ignore */ }

  try {
    await (supabase as any)
      .from('user_kv_store')
      .delete()
      .eq('user_id', userId)
      .eq('key', key);
  } catch { /* ignore */ }
}

/**
 * Cache-specific variant: reads from localStorage first (instant),
 * but backs up to Supabase for cross-device availability.
 * Used for FIPE caches and other performance-sensitive data.
 */
export function useKVCache<T>(key: string, cacheDurationMs: number = 24 * 60 * 60 * 1000) {
  const { user } = useAuth();

  const get = useCallback((): T | null => {
    const fullKey = user?.id ? `kv:${user.id}:${key}` : `kv:${key}`;
    try {
      const stored = localStorage.getItem(fullKey);
      if (!stored) return null;
      const entry: { data: T; timestamp: number } = JSON.parse(stored);
      if (Date.now() - entry.timestamp > cacheDurationMs) {
        localStorage.removeItem(fullKey);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }, [user?.id, key, cacheDurationMs]);

  const set = useCallback((data: T) => {
    const fullKey = user?.id ? `kv:${user.id}:${key}` : `kv:${key}`;
    const entry = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch { /* full */ }

    // Also persist to Supabase in background
    if (user?.id) {
      (supabase as any)
        .from('user_kv_store')
        .upsert(
          { user_id: user.id, key: `cache:${key}`, value: entry as any },
          { onConflict: 'user_id,key' }
        )
        .then(() => {})
        .catch(() => {});
    }
  }, [user?.id, key]);

  const remove = useCallback(() => {
    const fullKey = user?.id ? `kv:${user.id}:${key}` : `kv:${key}`;
    try { localStorage.removeItem(fullKey); } catch { /* ignore */ }
  }, [user?.id, key]);

  return { get, set, remove };
}
