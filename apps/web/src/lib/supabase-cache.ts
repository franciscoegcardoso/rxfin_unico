import { supabase } from '@/integrations/supabase/client';

const TTL = {
  LONG:   30 * 60 * 1000,
  MEDIUM:  5 * 60 * 1000,
} as const;

type CacheEntry<T> = { data: T; ts: number };

function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`rxfin:cache:${key}`);
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEntry<T>).data;
  } catch { return null; }
}

function cacheSet<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(`rxfin:cache:${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota ou modo privado */ }
}

function cacheIsStale(key: string, ttl: number): boolean {
  try {
    const raw = sessionStorage.getItem(`rxfin:cache:${key}`);
    if (!raw) return true;
    return Date.now() - (JSON.parse(raw) as CacheEntry<unknown>).ts > ttl;
  } catch { return true; }
}

async function cachedQuery<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) {
    if (cacheIsStale(key, ttl)) fetcher().then((f) => cacheSet(key, f)).catch(() => {});
    return cached;
  }
  const data = await fetcher();
  cacheSet(key, data);
  return data;
}

export interface SubscriptionPlan {
  id: string; slug: string; name: string;
  price_monthly: number; price_yearly: number;
  order_index: number; features: Record<string, boolean | number | string>; is_active: boolean;
}
export interface AppPage {
  slug: string; path: string; min_plan_slug: string | null; is_active_users: boolean;
}
export type AppSettings = Record<string, string | number | boolean | null>;

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return cachedQuery('subscription_plans', async () => {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []) as SubscriptionPlan[];
  }, TTL.LONG);
}

export async function getAppPages(): Promise<AppPage[]> {
  return cachedQuery('app_pages', async () => {
    const { data, error } = await supabase.from('pages').select('slug, path, min_plan_slug, is_active_users');
    if (error) throw error;
    return (data ?? []) as AppPage[];
  }, TTL.LONG);
}

export async function getAppSettings(): Promise<AppSettings> {
  return cachedQuery('app_settings', async () => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])) as AppSettings;
  }, TTL.MEDIUM);
}

export function clearSupabaseCache(): void {
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith('rxfin:cache:')).forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignora */ }
}
