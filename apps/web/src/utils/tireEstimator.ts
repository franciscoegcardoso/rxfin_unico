// Tire Cost Estimator - Calculadora de Custo de Pneu por KM

export interface TireSpec {
  width: number;      // 205
  profile: number;    // 55
  rim: number;        // 16
  treadwear: number;  // 400
}

export interface TireCostEstimate {
  precoUnitarioEstimado: number;
  custoJogo: number;           // preço × 4
  custoMontagem: number;       // R$ 250 fixo
  custoTotal: number;          // jogo + montagem
  durabilidadeKm: number;      // treadwear × 140
  custoPorKm: number;          // custo / durabilidade
  custoPor100Km: number;       // "custo invisível"
  custoAnual: number;          // 15.000km/ano
  custoMensal: number;
}

// Tabela de preços estimados por aro (valores em R$)
export const TIRE_PRICE_ESTIMATES: Record<number, { min: number; avg: number; max: number }> = {
  13: { min: 200, avg: 280, max: 400 },
  14: { min: 250, avg: 350, max: 500 },
  15: { min: 300, avg: 420, max: 600 },
  16: { min: 380, avg: 520, max: 750 },
  17: { min: 450, avg: 650, max: 950 },
  18: { min: 550, avg: 800, max: 1200 },
  19: { min: 700, avg: 1000, max: 1500 },
  20: { min: 900, avg: 1300, max: 2000 },
  21: { min: 1200, avg: 1800, max: 2800 },
  22: { min: 1500, avg: 2200, max: 3500 },
};

// Treadwear médio por categoria de pneu
export const TREADWEAR_BY_CATEGORY = {
  performance: 200,      // Pneus esportivos
  touring: 400,          // Pneus passeio (mais comum)
  allSeason: 500,        // Pneus 4 estações
  economy: 600,          // Pneus econômicos
  truck: 450,            // Pneus de caminhonete/SUV
};

// Custo fixo de montagem (alinhamento + balanceamento + montagem)
export const CUSTO_MONTAGEM = 250;

// Rodagem média anual padrão (km)
export const RODAGEM_ANUAL_PADRAO = 15000;

// Multiplicador de durabilidade (km por unidade de Treadwear)
export const TREADWEAR_MULTIPLIER = 140;

// Durabilidade padrão quando Treadwear não é informado
export const DURABILIDADE_PADRAO = 50000;

/**
 * Parse tire size string (e.g., "205/55 R16") into components
 */
export function parseTireSize(sizeString: string): TireSpec | null {
  // Regex para capturar: 205/55 R16 ou 205/55R16 ou 205 55 R16
  const regex = /(\d{3})\s*[\/\s]\s*(\d{2})\s*[Rr]?\s*(\d{2})/;
  const match = sizeString.match(regex);
  
  if (!match) return null;
  
  return {
    width: parseInt(match[1]),
    profile: parseInt(match[2]),
    rim: parseInt(match[3]),
    treadwear: TREADWEAR_BY_CATEGORY.touring, // Default
  };
}

/**
 * Estimate tire price based on rim size
 */
export function estimateTirePrice(rim: number, tier: 'min' | 'avg' | 'max' = 'avg'): number {
  const prices = TIRE_PRICE_ESTIMATES[rim];
  if (!prices) {
    // Fallback para aros não listados
    if (rim < 13) return TIRE_PRICE_ESTIMATES[13][tier];
    if (rim > 22) return TIRE_PRICE_ESTIMATES[22][tier];
    // Interpolar entre valores conhecidos
    const lowerRim = Math.floor(rim);
    const upperRim = Math.ceil(rim);
    const lowerPrice = TIRE_PRICE_ESTIMATES[lowerRim]?.[tier] || TIRE_PRICE_ESTIMATES[16][tier];
    const upperPrice = TIRE_PRICE_ESTIMATES[upperRim]?.[tier] || lowerPrice;
    return Math.round((lowerPrice + upperPrice) / 2);
  }
  return prices[tier];
}

/**
 * Calculate tire durability in km based on Treadwear
 */
export function getTireDurability(treadwear?: number): number {
  if (!treadwear || treadwear <= 0) {
    return DURABILIDADE_PADRAO;
  }
  return treadwear * TREADWEAR_MULTIPLIER;
}

/**
 * Calculate complete tire cost estimate
 */
export function calculateTireCostPerKm(
  rim: number,
  treadwear: number = TREADWEAR_BY_CATEGORY.touring,
  precoUnitarioManual?: number,
  rodagemAnual: number = RODAGEM_ANUAL_PADRAO
): TireCostEstimate {
  // Preço unitário (manual ou estimado)
  const precoUnitarioEstimado = precoUnitarioManual ?? estimateTirePrice(rim, 'avg');
  
  // Custo do jogo (4 pneus)
  const custoJogo = precoUnitarioEstimado * 4;
  
  // Custo de montagem fixo
  const custoMontagem = CUSTO_MONTAGEM;
  
  // Custo total
  const custoTotal = custoJogo + custoMontagem;
  
  // Durabilidade baseada no Treadwear
  const durabilidadeKm = getTireDurability(treadwear);
  
  // Custo por km
  const custoPorKm = custoTotal / durabilidadeKm;
  
  // Custo "invisível" (a cada 100km)
  const custoPor100Km = custoPorKm * 100;
  
  // Custo anual
  const custoAnual = custoPorKm * rodagemAnual;
  
  // Custo mensal
  const custoMensal = custoAnual / 12;
  
  return {
    precoUnitarioEstimado,
    custoJogo,
    custoMontagem,
    custoTotal,
    durabilidadeKm,
    custoPorKm,
    custoPor100Km,
    custoAnual,
    custoMensal,
  };
}

/**
 * Estimate rim size based on vehicle category
 */
export function estimateRimByCategory(category: string): number {
  const categoryMap: Record<string, number> = {
    'hatch_popular': 14,
    'hatch_medio': 15,
    'hatch_premium': 17,
    'sedan_popular': 15,
    'sedan_medio': 16,
    'sedan_premium': 17,
    'suv_compacto': 16,
    'suv_medio': 17,
    'suv_grande': 18,
    'suv_premium': 19,
    'pickup_media': 16,
    'pickup_grande': 17,
    'pickup_premium': 18,
    'esportivo': 18,
    'luxo': 19,
    'default': 16,
  };
  
  const normalizedCategory = category.toLowerCase().replace(/[- ]/g, '_');
  return categoryMap[normalizedCategory] || categoryMap['default'];
}

/**
 * Format tire cost for display
 */
export function formatTireCostLabel(custoMensal: number): string {
  if (custoMensal < 30) return 'Muito Econômico';
  if (custoMensal < 50) return 'Econômico';
  if (custoMensal < 80) return 'Moderado';
  if (custoMensal < 120) return 'Elevado';
  return 'Muito Elevado';
}

/**
 * Get comparison between two tire costs
 */
export function compareTireCosts(
  costA: TireCostEstimate,
  costB: TireCostEstimate
): {
  diferencaMensal: number;
  diferencaAnual: number;
  percentualDiferenca: number;
  maisCaroLabel: 'A' | 'B' | 'igual';
} {
  const diferencaMensal = costA.custoMensal - costB.custoMensal;
  const diferencaAnual = costA.custoAnual - costB.custoAnual;
  const percentualDiferenca = costB.custoAnual > 0 
    ? ((costA.custoAnual - costB.custoAnual) / costB.custoAnual) * 100
    : 0;
  
  let maisCaroLabel: 'A' | 'B' | 'igual' = 'igual';
  if (Math.abs(diferencaMensal) > 5) {
    maisCaroLabel = diferencaMensal > 0 ? 'A' : 'B';
  }
  
  return {
    diferencaMensal,
    diferencaAnual,
    percentualDiferenca,
    maisCaroLabel,
  };
}
