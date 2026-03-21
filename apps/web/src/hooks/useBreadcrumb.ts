import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { canonicalPathForPage, canonicalPathnameForLocation } from '@/lib/pagePathCanonical';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

const CACHE_KEY = 'rxfin_pages_breadcrumb_v2';
const CACHE_TTL = 5 * 60 * 1000;

type PageRow = {
  path: string;
  title: string;
  slug?: string | null;
  page_groups?: { name: string | null; slug: string | null } | null;
};

const GROUP_PATHS: Record<string, string> = {
  simuladores: '/simuladores',
  planejamento: '/planejamento-mensal',
  controles: '/inicio',
  configuracoes: '/minha-conta',
  'menu-principal': '/inicio',
};

type MapValue = {
  title: string;
  groupName: string;
  groupSlug: string;
  groupPath: string;
};

async function getPagesMap(): Promise<Map<string, MapValue>> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: [string, MapValue][]; ts: number };
      if (Date.now() - ts < CACHE_TTL) return new Map(data);
    }
  } catch {
    /* ignore */
  }

  const { data, error } = await supabase
    .from('pages')
    .select('path, title, slug, page_groups(name, slug)')
    .eq('is_active_users', true);

  if (error) throw error;

  const map = new Map<string, MapValue>();
  for (const p of (data ?? []) as PageRow[]) {
    const key = canonicalPathForPage(p.path, p.slug);
    const gslug = p.page_groups?.slug ?? '';
    map.set(key, {
      title: p.title,
      groupName: p.page_groups?.name ?? '',
      groupSlug: gslug,
      groupPath: GROUP_PATHS[gslug] ?? '/inicio',
    });
  }

  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: [...map.entries()], ts: Date.now() })
    );
  } catch {
    /* ignore */
  }
  return map;
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const lookup = canonicalPathnameForLocation(pathname);

    getPagesMap()
      .then((m) => {
        if (cancelled) return;
        const page = m.get(lookup);
        if (!page) {
          setItems([]);
          return;
        }
        const result: BreadcrumbItem[] = [{ label: 'Início', path: '/inicio' }];
        if (page.groupSlug && page.groupSlug !== 'menu-principal') {
          result.push({ label: page.groupName, path: page.groupPath });
        }
        result.push({ label: page.title, path: pathname });
        setItems(result);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return items;
}
