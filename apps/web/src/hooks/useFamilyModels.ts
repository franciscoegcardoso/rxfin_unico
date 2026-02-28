/**
 * Hook para buscar modelos da mesma família (Nível 2 do Waterfall)
 * 
 * Estratégia: Database-First, API-Last
 * 
 * Quando o Nível 1 (dados específicos) falha por falta de pontos,
 * este hook busca dados agregados de todos os anos-modelo da mesma família.
 * 
 * OTIMIZAÇÃO v2.0:
 * 1. Primeiro busca no banco de dados (fipe_price_history) - RÁPIDO
 * 2. Só usa API FIPE como fallback se banco insuficiente - LENTO
 * 
 * Exemplo: Se "Corolla XEi 2.0" não tem histórico suficiente,
 * buscamos dados de "Corolla" (todas as versões e anos).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { getCachedValue, setCachedValue } from '@/utils/kvCacheUtils';
import type { RawCohortData } from '@/utils/depreciationCoreEngine';

// Cache persistente
const CACHE_KEY_PREFIX = 'fipe_family_models_v2_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const MIN_POINTS_FOR_DB_SUCCESS = 5; // Mínimo de pontos para considerar DB suficiente (reduzido de 10 para ativar fallback API mais cedo)

// Helper function to fetch via fipe-proxy with path parameter (GET with query string)
// Returns null for 404s (expected for invalid model/year combos) instead of throwing
async function fetchFipeProxy<T>(path: string): Promise<T | null> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fipe-proxy?path=${encodeURIComponent(path)}`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  // 404 is expected for invalid model/year combinations - return null gracefully
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FIPE proxy error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

interface CacheEntry {
  data: FamilyModelsData;
  timestamp: number;
}

export interface FamilyModelInfo {
  fipeCode: string;
  modelName: string;
  modelYear: number;
}

export interface FamilyModelsData {
  familyName: string;
  models: FamilyModelInfo[];
  cohortData: RawCohortData[];
  totalPoints: number;
  source: 'database' | 'api'; // Novo: indica a fonte dos dados
}

export interface UseFamilyModelsReturn {
  familyData: FamilyModelsData | null;
  loading: boolean;
  error: string | null;
  fetchFamilyModels: (
    brandCode: string,
    modelName: string,
    vehicleType: 'carros' | 'motos' | 'caminhoes',
    fipeCode?: string
  ) => Promise<FamilyModelsData | null>;
  reset: () => void;
}

/**
 * Extrai o prefixo da marca do código FIPE completo
 * 
 * IMPORTANTE: O brandCode da API FIPE (ex: "25" para Honda) é DIFERENTE
 * do prefixo do código FIPE (ex: "014" para Honda).
 * 
 * Esta função extrai os 3 primeiros dígitos de um código FIPE completo.
 * 
 * Exemplos:
 * - "014075-9" -> "014" (Honda)
 * - "025341-8" -> "025" (GM/Chevrolet)
 * - "001234-5" -> "001" (Acura)
 */
function extractBrandPrefixFromFipeCode(fipeCode: string): string {
  // Código FIPE completo: pegar os 3 primeiros dígitos
  if (fipeCode.includes('-') || fipeCode.length >= 6) {
    return fipeCode.substring(0, 3);
  }
  // Fallback: se for só um código numérico, formata para 3 dígitos
  const numericCode = fipeCode.replace(/\D/g, '');
  return numericCode.padStart(3, '0');
}

/**
 * Extrai o nome base da família de um modelo completo
 * 
 * Exemplos:
 * - "COROLLA XEi 2.0 Flex 16V Aut." -> "Corolla"
 * - "GOL 1.0 Mi Total Flex 8V 4p" -> "Gol"
 * - "HB20 1.6 Comfort Plus 16V Flex 4p Aut." -> "HB20"
 * - "ONIX HATCH LT 1.0 8V FlexPower 5p Mec." -> "Onix"
 */
export function extractModelFamily(fullModelName: string): string {
  // Remove versões numéricas, sufixos de motorização, etc.
  const cleaned = fullModelName
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // Palavras a ignorar (versões, motorizações, etc.)
  const ignorePatterns = [
    /\b\d+\.\d+\b/,          // 1.0, 2.0, etc.
    /\bFLEX\b/i,
    /\bGASOLINA\b/i,
    /\bDIESEL\b/i,
    /\bETANOL\b/i,
    /\b\d+V\b/,              // 8V, 16V, etc.
    /\bAUT\.?\b/i,
    /\bMEC\.?\b/i,
    /\b\d+P\b/,              // 4p, 5p (portas)
    /\bMI\b/i,
    /\bMPI\b/i,
    /\bTURBO\b/i,
    /\bTSI\b/i,
    /\bTFSI\b/i,
    /\bHATCH\b/i,
    /\bSEDAN\b/i,
    /\bSUV\b/i,
    /\bPICKUP\b/i,
    /\bPLUS\b/i,
    /\bPREMIUM\b/i,
    /\bCOMFORT\b/i,
    /\bXEI\b/i,
    /\bXLI\b/i,
    /\bGLI\b/i,
    /\bLT\b/i,
    /\bLTZ\b/i,
    /\bLS\b/i,
    /\bSR\b/i,
    /\bSE\b/i,
    /\bEL\b/i,
    /\bDX\b/i,
    /\bEX\b/i,
    /\bLX\b/i,
  ];
  
  // Pega a primeira palavra significativa
  const words = cleaned.split(' ');
  let familyName = words[0];
  
  // Se a primeira palavra for muito curta (< 3 chars) e houver outra, combina
  if (familyName.length < 3 && words.length > 1) {
    familyName = `${words[0]} ${words[1]}`;
  }
  
  // Capitaliza: COROLLA -> Corolla
  return familyName.charAt(0).toUpperCase() + familyName.slice(1).toLowerCase();
}

function getCacheKey(brandCode: string, familyName: string): string {
  return `${CACHE_KEY_PREFIX}${brandCode}_${familyName.toLowerCase().replace(/\s+/g, '_')}`;
}

function getCache(key: string): FamilyModelsData | null {
  return getCachedValue<FamilyModelsData>(key, CACHE_DURATION);
}

function setCache(key: string, data: FamilyModelsData): void {
  if (!data || data.totalPoints < 5) return;
  setCachedValue(key, data);
}

export function useFamilyModels(): UseFamilyModelsReturn {
  const [familyData, setFamilyData] = useState<FamilyModelsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    setFamilyData(null);
    setError(null);
    setLoading(false);
    abortControllerRef.current?.abort();
  }, []);

  /**
   * FASE 1: Busca dados da família diretamente no banco de dados
   * Estratégia Database-First - muito mais rápido que API
   */
  const fetchFamilyFromDatabase = useCallback(async (
    brandPrefix: string,
    familyName: string
  ): Promise<{ cohortData: RawCohortData[]; fipeCodes: string[] } | null> => {
    console.log(`[useFamilyModels] DB-First: Querying database for family "${familyName}" (prefix: ${brandPrefix})`);
    
    try {
      // Query database for all FIPE codes with this brand prefix
      // Prioritize December data (reference_month = 12)
      const { data: cachedPrices, error: dbError } = await supabase
        .from('fipe_price_history')
        .select('fipe_code, model_year, reference_year, reference_month, price')
        .like('fipe_code', `${brandPrefix}%`)
        .eq('reference_month', 12)
        .order('reference_year', { ascending: true });
      
      if (dbError) {
        console.warn('[useFamilyModels] DB query error:', dbError);
        return null;
      }
      
      if (!cachedPrices || cachedPrices.length === 0) {
        console.log(`[useFamilyModels] No cached data found for prefix ${brandPrefix}`);
        return null;
      }
      
      // Get unique FIPE codes
      const fipeCodes = [...new Set(cachedPrices.map(p => p.fipe_code))];
      
      // Convert to RawCohortData format
      const cohortData: RawCohortData[] = cachedPrices.map(price => ({
        t: 0, // Will be calculated in prepareDataPoints by the core engine
        price: Number(price.price),
        year: price.reference_year,
        ref_date: `${price.reference_year}-12-01`,
      }));
      
      console.log(`[useFamilyModels] DB-First: Found ${cohortData.length} points from ${fipeCodes.length} FIPE codes`);
      
      return { cohortData, fipeCodes };
      
    } catch (err) {
      console.error('[useFamilyModels] DB query exception:', err);
      return null;
    }
  }, []);

  /**
   * FASE 2: Fallback para API FIPE (lento, só se banco insuficiente)
   */
  const fetchFamilyFromAPI = useCallback(async (
    brandCode: string,
    familyName: string,
    vehicleType: 'carros' | 'motos' | 'caminhoes'
  ): Promise<{ cohortData: RawCohortData[]; models: FamilyModelInfo[] } | null> => {
    console.log(`[useFamilyModels] API Fallback: Fetching from FIPE API for "${familyName}" (brand: ${brandCode})`);
    
    try {
      // Step 1: Get all models from the brand that match the family name
      const modelsPath = `/${vehicleType}/marcas/${brandCode}/modelos`;
      const proxyData = await fetchFipeProxy<{ modelos: Array<{ codigo: number; nome: string }> }>(modelsPath);
      
      if (!proxyData?.modelos || !Array.isArray(proxyData.modelos)) {
        console.log(`[useFamilyModels] API Fallback: No models returned for brand ${brandCode}`);
        return null;
      }
      
      // Filter models that belong to the same family
      const familyNameUpper = familyName.toUpperCase();
      const familyModels = proxyData.modelos.filter((m: { nome: string }) => 
        m.nome.toUpperCase().startsWith(familyNameUpper) ||
        m.nome.toUpperCase().includes(` ${familyNameUpper} `) ||
        m.nome.toUpperCase().includes(`${familyNameUpper} `)
      );
      
      if (familyModels.length === 0) {
        console.log(`[useFamilyModels] No family models found for "${familyName}" in brand ${brandCode} via API`);
        return null;
      }
      
      console.log(`[useFamilyModels] Found ${familyModels.length} models in family "${familyName}" for brand ${brandCode}`);
      
      // Step 2: For each model, get available years and FIPE codes (limit to 5 for better coverage)
      const modelsToFetch = familyModels.slice(0, 5);
      const modelInfos: FamilyModelInfo[] = [];
      
      for (const model of modelsToFetch) {
        const yearsPath = `/${vehicleType}/marcas/${brandCode}/modelos/${model.codigo}/anos`;
        const yearsData = await fetchFipeProxy<Array<{ codigo: string; nome: string }>>(yearsPath);
        
        if (!yearsData || !Array.isArray(yearsData)) continue;
        
        for (const year of yearsData) {
          const yearCode = String(year.codigo);
          const yearNum = parseInt(yearCode.split('-')[0], 10);
          
          if (yearNum === 32000 || yearNum < 2005) continue;
          
          const pricePath = `/${vehicleType}/marcas/${brandCode}/modelos/${model.codigo}/anos/${yearCode}`;
          const priceData = await fetchFipeProxy<{ CodigoFipe?: string; codigoFipe?: string }>(pricePath);
          
          if (!priceData) continue;
          
          const fipeCode = priceData.CodigoFipe || priceData.codigoFipe;
          if (fipeCode) {
            modelInfos.push({
              fipeCode,
              modelName: model.nome,
              modelYear: yearNum,
            });
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (modelInfos.length === 0) {
        return null;
      }
      
      // Step 3: Query the database for cached prices for these FIPE codes
      const fipeCodes = [...new Set(modelInfos.map(m => m.fipeCode))];
      
      const { data: cachedPrices } = await supabase
        .from('fipe_price_history')
        .select('fipe_code, model_year, reference_year, price')
        .in('fipe_code', fipeCodes);
      
      const cohortData: RawCohortData[] = [];
      
      if (cachedPrices && cachedPrices.length > 0) {
        for (const price of cachedPrices) {
          cohortData.push({
            t: 0,
            price: Number(price.price),
            year: price.reference_year,
            ref_date: `${price.reference_year}-12-01`,
          });
        }
      }
      
      // If still insufficient, try cohort-matrix for first code
      if (cohortData.length < MIN_POINTS_FOR_DB_SUCCESS && fipeCodes.length > 0) {
        const { data: cohortResponse } = await supabase.functions.invoke('fipe-cohort-matrix', {
          body: { fipeCode: fipeCodes[0] },
        });
        
        if (cohortResponse?.success && cohortResponse?.cells) {
          for (const cell of cohortResponse.cells) {
            cohortData.push({
              t: 0,
              price: cell.price,
              year: cell.calendarYear,
              ref_date: `${cell.calendarYear}-${String(cell.month || 12).padStart(2, '0')}-01`,
            });
          }
        }
      }
      
      return { cohortData, models: modelInfos };
      
    } catch (err) {
      console.error('[useFamilyModels] API fallback error:', err);
      return null;
    }
  }, []);

  /**
   * Busca todos os modelos da mesma família e seus dados de cohort
   * Estratégia: Database-First, API-Last
   */
  const fetchFamilyModels = useCallback(async (
    brandCode: string,
    modelName: string,
    vehicleType: 'carros' | 'motos' | 'caminhoes',
    fipeCode?: string
  ): Promise<FamilyModelsData | null> => {
    const familyName = extractModelFamily(modelName);
    // CORREÇÃO: Usar fipeCode se disponível para extrair prefixo correto
    // O brandCode da API (ex: "25") é diferente do prefixo FIPE (ex: "014")
    const brandPrefix = fipeCode 
      ? extractBrandPrefixFromFipeCode(fipeCode)
      : extractBrandPrefixFromFipeCode(brandCode);
    const cacheKey = getCacheKey(brandPrefix, familyName);
    
    console.log(`[useFamilyModels] Extracting prefix: fipeCode=${fipeCode}, brandCode=${brandCode}, result=${brandPrefix}`);
    
    // Check cache first
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[useFamilyModels] Cache hit for ${familyName}: ${cached.totalPoints} points`);
      setFamilyData(cached);
      return cached;
    }
    
    setLoading(true);
    setError(null);
    
    // Cancel any pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      console.log(`[useFamilyModels] Fetching family "${familyName}" (brand: ${brandCode}, prefix: ${brandPrefix})`);
      
      // =====================================================================
      // FASE 1: Database-First (rápido, ~50-100ms)
      // =====================================================================
      const dbResult = await fetchFamilyFromDatabase(brandPrefix, familyName);
      
      if (dbResult && dbResult.cohortData.length >= MIN_POINTS_FOR_DB_SUCCESS) {
        console.log(`[useFamilyModels] ✅ DB-First SUCCESS: ${dbResult.cohortData.length} points`);
        
        const result: FamilyModelsData = {
          familyName,
          models: [], // Não temos info de modelos específicos no DB-first
          cohortData: dbResult.cohortData,
          totalPoints: dbResult.cohortData.length,
          source: 'database',
        };
        
        setCache(cacheKey, result);
        
        if (mountedRef.current) {
          setFamilyData(result);
          setLoading(false);
        }
        
        return result;
      }
      
      // =====================================================================
      // FASE 2: API Fallback (lento, só se banco insuficiente)
      // =====================================================================
      console.log(`[useFamilyModels] DB insufficient (${dbResult?.cohortData.length || 0} points), trying API...`);
      
      const apiResult = await fetchFamilyFromAPI(brandCode, familyName, vehicleType);
      
      if (!apiResult || apiResult.cohortData.length === 0) {
        // Se DB tinha algo, usa mesmo que insuficiente
        if (dbResult && dbResult.cohortData.length > 0) {
          const result: FamilyModelsData = {
            familyName,
            models: [],
            cohortData: dbResult.cohortData,
            totalPoints: dbResult.cohortData.length,
            source: 'database',
          };
          
          if (mountedRef.current) {
            setFamilyData(result);
            setLoading(false);
          }
          
          return result;
        }
        
        console.log(`[useFamilyModels] No data found for family "${familyName}"`);
        if (mountedRef.current) {
          setLoading(false);
        }
        return null;
      }
      
      const result: FamilyModelsData = {
        familyName,
        models: apiResult.models,
        cohortData: apiResult.cohortData,
        totalPoints: apiResult.cohortData.length,
        source: 'api',
      };
      
      setCache(cacheKey, result);
      
      if (mountedRef.current) {
        setFamilyData(result);
        setLoading(false);
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[useFamilyModels] Error:', errorMessage);
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      
      return null;
    }
  }, [fetchFamilyFromDatabase, fetchFamilyFromAPI]);

  return {
    familyData,
    loading,
    error,
    fetchFamilyModels,
    reset,
  };
}
