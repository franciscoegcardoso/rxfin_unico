import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AssetFundamentalsRow = {
  asset_code: string;
  source: string | null;
  dy_12m: number | null;
  p_l: number | null;
  p_vp: number | null;
  roe: number | null;
  ebit_margin: number | null;
  market_cap: number | null;
  last_updated_at: string | null;
};

const BRAPI = 'brapi';

/**
 * Mapa asset_code (uppercase) → fundamentals (source brapi).
 * Só consulta quando `codes` não está vazio.
 */
export function useAssetFundamentalsByCodes(codes: string[]) {
  const normalized = useMemo(
    () => [...new Set(codes.filter(Boolean).map((c) => c.trim().toUpperCase()))],
    [codes],
  );

  return useQuery({
    queryKey: ['asset-fundamentals', BRAPI, normalized],
    queryFn: async (): Promise<Map<string, AssetFundamentalsRow>> => {
      if (normalized.length === 0) return new Map();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- asset_fundamentals ainda não está em Database
      const { data, error } = await (supabase as any)
        .from('asset_fundamentals')
        .select(
          'asset_code, source, dy_12m, p_l, p_vp, roe, ebit_margin, market_cap, last_updated_at',
        )
        .eq('source', BRAPI)
        .in('asset_code', normalized);

      if (error) throw error;

      const m = new Map<string, AssetFundamentalsRow>();
      for (const row of (data ?? []) as AssetFundamentalsRow[]) {
        if (row?.asset_code) {
          m.set(String(row.asset_code).toUpperCase(), row);
        }
      }
      return m;
    },
    enabled: normalized.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Tipos Pluggy que podem ter fundamentals de mercado (ticker B3 / brapi). */
export function shouldFetchAssetFundamentals(type: string | null | undefined): boolean {
  return ['EQUITY', 'ETF', 'MUTUAL_FUND'].includes((type ?? '').toUpperCase());
}

export function collectFundamentalAssetCodes(
  items: Array<{ type?: string | null; code?: string | null }>,
): string[] {
  const out: string[] = [];
  for (const inv of items) {
    const code = inv.code?.trim();
    if (!code || !shouldFetchAssetFundamentals(inv.type ?? undefined)) continue;
    out.push(code.toUpperCase());
  }
  return out;
}

/** Resolve fundamentals pelo ticker (`code`) quando o tipo permite brapi. */
export function getFundamentalsForInvestment(
  item: { type?: string | null; code?: string | null },
  map: Map<string, AssetFundamentalsRow>,
): AssetFundamentalsRow | undefined {
  const code = item.code?.trim();
  if (!code || !shouldFetchAssetFundamentals(item.type ?? undefined)) return undefined;
  return map.get(code.toUpperCase());
}

/** Há pelo menos uma métrica para exibir (evita card vazio). */
export function hasVisibleFundamentals(f: AssetFundamentalsRow): boolean {
  if (f.dy_12m != null && f.dy_12m > 0) return true;
  if (f.p_l != null) return true;
  if (f.p_vp != null) return true;
  if (f.roe != null) return true;
  return false;
}
