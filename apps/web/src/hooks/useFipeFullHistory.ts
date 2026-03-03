import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CohortAnalysisData } from '@/utils/depreciationRegression';

export type VehicleTypeV2 = 'cars' | 'motorcycles' | 'trucks';

export interface FipeReference {
  code: string;
  month: string;
}

export interface ParsedHistoryPoint {
  date: Date;
  monthLabel: string;
  price: number;
  reference: string;
  isLaunchPrice?: boolean;
}

import { getCachedValue, setCachedValue, cleanupOldCacheKeys } from '@/utils/kvCacheUtils';

// Cache for cohort data only (history comes from database now)
const COHORT_CACHE_KEY_PREFIX = 'cohort_v2_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const COHORT_THRESHOLD_MONTHS = 24; // Limite para buscar siblings

// Limpa cache antigo na primeira execução
try {
  cleanupOldCacheKeys('fipe_full_history_');
  cleanupOldCacheKeys('fipe_cohort_', '_v2_');
} catch { /* ignore */ }

/** Response shape from RPC get_fipe_price_history (schema public or fipe) */
type GetFipePriceHistoryRow = {
  reference_year: number;
  reference_month: number;
  reference_label: string;
  price: number | string; // Postgres numeric often comes as string
  reference_code: string;
};

type BackendHistoryResponse = {
  success: boolean;
  restricted?: boolean;
  source?: 'database' | 'api' | 'partial';
  partial?: boolean; // True if more data is being fetched in background
  points?: Array<{ date: string; monthLabel: string; price: number; reference: string }>;
  stats?: {
    cacheHits?: number;
    queryTimeMs?: number;
    totalTimeMs?: number;
    coverageStatus?: string;
  };
  error?: string;
};

type SiblingHistoryResponse = {
  success: boolean;
  siblings?: Array<{
    modelYear: number;
    monthlyDecayRate: number | null;
  }>;
  avgMonthlyDecayRate: number | null;
  stats?: Record<string, unknown>;
  error?: string;
};

export function mapVehicleTypeToV2(type: 'carros' | 'motos' | 'caminhoes'): VehicleTypeV2 {
  switch (type) {
    case 'carros': return 'cars';
    case 'motos': return 'motorcycles';
    case 'caminhoes': return 'trucks';
    default: return 'cars';
  }
}

export interface UseFipeFullHistoryReturn {
  priceHistory: ParsedHistoryPoint[];
  loading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
  hasHistory: boolean;
  cohortData: CohortAnalysisData | null;
  isPartial: boolean; // True if displaying partial data while more is loading
  fetchFullHistory: (
    vehicleType: VehicleTypeV2, 
    fipeCode: string, 
    yearId: string,
    modelYear: number
  ) => Promise<void>;
  refetchIfPartial: () => Promise<void>; // Refetch to get complete data
  reset: () => void;
}

export function useFipeFullHistory(): UseFipeFullHistoryReturn {
  const [priceHistory, setPriceHistory] = useState<ParsedHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cohortData, setCohortData] = useState<CohortAnalysisData | null>(null);
  const [isPartial, setIsPartial] = useState(false);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<{ fipeCode: string; modelYear: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch sibling data for cohort analysis
  const fetchSiblingData = useCallback(async (
    fipeCode: string,
    currentModelYear: number
  ): Promise<CohortAnalysisData | null> => {
    const cohortCacheKey = `${COHORT_CACHE_KEY_PREFIX}${fipeCode}_${currentModelYear}`;
    const cached = getCachedValue<CohortAnalysisData>(cohortCacheKey, CACHE_DURATION);
    if (cached) {
      return cached;
    }

    try {
      
      const { data, error: fnError } = await supabase.functions.invoke<SiblingHistoryResponse>(
        'fipe-sibling-history',
        { body: { fipeCode, currentModelYear, siblingsToFetch: 3 } }
      );

      if (fnError || !data?.success) {
        return null;
      }

      if (data.avgMonthlyDecayRate === null || data.avgMonthlyDecayRate >= 0) {
        return null;
      }

      const siblingYears = (data.siblings || [])
        .filter(s => s.monthlyDecayRate !== null && s.monthlyDecayRate < 0)
        .map(s => s.modelYear);

      const cohort: CohortAnalysisData = {
        siblingYears,
        avgMonthlyDecayRate: data.avgMonthlyDecayRate,
        samplesUsed: siblingYears.length,
      };

      setCachedValue(cohortCacheKey, cohort);
      return cohort;
    } catch {
      return null;
    }
  }, []);

  const fetchFullHistory = useCallback(async (
    _vehicleType: VehicleTypeV2,
    fipeCode: string,
    _yearId: string,
    modelYear: number,
    forceFullFetch = false
  ) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    // Store params for potential refetch
    lastFetchParamsRef.current = { fipeCode, modelYear };
    
    // Reset cohort data on new fetch
    setCohortData(null);
    setIsPartial(false);

    setLoading(true);
    setError(null);
    setProgress(null);
    setPriceHistory([]);

    // year_id vem como "2023-5"; extrair apenas o ano inteiro (Number("2023-5") => NaN)
    const modelYearInt = parseInt(String(modelYear).split('-')[0], 10);
    if (!fipeCode || isNaN(modelYearInt)) {
      if (mountedRef.current) {
        setPriceHistory([]);
        setError('Selecione um veículo válido para ver o histórico.');
        setLoading(false);
      }
      return;
    }

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_fipe_price_history', {
        p_fipe_code: fipeCode,
        p_model_year: modelYearInt,
        p_months_back: 60,
      });

      if (rpcError || !rpcData || !Array.isArray(rpcData) || rpcData.length === 0) {
        if (mountedRef.current) {
          setPriceHistory([]);
          setError(rpcError?.message || 'Histórico não disponível para este veículo.');
          setLoading(false);
        }
        return;
      }

      const points: ParsedHistoryPoint[] = (rpcData as GetFipePriceHistoryRow[])
        .map((row) => {
          const price = Number(row.price);
          const date = new Date(row.reference_year, row.reference_month - 1, 1);
          return {
            date,
            monthLabel: row.reference_label || `${row.reference_month}/${row.reference_year}`,
            price,
            reference: row.reference_code || '',
          };
        })
        .filter((p) => !isNaN(p.date.getTime()) && p.price > 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (points.length === 0) {
        if (mountedRef.current) {
          setPriceHistory([]);
          setError('Histórico não disponível para este veículo.');
          setLoading(false);
        }
        return;
      }

      points[0].isLaunchPrice = true;
      if (mountedRef.current) {
        setPriceHistory(points);
        setProgress(null);
        setError(null);
        setIsPartial(false);
        const firstDate = points[0].date;
        const lastDate = points[points.length - 1].date;
        const monthsOfHistory = Math.round(
          (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );
        if (monthsOfHistory < COHORT_THRESHOLD_MONTHS) {
          fetchSiblingData(fipeCode, modelYearInt).then((cohort) => {
            if (mountedRef.current && cohort) setCohortData(cohort);
          });
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      
      if (mountedRef.current) {
        setPriceHistory([]);
        setError(err instanceof Error ? err.message : 'Erro ao carregar histórico.');
        setProgress(null);
        setIsPartial(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchSiblingData]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setPriceHistory([]);
    setCohortData(null);
    setError(null);
    setLoading(false);
    setProgress(null);
    setIsPartial(false);
    lastFetchParamsRef.current = null;
  }, []);

  // Refetch to get complete data if currently showing partial (apenas RPC)
  const refetchIfPartial = useCallback(async () => {
    if (!isPartial || !lastFetchParamsRef.current) return;
    const { fipeCode, modelYear } = lastFetchParamsRef.current;
    const modelYearInt = parseInt(String(modelYear).split('-')[0], 10);
    if (!fipeCode || isNaN(modelYearInt)) return;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_fipe_price_history', {
        p_fipe_code: fipeCode,
        p_model_year: modelYearInt,
        p_months_back: 84,
      });
      if (rpcError || !rpcData || !Array.isArray(rpcData) || rpcData.length === 0) return;
      const fullPoints: ParsedHistoryPoint[] = (rpcData as GetFipePriceHistoryRow[])
        .map((row) => {
          const price = Number(row.price);
          const date = new Date(row.reference_year, row.reference_month - 1, 1);
          return {
            date,
            monthLabel: row.reference_label || `${row.reference_month}/${row.reference_year}`,
            price,
            reference: row.reference_code || '',
          };
        })
        .filter((p) => !isNaN(p.date.getTime()) && p.price > 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      if (mountedRef.current && fullPoints.length > 0) {
        fullPoints[0].isLaunchPrice = true;
        setPriceHistory(fullPoints);
        setIsPartial(false);
        setError(null);
      }
    } catch {
      // Silent fail
    }
  }, [isPartial]);

  return {
    priceHistory,
    loading,
    progress,
    error,
    hasHistory: priceHistory.length > 0,
    cohortData,
    isPartial,
    fetchFullHistory,
    refetchIfPartial,
    reset,
  };
}
