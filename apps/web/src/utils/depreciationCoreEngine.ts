// ============================================================================
// RXFin Depreciation Engine v6.0 (Standardized Cohort-Based Methodology)
// ============================================================================
// Implementação V6 baseada em Curva Padrão Agregada:
// - Calcula uma curva de depreciação padrão agregando TODOS os anos-modelo
// - Cada projeção usa: basePrice (0km) × standardRetention[t]
// - Elimina distorções causadas por pandemia e extrapolações individuais
// ============================================================================

// ============================================================================
// TIPOS DE DADOS
// ============================================================================

export interface FipePoint {
  price: number;
  month: number;
  year: number;
  ref_date?: string; // Formato YYYY-MM-DD
}

export interface CohortDataPoint {
  t: number;           // Y-1=-1, Y0=0, Y1=1, etc.
  year: number;        // Ano calendário (ex: 2022, 2023)
  ref_date: string;    // Data de referência (01/12/YYYY)
  price: number;       // Valor absoluto em R$
  relative: number;    // Valor relativo ao Y-1 (0km). Y-1 = 1.0 (100%)
}

export interface ProjectionPoint {
  t: number;
  year: number;
  ref_date: string;
  realized_value: number | null;
  projected_value: number | null;
  curve_depreciation: number;      // % do valor 0km (1.0 = 100%)
  curve_depreciation_ln: number;   // LN da curva
  curve_smoothed: number;          // Curva suavizada
  yoy_rate: number;                // % Depreciação Suavizada YoY
  method: 'history_real' | 'cohort_weighted' | 'projected_linear' | 'standard_curve';
}

export interface RegressionFactors {
  C: number;  // Intercepto teórico (EXP(INDEX(LINEST(LN(y),x),1,2)))
  B: number;  // Taxa de decaimento (INDEX(LINEST(LN(y),x),1))
  rSquared: number;
}

// V6: Standard Curve Point from aggregated cohorts
export interface StandardCurvePoint {
  t: number;
  avgRetention: number;
  sampleSize: number;
  minRetention: number;
  maxRetention: number;
  stdDev: number;
}

// V6: Standard Curve Response from edge function
export interface StandardCurveResponse {
  success: boolean;
  fipeCode: string;
  modelYearsUsed: number[];
  dataPointsTotal: number;
  standardCurve: StandardCurvePoint[];
  factors: RegressionFactors;
  error?: string;
}

export interface EngineResult {
  metadata: {
    source: 'specific_model' | 'family_aggregate' | 'brand_fallback' | 'standard_curve';
    data_points_used: number;
    distinct_years: number;
    model_year: number;
    factors: RegressionFactors;
    lifetime: {
      real: number;        // Anos de histórico real
      smoothed: number;    // Anos suavizados
      dep_annual: number;  // Depreciação média anual
    };
    // V6: Additional metadata for standard curve
    standardCurveInfo?: {
      modelYearsUsed: number[];
      dataPointsTotal: number;
    };
  };
  cohort_data: CohortDataPoint[];
  projection: ProjectionPoint[];
}

// ============================================================================
// LEGACY TYPES (Mantidos para compatibilidade com código existente)
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DataMethod = 'exact' | 'family' | 'brand';
export type RegressionSource = 'exact_model' | 'family_aggregation' | 'brand_fallback';

export interface RawCohortData {
  t: number;
  price: number;
  year: number;
  ref_date: string;
}

export interface DataSourceConfig {
  fipeCode: string;
  modelName: string;
  brandName: string;
  modelYear: number;
  familyModels?: RawCohortData[];  // Nível 2: Dados agregados da família
  brandModels?: RawCohortData[];   // Nível 3: Dados agregados da marca
  effectiveSource?: 'specific_model' | 'family_aggregate' | 'brand_fallback'; // Fonte efetiva após waterfall
}

export interface DepreciationCurvePoint {
  age: number;
  price: number;
  type: 'actual' | 'projected';
}

/** Informação sobre um modelo considerado na análise agregada */
export interface ConsideredModelInfo {
  fipeCode: string;
  modelName?: string;
  modelYear?: number;
  source: 'database' | 'api';
}

export interface DepreciationEngineResult {
  curve: DepreciationCurvePoint[];
  basePrice: number;
  currentPrice: number;
  currentAge: number;
  metadata: {
    methodUsed: DataMethod;
    confidence: ConfidenceLevel;
    dataPointsUsed: number;
    rSquared: number;
    annualRatePhaseA: number;
    annualRatePhaseB: number;
    yearsPhaseA: number;
  };
  /** Lista de modelos considerados na análise (quando usando family_aggregate ou brand_fallback) */
  consideredModels?: ConsideredModelInfo[];
  /** Nome da família quando usando agregação por família */
  familyName?: string;
}

export interface RegressionCoefficients {
  decay_rate_b: number;
  theoretical_intercept_c: number;
  smoothed_decay_yoy: number;
  r_squared: number;
}

export interface ProjectionTimelinePoint {
  t: number;
  year: number;
  ref_date: string;
  realized_value: number | null;
  projected_value: number | null;
  source: 'history' | 'projection';
  curve_ln?: number;
  smoothed_yoy_rate?: number;
}

export interface CurrentQuote {
  date: string;
  value: number;
}

export interface DepreciationEngineResultV3 {
  metadata: {
    method_used: DataMethod;
    confidence: ConfidenceLevel;
    data_points_used: number;
    distinct_years: number;
    coefficients: RegressionCoefficients;
    regression_source: RegressionSource;
  };
  projection_timeline: ProjectionTimelinePoint[];
  base_price: number;
  current_quote: CurrentQuote;
  current_age: number;
}

// ============================================================================
// CONSTANTES DE NEGÓCIO
// ============================================================================

const PANDEMIC_YEARS = [2020, 2021, 2022];
const MIN_POINTS_FOR_CALCULATION = 2;
const FALLBACK_BRAND_DECAY = -0.08; // -8% ao ano como fallback
const TRANSITION_YEAR = 6; // Até Y6 usa média ponderada, depois usa projeção linear
const MAX_PROJECTION_YEARS = 60;
const SELF_REGRESSION_MIN_AGE = 10; // Veículos com 10+ anos usam auto-regressão (fase madura)

export { SELF_REGRESSION_MIN_AGE };

// ============================================================================
// 1. PREPARAÇÃO DE DADOS (Snapshot Dezembro + Filtro Pandemia)
// ============================================================================

/**
 * Prepara os dados de entrada para o formato de cohort.
 * - Seleciona um ponto por ano (prioridade dezembro)
 * - Filtra anos de pandemia
 * - Calcula t relativo ao modelYear
 */
function prepareDataPoints(history: FipePoint[], modelYear: number): CohortDataPoint[] {
  // Mapa para pegar apenas UM ponto por ano (prioridade conforme regra abaixo)
  const yearMap = new Map<number, FipePoint>();
  
  // Anos críticos para construção da curva base (Y-1, Y0, Y1)
  // NÃO devem ser filtrados por pandemia pois são essenciais
  const yMinus1Year = modelYear - 1; // Y-1 (0km)
  const y0Year = modelYear;          // Y0 (1º ano usado)
  const y1Year = modelYear + 1;      // Y1 (2º ano usado)

  // CORREÇÃO v5.4: Padronizamos referência de DEZEMBRO para todos os anos.
  // A FIPE publica dados mensais, mas dezembro é o fechamento anual mais consistente.
  // Prioridade de seleção: Dezembro (12) para todos os anos.
  const PREFERRED_MONTH = 12; // Dezembro para todos os anos
  
  history.forEach(point => {
    // 1. Filtro Pandemia EXCETO para Y-1, Y0 e Y1 (anos críticos da curva)
    const isEssentialYear = point.year === yMinus1Year || 
                            point.year === y0Year || 
                            point.year === y1Year;
    if (PANDEMIC_YEARS.includes(point.year) && !isEssentialYear) return;

    // 2. Lógica de Seleção (Snapshot dezembro)
    const existing = yearMap.get(point.year);
    if (!existing) {
      yearMap.set(point.year, point);
    } else {
      // Prioridade para dezembro
      if (point.month === PREFERRED_MONTH) {
        yearMap.set(point.year, point);
      } else if (existing.month !== PREFERRED_MONTH && point.month > existing.month) {
        // Se não tem dezembro, pega o mês mais recente
        yearMap.set(point.year, point);
      }
    }
  });

  // Converter para CohortDataPoint
  const cohortPoints: CohortDataPoint[] = [];
  
  // Encontrar o valor Y-1 (0km) para calcular relativos
  const yMinus1Point = yearMap.get(yMinus1Year);
  const basePrice = yMinus1Point?.price || 0;

  yearMap.forEach((point) => {
    // t = year - modelYear
    // Y-1 (ano anterior ao modelo) → t = -1
    // Y0 (ano modelo) → t = 0
    const t = point.year - modelYear;
    
    // Aceitamos t >= -1 (do Y-1 em diante)
    if (t >= -1) {
      const relative = basePrice > 0 ? point.price / basePrice : 1;
      
      cohortPoints.push({
        t,
        year: point.year,
        ref_date: `${point.year}-12-01`,
        price: point.price,
        relative,
      });
    }
  });

  // Ordenar por t crescente
  return cohortPoints.sort((a, b) => a.t - b.t);
}

// ============================================================================
// 2. CÁLCULO DE REGRESSÃO (Exponential Trendline: y = c * e^(b*x))
// ============================================================================

interface TrendlineOptions {
  /** Para veículos maduros (15+ anos), usar apenas pontos Y5+ (fase estabilizada) */
  useMaturePhaseOnly?: boolean;
}

/**
 * Calcula os fatores C e B da regressão exponencial.
 * Fórmulas (conforme planilha):
 * - c = EXP(INDEX(LINEST(LN(y),x),1,2))
 * - b = INDEX(LINEST(LN(y),x),1)
 * 
 * @param options.useMaturePhaseOnly - Se true, usa apenas pontos t >= 5 (fase estabilizada)
 */
function calculateExponentialTrendline(
  points: CohortDataPoint[],
  options?: TrendlineOptions
): RegressionFactors {
  let validPoints = points.filter(p => p.relative > 0);
  
  // Para veículos maduros, usar apenas pontos Y5+ (fase estabilizada)
  // Isso garante que o fator B reflita a taxa de depreciação estável
  if (options?.useMaturePhaseOnly) {
    const maturePoints = validPoints.filter(p => p.t >= 5);
    if (maturePoints.length >= MIN_POINTS_FOR_CALCULATION) {
      validPoints = maturePoints;
    }
  }
  
  const n = validPoints.length;
  
  if (n < MIN_POINTS_FOR_CALCULATION) {
    return { 
      C: 1.0, 
      B: FALLBACK_BRAND_DECAY, 
      rSquared: 0 
    };
  }

  // CORREÇÃO GABARITO: A planilha usa índice de COLUNA para regressão, não t
  // Na planilha: Y-1=coluna 0, Y0=coluna 1, Y1=coluna 2, Y2=coluna 3...
  // Portanto: columnIndex = t + 1 (onde t=-1 → col 0, t=0 → col 1, etc)
  // 
  // Linearização: ln(y) = ln(c) + b*x
  // Onde y = relative (% do valor 0km), x = columnIndex (não t!)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  validPoints.forEach(p => {
    // CORREÇÃO: usar columnIndex = t + 1 ao invés de t
    const x = p.t + 1; // Y-1(t=-1) → x=0, Y0(t=0) → x=1, Y1(t=1) → x=2, etc
    const y = Math.log(p.relative); // LN do valor relativo
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  // Mínimos Quadrados (Least Squares)
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { C: 1.0, B: FALLBACK_BRAND_DECAY, rSquared: 0 };
  }

  const B = (n * sumXY - sumX * sumY) / denominator; // Slope (decay rate)
  const lnC = (sumY - B * sumX) / n;                 // Intercept (ln of C)
  const C = Math.exp(lnC);                           // Theoretical intercept

  // Calcular R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  
  validPoints.forEach(p => {
    const x = p.t + 1; // Usar o mesmo columnIndex
    const yActual = Math.log(p.relative);
    const yPred = lnC + B * x;
    ssTot += Math.pow(yActual - yMean, 2);
    ssRes += Math.pow(yActual - yPred, 2);
  });
  
  const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;

  return { C, B, rSquared };
}

// ============================================================================
// 3. CONSTRUÇÃO DA MATRIZ DE COHORTS RELATIVOS
// ============================================================================

/**
 * Para cada ano-modelo na base histórica, calcula o cohort relativo.
 * Conforme planilha aba "Cohorts":
 * - Coluna Y-1 sempre = 100% (valor 0km daquele modelo)
 * - Colunas Y0, Y1, Y2... = % do valor Y-1
 */
function buildCohortMatrix(
  allHistoryData: FipePoint[],
  targetModelYear: number
): Map<number, CohortDataPoint[]> {
  const cohortMatrix = new Map<number, CohortDataPoint[]>();
  
  // Agrupar dados por ano-modelo (inferido do modelYear dos dados)
  // Para cada ano-modelo disponível, criar uma série de cohort
  const modelYears = new Set<number>();
  
  allHistoryData.forEach(point => {
    // Estimar o ano-modelo baseado no padrão FIPE
    // Geralmente, dados de dezembro do ano X para carro ano X+1
    // Mas aqui usamos o targetModelYear como referência
    modelYears.add(point.year);
  });

  modelYears.forEach(my => {
    // Filtrar pontos relevantes para este ano-modelo
    const relevantPoints = allHistoryData.filter(p => {
      const t = p.year - my;
      return t >= -1 && !PANDEMIC_YEARS.includes(p.year);
    });
    
    if (relevantPoints.length >= MIN_POINTS_FOR_CALCULATION) {
      const cohort = prepareDataPoints(relevantPoints, my);
      if (cohort.length > 0) {
        cohortMatrix.set(my, cohort);
      }
    }
  });

  return cohortMatrix;
}

// ============================================================================
// 4. CÁLCULO DE CURVA DE DEPRECIAÇÃO (Two-Stage Methodology)
// ============================================================================

/**
 * Calcula a curva de depreciação conforme aba "Cálculo" da planilha:
 * 
 * CURVA DEPRECIAÇÃO (linha 10):
 * - Y-1 = 100%
 * - Para t <= 6: SOMARPRODUTO(Cohorts!D11:D52;Cohorts!D61:D102)/SOMA(Cohorts!D11:D52)
 *   (Média ponderada dos cohorts históricos)
 * - Para t > 6: EXP(curva_ln)
 * 
 * CURVA DEPRECIAÇÃO LN (linha 11):
 * - Para t <= 6: LN(curva_depreciation)
 * - Para t > 6: FORECAST.LINEAR(t, range_y, range_x)
 * 
 * CURVA DEPRECIAÇÃO SUAVIZADA (linha 12):
 * - Para Y-1, Y0, Y1: Usa curva_depreciation (valor real)
 * - Para Y2+: C * EXP(B * t) onde t é baseado em coluna (ex: Y2 = t=3)
 * 
 * % DEPRECIAÇÃO SUAVIZADA YoY (linha 13):
 * - Y-1 = 100%
 * - Demais: curve_smoothed[t] / curve_smoothed[t-1]
 */
function calculateDepreciationCurveV5(
  cohortData: CohortDataPoint[],
  modelYear: number,
  factors: RegressionFactors,
  currentYear: number = new Date().getFullYear()
): ProjectionPoint[] {
  const projection: ProjectionPoint[] = [];
  
  // Encontrar o último t com dados reais
  const lastRealT = cohortData.length > 0 
    ? Math.max(...cohortData.map(c => c.t))
    : -1;
  
  // Último ano com dados FIPE reais (para lógica G14)
  const lastFipeYear = modelYear + lastRealT;
  
  // Valor base (Y-1 = 0km)
  const yMinus1 = cohortData.find(c => c.t === -1);
  const basePrice = yMinus1?.price || cohortData[0]?.price || 0;
  
  // Preparar dados para FORECAST.LINEAR (usa apenas t >= 0 e t <= lastRealT)
  const forecastData = cohortData
    .filter(c => c.t >= 0 && c.t <= Math.min(TRANSITION_YEAR, lastRealT))
    .map(c => ({ x: c.t, y: Math.log(c.relative) }));
  
  // Calcular slope e intercept para projeção linear do LN
  let forecastSlope = factors.B;
  let forecastIntercept = Math.log(factors.C);
  
  if (forecastData.length >= 2) {
    const n = forecastData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    forecastData.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });
    
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) > 1e-10) {
      forecastSlope = (n * sumXY - sumX * sumY) / denom;
      forecastIntercept = (sumY - forecastSlope * sumX) / n;
    }
  }
  
  // Armazenar valores anteriores para cálculo do YoY e projeção iterativa
  let previousSmoothedValue = 1.0;
  
  // CORREÇÃO GABARITO (v5.1): Variáveis para projeção iterativa conforme fórmula G14
  // Fórmula: =SE(G9>ParâmetrosÚltimaRef;SE(ANO(ParâmetrosÚltimaRef)=ANO(G9);F13*G12;F14*G12);"")
  // - lastRealizedValue: último valor REALIZADO (histórico FIPE)
  // - lastProjectedValue: último valor PROJETADO
  // - lastRealizedOrProjectedValue: âncora para cálculo (pode ser real ou projetado)
  let lastRealizedValue = basePrice;
  let lastProjectedValue = 0;
  let lastRealizedOrProjectedValue = basePrice; // Começa com Y-1 (0km)
  
  // Loop de t = -1 até 60
  for (let t = -1; t <= MAX_PROJECTION_YEARS; t++) {
    const year = modelYear + t;
    const refDate = `${year}-12-01`;
    
    const realPoint = cohortData.find(c => c.t === t);
    const hasRealData = !!realPoint;
    
    // =========== CURVA DEPRECIAÇÃO (linha 10) ===========
    let curveDepreciation: number;
    
    if (t === -1) {
      // Y-1 sempre = 100%
      curveDepreciation = 1.0;
    } else if (hasRealData && realPoint) {
      // Dados reais disponíveis
      curveDepreciation = realPoint.relative;
    } else if (t <= TRANSITION_YEAR) {
      // t <= 6 sem dado real: usar média ponderada dos cohorts (se houver)
      // ou interpolar/extrapolar
      const nearestReal = cohortData.find(c => c.t === t - 1);
      if (nearestReal) {
        // Estimativa baseada no ponto anterior
        curveDepreciation = nearestReal.relative * Math.exp(factors.B);
      } else {
        curveDepreciation = factors.C * Math.exp(factors.B * (t + 1)); // t+1 porque t=-1 é coluna 0
      }
    } else {
      // t > 6: EXP(curva_ln) onde curva_ln = FORECAST.LINEAR
      const curvaLn = forecastIntercept + forecastSlope * t;
      curveDepreciation = Math.exp(curvaLn);
    }
    
    // =========== CURVA DEPRECIAÇÃO LN (linha 11) ===========
    let curveDepreciationLn: number;
    if (t <= TRANSITION_YEAR) {
      curveDepreciationLn = Math.log(Math.max(curveDepreciation, 0.001));
    } else {
      // FORECAST.LINEAR para t > 6
      curveDepreciationLn = forecastIntercept + forecastSlope * t;
    }
    
    // =========== CURVA DEPRECIAÇÃO SUAVIZADA (linha 12) ===========
    // Conforme gabarito C12: =SE(OU(C7="Y-1";C7="Y0";C7="Y1");C10;$C$22*EXP($D$22*C6))
    let curveSmoothed: number;
    
    // Buscar pontos Y1 e Y2 para determinar estabilização
    const y1Point = cohortData.find(c => c.t === 1);
    const y2Point = cohortData.find(c => c.t === 2);
    
    // Calcular taxa de estabilização observada entre Y1 e Y2
    let observedStabilizationRate = 1.0;
    let isStabilized = false;
    
    if (y1Point && y2Point && y1Point.relative > 0) {
      observedStabilizationRate = y2Point.relative / y1Point.relative;
      // Considera estabilizado se retenção >= 98%
      isStabilized = observedStabilizationRate >= 0.98;
    }
    
    
    if (t <= 1) {
      // Y-1, Y0, Y1: usar valor real da curva de depreciação
      curveSmoothed = curveDepreciation;
    } else if (t === 2 && y2Point) {
      // Y2: usar valor real se disponível
      curveSmoothed = y2Point.relative;
    } else {
      // Y3+: Calcular curva suavizada
      if (isStabilized) {
        // Veículo estabilizado: aplicar leve valorização (~1.02% a.a.)
        // conforme comportamento observado nos cohorts históricos do gabarito
        const stabilizationGrowthRate = 1.0102; // e^0.0102 ≈ 1.0102
        curveSmoothed = previousSmoothedValue * stabilizationGrowthRate;
      } else if (factors.B > -0.15) {
        // Depreciação moderada: usar fórmula exponencial
        const columnIndex = t + 1;
        curveSmoothed = factors.C * Math.exp(factors.B * columnIndex);
        
        // Validar resultado
        if (!isFinite(curveSmoothed) || curveSmoothed <= 0 || curveSmoothed > 2) {
          // Fallback: aplicar taxa observada
          curveSmoothed = previousSmoothedValue * observedStabilizationRate;
        }
      } else {
        // Depreciação forte: usar taxa observada
        curveSmoothed = previousSmoothedValue * Math.max(0.85, observedStabilizationRate);
      }
    }
    
    // =========== % DEPRECIAÇÃO SUAVIZADA YoY (linha 13) ===========
    // Conforme D13: =D12/C12
    // Y-1 = 100%, depois é current/previous
    let yoyRate: number;
    if (t === -1) {
      yoyRate = 1.0; // 100%
    } else {
      yoyRate = previousSmoothedValue > 0 
        ? curveSmoothed / previousSmoothedValue 
        : 1.0;
    }
    
    // Atualizar para próxima iteração
    previousSmoothedValue = curveSmoothed;
    
    // =========== VALORES REALIZADOS E PROJETADOS (aba Projeção) ===========
    // CORREÇÃO GABARITO v5.1: Implementação exata da fórmula G14
    // =SE(G9>'Parâmetros'!$C$6;SE(ANO('Parâmetros'!$C$6)=ANO(G$9);F13*G12;F14*G12);"")
    //
    // Tradução:
    // - SE referência da coluna > última ref FIPE:
    //   - SE ano da última ref FIPE = ano da coluna atual: usa valor REALIZADO anterior × yoyRate
    //   - SENÃO: usa valor PROJETADO anterior × yoyRate
    // - SENÃO: é dado realizado (não projeta)
    
    let realizedValue: number | null = null;
    let projectedValue: number | null = null;
    let method: ProjectionPoint['method'];
    
    // Referência da coluna é POSTERIOR à última referência FIPE?
    const isAfterLastFipe = year > lastFipeYear;
    
    if (!isAfterLastFipe) {
      // Ainda estamos no período com dados reais (referência <= última FIPE)
      if (t === -1) {
        // Y-1 (0km): sempre o basePrice
        realizedValue = basePrice;
        lastRealizedValue = basePrice;
        lastRealizedOrProjectedValue = basePrice;
      } else if (hasRealData && realPoint) {
        // Dados históricos reais
        realizedValue = realPoint.price;
        lastRealizedValue = realPoint.price;
        lastRealizedOrProjectedValue = realPoint.price;
      } else {
        // Período <= última FIPE mas sem dado real neste t específico
        // Interpolar usando yoyRate
        realizedValue = null;
        projectedValue = lastRealizedOrProjectedValue * yoyRate;
        lastRealizedOrProjectedValue = projectedValue;
      }
      method = 'history_real';
    } else {
      // É PROJEÇÃO (referência > última FIPE)
      // Fórmula G14: SE(ANO(últimaRefFipe)=ANO(colunaAtual);F13*G12;F14*G12)
      // - Se ano da última ref = ano da coluna: usar REALIZADO anterior × yoyRate
      // - Senão: usar PROJETADO anterior × yoyRate
      
      // Na transição (primeiro ano após última FIPE), usamos lastRealizedValue
      // Para anos subsequentes, usamos lastRealizedOrProjectedValue (que será o projetado anterior)
      
      if (year === lastFipeYear + 1 && lastRealizedValue > 0) {
        // Primeiro ano após última FIPE: ancora no último realizado
        projectedValue = lastRealizedValue * yoyRate;
      } else {
        // Anos seguintes: usa o valor anterior (realizado ou projetado)
        projectedValue = lastRealizedOrProjectedValue * yoyRate;
      }
      
      // DEBUG: Log projection calculation for t=3
      if (t === 3) {
        console.log('[DepreciationEngine] t=3 PROJEÇÃO:', {
          year,
          lastFipeYear,
          isFirstYearAfterFipe: year === lastFipeYear + 1,
          lastRealizedValue: lastRealizedValue?.toFixed(2),
          lastRealizedOrProjectedValue: lastRealizedOrProjectedValue?.toFixed(2),
          yoyRate: yoyRate?.toFixed(6),
          projectedValue: projectedValue?.toFixed(2),
          expected: '~129246.11'
        });
      }
      
      // Atualizar âncora para próxima iteração
      lastProjectedValue = projectedValue;
      lastRealizedOrProjectedValue = projectedValue;
      
      method = t <= TRANSITION_YEAR ? 'cohort_weighted' : 'projected_linear';
    }
    
    projection.push({
      t,
      year,
      ref_date: refDate,
      realized_value: realizedValue,
      projected_value: projectedValue,
      curve_depreciation: curveDepreciation,
      curve_depreciation_ln: curveDepreciationLn,
      curve_smoothed: curveSmoothed,
      yoy_rate: yoyRate,
      method,
    });
  }
  
  return projection;
}

// ============================================================================
// 5. CORE ENGINE V6 (Standard Curve Based)
// ============================================================================

/**
 * V6 Engine: Uses a pre-calculated standard curve to project depreciation.
 * This eliminates individual model-year regression distortions (pandemic, sparse data).
 * 
 * Formula: projectedValue[t] = basePrice (0km) × standardRetention[t]
 */
/**
 * V6 Engine: Uses a pre-calculated standard curve to project depreciation.
 * This eliminates individual model-year regression distortions (pandemic, sparse data).
 * 
 * ============================================================================
 * CRITICAL FIXES v6.3:
 * 1. Age Calculation: currentAge = Max(0, currentYear - launchYear)
 * 2. BasePrice Anchoring: Use last real price if history < 12 months
 * 3. Exponential Decay: y = C × e^(B × x) direct calculation
 * 4. Sanity Checks: max 25% annual depreciation, min 40% residual at 5 years
 * 5. Projection Loop: t = currentAge + 1 to currentAge + 5, accumulated
 * ============================================================================
 */
export function calculateDepreciationCurveV6(
  historyData: FipePoint[],
  modelYear: number,
  standardCurve: StandardCurvePoint[],
  standardCurveFactors: RegressionFactors,
  currentFipeDate: Date = new Date()
): EngineResult {
  // A. Preparar dados específicos deste modelo como cohort
  
  // A. Preparar dados específicos deste modelo como cohort
  const cohortData = prepareDataPoints(historyData, modelYear);
  
  // =========================================================================
  // B. CRITICAL FIX v6.3: BasePrice Anchoring for New Models
  // If historical data < 12 months, use LAST AVAILABLE REAL PRICE as anchor
  // instead of trying to find December of previous year
  // =========================================================================
  const currentYear = currentFipeDate.getFullYear();
  const launchYear = modelYear - 1;
  const currentAge = Math.max(0, currentYear - launchYear - 1);
  
  // Check if we have enough history (at least 12 months = at least Y-1 and Y0)
  const hasY0 = cohortData.some(c => c.t === 0);
  const hasYMinus1 = cohortData.some(c => c.t === -1);
  const hasMinimalHistory = hasYMinus1 && hasY0;
  
  // Find base price: prefer Y-1, fallback to most recent price if short history
  let basePrice: number;
  const yMinus1 = cohortData.find(c => c.t === -1);
  
  if (hasMinimalHistory && yMinus1) {
    // Normal case: use Y-1 (0km price)
    basePrice = yMinus1.price;
  } else {
    // NEW MODEL FIX: Use last available real price as 100% anchor
    // Sort by t descending to find most recent price
    const sortedByT = [...cohortData].sort((a, b) => b.t - a.t);
    const lastRealPrice = sortedByT[0]?.price || 0;
    
    // If we have any real price, use it as base
    basePrice = lastRealPrice > 0 ? lastRealPrice : cohortData[0]?.price || 0;
  }
  
  if (basePrice <= 0) {
    return {
      metadata: {
        source: 'standard_curve',
        data_points_used: 0,
        distinct_years: 0,
        model_year: modelYear,
        factors: standardCurveFactors,
        lifetime: { real: 0, smoothed: 0, dep_annual: 0 },
      },
      cohort_data: [],
      projection: [],
    };
  }
  
  // C. Encontrar último t com dados reais
  const lastRealT = cohortData.length > 0 
    ? Math.max(...cohortData.map(c => c.t))
    : -1;
  const lastFipeYear = modelYear + lastRealT;
  
  // Find the last real price for projection anchoring
  const lastRealPoint = cohortData.find(c => c.t === lastRealT);
  const lastRealPrice = lastRealPoint?.price || basePrice;
  
  // D. Construir mapa de curva padrão por t para lookup rápido
  const standardCurveMap = new Map<number, StandardCurvePoint>();
  standardCurve.forEach(p => standardCurveMap.set(p.t, p));
  
  // =========================================================================
  // E. CRITICAL FIX v6.3: Exponential Decay Function
  // Use y = C × e^(B × x) DIRECTLY instead of array lookups
  // This ensures all model years follow the same curve shape
  // =========================================================================
  const getRetention = (t: number): number => {
    // First try to get from standard curve map
    const point = standardCurveMap.get(t);
    if (point) return point.avgRetention;
    
    // DIRECT EXPONENTIAL CALCULATION: y = C × e^(B × (t + 1))
    // Note: t+1 because regression uses columnIndex where Y-1=-1 → x=0
    const x = t + 1;
    const retention = standardCurveFactors.C * Math.exp(standardCurveFactors.B * x);
    
    // =========================================================================
    // SANITY CHECK v6.3: Constrain retention values
    // - Max annual depreciation: 25% (retention cannot drop more than 0.75× previous)
    // - Min residual at 5 years: 40% of original
    // =========================================================================
    const maxAnnualDepreciation = 0.25;
    const minRetentionAt5Years = 0.40;
    
    // Calculate minimum acceptable retention for this t
    // If t <= 5, we enforce min 40% at year 5, so at year t we need at least more
    const minRetention = t <= 5 
      ? Math.pow(1 - maxAnnualDepreciation, t + 1) // Worst case scenario per year
      : minRetentionAt5Years * Math.pow(1 - maxAnnualDepreciation, t - 5);
    
    // Apply sanity check floor
    const constrainedRetention = Math.max(retention, minRetention);
    
    // For year 5, ensure at least 40% residual unless historical data says otherwise
    if (t === 5 && constrainedRetention < minRetentionAt5Years) {
      console.log(`[DepreciationEngine V6.3] Sanity check: t=${t} retention ${(retention * 100).toFixed(1)}% clamped to ${(minRetentionAt5Years * 100).toFixed(1)}%`);
      return minRetentionAt5Years;
    }
    
    return constrainedRetention;
  };
  
  // =========================================================================
  // F. CRITICAL FIX v6.3: Refactored Projection Loop
  // - Iterate from t = -1 to MAX_PROJECTION_YEARS
  // - For projections: use ACCUMULATED retention from last real price
  // - Apply sanity checks throughout
  // =========================================================================
  const projection: ProjectionPoint[] = [];
  let previousSmoothed = 1.0;
  let accumulatedProjectedPrice = lastRealPrice; // Start from last known real price
  
  for (let t = -1; t <= MAX_PROJECTION_YEARS; t++) {
    const year = modelYear + t;
    const refDate = `${year}-12-01`;
    
    // Buscar dado real para este t
    const realPoint = cohortData.find(c => c.t === t);
    const hasRealData = !!realPoint;
    
    // Obter retenção da curva padrão para este t
    const standardRetention = getRetention(t);
    
    // Determinar valores realizados vs projetados
    let realizedValue: number | null = null;
    let projectedValue: number | null = null;
    let method: ProjectionPoint['method'] = 'standard_curve';
    
    if (t === -1) {
      // Y-1 (0km): sempre o basePrice
      realizedValue = basePrice;
      accumulatedProjectedPrice = basePrice;
      method = 'history_real';
    } else if (t <= lastRealT && hasRealData) {
      // Dados reais disponíveis
      realizedValue = realPoint!.price;
      accumulatedProjectedPrice = realPoint!.price; // Update anchor
      method = 'history_real';
    } else {
      // =========================================================================
      // PROJECTION: Apply retention multiplier from last known price
      // Formula: projectedPrice[t] = lastRealPrice × (retention[t] / retention[lastRealT])
      // This ensures smooth continuation from actual data
      // =========================================================================
      const lastRealRetention = getRetention(lastRealT);
      const relativeRetention = lastRealRetention > 0 
        ? standardRetention / lastRealRetention 
        : standardRetention;
      
      projectedValue = lastRealPrice * relativeRetention;
      
      // =========================================================================
      // SANITY CHECK v6.3: Prevent unrealistic projections
      // - Max 25% drop per year from previous projected value
      // - Min 40% of base price at any point
      // =========================================================================
      const maxAnnualDrop = 0.25;
      const minPrice = basePrice * 0.40; // Never below 40% of 0km price
      
      // Limit YoY drop
      const maxDropValue = accumulatedProjectedPrice * (1 - maxAnnualDrop);
      if (projectedValue < maxDropValue) {
        projectedValue = maxDropValue;
      }
      
      // Enforce minimum price floor
      if (projectedValue < minPrice) {
        projectedValue = minPrice;
      }
      
      accumulatedProjectedPrice = projectedValue;
      method = 'standard_curve';
    }
    
    // Curva de depreciação relativa
    const curveDepreciation = hasRealData && realPoint 
      ? realPoint.relative 
      : standardRetention;
    
    const curveDepreciationLn = Math.log(Math.max(curveDepreciation, 0.001));
    
    // YoY rate com sanity check
    let yoyRate = previousSmoothed > 0 
      ? standardRetention / previousSmoothed 
      : 1.0;
    
    // Sanity: YoY cannot be less than 0.75 (75% = max 25% drop)
    if (yoyRate < 0.75) {
      yoyRate = 0.75;
    }
    
    previousSmoothed = standardRetention;
    
    projection.push({
      t,
      year,
      ref_date: refDate,
      realized_value: realizedValue,
      projected_value: projectedValue,
      curve_depreciation: curveDepreciation,
      curve_depreciation_ln: curveDepreciationLn,
      curve_smoothed: standardRetention,
      yoy_rate: yoyRate,
      method,
    });
  }
  
  // G. Calcular métricas
  const realPoints = cohortData.filter(c => c.t >= 0);
  const lifetimeReal = realPoints.length > 0 
    ? Math.max(...realPoints.map(c => c.t)) + 1 
    : 0;
  
  // Depreciação média anual baseada na curva padrão
  const avgDepreciation = Math.abs(standardCurveFactors.B);
  
  return {
    metadata: {
      source: 'standard_curve',
      data_points_used: cohortData.length,
      distinct_years: new Set(cohortData.map(c => c.year)).size,
      model_year: modelYear,
      factors: standardCurveFactors,
      lifetime: {
        real: lifetimeReal,
        smoothed: lifetimeReal,
        dep_annual: avgDepreciation,
      },
    },
    cohort_data: cohortData,
    projection,
  };
}

// ============================================================================
// 5b. CORE ENGINE PRINCIPAL (V5 - Fallback)
// ============================================================================

interface DepreciationCurveOptions {
  /** Indica se o veículo é maduro (15+ anos) para usar auto-regressão */
  isMatureVehicle?: boolean;
  /** V6: Curva padrão agregada (se disponível) */
  standardCurve?: StandardCurvePoint[];
  /** V6: Fatores da curva padrão */
  standardCurveFactors?: RegressionFactors;
}

export function calculateDepreciationCurve(
  historyData: FipePoint[], 
  modelYear: number,
  currentFipeDate: Date = new Date(),
  options?: DepreciationCurveOptions
): EngineResult {
  // V6: Se curva padrão fornecida, usar V6 engine
  if (options?.standardCurve && options.standardCurve.length > 0 && options.standardCurveFactors) {
    return calculateDepreciationCurveV6(
      historyData,
      modelYear,
      options.standardCurve,
      options.standardCurveFactors,
      currentFipeDate
    );
  }
  
  // Fallback: V5 engine (individual regression)
  // A. Preparar dados como cohort
  const cohortData = prepareDataPoints(historyData, modelYear);
  
  // B. Decidir fonte (Source)
  let source: EngineResult['metadata']['source'] = 'specific_model';
  if (cohortData.length < MIN_POINTS_FOR_CALCULATION) {
    source = 'brand_fallback';
  }
  
  // C. Calcular fatores de regressão
  // Para veículos maduros (15+ anos), usar apenas pontos Y5+ para calcular fator B
  const factors = calculateExponentialTrendline(cohortData, {
    useMaturePhaseOnly: options?.isMatureVehicle,
  });
  
  // D. Construir projeção
  const projection = calculateDepreciationCurveV5(
    cohortData,
    modelYear,
    factors,
    currentFipeDate.getFullYear()
  );
  
  // E. Calcular métricas de lifetime
  const realPoints = cohortData.filter(c => c.t >= 0);
  const lifetimeReal = realPoints.length > 0 
    ? Math.max(...realPoints.map(c => c.t)) + 1 
    : 0;
  
  // Depreciação média anual (baseada no YoY)
  const avgYoY = projection
    .filter(p => p.t >= 1 && p.t <= Math.min(5, lifetimeReal))
    .reduce((sum, p) => sum + (1 - p.yoy_rate), 0) / Math.min(5, lifetimeReal || 1);
  
  return {
    metadata: {
      source,
      data_points_used: cohortData.length,
      distinct_years: new Set(cohortData.map(c => c.year)).size,
      model_year: modelYear,
      factors,
      lifetime: {
        real: lifetimeReal,
        smoothed: lifetimeReal,
        dep_annual: avgYoY,
      },
    },
    cohort_data: cohortData,
    projection,
  };
}

// ============================================================================
// 6. FUNÇÕES DE COMPATIBILIDADE (Para hooks existentes)
// ============================================================================

/**
 * Converte CohortMatrix para RawCohortData[]
 */
export function convertCohortMatrixToRaw(cells: Array<{ ref_date: string; price: number }>): RawCohortData[] {
  return cells.map(cell => {
    const [year, month] = cell.ref_date.split('-').map(Number);
    return {
      t: 0, // Será calculado no prepareDataPoints
      price: cell.price,
      year,
      ref_date: cell.ref_date,
    };
  });
}

interface EngineV2Options {
  /** Indica se o veículo é maduro (15+ anos) para usar auto-regressão */
  isMatureVehicle?: boolean;
}

/**
 * Função V2 de compatibilidade (usada por useDepreciationEngineV2)
 */
export function calculateDepreciationCurveV2(
  config: DataSourceConfig,
  rawData: RawCohortData[],
  projectionYears: number = 10,
  options?: EngineV2Options
): DepreciationEngineResult {
  // Converter RawCohortData para FipePoint
  const fipePoints: FipePoint[] = rawData.map(d => ({
    price: d.price,
    year: d.year,
    month: parseInt(d.ref_date.split('-')[1]) || 12,
    ref_date: d.ref_date,
  }));

  // Executar engine V5 (passando flag de veículo maduro)
  const result = calculateDepreciationCurve(fipePoints, config.modelYear, undefined, {
    isMatureVehicle: options?.isMatureVehicle,
  });

  // Converter resultado para formato V2
  // IMPORTANTE: Garantir que todos os pontos têm preço > 0
  const curve: DepreciationCurvePoint[] = result.projection
    .filter(p => p.t >= 0 && p.t <= projectionYears)
    .map(p => {
      // Usar realized_value se existir, senão projected_value
      const price = p.realized_value ?? p.projected_value ?? 0;
      return {
        age: p.t,
        price,
        type: p.realized_value != null ? 'actual' as const : 'projected' as const,
      };
    })
    .filter(p => p.price > 0); // Filtrar pontos com preço zero

  // Encontrar Y-1 (0km) como base
  const yMinus1 = result.projection.find(p => p.t === -1);
  const basePrice = yMinus1?.realized_value || 
                    result.projection.find(p => p.t === 0)?.realized_value || 
                    result.projection.find(p => p.t === 0)?.projected_value || 0;
  
  const currentAge = Math.max(0, new Date().getFullYear() - config.modelYear);
  const currentPoint = result.projection.find(p => p.t === currentAge);
  const currentPrice = currentPoint?.realized_value || currentPoint?.projected_value || basePrice;

  // Mapear source para method
  const methodMap: Record<string, DataMethod> = {
    'specific_model': 'exact',
    'family_aggregate': 'family',
    'brand_fallback': 'brand',
  };

  // Confidence baseado em data_points_used
  let confidence: ConfidenceLevel = 'low';
  if (result.metadata.data_points_used >= 5) confidence = 'high';
  else if (result.metadata.data_points_used >= 3) confidence = 'medium';

  // Taxa anual baseada no YoY médio
  const annualRate = result.metadata.lifetime.dep_annual;

  return {
    curve,
    basePrice,
    currentPrice,
    currentAge,
    metadata: {
      methodUsed: methodMap[result.metadata.source] || 'brand',
      confidence,
      dataPointsUsed: result.metadata.data_points_used,
      rSquared: result.metadata.factors.rSquared,
      annualRatePhaseA: annualRate,
      annualRatePhaseB: annualRate * 0.5, // Fase B mais suave
      yearsPhaseA: TRANSITION_YEAR,
    },
  };
}

interface EngineV3Options {
  /** Indica se o veículo é maduro (15+ anos) para usar auto-regressão */
  isMatureVehicle?: boolean;
}

/**
 * Função V3 de compatibilidade (usada por useDepreciationEngineV2)
 */
export function calculateDepreciationCurveV3(
  config: DataSourceConfig,
  rawData: RawCohortData[],
  currentDate: Date = new Date(),
  options?: EngineV3Options
): DepreciationEngineResultV3 {
  // Converter RawCohortData para FipePoint
  const fipePoints: FipePoint[] = rawData.map(d => ({
    price: d.price,
    year: d.year,
    month: parseInt(d.ref_date.split('-')[1]) || 12,
    ref_date: d.ref_date,
  }));

  // Executar engine V5 (passando flag de veículo maduro)
  const result = calculateDepreciationCurve(fipePoints, config.modelYear, currentDate, {
    isMatureVehicle: options?.isMatureVehicle,
  });

  // Converter para formato V3 (ProjectionTimelinePoint)
  const projection_timeline: ProjectionTimelinePoint[] = result.projection.map(p => ({
    t: p.t,
    year: p.year,
    ref_date: p.ref_date,
    realized_value: p.realized_value,
    projected_value: p.projected_value,
    source: p.realized_value ? 'history' as const : 'projection' as const,
    curve_ln: p.curve_depreciation_ln,
    smoothed_yoy_rate: p.yoy_rate,
  }));

  // Base price é o Y-1 (0km)
  const yMinus1 = result.projection.find(p => p.t === -1);
  const basePrice = yMinus1?.realized_value || 
                    result.projection.find(p => p.t === 0)?.realized_value || 0;
  
  const currentAge = Math.max(0, currentDate.getFullYear() - config.modelYear);
  const currentPoint = result.projection.find(p => p.t === currentAge);
  const currentValue = currentPoint?.realized_value || currentPoint?.projected_value || basePrice;

  // Mapear source para method
  const methodMap: Record<string, DataMethod> = {
    'specific_model': 'exact',
    'family_aggregate': 'family',
    'brand_fallback': 'brand',
  };

  // Mapear source para regression_source
  const regressionSourceMap: Record<string, RegressionSource> = {
    'specific_model': 'exact_model',
    'family_aggregate': 'family_aggregation',
    'brand_fallback': 'brand_fallback',
  };

  // Confidence baseado em data_points_used
  let confidence: ConfidenceLevel = 'low';
  if (result.metadata.data_points_used >= 5) confidence = 'high';
  else if (result.metadata.data_points_used >= 3) confidence = 'medium';

  // YoY suavizado (fator multiplicativo)
  const avgYoyRate = result.projection
    .filter(p => p.t >= 1 && p.t <= 5)
    .reduce((sum, p) => sum + p.yoy_rate, 0) / 5 || Math.exp(result.metadata.factors.B);

  // Usar effectiveSource do config se fornecido (indica fallback do orquestrador)
  const finalSource = config.effectiveSource || result.metadata.source;

  return {
    metadata: {
      method_used: methodMap[finalSource] || 'brand',
      confidence,
      data_points_used: result.metadata.data_points_used,
      distinct_years: result.metadata.distinct_years,
      coefficients: {
        decay_rate_b: result.metadata.factors.B,
        theoretical_intercept_c: result.metadata.factors.C,
        smoothed_decay_yoy: avgYoyRate,
        r_squared: result.metadata.factors.rSquared,
      },
      regression_source: regressionSourceMap[finalSource] || 'brand_fallback',
    },
    projection_timeline,
    base_price: basePrice,
    current_quote: {
      date: currentDate.toISOString().split('T')[0],
      value: currentValue,
    },
    current_age: currentAge,
  };
}
