import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedValue, setCachedValue, removeCachedValue, cleanupOldCacheKeys } from '@/utils/kvCacheUtils';

export interface CohortCell {
  modelYear: number;
  calendarYear: number;
  price: number;
  month: number;
}

export interface CohortMatrixData {
  modelYears: number[];       // Rows (sorted ascending, 32000/0km last)
  calendarYears: number[];    // Columns (sorted ascending)
  cells: CohortCell[];        // All data points
  has0km: boolean;
}

interface CacheEntry {
  data: CohortMatrixData;
  timestamp: number;
}


// v10: Fixed Y-1 launch price fetch for all model years (2007, 2008, etc.)
const CACHE_KEY_PREFIX = 'cohort_matrix_v10_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Flag to track if old cache cleanup has run (lazy initialization)
let hasCleanedOldCache = false;

function cleanupOldCacheOnce(): void {
  if (hasCleanedOldCache) return;
  hasCleanedOldCache = true;
  cleanupOldCacheKeys('fipe_cohort_matrix_');
  cleanupOldCacheKeys('cache:cohort_matrix_', '_v10_');
}

function getCacheKey(fipeCode: string): string {
  return `${CACHE_KEY_PREFIX}${fipeCode}`;
}

function getCache(key: string): CohortMatrixData | null {
  const data = getCachedValue<CohortMatrixData>(key, CACHE_DURATION);
  if (!data) return null;
  const cells = Array.isArray(data.cells) ? data.cells : [];
  if (cells.length < 2) return null;
  const modelYears = Array.isArray(data.modelYears) ? data.modelYears : [];
  const calendarYears = Array.isArray(data.calendarYears) ? data.calendarYears : [];
  if (modelYears.length < 2 || calendarYears.length < 2) return null;
  return { ...data, modelYears, calendarYears, cells, has0km: Boolean(data.has0km) };
}

function setCache(key: string, data: CohortMatrixData): void {
  if (!data?.cells?.length || data.cells.length < 2) return;
  setCachedValue(key, data);
}

/** Fallback: build cohort matrix only from fipe_price_history (sem Edge Function). */
async function fetchCohortFromDb(
  supabaseClient: ReturnType<typeof import('@/integrations/supabase/client').supabase>,
  fipeCode: string
): Promise<CohortMatrixData | null> {
  const { data: rows, error } = await supabaseClient
    .from('fipe_price_history')
    .select('model_year, reference_year, reference_month, price')
    .eq('fipe_code', fipeCode);

  if (error || !rows?.length) return null;

  type Row = { model_year: number; reference_year: number; reference_month: number; price: number };
  const byKey = new Map<string, Row>();
  for (const r of rows as Row[]) {
    const key = `${r.model_year}-${r.reference_year}`;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, r);
    else if (r.reference_month === 12 && existing.reference_month !== 12) byKey.set(key, r);
  }

  const cells: CohortCell[] = [];
  for (const r of byKey.values()) {
    if (r.model_year === 32000) continue; // 0km row handled separately in Edge; exclude from matrix
    cells.push({
      modelYear: r.model_year,
      calendarYear: r.reference_year,
      price: Number(r.price),
      month: r.reference_month - 1,
    });
  }

  const modelYears = [...new Set(cells.map((c) => c.modelYear))].filter((y) => y > 2000).sort((a, b) => a - b);
  const calendarYears = [...new Set(cells.map((c) => c.calendarYear))].sort((a, b) => a - b);
  const has0km = rows.some((r: Row) => r.model_year === 32000);

  if (modelYears.length < 2 || calendarYears.length < 2 || cells.length < 2) return null;

  return { modelYears, calendarYears, cells, has0km };
}

export interface UseCohortMatrixReturn {
  matrixData: CohortMatrixData | null;
  loading: boolean;
  error: string | null;
  /** 
   * Fetch cohort data for a FIPE code. 
   * Returns the data directly for immediate use (avoids React state race condition).
   * @param forceRefresh - If true, clears cache and re-fetches from API
   */
  fetchCohortData: (fipeCode: string, forceRefresh?: boolean) => Promise<CohortMatrixData | null>;
  reset: () => void;
  getCell: (modelYear: number, calendarYear: number) => CohortCell | undefined;
  getYoYChange: (modelYear: number, calendarYear: number) => number | null;
  getVs0kmChange: (modelYear: number, calendarYear: number) => number | null;
}

export function useCohortMatrix(): UseCohortMatrixReturn {
  // All useState hooks MUST be called unconditionally at the top
  const [matrixData, setMatrixData] = useState<CohortMatrixData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // All useRef hooks also unconditionally at the top
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cellMapRef = useRef<Map<string, CohortCell>>(new Map());

  // Cleanup effect - runs once on mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Build cell map when data changes
  useEffect(() => {
    const map = cellMapRef.current;
    map.clear();
    if (matrixData?.cells) {
      for (const cell of matrixData.cells) {
        map.set(`${cell.modelYear}-${cell.calendarYear}`, cell);
      }
    }
  }, [matrixData]);

  const getCell = useCallback((modelYear: number, calendarYear: number): CohortCell | undefined => {
    return cellMapRef.current.get(`${modelYear}-${calendarYear}`);
  }, []);

  const getYoYChange = useCallback((modelYear: number, calendarYear: number): number | null => {
    if (!matrixData) return null;
    
    const current = getCell(modelYear, calendarYear);
    const prevIdx = matrixData.calendarYears.indexOf(calendarYear) - 1;
    if (prevIdx < 0) return null;
    
    const prevYear = matrixData.calendarYears[prevIdx];
    const previous = getCell(modelYear, prevYear);
    
    if (!current || !previous) return null;
    return (current.price - previous.price) / previous.price;
  }, [matrixData, getCell]);

  const getVs0kmChange = useCallback((modelYear: number, calendarYear: number): number | null => {
    if (!matrixData) return null;
    
    const current = getCell(modelYear, calendarYear);
    // Get 0km price from the launch year (Y-1)
    const launchYear = modelYear - 1;
    const zeroKmCell = getCell(modelYear, launchYear);
    
    if (!current || !zeroKmCell || calendarYear === launchYear) return null;
    return (current.price - zeroKmCell.price) / zeroKmCell.price;
  }, [matrixData, getCell]);

  const fetchCohortData = useCallback(async (fipeCode: string, forceRefresh = false): Promise<CohortMatrixData | null> => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Lazy cleanup of old cache versions
    cleanupOldCacheOnce();

    const cacheKey = getCacheKey(fipeCode);
    
    // Force refresh: clear cache for this code
    if (forceRefresh) {
      removeCachedValue(cacheKey);
    } else {
      // Check cache first (only if not forcing refresh)
      const cached = getCache(cacheKey);
      if (cached) {
        setMatrixData(cached);
        return cached; // Return directly for immediate use
      }
    }

    setLoading(true);
    setError(null);
    setMatrixData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fipe-cohort-matrix', {
        body: { fipeCode }
      });

      if (!fnError && data != null) {
        const hasPayload = Array.isArray((data as { modelYears?: unknown }).modelYears) || Array.isArray((data as { cells?: unknown }).cells);
        if (hasPayload) {
          const modelYears = Array.isArray(data.modelYears) ? data.modelYears : [];
          const calendarYears = Array.isArray(data.calendarYears) ? data.calendarYears : [];
          const cells = Array.isArray(data.cells) ? data.cells : [];
          const result: CohortMatrixData = {
            modelYears,
            calendarYears,
            cells,
            has0km: Boolean(data.has0km),
          };
          if (mountedRef.current) {
            setMatrixData(result);
            setCache(cacheKey, result);
            setError(null);
          }
          return result;
        }
      }

      // Edge Function falhou (non-2xx, timeout ou payload inválido): fallback direto no banco
      const fromDb = await fetchCohortFromDb(supabase, fipeCode);
      if (fromDb && mountedRef.current) {
        setMatrixData(fromDb);
        setCache(cacheKey, fromDb);
        setError(null);
        return fromDb;
      }

      // Sem dados no banco: mensagem amigável
      const msg = fnError?.message?.includes('non-2xx')
        ? 'Serviço temporariamente indisponível. Os dados do banco foram consultados; se o erro persistir, tente novamente mais tarde.'
        : (fnError?.message || (data as { error?: string })?.error || 'Erro ao carregar matriz.');
      if (mountedRef.current) setError(msg);
      return null;
    } catch (err) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar matriz de cohort.';
        setError(msg);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setMatrixData(null);
    setError(null);
    setLoading(false);
    cellMapRef.current.clear();
  }, []);

  return {
    matrixData,
    loading,
    error,
    fetchCohortData,
    reset,
    getCell,
    getYoYChange,
    getVs0kmChange,
  };
}
