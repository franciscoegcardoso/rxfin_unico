/**
 * Hook para agregação por marca (Nível 3 do Waterfall)
 * 
 * Quando os níveis 1 (modelo exato) e 2 (família) não têm dados suficientes,
 * este hook busca dados agregados de TODOS os veículos da mesma marca
 * no cache do banco de dados.
 * 
 * Exemplo: Se "Honda Civic EXR" e família "Civic" não têm histórico suficiente,
 * buscamos dados de todos os veículos Honda (Fit, CR-V, HR-V, etc.).
 * 
 * Estratégia: Database-First (nunca chama API externa)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RawCohortData } from '@/utils/depreciationCoreEngine';

import { getCachedValue, setCachedValue } from '@/utils/kvCacheUtils';

// Cache persistente
const CACHE_KEY_PREFIX = 'brand_agg_v1_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
export interface BrandAggregationData {
  brandPrefix: string;
  brandName: string;
  cohortData: RawCohortData[];
  totalPoints: number;
  distinctFipeCodes: number;
  averageDecayRate: number; // Taxa média de depreciação anual
}

export interface UseBrandAggregationReturn {
  brandData: BrandAggregationData | null;
  loading: boolean;
  error: string | null;
  fetchBrandAggregation: (
    fipeCode: string,
    brandName: string
  ) => Promise<BrandAggregationData | null>;
  reset: () => void;
}

/**
 * Extrai o prefixo da marca do código FIPE
 * 
 * Exemplos:
 * - "014075-9" -> "014" (Honda)
 * - "025341-8" -> "025" (GM/Chevrolet)
 * - "001267-0" -> "001" (Acura)
 */
export function extractBrandPrefix(fipeCode: string): string {
  // Remove caracteres não numéricos e pega os primeiros 3 dígitos
  const numericCode = fipeCode.replace(/\D/g, '');
  return numericCode.substring(0, 3);
}

function getCacheKey(brandPrefix: string): string {
  return `${CACHE_KEY_PREFIX}${brandPrefix}`;
}

function getCache(key: string): BrandAggregationData | null {
  return getCachedValue<BrandAggregationData>(key, CACHE_DURATION);
}

function setCache(key: string, data: BrandAggregationData): void {
  if (!data || data.totalPoints < 10) return;
  setCachedValue(key, data);
}

/**
 * Calcula a taxa média de depreciação anual a partir dos dados de cohort
 */
function calculateAverageDecayRate(cohortData: RawCohortData[]): number {
  if (cohortData.length < 2) return -0.08; // Fallback: -8% a.a.
  
  // Agrupar por ano e calcular média de preços
  const pricesByYear = new Map<number, number[]>();
  
  cohortData.forEach(point => {
    const prices = pricesByYear.get(point.year) || [];
    prices.push(point.price);
    pricesByYear.set(point.year, prices);
  });
  
  // Calcular média por ano e ordenar
  const yearAverages = Array.from(pricesByYear.entries())
    .map(([year, prices]) => ({
      year,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    }))
    .sort((a, b) => a.year - b.year);
  
  if (yearAverages.length < 2) return -0.08;
  
  // Calcular taxa de variação média ano a ano
  let totalRate = 0;
  let rateCount = 0;
  
  for (let i = 1; i < yearAverages.length; i++) {
    const prev = yearAverages[i - 1];
    const curr = yearAverages[i];
    
    if (prev.avgPrice > 0) {
      const yoyRate = (curr.avgPrice - prev.avgPrice) / prev.avgPrice;
      // Ignorar taxas extremas (>50% ou <-50%)
      if (yoyRate > -0.5 && yoyRate < 0.5) {
        totalRate += yoyRate;
        rateCount++;
      }
    }
  }
  
  return rateCount > 0 ? totalRate / rateCount : -0.08;
}

export function useBrandAggregation(): UseBrandAggregationReturn {
  const [brandData, setBrandData] = useState<BrandAggregationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setBrandData(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Busca dados agregados de todos os veículos da marca no banco de dados
   */
  const fetchBrandAggregation = useCallback(async (
    fipeCode: string,
    brandName: string
  ): Promise<BrandAggregationData | null> => {
    const brandPrefix = extractBrandPrefix(fipeCode);
    const cacheKey = getCacheKey(brandPrefix);
    
    // Check cache first
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[useBrandAggregation] Cache hit for ${brandName} (${brandPrefix}): ${cached.totalPoints} points`);
      setBrandData(cached);
      return cached;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[useBrandAggregation] Fetching brand data for "${brandName}" (prefix: ${brandPrefix})`);
      
      // Query database for all FIPE codes with this brand prefix
      // Prioritize December data (reference_month = 12)
      const { data: cachedPrices, error: dbError } = await supabase
        .from('fipe_price_history')
        .select('fipe_code, model_year, reference_year, reference_month, price')
        .like('fipe_code', `${brandPrefix}%`)
        .eq('reference_month', 12)
        .order('reference_year', { ascending: true });
      
      if (dbError) {
        console.warn('[useBrandAggregation] DB query error:', dbError);
        throw new Error(`Erro ao buscar dados da marca: ${dbError.message}`);
      }
      
      if (!cachedPrices || cachedPrices.length === 0) {
        console.log(`[useBrandAggregation] No cached data found for brand ${brandName}`);
        
        if (mountedRef.current) {
          setLoading(false);
        }
        return null;
      }
      
      console.log(`[useBrandAggregation] Got ${cachedPrices.length} points from DB for brand ${brandName}`);
      
      // Convert to RawCohortData format
      const cohortData: RawCohortData[] = cachedPrices.map(price => ({
        t: 0, // Will be calculated in prepareDataPoints by the core engine
        price: Number(price.price),
        year: price.reference_year,
        ref_date: `${price.reference_year}-12-01`,
      }));
      
      // Count distinct FIPE codes
      const distinctFipeCodes = new Set(cachedPrices.map(p => p.fipe_code)).size;
      
      // Calculate average decay rate
      const averageDecayRate = calculateAverageDecayRate(cohortData);
      
      const result: BrandAggregationData = {
        brandPrefix,
        brandName,
        cohortData,
        totalPoints: cohortData.length,
        distinctFipeCodes,
        averageDecayRate,
      };
      
      // Cache successful result
      setCache(cacheKey, result);
      
      console.log(`[useBrandAggregation] ✅ Brand aggregation complete: ${cohortData.length} points from ${distinctFipeCodes} FIPE codes, avg decay: ${(averageDecayRate * 100).toFixed(2)}%`);
      
      if (mountedRef.current) {
        setBrandData(result);
        setLoading(false);
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[useBrandAggregation] Error:', errorMessage);
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      
      return null;
    }
  }, []);

  return {
    brandData,
    loading,
    error,
    fetchBrandAggregation,
    reset,
  };
}
