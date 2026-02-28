/**
 * Hook para buscar e cachear dados de regime de mercado (market_regime_annual).
 * Dados mudam apenas 1x/ano — cache de 24h via React Query.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketRegimeData, VehicleSegment } from '@/utils/depreciationEngineV7';

/** Fetch market regime data (13 rows, changes 1x/year) */
async function fetchMarketRegime(): Promise<MarketRegimeData> {
  const { data: regimeRows, error } = await (supabase as any)
    .from('market_regime_annual')
    .select('year, mkt_retention');

  if (error) {
    console.warn('[MarketRegime] Fetch failed, using defaults:', error.message);
    return { regimeByYear: {} };
  }

  return {
    regimeByYear: Object.fromEntries(
      regimeRows?.map(r => [r.year, Number(r.mkt_retention)]) ?? []
    ),
  };
}

/** Fetch vehicle segment by FIPE code */
async function fetchVehicleSegment(fipeCode: string): Promise<VehicleSegment> {
  if (!fipeCode) return 'default';
  
  const { data: segmentRow, error } = await (supabase as any)
    .from('vehicle_segments')
    .select('segment')
    .eq('fipe_code', fipeCode)
    .maybeSingle();

  if (error || !segmentRow) return 'default';
  return (segmentRow.segment as VehicleSegment) ?? 'default';
}

/** Global cached hook for market regime data */
export function useMarketRegimeData() {
  const { data: regimeData } = useQuery({
    queryKey: ['market-regime-annual'],
    queryFn: fetchMarketRegime,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 48 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return regimeData ?? { regimeByYear: {} };
}

/** Hook to fetch vehicle segment (cached per fipeCode) */
export function useVehicleSegment(fipeCode: string) {
  const { data: segment } = useQuery({
    queryKey: ['vehicle-segment', fipeCode],
    queryFn: () => fetchVehicleSegment(fipeCode),
    enabled: !!fipeCode,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return segment ?? 'default' as VehicleSegment;
}
