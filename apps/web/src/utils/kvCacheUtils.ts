/**
 * Standalone KV cache utilities for use outside React components.
 * Uses localStorage as fast cache + syncs to Supabase user_kv_store in background.
 * 
 * For React components, prefer useKVCache from @/hooks/useUserKV.
 */
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached data from localStorage (fast, synchronous)
 */
export function getCachedValue<T>(key: string, cacheDurationMs = DEFAULT_CACHE_DURATION): T | null {
  try {
    const stored = localStorage.getItem(`cache:${key}`);
    if (!stored) return null;
    const entry: CacheEntry<T> = JSON.parse(stored);
    if (Date.now() - entry.timestamp > cacheDurationMs) {
      localStorage.removeItem(`cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Set cached data in localStorage + optionally sync to Supabase
 */
export function setCachedValue<T>(key: string, data: T, syncToSupabase = true): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  try {
    localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch { /* localStorage full */ }

  if (syncToSupabase) {
    // Background sync to Supabase for cross-device availability
    supabase.auth.getUser().then(({ data: userData }) => {
      const userId = userData?.user?.id;
      if (userId) {
        (supabase as any)
          .from('user_kv_store')
          .upsert(
            { user_id: userId, key: `cache:${key}`, value: entry as any },
            { onConflict: 'user_id,key' }
          )
          .then(() => {})
          .catch(() => {});
      }
    }).catch(() => {});
  }
}

/**
 * Remove cached value
 */
export function removeCachedValue(key: string): void {
  try {
    localStorage.removeItem(`cache:${key}`);
  } catch { /* ignore */ }
}

/**
 * Clean up old cache keys matching a pattern
 */
export function cleanupOldCacheKeys(prefix: string, excludePattern?: string): void {
  try {
    const keysToRemove = Object.keys(localStorage).filter(k =>
      k.startsWith(prefix) && (!excludePattern || !k.includes(excludePattern))
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
