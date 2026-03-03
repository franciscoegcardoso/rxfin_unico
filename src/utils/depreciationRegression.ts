/**
 * Depreciação Dinâmica baseada em Regressão Exponencial
 * 
 * Metodologia: Ao invés de usar taxas estáticas, calculamos a taxa de depreciação
 * real do modelo específico usando dados cross-sectional (preços atuais para diferentes
 * anos do mesmo modelo).
 * 
 * Modelo Matemático:
 * - Preço(t) = P0 * e^(-k * t)
 * - Linearização: ln(Preço) = ln(P0) - k * t
 * - Usamos regressão linear em ln(Preço) vs. t para encontrar k
 */

export interface AgePricePoint {
  age: number;  // Idade do veículo em anos (0, 1, 2, ...)
  price: number; // Preço FIPE atual
}

export interface DepreciationCurveResult {
  // Taxa anual de depreciação (ex: 0.08 para 8%)
  annualRate: number;
  
  // P0 estimado (preço quando 0 km)
  estimatedNewPrice: number;
  
  // Projeções futuras
  projections: { year: number; age: number; price: number }[];
  
  // Qualidade da regressão (R²)
  rSquared: number;
  
  // Indica se usou fallback
  usedFallback: boolean;
  
  // Motivo do fallback (se aplicável)
  fallbackReason?: string;
  
  // Pontos filtrados (sem outliers)
  filteredPoints: AgePricePoint[];
}

// Taxa de fallback segura (10% ao ano)
const FALLBACK_DEPRECIATION_RATE = 0.10;

// Mínimo de pontos para regressão confiável
const MIN_POINTS_FOR_REGRESSION = 3;

// Taxa máxima aceitável (acima disso é outlier)
const MAX_ACCEPTABLE_RATE = 0.25; // 25% ao ano

// Taxa mínima aceitável (abaixo disso pode ser valorização anômala)
const MIN_ACCEPTABLE_RATE = 0.02; // 2% ao ano

/**
 * Remove outliers onde carros mais velhos estão mais caros que mais novos
 * (situação anômala no mercado que distorce a curva)
 */
function removeOutliers(points: AgePricePoint[]): AgePricePoint[] {
  if (points.length <= 2) return points;
  
  // Ordena por idade (do mais novo ao mais velho)
  const sorted = [...points].sort((a, b) => a.age - b.age);
  
  const filtered: AgePricePoint[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    // Um carro mais velho não deveria custar mais que um mais novo
    // Se custar, é um outlier (pode ser versão especial, carro clássico, etc.)
    const previousMaxPrice = Math.max(...filtered.map(p => p.price));
    
    // Tolerância de 5% para pequenas variações
    if (sorted[i].price <= previousMaxPrice * 1.05) {
      filtered.push(sorted[i]);
    }
  }
  
  return filtered;
}

/**
 * Calcula regressão linear simples usando método dos Mínimos Quadrados
 * Para a equação: y = mx + b
 * 
 * No nosso caso:
 * - y = ln(preço)
 * - x = idade
 * - m = -k (coeficiente de depreciação)
 * - b = ln(P0)
 */
function linearRegression(
  x: number[], 
  y: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  
  if (n === 0) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  // Somas necessárias para mínimos quadrados
  const sumX = x.reduce((acc, val) => acc + val, 0);
  const sumY = y.reduce((acc, val) => acc + val, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumXX = x.reduce((acc, val) => acc + val * val, 0);
  const sumYY = y.reduce((acc, val) => acc + val * val, 0);
  
  // Médias
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // Fórmulas de mínimos quadrados
  const denominator = sumXX - n * meanX * meanX;
  
  if (Math.abs(denominator) < 1e-10) {
    // Evita divisão por zero
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }
  
  const slope = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;
  
  // Calcula R² (coeficiente de determinação)
  const ssTotal = sumYY - n * meanY * meanY;
  const ssResidual = y.reduce((acc, val, i) => {
    const predicted = slope * x[i] + intercept;
    return acc + Math.pow(val - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * Calcula a curva de depreciação usando regressão exponencial
 * 
 * @param dataPoints Array de pontos { age, price } onde age é a idade do veículo
 * @param currentAge Idade atual do veículo selecionado
 * @param projectionYears Quantos anos projetar no futuro (default: 5)
 */
export function calculateDepreciationCurve(
  dataPoints: AgePricePoint[],
  currentAge: number = 0,
  projectionYears: number = 5
): DepreciationCurveResult {
  // Filtra pontos inválidos
  const validPoints = dataPoints.filter(p => p.price > 0 && p.age >= 0);
  
  // Remove outliers
  const filteredPoints = removeOutliers(validPoints);
  
  // Verifica se temos pontos suficientes
  if (filteredPoints.length < MIN_POINTS_FOR_REGRESSION) {
    return createFallbackResult(
      dataPoints[0]?.price || 0,
      currentAge,
      projectionYears,
      `Dados insuficientes (${filteredPoints.length} pontos, mínimo ${MIN_POINTS_FOR_REGRESSION})`,
      filteredPoints
    );
  }
  
  // Prepara dados para regressão linear em ln(preço)
  const ages = filteredPoints.map(p => p.age);
  const logPrices = filteredPoints.map(p => Math.log(p.price));
  
  // Executa regressão linear
  const { slope, intercept, rSquared } = linearRegression(ages, logPrices);
  
  // k = -slope (o slope deve ser negativo para depreciação)
  const k = -slope;
  
  // P0 = e^intercept
  const estimatedNewPrice = Math.exp(intercept);
  
  // Validação: k deve estar em faixa razoável
  if (k < MIN_ACCEPTABLE_RATE) {
    // Valorização ou depreciação muito baixa - usar fallback
    return createFallbackResult(
      estimatedNewPrice,
      currentAge,
      projectionYears,
      k < 0 
        ? 'Modelo mostra valorização (anomalia de mercado)'
        : `Taxa muito baixa (${(k * 100).toFixed(1)}% < ${MIN_ACCEPTABLE_RATE * 100}%)`,
      filteredPoints
    );
  }
  
  if (k > MAX_ACCEPTABLE_RATE) {
    // Depreciação muito alta - usar fallback suavizado
    return createFallbackResult(
      estimatedNewPrice,
      currentAge,
      projectionYears,
      `Taxa muito alta (${(k * 100).toFixed(1)}% > ${MAX_ACCEPTABLE_RATE * 100}%)`,
      filteredPoints
    );
  }
  
  // R² muito baixo indica dados muito dispersos
  if (rSquared < 0.6) {
    return createFallbackResult(
      estimatedNewPrice,
      currentAge,
      projectionYears,
      `Dados muito dispersos (R² = ${(rSquared * 100).toFixed(0)}%)`,
      filteredPoints
    );
  }
  
  // Gera projeções
  const currentYear = new Date().getFullYear();
  const projections: { year: number; age: number; price: number }[] = [];
  
  for (let i = 0; i <= projectionYears; i++) {
    const futureAge = currentAge + i;
    // Preço = P0 * e^(-k * idade)
    const projectedPrice = estimatedNewPrice * Math.exp(-k * futureAge);
    
    projections.push({
      year: currentYear + i,
      age: futureAge,
      price: Math.round(projectedPrice),
    });
  }
  
  return {
    annualRate: k,
    estimatedNewPrice: Math.round(estimatedNewPrice),
    projections,
    rSquared,
    usedFallback: false,
    filteredPoints,
  };
}

/**
 * Cria resultado usando fallback com taxa fixa
 */
function createFallbackResult(
  basePrice: number,
  currentAge: number,
  projectionYears: number,
  reason: string,
  filteredPoints: AgePricePoint[]
): DepreciationCurveResult {
  const currentYear = new Date().getFullYear();
  const projections: { year: number; age: number; price: number }[] = [];
  
  // Calcula o preço atual baseado na idade com taxa fallback
  let currentPrice = basePrice;
  if (filteredPoints.length > 0) {
    // Usa o preço do ponto mais próximo da idade atual
    const closestPoint = filteredPoints.reduce((prev, curr) => 
      Math.abs(curr.age - currentAge) < Math.abs(prev.age - currentAge) ? curr : prev
    );
    currentPrice = closestPoint.price;
  }
  
  for (let i = 0; i <= projectionYears; i++) {
    const projectedPrice = currentPrice * Math.pow(1 - FALLBACK_DEPRECIATION_RATE, i);
    
    projections.push({
      year: currentYear + i,
      age: currentAge + i,
      price: Math.round(projectedPrice),
    });
  }
  
  return {
    annualRate: FALLBACK_DEPRECIATION_RATE,
    estimatedNewPrice: Math.round(basePrice / Math.pow(1 - FALLBACK_DEPRECIATION_RATE, currentAge)),
    projections,
    rSquared: 0,
    usedFallback: true,
    fallbackReason: reason,
    filteredPoints,
  };
}

/**
 * Converte dados de preços por ano em AgePricePoints
 * 
 * @param yearPrices Array de { year: string, price: number } onde year é "2024", "2023", etc.
 * @param referenceYear Ano de referência (normalmente ano atual)
 */
export function convertYearPricesToAgePoints(
  yearPrices: { displayYear: string; price: number }[],
  referenceYear: number = new Date().getFullYear()
): AgePricePoint[] {
  return yearPrices
    .map(yp => {
      const year = parseInt(yp.displayYear);
      if (isNaN(year)) return null;
      
      const age = referenceYear - year;
      // Ignora anos futuros (idade negativa)
      if (age < 0) return null;
      
      return { age, price: yp.price };
    })
    .filter((p): p is AgePricePoint => p !== null);
}

/**
 * Formata a taxa de depreciação para exibição
 */
export function formatDepreciationRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Calcula a depreciação mensal a partir da taxa anual
 */
export function getMonthlyDepreciation(annualRate: number, currentPrice: number): number {
  const annualLoss = currentPrice * annualRate;
  return annualLoss / 12;
}

/**
 * Interface para pontos de histórico de preço
 */
export interface HistoricalPricePoint {
  date: Date;
  price: number;
  monthLabel: string;
  isLaunchPrice?: boolean;
  isProjection?: boolean;
}

/**
 * Informações de análise de coorte (siblings)
 */
export interface CohortAnalysisData {
  siblingYears: number[];
  avgMonthlyDecayRate: number;
  samplesUsed: number;
}

/**
 * Estratégia usada na projeção
 */
export type ProjectionStrategy = 
  | 'standard_regression'      // Strategy A: >24 months history
  | 'cohort_analysis'          // Strategy B: Use sibling model years
  | 'category_fallback';       // Strategy C: Generic category rate

/**
 * Resultado da projeção baseada em histórico
 */
export interface HistoricalProjectionResult {
  projectedPoints: HistoricalPricePoint[];
  annualRate: number;
  rSquared: number;
  usedFallback: boolean;
  fallbackReason?: string;
  strategy?: ProjectionStrategy;
  cohortData?: CohortAnalysisData;
}

/**
 * HIERARCHY OF ACCURACY - Projeção Inteligente
 * 
 * STRATEGY A (Standard): Se o carro tem > 24 meses de dados, usa regressão log-linear
 *                        nos últimos 18 meses (ignora depreciação íngreme do 0km)
 * 
 * STRATEGY B (Cohort): Se o carro é novo (< 24 meses), usa dados de anos-modelo anteriores
 *                      do mesmo modelo (siblings) para calcular taxa média de depreciação
 * 
 * STRATEGY C (Fallback): Se não há dados suficientes nem siblings, usa taxa genérica
 *                        de categoria (~12% ao ano para sedans/hatches)
 * 
 * @param historyPoints Pontos históricos do carro atual
 * @param projectionYears Anos para projetar (default: 5)
 * @param cohortData Dados opcionais de análise de coorte (siblings)
 */
export function calculateProjectionFromHistory(
  historyPoints: HistoricalPricePoint[],
  projectionYears: number = 5,
  cohortData?: CohortAnalysisData | null
): HistoricalProjectionResult {
  const CATEGORY_FALLBACK_RATE = 0.010; // ~12% ao ano (fallback genérico)
  const MIN_POINTS = 3;
  const RECENT_MONTHS = 18;
  const STANDARD_THRESHOLD_MONTHS = 24; // Limiar para usar Strategy A
  
  // Filtra pontos válidos
  const validPoints = historyPoints.filter(p => 
    p.price > 0 && 
    !isNaN(p.date.getTime()) &&
    !p.isProjection
  );
  
  if (validPoints.length < MIN_POINTS) {
    // Sem dados suficientes - tentar cohort ou fallback
    return handleInsufficientData(
      validPoints,
      projectionYears,
      cohortData,
      CATEGORY_FALLBACK_RATE,
      `Dados insuficientes (${validPoints.length} pontos)`
    );
  }
  
  // Ordena por data
  const sorted = [...validPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calcula quantos meses de histórico temos
  const firstDate = sorted[0].date;
  const lastDate = sorted[sorted.length - 1].date;
  const monthsOfHistory = Math.round(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  
  console.log(`[Projection] History: ${monthsOfHistory} months, ${sorted.length} points`);
  
  // === DECISION: Which strategy to use? ===
  
  // STRATEGY A: Enough history -> Standard Regression
  if (monthsOfHistory >= STANDARD_THRESHOLD_MONTHS) {
    console.log('[Projection] Using STRATEGY A: Standard Regression');
    return calculateStandardRegression(sorted, projectionYears, RECENT_MONTHS, CATEGORY_FALLBACK_RATE);
  }
  
  // STRATEGY B: Not enough history -> Try Cohort Analysis
  if (cohortData && cohortData.avgMonthlyDecayRate < 0 && cohortData.samplesUsed > 0) {
    console.log(`[Projection] Using STRATEGY B: Cohort Analysis (siblings: ${cohortData.siblingYears.join(', ')})`);
    return calculateCohortProjection(sorted, projectionYears, cohortData);
  }
  
  // STRATEGY C: Fallback to category average
  console.log('[Projection] Using STRATEGY C: Category Fallback');
  return createFallbackProjection(
    sorted,
    projectionYears,
    CATEGORY_FALLBACK_RATE,
    'Histórico curto, usando taxa média de categoria',
    'category_fallback'
  );
}

/**
 * Strategy A: Standard Log-Linear Regression
 * Usa apenas os últimos 18 meses para calcular tendência (evita drop do 0km)
 */
function calculateStandardRegression(
  sorted: HistoricalPricePoint[],
  projectionYears: number,
  recentMonths: number,
  fallbackRate: number
): HistoricalProjectionResult {
  const MIN_POINTS = 3;
  
  // Pega apenas os últimos N pontos
  const recentPoints = sorted.slice(-recentMonths);
  
  if (recentPoints.length < MIN_POINTS) {
    return createFallbackProjection(
      sorted,
      projectionYears,
      fallbackRate,
      `Dados recentes insuficientes (${recentPoints.length} pontos)`,
      'category_fallback'
    );
  }
  
  // Prepara dados para regressão: x = dias, y = ln(preço)
  const xValues: number[] = [];
  const yValues: number[] = [];
  
  for (const point of recentPoints) {
    const daysSinceEpoch = Math.floor(point.date.getTime() / (1000 * 60 * 60 * 24));
    xValues.push(daysSinceEpoch);
    yValues.push(Math.log(point.price));
  }
  
  const { slope, rSquared } = linearRegressionForProjection(xValues, yValues);
  const dailySlope = slope;
  const annualRate = 1 - Math.exp(dailySlope * 365);
  
  // Validação
  if (dailySlope > 0) {
    return createFallbackProjection(
      sorted,
      projectionYears,
      fallbackRate,
      'Modelo mostra valorização (anomalia)',
      'category_fallback'
    );
  }
  
  if (annualRate > 0.30) {
    return createFallbackProjection(
      sorted,
      projectionYears,
      fallbackRate,
      `Taxa muito alta (${(annualRate * 100).toFixed(1)}%)`,
      'category_fallback'
    );
  }
  
  if (rSquared < 0.3 && recentPoints.length >= 6) {
    const blendedMonthlyRate = (-dailySlope * 30 * 0.5) + (fallbackRate * 0.5);
    return createFallbackProjection(
      sorted,
      projectionYears,
      blendedMonthlyRate,
      `Dados dispersos (R²=${(rSquared * 100).toFixed(0)}%)`,
      'category_fallback'
    );
  }
  
  // Projeção ancorada
  const lastPoint = sorted[sorted.length - 1];
  const lastRealPrice = lastPoint.price;
  const lastRealDate = lastPoint.date;
  const lastRealOrdinal = Math.floor(lastRealDate.getTime() / (1000 * 60 * 60 * 24));
  
  const projectedPoints: HistoricalPricePoint[] = [];
  
  for (let year = 1; year <= projectionYears; year++) {
    const futureDate = new Date(lastRealDate);
    futureDate.setFullYear(futureDate.getFullYear() + year);
    
    const futureOrdinal = Math.floor(futureDate.getTime() / (1000 * 60 * 60 * 24));
    const deltaDays = futureOrdinal - lastRealOrdinal;
    
    const projectedPrice = lastRealPrice * Math.exp(dailySlope * deltaDays);
    
    projectedPoints.push({
      date: futureDate,
      price: Math.round(projectedPrice),
      monthLabel: `${futureDate.toLocaleString('pt-BR', { month: 'short' })}/${futureDate.getFullYear()}`,
      isProjection: true,
    });
  }
  
  return {
    projectedPoints,
    annualRate: Math.abs(annualRate),
    rSquared,
    usedFallback: false,
    strategy: 'standard_regression',
  };
}

/**
 * Strategy B: Cohort Analysis Projection
 * Usa taxa média de depreciação de anos-modelo anteriores (siblings)
 */
function calculateCohortProjection(
  sorted: HistoricalPricePoint[],
  projectionYears: number,
  cohortData: CohortAnalysisData
): HistoricalProjectionResult {
  const lastPoint = sorted[sorted.length - 1];
  const lastRealPrice = lastPoint.price;
  const lastRealDate = lastPoint.date;
  
  const monthlyDecayRate = cohortData.avgMonthlyDecayRate; // Negativo (ex: -0.008)
  const projectedPoints: HistoricalPricePoint[] = [];
  
  for (let year = 1; year <= projectionYears; year++) {
    const futureDate = new Date(lastRealDate);
    futureDate.setFullYear(futureDate.getFullYear() + year);
    
    const monthsAhead = year * 12;
    
    // P = P0 * (1 + r)^t onde r é negativo
    const projectedPrice = lastRealPrice * Math.pow(1 + monthlyDecayRate, monthsAhead);
    
    projectedPoints.push({
      date: futureDate,
      price: Math.round(projectedPrice),
      monthLabel: `${futureDate.toLocaleString('pt-BR', { month: 'short' })}/${futureDate.getFullYear()}`,
      isProjection: true,
    });
  }
  
  // Converte taxa mensal para anual
  const annualRate = 1 - Math.pow(1 + monthlyDecayRate, 12);
  
  return {
    projectedPoints,
    annualRate: Math.abs(annualRate),
    rSquared: 0, // N/A para cohort
    usedFallback: false,
    strategy: 'cohort_analysis',
    cohortData,
  };
}

/**
 * Handler para dados insuficientes - tenta cohort, senão usa fallback
 */
function handleInsufficientData(
  historyPoints: HistoricalPricePoint[],
  projectionYears: number,
  cohortData: CohortAnalysisData | null | undefined,
  fallbackRate: number,
  reason: string
): HistoricalProjectionResult {
  // Se temos cohort data válido, usar Strategy B
  if (cohortData && cohortData.avgMonthlyDecayRate < 0 && cohortData.samplesUsed > 0) {
    const sorted = [...historyPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
    return calculateCohortProjection(sorted, projectionYears, cohortData);
  }
  
  // Senão, usar fallback (Strategy C)
  return createFallbackProjection(
    historyPoints,
    projectionYears,
    fallbackRate,
    reason,
    'category_fallback'
  );
}

/**
 * Regressão linear simples para projeção
 */
function linearRegressionForProjection(
  x: number[], 
  y: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };
  
  const sumX = x.reduce((a, v) => a + v, 0);
  const sumY = y.reduce((a, v) => a + v, 0);
  const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
  const sumXX = x.reduce((a, v) => a + v * v, 0);
  const sumYY = y.reduce((a, v) => a + v * v, 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  const denom = sumXX - n * meanX * meanX;
  if (Math.abs(denom) < 1e-10) {
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }
  
  const slope = (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;
  
  const ssTotal = sumYY - n * meanY * meanY;
  const ssResidual = y.reduce((a, v, i) => {
    const pred = slope * x[i] + intercept;
    return a + (v - pred) ** 2;
  }, 0);
  
  const rSquared = ssTotal > 0 ? Math.max(0, 1 - ssResidual / ssTotal) : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * Cria projeção usando taxa fallback
 */
function createFallbackProjection(
  historyPoints: HistoricalPricePoint[],
  projectionYears: number,
  monthlyRate: number,
  reason: string,
  strategy: ProjectionStrategy = 'category_fallback'
): HistoricalProjectionResult {
  const sorted = [...historyPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  const lastPoint = sorted[sorted.length - 1];
  
  if (!lastPoint) {
    return {
      projectedPoints: [],
      annualRate: 0.10,
      rSquared: 0,
      usedFallback: true,
      fallbackReason: reason,
      strategy,
    };
  }
  
  const lastPrice = lastPoint.price;
  const lastDate = lastPoint.date;
  const projectedPoints: HistoricalPricePoint[] = [];
  
  for (let year = 1; year <= projectionYears; year++) {
    const futureDate = new Date(lastDate);
    futureDate.setFullYear(futureDate.getFullYear() + year);
    
    const monthsAhead = year * 12;
    const projectedPrice = lastPrice * Math.exp(-monthlyRate * monthsAhead);
    
    projectedPoints.push({
      date: futureDate,
      price: Math.round(projectedPrice),
      monthLabel: `${futureDate.toLocaleString('pt-BR', { month: 'short' })}/${futureDate.getFullYear()}`,
      isProjection: true,
    });
  }
  
  const annualRate = 1 - Math.exp(-monthlyRate * 12);
  
  return {
    projectedPoints,
    annualRate,
    rSquared: 0,
    usedFallback: true,
    fallbackReason: reason,
    strategy,
  };
}
