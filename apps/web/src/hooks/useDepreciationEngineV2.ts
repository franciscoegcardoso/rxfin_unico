/**
 * Hook de integração do Motor de Cálculo de Depreciação V6
 * 
 * Orquestra a busca de dados (Waterfall) e executa o Core Engine,
 * fornecendo uma interface simples para componentes UI.
 * 
 * RXFin v6.0: Usa Curva Padrão Agregada para projeções consistentes
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCohortMatrix, type CohortCell } from '@/hooks/useCohortMatrix';
import { useFamilyModels, extractModelFamily } from '@/hooks/useFamilyModels';
import { useBrandAggregation } from '@/hooks/useBrandAggregation';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateDepreciationCurveV3,
  calculateDepreciationCurveV2,
  calculateDepreciationCurveV6,
  convertCohortMatrixToRaw,
  SELF_REGRESSION_MIN_AGE,
  type DepreciationEngineResultV3,
  type DepreciationEngineResult,
  type DataSourceConfig,
  type RawCohortData,
  type ConfidenceLevel,
  type DataMethod,
  type RegressionCoefficients,
  type RegressionSource,
  type ProjectionTimelinePoint,
  type ConsideredModelInfo,
  type StandardCurvePoint,
  type StandardCurveResponse,
  type EngineResult,
  type DepreciationCurvePoint,
} from '@/utils/depreciationCoreEngine';

export interface UseDepreciationEngineV2Props {
  fipeCode: string;
  modelName: string;
  brandName: string;
  modelYear: number;
  vehicleType?: 'carros' | 'motos' | 'caminhoes';
  brandCode?: string;
}

export interface UseDepreciationEngineV2Return {
  /** Resultado legado (V2) para compatibilidade com UI existente */
  result: DepreciationEngineResult | null;
  
  /** Resultado completo V3 com projection_timeline e coefficients */
  resultV3: DepreciationEngineResultV3 | null;
  
  loading: boolean;
  error: string | null;
  isReady: boolean;
  
  // Metadata para UI
  confidence: ConfidenceLevel | null;
  methodUsed: DataMethod | null;
  dataPointsUsed: number;
  
  /** Coeficientes da regressão (terminologia RXFin v3) */
  coefficients: RegressionCoefficients | null;
  
  /** Fonte da regressão para debug (v3.1) */
  regressionSource: RegressionSource | null;
  
  /** Lista de modelos considerados na análise agregada */
  consideredModels: ConsideredModelInfo[];
  
  /** Nome da família quando usando agregação por família */
  familyName: string | null;
  
  /** V6: Curva padrão usada para projeções */
  standardCurve: StandardCurvePoint[] | null;
  
  /** V6: Número de anos-modelo usados na curva padrão */
  standardCurveModelYears: number;
  
  // Actions
  calculate: () => Promise<void>;
  reset: () => void;
}

// V6: Helper para buscar curva padrão da edge function
async function fetchStandardCurve(fipeCode: string): Promise<StandardCurveResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fipe-cohort-standard-curve', {
      body: { fipeCode }
    });
    
    if (error) {
      return null;
    }
    
    if (data?.success && data?.standardCurve?.length > 0) {
      return data as StandardCurveResponse;
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// V6 Conversion Helpers: Convert EngineResult (V6) to V3/V2 formats
// ============================================================================

function convertV6ToV3(
  v6Result: EngineResult,
  effectiveSource: 'specific_model' | 'family_aggregate' | 'brand_fallback',
  isMatureVehicle: boolean
): DepreciationEngineResultV3 {
  // Find base price (Y-1)
  const basePrice = v6Result.cohort_data.find(c => c.t === -1)?.price || 
                   v6Result.projection[0]?.realized_value || 0;
  
  // Find current price (most recent realized value)
  const currentYear = new Date().getFullYear();
  const currentPoint = v6Result.projection.find(p => 
    p.year === currentYear && p.realized_value !== null
  ) || v6Result.projection.find(p => p.realized_value !== null);
  
  const currentPrice = currentPoint?.realized_value || basePrice;
  const currentAge = currentPoint ? currentPoint.t : 0;
  
  // Map projection to timeline
  const projection_timeline: ProjectionTimelinePoint[] = v6Result.projection
    .filter(p => p.t >= -1)
    .map(p => ({
      t: p.t,
      year: p.year,
      ref_date: p.ref_date,
      realized_value: p.realized_value,
      projected_value: p.projected_value,
      source: p.realized_value !== null ? 'history' as const : 'projection' as const,
      curve_ln: p.curve_depreciation_ln,
      smoothed_yoy_rate: p.yoy_rate,
    }));
  
  // Map source to method
  const methodMap: Record<string, DataMethod> = {
    'specific_model': 'exact',
    'family_aggregate': 'family',
    'brand_fallback': 'brand',
    'standard_curve': 'exact', // V6 standard curve counts as exact
  };
  
  // Determine confidence based on data quality
  let confidence: ConfidenceLevel = 'high';
  if (v6Result.metadata.distinct_years < 3) confidence = 'low';
  else if (v6Result.metadata.distinct_years < 5) confidence = 'medium';
  
  return {
    metadata: {
      method_used: methodMap[v6Result.metadata.source] || 'exact',
      confidence,
      data_points_used: v6Result.metadata.data_points_used,
      distinct_years: v6Result.metadata.distinct_years,
      coefficients: {
        decay_rate_b: v6Result.metadata.factors.B,
        theoretical_intercept_c: v6Result.metadata.factors.C,
        smoothed_decay_yoy: Math.exp(v6Result.metadata.factors.B), // e^B
        r_squared: v6Result.metadata.factors.rSquared,
      },
      regression_source: effectiveSource === 'specific_model' ? 'exact_model' : 
                         effectiveSource === 'family_aggregate' ? 'family_aggregation' : 'brand_fallback',
    },
    projection_timeline,
    base_price: basePrice,
    current_quote: {
      date: currentPoint?.ref_date || `${currentYear}-12-01`,
      value: currentPrice,
    },
    current_age: currentAge,
  };
}

/**
 * Converte resultado V6 para formato V2 (compatibilidade com UI existente)
 * 
 * CRITICAL FIX v6.3: 
 * - Correct age calculation for new models (2026 in 2026 = age 0)
 * - Robust fallback for null prices using exponential formula
 * - Sanity checks: max 25% annual drop, min 40% residual
 */
function convertV6ToV2(
  v6Result: EngineResult,
  maxAge: number = 15
): DepreciationEngineResult {
  // Find base price (Y-1)
  const basePrice = v6Result.cohort_data.find(c => c.t === -1)?.price || 
                   v6Result.projection[0]?.realized_value || 
                   v6Result.projection[0]?.projected_value || 0;
  
  // =========================================================================
  // CRITICAL FIX v6.3: Correct currentAge calculation
  // currentAge = Max(0, currentYear - launchYear - 1)
  // For T-Cross 2026: launchYear=2025, currentYear=2026 → age = max(0, 0) = 0
  // =========================================================================
  const currentYear = new Date().getFullYear();
  const modelYear = v6Result.metadata.model_year;
  const launchYear = modelYear - 1;
  const currentAge = Math.max(0, currentYear - launchYear - 1);
  
  const currentPoint = v6Result.projection.find(p => 
    p.year === currentYear && (p.realized_value !== null || p.projected_value !== null)
  );
  
  const currentPrice = currentPoint?.realized_value || currentPoint?.projected_value || basePrice;
  
  // =========================================================================
  // Build curve with ROBUST FALLBACK and SANITY CHECKS
  // =========================================================================
  let previousPrice = basePrice;
  const maxAnnualDrop = 0.25;
  const minResidual = 0.40;
  
  const curve: DepreciationCurvePoint[] = v6Result.projection
    .filter(p => p.t >= 0 && p.t <= maxAge)
    .map(p => {
      // Try to get price from realized or projected
      let price = p.realized_value ?? p.projected_value;
      
      // FALLBACK: If still null, calculate using curve_smoothed retention
      if (price === null || price === undefined) {
        const retention = p.curve_smoothed || 1;
        price = basePrice * retention;
      }
      
      // =========================================================================
      // SANITY CHECK v6.3: Prevent unrealistic drops
      // =========================================================================
      // Max 25% drop from previous year
      const maxDropPrice = previousPrice * (1 - maxAnnualDrop);
      if (price < maxDropPrice && p.realized_value === null) {
        price = maxDropPrice;
      }
      
      // Min 40% of base price
      const floorPrice = basePrice * minResidual;
      if (price < floorPrice) {
        price = floorPrice;
      }
      
      previousPrice = price;
      
      return {
        age: p.t,
        price: price || 0,
        type: p.realized_value !== null ? 'actual' as const : 'projected' as const,
      };
    })
    .filter(p => p.price > 0); // Remove zero price points
  
  // Calculate annual rates
  const y0Point = v6Result.projection.find(p => p.t === 0);
  const y5Point = v6Result.projection.find(p => p.t === 5);
  
  let annualRatePhaseA = 0.08; // Default 8%
  if (y0Point && y5Point) {
    const val0 = y0Point.realized_value || y0Point.projected_value || 1;
    const val5 = y5Point.realized_value || y5Point.projected_value || val0 * 0.6;
    if (val0 > 0 && val5 > 0) {
      annualRatePhaseA = 1 - Math.pow(val5 / val0, 1/5);
      // Sanity: cap at 25%
      annualRatePhaseA = Math.min(annualRatePhaseA, maxAnnualDrop);
    }
  }
  
  return {
    curve,
    basePrice,
    currentPrice,
    currentAge,
    metadata: {
      methodUsed: 'exact',
      confidence: v6Result.metadata.distinct_years >= 5 ? 'high' : 
                  v6Result.metadata.distinct_years >= 3 ? 'medium' : 'low',
      dataPointsUsed: v6Result.metadata.data_points_used,
      rSquared: v6Result.metadata.factors.rSquared,
      annualRatePhaseA,
      annualRatePhaseB: annualRatePhaseA * 0.5, // Phase B is typically slower
      yearsPhaseA: 6,
    },
  };
}

// RXFin v6.0: Usa Curva Padrão Agregada para projeções consistentes

export function useDepreciationEngineV2({
  fipeCode,
  modelName,
  brandName,
  modelYear,
  vehicleType = 'carros',
  brandCode,
}: UseDepreciationEngineV2Props): UseDepreciationEngineV2Return {
  const [result, setResult] = useState<DepreciationEngineResult | null>(null);
  const [resultV3, setResultV3] = useState<DepreciationEngineResultV3 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consideredModels, setConsideredModels] = useState<ConsideredModelInfo[]>([]);
  const [familyNameState, setFamilyNameState] = useState<string | null>(null);
  
  const cohort = useCohortMatrix();
  const family = useFamilyModels();
  const brand = useBrandAggregation();
  
  const mountedRef = useRef(true);
  const calculationIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setResultV3(null);
    setError(null);
    setLoading(false);
    setConsideredModels([]);
    setFamilyNameState(null);
    cohort.reset();
    family.reset();
    brand.reset();
  }, [cohort, family, brand]);

  /**
   * Executa o cálculo completo de depreciação
   */
  // V6 State for standard curve
  const [standardCurveState, setStandardCurveState] = useState<StandardCurvePoint[] | null>(null);
  const [standardCurveModelYearsState, setStandardCurveModelYearsState] = useState<number>(0);

  const calculate = useCallback(async () => {
    if (!fipeCode || !modelName || !brandName || !modelYear) {
      setError('Dados do veículo incompletos');
      return;
    }
    
    const calculationId = ++calculationIdRef.current;
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[DepreciationEngineV2] Starting V6 calculation for ${modelName} (${fipeCode})`);
      
      // =====================================================================
      // V6: BUSCAR CURVA PADRÃO AGREGADA PRIMEIRO
      // A curva padrão é calculada agregando TODOS os anos-modelo disponíveis
      // Isso elimina distorções de pandemia e extrapolações individuais
      // =====================================================================
      
      let standardCurveResponse: StandardCurveResponse | null = null;
      
      try {
        standardCurveResponse = await fetchStandardCurve(fipeCode);
        console.log('[DepreciationEngineV2] V6: Standard curve fetched:', {
          success: standardCurveResponse?.success,
          modelYears: standardCurveResponse?.modelYearsUsed?.length,
          curvePoints: standardCurveResponse?.standardCurve?.length,
          factorB: standardCurveResponse?.factors?.B?.toFixed(4),
        });
        
        if (standardCurveResponse?.success) {
          setStandardCurveState(standardCurveResponse.standardCurve);
          setStandardCurveModelYearsState(standardCurveResponse.modelYearsUsed?.length || 0);
        }
      } catch (err) {
        console.warn('[DepreciationEngineV2] V6: Standard curve fetch failed, using V5 fallback:', err);
      }
      
      // =====================================================================
      // NÍVEL 1: Busca dados específicos do FIPE code via cohort matrix
      // CORREÇÃO v5.5: Usar valor retornado diretamente em vez de state
      // para evitar race condition com atualização assíncrona do React
      // =====================================================================
      
      const cohortResult = await cohort.fetchCohortData(fipeCode);
      
      if (calculationIdRef.current !== calculationId || !mountedRef.current) {
        return;
      }
      
      let rawCohortData: RawCohortData[] = [];
      // Usa o resultado retornado diretamente (não o state)
      if (cohortResult?.cells && cohortResult.cells.length > 0) {
        // CORREÇÃO v5.2: Filtrar apenas as células do modelYear selecionado
        // O cohort-matrix retorna dados de TODOS os anos-modelo do veículo,
        // mas a engine precisa apenas das células do modelo específico.
        //
        // Para modelo 2023:
        // - Y-1: calendarYear=2022 (preço 0km de lançamento)
        // - Y0: calendarYear=2023 (1º ano como usado)
        // - Y1: calendarYear=2024 (2º ano como usado)
        // - Y2: calendarYear=2025 (3º ano como usado)
        // etc.
        const filteredCells = cohortResult.cells.filter(cell => 
          cell.modelYear === modelYear || 
          cell.modelYear === 32000 // 0km price code
        );
        
        // Converter para formato com ref_date
        // v5.4: Usar o mês que vier no dado (já priorizado como dezembro pelo backend)
        const cellsWithRefDate = filteredCells.map(cell => ({
          ref_date: `${cell.calendarYear}-${String(cell.month + 1).padStart(2, '0')}-01`,
          price: cell.price,
          modelYear: cell.modelYear,
          calendarYear: cell.calendarYear,
        }));
        
        rawCohortData = convertCohortMatrixToRaw(cellsWithRefDate);
        console.log(`[DepreciationEngineV2] Level 1: Got ${rawCohortData.length} points for modelYear ${modelYear} from cohort (filtered from ${cohortResult.cells.length} total)`);
      } else {
        console.log(`[DepreciationEngineV2] Level 1: No cohort data returned for ${fipeCode}`);
      }
      
      // =====================================================================
      // NÍVEL 2: Se dados insuficientes (< 3 pontos), busca família
      // A lógica de decisão agora está dentro do Core Engine (MIN_DATA_POINTS = 3)
      // =====================================================================
      
      let familyModelsData: RawCohortData[] | undefined;
      let brandModelsData: RawCohortData[] | undefined;
      let extractedFamilyName: string | null = null;
      let extractedModels: ConsideredModelInfo[] = [];
      
      // Calcular idade do veículo para regra de auto-regressão
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - modelYear;
      
      // REGRA DE NEGÓCIO: Veículos com 15+ anos SEMPRE usam dados próprios (Nível 1)
      // Eles têm histórico suficiente para calcular o fator B a partir da fase estabilizada (Y5+)
      const isMatureVehicle = vehicleAge >= SELF_REGRESSION_MIN_AGE;
      
      // Conta anos distintos nos dados do Nível 1
      const distinctYearsLevel1 = new Set(rawCohortData.map(d => d.year)).size;
      
      // Fallback só ocorre se:
      // 1. NÃO for veículo maduro (< 15 anos)
      // 2. E tiver menos de 3 anos distintos
      const needsFallback = !isMatureVehicle && distinctYearsLevel1 < 3;
      
      if (isMatureVehicle) {
        console.log(`[DepreciationEngineV2] 🚗 Mature vehicle (${vehicleAge} years >= ${SELF_REGRESSION_MIN_AGE}): Using self-regression from own history`);
      }
      
      if (needsFallback && brandCode) {
        console.log(`[DepreciationEngineV2] Level 1 insufficient (${distinctYearsLevel1} distinct years), trying Level 2 (Family)...`);
        
        // CORREÇÃO: Passar fipeCode para extrair o prefixo correto da marca
        const familyResult = await family.fetchFamilyModels(brandCode, modelName, vehicleType, fipeCode);
        
        if (calculationIdRef.current !== calculationId || !mountedRef.current) {
          return;
        }
        
        if (familyResult && familyResult.cohortData.length > 0) {
          familyModelsData = familyResult.cohortData;
          const distinctYearsFamily = new Set(familyResult.cohortData.map(d => d.year)).size;
          console.log(`[DepreciationEngineV2] Level 2: Got ${familyModelsData.length} points from family "${familyResult.familyName}" (${distinctYearsFamily} distinct years, source: ${familyResult.source})`);
          
          // Armazena informações da família para a UI
          extractedFamilyName = familyResult.familyName;
          extractedModels = familyResult.models.map(m => ({
            fipeCode: m.fipeCode,
            modelName: m.modelName,
            modelYear: m.modelYear,
            source: familyResult.source,
          }));
          
          // =====================================================================
          // NÍVEL 3: Se família também insuficiente, usar dados da marca
          // =====================================================================
          if (distinctYearsFamily < 3) {
            console.log(`[DepreciationEngineV2] Level 2 insufficient (${distinctYearsFamily} distinct years), trying Level 3 (Brand)...`);
            
            const brandResult = await brand.fetchBrandAggregation(fipeCode, brandName);
            
            if (calculationIdRef.current !== calculationId || !mountedRef.current) {
              return;
            }
            
            if (brandResult && brandResult.cohortData.length > 0) {
              brandModelsData = brandResult.cohortData;
              const distinctYearsBrand = new Set(brandResult.cohortData.map(d => d.year)).size;
              console.log(`[DepreciationEngineV2] Level 3: Got ${brandModelsData.length} points from brand "${brandName}" (${distinctYearsBrand} distinct years, ${brandResult.distinctFipeCodes} FIPE codes)`);
              
              // Substitui info com dados da marca
              extractedFamilyName = brandResult.brandName;
              extractedModels = []; // Brand level não tem modelos específicos
            }
          }
        } else {
          // Se família falhou completamente, tenta marca diretamente
          console.log(`[DepreciationEngineV2] Level 2 failed, trying Level 3 (Brand) directly...`);
          
          const brandResult = await brand.fetchBrandAggregation(fipeCode, brandName);
          
          if (calculationIdRef.current !== calculationId || !mountedRef.current) {
            return;
          }
          
          if (brandResult && brandResult.cohortData.length > 0) {
            brandModelsData = brandResult.cohortData;
            const distinctYearsBrand = new Set(brandResult.cohortData.map(d => d.year)).size;
            console.log(`[DepreciationEngineV2] Level 3: Got ${brandModelsData.length} points from brand "${brandName}" (${distinctYearsBrand} distinct years)`);
            
            extractedFamilyName = brandResult.brandName;
            extractedModels = [];
          }
        }
      }
      
      // =====================================================================
      // EXECUTAR CORE ENGINE V3 - COM WATERFALL PARA DADOS EFETIVOS
      // =====================================================================
      
      // Determinar qual conjunto de dados usar baseado no Waterfall
      let effectiveCohortData = rawCohortData;
      let effectiveSource: 'specific_model' | 'family_aggregate' | 'brand_fallback' = 'specific_model';
      
      // Se Nível 1 insuficiente, usar dados agregados
      if (needsFallback) {
        if (familyModelsData && familyModelsData.length > 0) {
          effectiveCohortData = familyModelsData;
          effectiveSource = 'family_aggregate';
          console.log(`[DepreciationEngineV2] ✅ Using Level 2 (Family) data: ${effectiveCohortData.length} points`);
        } else if (brandModelsData && brandModelsData.length > 0) {
          effectiveCohortData = brandModelsData;
          effectiveSource = 'brand_fallback';
          console.log(`[DepreciationEngineV2] ✅ Using Level 3 (Brand) data: ${effectiveCohortData.length} points`);
        } else {
          console.log(`[DepreciationEngineV2] ⚠️ No fallback data available, using Level 1 with ${rawCohortData.length} points`);
        }
      }
      
      // DEBUG: Log effectiveCohortData before passing to engine
      console.log(`[DepreciationEngineV2] effectiveCohortData:`, {
        length: effectiveCohortData.length,
        source: effectiveSource,
        sample: effectiveCohortData.slice(0, 5).map(d => ({
          year: d.year,
          price: d.price,
          ref_date: d.ref_date
        })),
      });
      
      const config: DataSourceConfig = {
        fipeCode,
        modelName,
        brandName,
        modelYear,
        familyModels: familyModelsData,
        brandModels: brandModelsData,
        effectiveSource, // NOVO: Passa a fonte efetiva para a engine
      };
      
      // =====================================================================
      // V6: SE CURVA PADRÃO DISPONÍVEL, USAR ENGINE V6
      // Caso contrário, fallback para V5 (V3/V2)
      // =====================================================================
      
      const projectionHorizon = Math.max(vehicleAge + 10, 15); // Mínimo 15 anos
      
      let engineResultV3: DepreciationEngineResultV3;
      let engineResultV2: DepreciationEngineResult;
      
      if (standardCurveResponse?.success && 
          standardCurveResponse.standardCurve.length > 0 &&
          standardCurveResponse.factors) {
        
        console.log(`[DepreciationEngineV2] ✅ Using V6 engine with standard curve (${standardCurveResponse.modelYearsUsed.length} model years)`);
        
        // =====================================================================
        // CRITICAL FIX (v6.2): A âncora do V6 (preço 0km / Y-1) NÃO pode vir
        // de dados agregados (família/marca), porque isso pode eliminar o ano
        // Y-1 do ano-modelo selecionado e zerar/distorcer a projeção.
        //
        // Portanto:
        // - Base/âncora: SEMPRE tentar usar Nível 1 (rawCohortData) do modelo
        // - Só cair para effectiveCohortData se Nível 1 não tiver nenhum ponto
        // =====================================================================
        const hasLevel1Anchor = rawCohortData.some(d => d.year === (modelYear - 1));
        const cohortForV6 = (rawCohortData.length > 0 && hasLevel1Anchor)
          ? rawCohortData
          : rawCohortData.length > 0
            ? rawCohortData
            : effectiveCohortData;

        // Converter dados cohort para FipePoint format esperado pelo V6
        const fipePoints: { price: number; month: number; year: number; ref_date?: string }[] = 
          cohortForV6.map(d => ({
            price: d.price,
            month: 12, // Usamos dezembro como padrão
            year: d.year,
            ref_date: d.ref_date,
          }));
        
        // Chamar V6 Engine
        const v6Result = calculateDepreciationCurveV6(
          fipePoints,
          modelYear,
          standardCurveResponse.standardCurve,
          standardCurveResponse.factors
        );
        
        // Converter V6 result para V3 format (compatibilidade)
        engineResultV3 = convertV6ToV3(v6Result, effectiveSource, isMatureVehicle);
        engineResultV2 = convertV6ToV2(v6Result, projectionHorizon);
        
      } else {
        console.log(`[DepreciationEngineV2] ⚠️ Standard curve unavailable, using V5 fallback`);
        
        // Calcula resultado V3 (com projection_timeline e coefficients)
        engineResultV3 = calculateDepreciationCurveV3(
          config,
          effectiveCohortData,
          new Date(),
          { isMatureVehicle }
        );
        
        // Calcula resultado V2 para compatibilidade
        engineResultV2 = calculateDepreciationCurveV2(
          config,
          effectiveCohortData,
          projectionHorizon,
          { isMatureVehicle }
        );
      }
      
      console.log(`[DepreciationEngineV2] Calculation complete:`, {
        method: engineResultV3.metadata.method_used,
        isMatureVehicle,
        confidence: engineResultV3.metadata.confidence,
        distinctYears: engineResultV3.metadata.distinct_years,
        coefficients: {
          b: engineResultV3.metadata.coefficients.decay_rate_b.toFixed(4),
          c: engineResultV3.metadata.coefficients.theoretical_intercept_c.toFixed(4),
          yoy: engineResultV3.metadata.coefficients.smoothed_decay_yoy.toFixed(4),
        },
        rSquared: engineResultV3.metadata.coefficients.r_squared.toFixed(3),
      });
      
      if (mountedRef.current && calculationIdRef.current === calculationId) {
        setResult(engineResultV2);
        setResultV3(engineResultV3);
        setConsideredModels(extractedModels);
        setFamilyNameState(extractedFamilyName);
        setLoading(false);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular depreciação';
      console.error('[DepreciationEngineV2] Error:', errorMessage);
      
      if (mountedRef.current && calculationIdRef.current === calculationId) {
        setError(errorMessage);
        setLoading(false);
      }
    }
  }, [fipeCode, modelName, brandName, modelYear, brandCode, vehicleType, cohort, family]);

  // Derived state for UI
  const confidence = resultV3?.metadata.confidence ?? null;
  const methodUsed = resultV3?.metadata.method_used ?? null;
  const dataPointsUsed = resultV3?.metadata.data_points_used ?? 0;
  const coefficients = resultV3?.metadata.coefficients ?? null;
  const regressionSource = resultV3?.metadata.regression_source ?? null;
  
  const isReady = useMemo(() => {
    return !!resultV3 && resultV3.projection_timeline.length > 0;
  }, [resultV3]);

  return {
    result,
    resultV3,
    loading: loading || cohort.loading || family.loading || brand.loading,
    error: error || cohort.error || family.error || brand.error,
    isReady,
    confidence,
    methodUsed,
    dataPointsUsed,
    coefficients,
    regressionSource,
    consideredModels,
    familyName: familyNameState,
    standardCurve: standardCurveState,
    standardCurveModelYears: standardCurveModelYearsState,
    calculate,
    reset,
  };
}

// ============================================================================
// HELPER: Formatar dados para o gráfico TimeSeriesDepreciationChart
// ============================================================================

export interface TimeSeriesPoint {
  date: Date;
  monthLabel: string;
  price: number;
  reference: string;
  isProjected?: boolean;
}

/**
 * Converte a curva do Core Engine V2 para o formato do TimeSeriesDepreciationChart
 */
export function convertEngineResultToTimeSeries(
  result: DepreciationEngineResult,
  modelYear: number
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const launchYear = modelYear - 1;
  
  for (const point of result.curve) {
    const calendarYear = launchYear + point.age + 1;
    const date = new Date(calendarYear, 11, 1);
    const monthLabel = `Dez/${calendarYear}`;
    
    points.push({
      date,
      monthLabel,
      price: point.price,
      reference: `dez-${calendarYear}`,
      isProjected: point.type === 'projected',
    });
  }
  
  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Converte a timeline V3 para o formato do TimeSeriesDepreciationChart
 */
export function convertV3TimelineToTimeSeries(
  timeline: ProjectionTimelinePoint[],
  maxAge: number = 15
): TimeSeriesPoint[] {
  return timeline
    .filter(p => p.t <= maxAge)
    .map(p => ({
      date: new Date(p.ref_date),
      monthLabel: `Dez/${p.year}`,
      price: p.realized_value || p.projected_value || 0,
      reference: p.ref_date,
      isProjected: p.source === 'projection',
    }));
}

/**
 * Extrai métricas de resumo para exibição
 */
export function extractEngineSummaryMetrics(result: DepreciationEngineResult) {
  const { curve, metadata, basePrice, currentPrice, currentAge } = result;
  
  const year5Point = curve.find(p => p.age === currentAge + 5);
  const year5Price = year5Point?.price || currentPrice * 0.5;
  
  const depreciation5Years = currentPrice - year5Price;
  const depreciationPercent5Years = (depreciation5Years / currentPrice) * 100;
  const monthlyDepreciation = depreciation5Years / 60;
  const annualRate = metadata.annualRatePhaseA * 100;
  
  return {
    basePrice,
    currentPrice,
    year5Price,
    depreciation5Years,
    depreciationPercent5Years,
    monthlyDepreciation,
    annualRate,
    methodUsed: metadata.methodUsed,
    confidence: metadata.confidence,
    rSquared: metadata.rSquared,
  };
}

/**
 * Extrai métricas V3 com coeficientes YoY
 */
export function extractEngineSummaryMetricsV3(resultV3: DepreciationEngineResultV3) {
  const { metadata, projection_timeline, base_price, current_quote, current_age } = resultV3;
  
  // Encontra projeção para 5 anos
  const year5Point = projection_timeline.find(p => p.t === current_age + 5);
  const year5Price = year5Point?.projected_value || year5Point?.realized_value || current_quote.value * 0.5;
  
  const depreciation5Years = current_quote.value - year5Price;
  const depreciationPercent5Years = (depreciation5Years / current_quote.value) * 100;
  const monthlyDepreciation = depreciation5Years / 60;
  
  // Taxa YoY: converte fator para percentual
  const yoyFactor = metadata.coefficients.smoothed_decay_yoy;
  const annualDepreciationPercent = (1 - yoyFactor) * 100;
  
  return {
    basePrice: base_price,
    currentPrice: current_quote.value,
    year5Price,
    depreciation5Years,
    depreciationPercent5Years,
    monthlyDepreciation,
    annualDepreciationPercent,
    yoyFactor,
    decayRateB: metadata.coefficients.decay_rate_b,
    interceptC: metadata.coefficients.theoretical_intercept_c,
    methodUsed: metadata.method_used,
    confidence: metadata.confidence,
    rSquared: metadata.coefficients.r_squared,
    distinctYears: metadata.distinct_years,
  };
}
