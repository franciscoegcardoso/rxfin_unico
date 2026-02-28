import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

export type VehicleType = 'carros' | 'motos' | 'caminhoes';

export interface FipeBrand {
  codigo: string;
  nome: string;
}

export interface FipeModel {
  codigo: number;
  nome: string;
}

export interface FipeYear {
  codigo: string;
  nome: string;
}

/**
 * Formata o nome do ano FIPE para exibição amigável.
 * Converte "32000 Flex" para "0 km (Flex)", "32000 Gasolina" para "0 km (Gasolina)", etc.
 */
export const formatFipeYearName = (yearName: string): string => {
  if (yearName.startsWith('32000')) {
    const fuel = yearName.replace('32000', '').trim();
    return fuel ? `0 km (${fuel})` : '0 km';
  }
  return yearName;
};

/**
 * Formata o código do ano modelo FIPE para exibição amigável.
 */
export const formatFipeAnoModelo = (anoModelo: number): string => {
  return anoModelo === 32000 ? '0 km' : String(anoModelo);
};

export interface FipePrice {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  TipoVeiculo: number;
  SiglaCombustivel: string;
}

export interface FipeInitData {
  vehicleType?: VehicleType;
  brandCode?: string;
  modelCode?: string;
  yearCode?: string;
}

export interface UseFipeReturn {
  vehicleType: VehicleType;
  setVehicleType: (type: VehicleType) => void;
  brands: FipeBrand[];
  models: FipeModel[];
  years: FipeYear[];
  selectedBrand: string;
  selectedModel: string;
  selectedYear: string;
  setSelectedBrand: (code: string) => void;
  setSelectedModel: (code: string) => void;
  setSelectedYear: (code: string) => void;
  price: FipePrice | null;
  priceValue: number;
  loading: {
    brands: boolean;
    models: boolean;
    years: boolean;
    price: boolean;
  };
  error: string | null;
  reset: () => void;
  initializeFromSaved: (data: FipeInitData) => void;
  isInitializing: boolean;
}

// =============================================================================
// CACHE CONFIGURATION
// Define cache durations for different FIPE data types to minimize API calls
// =============================================================================
const cache = new Map<string, { data: unknown; timestamp: number }>();

const CACHE_DURATIONS = {
  brands: 7 * 24 * 60 * 60 * 1000, // 7 days - brands rarely change
  models: 24 * 60 * 60 * 1000,     // 1 day - models update infrequently
  years: 24 * 60 * 60 * 1000,      // 1 day - years are stable
  price: 60 * 60 * 1000,           // 1 hour - prices update monthly but cache short for freshness
} as const;

// =============================================================================
// CACHE UTILITIES
// Helper functions for reading/writing to in-memory cache
// =============================================================================

/**
 * Retrieves cached data if not expired
 * @param key - Unique cache key
 * @param type - Type of data (determines expiration duration)
 * @returns Cached data or null if expired/missing
 */
function getCached<T>(key: string, type: keyof typeof CACHE_DURATIONS): T | null {
  const cached = cache.get(key);
  const duration = CACHE_DURATIONS[type];
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

/**
 * Stores data in cache with current timestamp
 * @param key - Unique cache key
 * @param data - Data to cache
 */
function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// =============================================================================
// API ERROR MESSAGES
// User-friendly error messages for different failure scenarios
// =============================================================================
const API_ERROR_MESSAGES = {
  network: 'Erro de conexão. Verifique sua internet e tente novamente.',
  timeout: 'A consulta demorou demais. Tente novamente em alguns segundos.',
  rateLimit: 'Muitas consultas seguidas. Aguarde alguns segundos.',
  server: 'Serviço FIPE temporariamente indisponível. Usando dados em cache.',
  unknown: 'Erro ao consultar tabela FIPE.',
} as const;

/**
 * Maps HTTP errors to user-friendly messages
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch') || msg.includes('network')) return API_ERROR_MESSAGES.network;
    if (msg.includes('timeout') || msg.includes('abort')) return API_ERROR_MESSAGES.timeout;
    if (msg.includes('429')) return API_ERROR_MESSAGES.rateLimit;
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return API_ERROR_MESSAGES.server;
  }
  return API_ERROR_MESSAGES.unknown;
}

// =============================================================================
// DATABASE-FIRST LAYER
// Tries local Supabase DB before hitting external API proxy.
// Falls through to API when DB has no data or query fails.
// =============================================================================

const DB_VT_MAP: Record<string, number> = { carros: 1, motos: 2, caminhoes: 3 };
const DB_FUEL_NAMES: Record<number, string> = { 1: 'Gasolina', 2: 'Álcool', 3: 'Diesel', 4: 'Gás', 5: 'Flex', 6: 'Elétrico/Híbrido' };
const DB_FUEL_ACRONYMS: Record<number, string> = { 1: 'G', 2: 'A', 3: 'D', 4: 'N', 5: 'F', 6: 'E' };
const DB_MIN_BRANDS_THRESHOLD = 20; // Only use DB if it has enough brands

async function tryFipeFromDB<T>(path: string): Promise<T | null> {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const vtName = parts[0];
  const vt = DB_VT_MAP[vtName];
  if (!vt) return null;

  // /carros/marcas → brands list
  if (parts.length === 2 && parts[1] === 'marcas') {
    const { data, error } = await (supabase.rpc as any)('get_fipe_brands', { p_vehicle_type: vt });
    if (error || !data || (data as any[]).length < DB_MIN_BRANDS_THRESHOLD) return null;
    return (data as any[]).map((r: any) => ({ codigo: String(r.brand_id), nome: r.brand_name })) as unknown as T;
  }

  // /carros/marcas/59/modelos → models for brand
  if (parts.length === 4 && parts[1] === 'marcas' && parts[3] === 'modelos') {
    const brandId = parseInt(parts[2]);
    if (isNaN(brandId)) return null;
    const { data, error } = await (supabase.rpc as any)('get_fipe_models', { p_vehicle_type: vt, p_brand_id: brandId });
    if (error || !data || (data as any[]).length === 0) return null;
    const models = (data as any[]).map((r: any) => ({ codigo: r.model_id, nome: r.model_name }));
    return { modelos: models } as unknown as T;
  }

  // /carros/marcas/59/modelos/5940/anos → years for model
  if (parts.length === 6 && parts[5] === 'anos') {
    const brandId = parseInt(parts[2]);
    const modelId = parseInt(parts[4]);
    if (isNaN(brandId) || isNaN(modelId)) return null;
    const { data, error } = await (supabase.rpc as any)('get_fipe_years', { p_vehicle_type: vt, p_brand_id: brandId, p_model_id: modelId });
    if (error || !data || (data as any[]).length === 0) return null;
    return (data as any[]).map((r: any) => ({
      codigo: r.year_id,
      nome: r.year_val === 32000
        ? `32000 ${DB_FUEL_NAMES[r.fuel_type] || 'Gasolina'}`
        : `${r.year_val} ${DB_FUEL_NAMES[r.fuel_type] || 'Gasolina'}`,
    })) as unknown as T;
  }

  // /carros/marcas/59/modelos/5940/anos/2024-1 → price for vehicle
  if (parts.length === 7) {
    const brandId = parseInt(parts[2]);
    const modelId = parseInt(parts[4]);
    const yearId = parts[6];
    if (isNaN(brandId) || isNaN(modelId)) return null;

    const { data: entry, error: catErr } = await (supabase.rpc as any)('get_fipe_catalog_entry', {
      p_vehicle_type: vt, p_brand_id: brandId, p_model_id: modelId, p_year_id: yearId,
    });
    if (catErr || !entry || (entry as any[]).length === 0) return null;
    const cat = (entry as any[])[0];

    const { data: priceData } = await supabase
      .from('fipe_price_history')
      .select('price, reference_label')
      .eq('fipe_code', cat.fipe_code)
      .eq('model_year', cat.year_val)
      .order('reference_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!priceData) return null;

    const priceNum = Number(priceData.price);
    const formatted = priceNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return {
      Valor: formatted,
      Marca: cat.brand_name,
      Modelo: cat.model_name,
      AnoModelo: cat.year_val,
      Combustivel: DB_FUEL_NAMES[cat.fuel_type] || 'Gasolina',
      CodigoFipe: cat.fipe_code,
      MesReferencia: priceData.reference_label,
      TipoVeiculo: vt,
      SiglaCombustivel: DB_FUEL_ACRONYMS[cat.fuel_type] || 'G',
    } as unknown as T;
  }

  return null;
}

// =============================================================================
// FIPE PROXY FETCH
// Database-first with API fallback. Queries local DB, then Edge Function proxy.
// =============================================================================

async function fetchFipeProxy<T>(path: string): Promise<T | null> {
  // DB-First: try local database
  try {
    const dbResult = await tryFipeFromDB<T>(path);
    if (dbResult !== null) return dbResult;
  } catch { /* DB failed, proceed to API */ }

  // API Fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/fipe-proxy?path=${encodeURIComponent(path)}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    
    // 404 is expected for invalid model/year combinations - return null gracefully
    if (response.status === 404) {
      return null;
    }
    
     if (!response.ok) {
       const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
       const msg = typeof (errorData as any)?.error === 'string' ? (errorData as any).error : '';
 
       // Don't throw for "Not found" errors - treat as empty result
       if (msg.includes('Not found')) return null;
 
       throw new Error(msg || `HTTP ${response.status}`);
     }

     const data: unknown = await response.json().catch(() => null);
     if (!data) return null;

     // When the proxy responds with a 200 + { ok:false, error: ... }, treat as empty.
     if (
       typeof data === 'object' &&
       data !== null &&
       (("ok" in data && (data as any).ok === false) ||
         ("error" in data && typeof (data as any).error === 'string'))
     ) {
       return null;
     }

     return data as T;
  } catch (error) {
    // Don't crash - caller will handle null result
    
    // Re-throw only if it's a genuine error (not abort/timeout)
    if (error instanceof Error && error.name !== 'AbortError') {
      throw error;
    }
    return null;
  }
}

export function useFipe(): UseFipeReturn {
  const [vehicleType, setVehicleType] = useState<VehicleType>('carros');
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [years, setYears] = useState<FipeYear[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [price, setPrice] = useState<FipePrice | null>(null);
  const [loading, setLoading] = useState({
    brands: false,
    models: false,
    years: false,
    price: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const pendingInitRef = useRef<FipeInitData | null>(null);
  const fetchingRef = useRef<{ [key: string]: boolean }>({});
  // Flag to skip automatic fetches during programmatic initialization
  const skipAutoFetchRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch brands when vehicle type changes
  useEffect(() => {
    // Skip automatic fetch during programmatic initialization
    if (skipAutoFetchRef.current) return;
    
    const cacheKey = `brands-${vehicleType}`;
    
    const cachedBrands = getCached<FipeBrand[]>(cacheKey, 'brands');
    if (cachedBrands) {
      setBrands(cachedBrands);
      return;
    }
    
    if (fetchingRef.current[cacheKey]) return;
    
    const fetchBrands = async () => {
      fetchingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, brands: true }));
      setError(null);
      
      try {
        const data = await fetchFipeProxy<FipeBrand[]>(`/${vehicleType}/marcas`);
        
        if (mountedRef.current) {
          if (data && Array.isArray(data)) {
            setBrands(data);
            setCache(cacheKey, data);
          } else {
            setBrands([]);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar marcas.');
          setBrands([]);
        }
      } finally {
        fetchingRef.current[cacheKey] = false;
        if (mountedRef.current) {
          setLoading(prev => ({ ...prev, brands: false }));
        }
      }
    };

    fetchBrands();
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setPrice(null);
  }, [vehicleType]);

  // Fetch models when brand changes
  useEffect(() => {
    // Skip automatic fetch during programmatic initialization
    if (skipAutoFetchRef.current) return;
    
    if (!selectedBrand) {
      setModels([]);
      setYears([]);
      setPrice(null);
      return;
    }

    const cacheKey = `models-${vehicleType}-${selectedBrand}`;
    
    const cachedModels = getCached<FipeModel[]>(cacheKey, 'models');
    if (cachedModels) {
      setModels(cachedModels);
      setSelectedModel('');
      setSelectedYear('');
      setYears([]);
      setPrice(null);
      return;
    }
    
    if (fetchingRef.current[cacheKey]) return;

    const fetchModels = async () => {
      fetchingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, models: true }));
      setError(null);
      
      try {
        const data = await fetchFipeProxy<{ modelos: FipeModel[] }>(
          `/${vehicleType}/marcas/${selectedBrand}/modelos`
        );
        const modelsData = data?.modelos || [];
        
        if (mountedRef.current) {
          setModels(modelsData);
          if (modelsData.length > 0) {
            setCache(cacheKey, modelsData);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar modelos.');
          setModels([]);
        }
      } finally {
        fetchingRef.current[cacheKey] = false;
        if (mountedRef.current) {
          setLoading(prev => ({ ...prev, models: false }));
        }
      }
    };

    fetchModels();
    setSelectedModel('');
    setSelectedYear('');
    setYears([]);
    setPrice(null);
  }, [selectedBrand, vehicleType]);

  // Fetch years when model changes
  useEffect(() => {
    // Skip automatic fetch during programmatic initialization
    if (skipAutoFetchRef.current) return;
    
    if (!selectedBrand || !selectedModel) {
      setYears([]);
      setPrice(null);
      return;
    }
    
    // Guard: validate that the selected model belongs to current brand's models list
    // This prevents race conditions when brand changes but model hasn't been cleared yet
    const modelExistsInCurrentBrand = models.some(m => String(m.codigo) === selectedModel);
    if (!modelExistsInCurrentBrand && models.length > 0) {
      // Model doesn't belong to this brand - wait for model to be cleared
      setYears([]);
      setPrice(null);
      return;
    }

    const cacheKey = `years-${vehicleType}-${selectedBrand}-${selectedModel}`;
    
    const cachedYears = getCached<FipeYear[]>(cacheKey, 'years');
    if (cachedYears) {
      setYears(cachedYears);
      setSelectedYear('');
      setPrice(null);
      return;
    }
    
    if (fetchingRef.current[cacheKey]) return;

    const fetchYears = async () => {
      fetchingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, years: true }));
      // Don't clear error here - only clear on success
      
      try {
        const data = await fetchFipeProxy<FipeYear[]>(
          `/${vehicleType}/marcas/${selectedBrand}/modelos/${selectedModel}/anos`
        );
        
        if (mountedRef.current) {
          // Handle null response (404) gracefully - just show empty years
          if (data && Array.isArray(data)) {
            setYears(data);
            setCache(cacheKey, data);
            setError(null); // Clear error on success
          } else {
            // null or invalid response - show empty state without error
            setYears([]);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          // Only set error for non-404 errors (404 means invalid combination, not a failure)
          const errorMessage = err instanceof Error ? err.message : '';
          if (!errorMessage.includes('404') && !errorMessage.includes('Not found')) {
            setError(errorMessage || 'Erro ao carregar anos.');
          }
          setYears([]);
        }
      } finally {
        fetchingRef.current[cacheKey] = false;
        if (mountedRef.current) {
          setLoading(prev => ({ ...prev, years: false }));
        }
      }
    };

    fetchYears();
    setSelectedYear('');
    setPrice(null);
  }, [selectedBrand, selectedModel, vehicleType, models]);

  // Fetch price when year changes
  useEffect(() => {
    // Skip automatic fetch during programmatic initialization
    if (skipAutoFetchRef.current) return;
    
    if (!selectedBrand || !selectedModel || !selectedYear) {
      setPrice(null);
      return;
    }
    
    // Guard: validate that the selected model belongs to current brand's models list
    // This prevents race conditions when brand changes but model hasn't been cleared yet
    const modelExistsInCurrentBrand = models.some(m => String(m.codigo) === selectedModel);
    if (!modelExistsInCurrentBrand && models.length > 0) {
      setPrice(null);
      return;
    }
    
    // Guard: validate that the selected year belongs to current model's years list
    const yearExistsInCurrentModel = years.some(y => y.codigo === selectedYear);
    if (!yearExistsInCurrentModel && years.length > 0) {
      setPrice(null);
      return;
    }

    const cacheKey = `price-${vehicleType}-${selectedBrand}-${selectedModel}-${selectedYear}`;
    
    const cachedPrice = getCached<FipePrice>(cacheKey, 'price');
    if (cachedPrice) {
      setPrice(cachedPrice);
      setError(null); // Clear error on cache hit
      return;
    }
    
    if (fetchingRef.current[cacheKey]) return;

    const fetchPrice = async () => {
      fetchingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, price: true }));
      // Don't clear error here - only clear on success
      
      try {
        const data = await fetchFipeProxy<FipePrice>(
          `/${vehicleType}/marcas/${selectedBrand}/modelos/${selectedModel}/anos/${selectedYear}`
        );
        
        if (mountedRef.current) {
          if (data) {
            setPrice(data);
            setCache(cacheKey, data);
            setError(null); // Clear error on success
          } else {
            // null response (404) - just clear price without error
            setPrice(null);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          // Only set error for non-404 errors
          const errorMessage = err instanceof Error ? err.message : '';
          if (!errorMessage.includes('404') && !errorMessage.includes('Not found')) {
            setError(errorMessage || 'Erro ao carregar preço FIPE.');
          }
          setPrice(null);
        }
      } finally {
        fetchingRef.current[cacheKey] = false;
        if (mountedRef.current) {
          setLoading(prev => ({ ...prev, price: false }));
        }
      }
    };

    fetchPrice();
  }, [selectedBrand, selectedModel, selectedYear, vehicleType, models, years]);

  const priceValue = price?.Valor
    ? parseFloat(
        price.Valor.replace(/[^\d,]/g, '')
          .replace(',', '.')
      ) || 0
    : 0;

  const reset = useCallback(() => {
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setPrice(null);
    setError(null);
    pendingInitRef.current = null;
    setIsInitializing(false);
  }, []);

  const handleSetVehicleType = useCallback((type: VehicleType) => {
    // Reset dependent selections immediately to avoid race conditions
    // (e.g. switching type while old brand/model requests are still in-flight)
    setVehicleType(type);
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setPrice(null);
    setError(null);
  }, []);

  const handleSetSelectedBrand = useCallback((code: string) => {
    // Clear dependent selections synchronously so downstream effects don't
    // run with stale model/year from a previous brand (race condition).
    setSelectedBrand(code);
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setPrice(null);
    setError(null);
  }, []);

  const handleSetSelectedModel = useCallback((code: string) => {
    // Clear year/price immediately to avoid fetching price for a stale year
    // when the user switches models quickly.
    setSelectedModel(code);
    setSelectedYear('');
    setYears([]);
    setPrice(null);
    setError(null);
  }, []);

  const handleSetSelectedYear = useCallback((code: string) => {
    setSelectedYear(code);
  }, []);

  // Initialize from saved asset data
  const initializeFromSaved = useCallback(async (data: FipeInitData) => {
    if (!data.brandCode) {
      console.warn('[useFipe] initializeFromSaved called without brandCode');
      return;
    }
    
    console.log('[useFipe] initializeFromSaved starting with:', {
      brandCode: data.brandCode,
      modelCode: data.modelCode,
      yearCode: data.yearCode,
      vehicleType: data.vehicleType,
    });
    
    setIsInitializing(true);
    pendingInitRef.current = data;
    setError(null);
    
    // CRITICAL: Set flag to prevent automatic useEffects from interfering
    // The useEffects for models/years/price will skip when this is true
    skipAutoFetchRef.current = true;
    
    // STEP 1: Clear ALL fields first to prevent race conditions
    // This ensures no stale data from previous vehicle causes 404s
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setModels([]);
    setYears([]);
    setPrice(null);
    
    try {
      const vType = data.vehicleType || vehicleType;
      
      // Set vehicle type (this also triggers brand fetch via useEffect, but we handle it manually here)
      if (data.vehicleType && data.vehicleType !== vehicleType) {
        setVehicleType(data.vehicleType);
      }
      
      // Fetch brands
      const brandsCacheKey = `brands-${vType}`;
      let brandsData = getCached<FipeBrand[]>(brandsCacheKey, 'brands');
      if (!brandsData) {
        setLoading(prev => ({ ...prev, brands: true }));
        brandsData = await fetchFipeProxy<FipeBrand[]>(`/${vType}/marcas`);
        if (brandsData) {
          setCache(brandsCacheKey, brandsData);
        }
        setLoading(prev => ({ ...prev, brands: false }));
      }
      if (mountedRef.current) {
        console.log('[useFipe] Setting brand and models:', { brandCode: data.brandCode, modelsCount: (brandsData || []).length });
        setBrands(brandsData || []);
        setSelectedBrand(data.brandCode);
      }
      
      // Fetch models
      if (data.modelCode) {
        const modelsCacheKey = `models-${vType}-${data.brandCode}`;
        let modelsData = getCached<FipeModel[]>(modelsCacheKey, 'models');
        if (!modelsData) {
          setLoading(prev => ({ ...prev, models: true }));
          const result = await fetchFipeProxy<{ modelos: FipeModel[] }>(
            `/${vType}/marcas/${data.brandCode}/modelos`
          );
          // Handle null response (404) gracefully
          modelsData = result?.modelos || [];
          if (modelsData.length > 0) {
            setCache(modelsCacheKey, modelsData);
          }
          setLoading(prev => ({ ...prev, models: false }));
        }
        if (mountedRef.current) {
          console.log('[useFipe] Setting model and years list:', { modelCode: data.modelCode, modelsCount: (modelsData || []).length });
          setModels(modelsData || []);
          setSelectedModel(data.modelCode);
        }
      }
      
      // Fetch years
      if (data.modelCode && data.yearCode) {
        const yearsCacheKey = `years-${vType}-${data.brandCode}-${data.modelCode}`;
        let yearsData = getCached<FipeYear[]>(yearsCacheKey, 'years');
        if (!yearsData) {
          setLoading(prev => ({ ...prev, years: true }));
          const result = await fetchFipeProxy<FipeYear[]>(
            `/${vType}/marcas/${data.brandCode}/modelos/${data.modelCode}/anos`
          );
          // Handle null response (404) gracefully
          yearsData = result || [];
          if (yearsData.length > 0) {
            setCache(yearsCacheKey, yearsData);
          }
          setLoading(prev => ({ ...prev, years: false }));
        }
        if (mountedRef.current) {
          console.log('[useFipe] Setting year and years list:', { yearCode: data.yearCode, yearsCount: (yearsData || []).length });
          setYears(yearsData || []);
          setSelectedYear(data.yearCode);
        }
      }
      
      // Fetch price
      if (data.modelCode && data.yearCode) {
        const priceCacheKey = `price-${vType}-${data.brandCode}-${data.modelCode}-${data.yearCode}`;
        let priceData = getCached<FipePrice>(priceCacheKey, 'price');
        if (!priceData) {
          setLoading(prev => ({ ...prev, price: true }));
          priceData = await fetchFipeProxy<FipePrice>(
            `/${vType}/marcas/${data.brandCode}/modelos/${data.modelCode}/anos/${data.yearCode}`
          );
          // Only cache valid price data
          if (priceData) {
            setCache(priceCacheKey, priceData);
          }
          setLoading(prev => ({ ...prev, price: false }));
        }
        if (mountedRef.current) {
          console.log('[useFipe] Setting price:', { priceData: priceData?.Valor });
          setPrice(priceData);
        }
      }
      
      console.log('[useFipe] initializeFromSaved completed successfully');
    } catch (err) {
      console.error('Error initializing from saved data:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados salvos.');
      }
    } finally {
      if (mountedRef.current) {
        setIsInitializing(false);
        pendingInitRef.current = null;
        // Defer re-enabling auto-fetches so React effects from the current
        // render cycle still see skipAutoFetchRef=true and don't clear data.
        // This is critical when all FIPE data is cached and the entire
        // initializeFromSaved runs synchronously in a single React batch.
        requestAnimationFrame(() => {
          if (mountedRef.current) {
            skipAutoFetchRef.current = false;
          }
        });
      }
    }
  }, [vehicleType]);

  return {
    vehicleType,
    setVehicleType: handleSetVehicleType,
    brands,
    models,
    years,
    selectedBrand,
    selectedModel,
    selectedYear,
    setSelectedBrand: handleSetSelectedBrand,
    setSelectedModel: handleSetSelectedModel,
    setSelectedYear: handleSetSelectedYear,
    price,
    priceValue,
    loading,
    error,
    reset,
    initializeFromSaved,
    isInitializing,
  };
}
