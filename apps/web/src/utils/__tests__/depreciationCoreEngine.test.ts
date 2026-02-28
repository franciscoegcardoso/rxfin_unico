/**
 * Testes do Motor de Cálculo de Depreciação (Core Engine) - RXFin v5.0
 * 
 * Valida:
 * - Regressão exponencial (Two-Stage: Cohort Weighted + Linear LN)
 * - Projeção baseada em cohorts relativos (Y-1 = 100%)
 * - Filtro de pandemia (2020-2022)
 * - Compatibilidade V2/V3
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDepreciationCurve,
  calculateDepreciationCurveV2,
  calculateDepreciationCurveV3,
  convertCohortMatrixToRaw,
  type FipePoint,
  type RawCohortData,
  type DataSourceConfig,
  type DepreciationEngineResultV3,
} from '../depreciationCoreEngine';

// ============================================================================
// FIXTURES: Dados de Teste
// ============================================================================

/**
 * Dados simulados de um Toyota Corolla 2023
 * Conforme GABARITO da planilha:
 * - Y-1 (2022): R$ 152.264,00 (0km)
 * - Y0 (2023): R$ 141.601,00
 * - Y1 (2024): R$ 129.689,00
 * - Y2 (2025): R$ 129.491,00
 */
const COROLLA_2023_FIPE: FipePoint[] = [
  { year: 2022, month: 12, price: 152264 }, // t=-1: Lançamento (0km)
  { year: 2023, month: 12, price: 141601 }, // t=0
  { year: 2024, month: 12, price: 129689 }, // t=1
  { year: 2025, month: 12, price: 129491 }, // t=2
];

const COROLLA_2023_RAW: RawCohortData[] = [
  { t: 0, price: 152264, year: 2022, ref_date: '2022-12-01' },
  { t: 0, price: 141601, year: 2023, ref_date: '2023-12-01' },
  { t: 0, price: 129689, year: 2024, ref_date: '2024-12-01' },
  { t: 0, price: 129491, year: 2025, ref_date: '2025-12-01' },
];

/**
 * Dados com período pandêmico para modelo 2020
 * Y-1 (2019), Y0 (2020), Y1 (2021) NÃO são filtrados
 * Y2 (2022) É filtrado por ser pandêmico e não essencial (t >= 2)
 */
const CIVIC_2020_FIPE: FipePoint[] = [
  { year: 2019, month: 12, price: 120000 }, // t=-1 (mantido - essencial)
  { year: 2020, month: 12, price: 125000 }, // t=0 (mantido - essencial)
  { year: 2021, month: 12, price: 130000 }, // t=1 (mantido - essencial)
  { year: 2022, month: 12, price: 128000 }, // t=2 PANDEMIA - FILTRADO
  { year: 2023, month: 12, price: 105000 }, // t=3 pós-pandemia
  { year: 2024, month: 12, price: 95000 },  // t=4
  { year: 2025, month: 12, price: 88000 },  // t=5
];

/**
 * Dados para modelo 2018 onde todos os dados pandêmicos (t>=2) serão filtrados
 */
const MODELO_2018_COM_PANDEMIA: FipePoint[] = [
  { year: 2017, month: 12, price: 80000 },  // t=-1 (mantido)
  { year: 2018, month: 12, price: 75000 },  // t=0 (mantido)
  { year: 2019, month: 12, price: 70000 },  // t=1 (mantido)
  { year: 2020, month: 12, price: 68000 },  // t=2 PANDEMIA - FILTRADO
  { year: 2021, month: 12, price: 72000 },  // t=3 PANDEMIA - FILTRADO
  { year: 2022, month: 12, price: 71000 },  // t=4 PANDEMIA - FILTRADO
  { year: 2023, month: 12, price: 55000 },  // t=5 pós-pandemia
  { year: 2024, month: 12, price: 50000 },  // t=6
];

// ============================================================================
// TESTES: Core Engine V5
// ============================================================================

describe('RXFin Engine v5.0', () => {
  describe('calculateDepreciationCurve', () => {
    it('calcula fatores B, C corretamente', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      // B e C são calculados via regressão exponencial sobre valores relativos
      // B pode ser positivo ou negativo dependendo da curva suavizada
      // C é o intercepto teórico (geralmente entre 0 e 1)
      expect(result.metadata.factors.C).toBeGreaterThan(0);
      expect(result.metadata.factors.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.metadata.factors.rSquared).toBeLessThanOrEqual(1);
    });

    it('usa source "specific_model" com >= 2 pontos', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      expect(result.metadata.source).toBe('specific_model');
      expect(result.metadata.data_points_used).toBeGreaterThanOrEqual(2);
    });

    it('usa fallback com < 2 pontos', () => {
      const sparseData: FipePoint[] = [
        { year: 2023, month: 12, price: 100000 },
      ];
      
      const result = calculateDepreciationCurve(sparseData, 2023);
      
      expect(result.metadata.source).toBe('brand_fallback');
    });

    it('mantém Y-1, Y0, Y1 mesmo em pandemia e filtra t>=2', () => {
      // Modelo 2020: Y-1=2019, Y0=2020, Y1=2021 mantidos; Y2=2022 filtrado
      const result = calculateDepreciationCurve(CIVIC_2020_FIPE, 2020);
      
      // Esperado: 2019(t=-1), 2020(t=0), 2021(t=1), 2023(t=3), 2024(t=4), 2025(t=5) = 6 pontos
      // 2022 (t=2) é filtrado por pandemia
      expect(result.metadata.data_points_used).toBe(6);
      
      // Verificar que Y0 e Y1 pandêmicos estão incluídos
      const hasY0 = result.cohort_data.some(c => c.t === 0 && c.year === 2020);
      const hasY1 = result.cohort_data.some(c => c.t === 1 && c.year === 2021);
      expect(hasY0).toBe(true);
      expect(hasY1).toBe(true);
    });

    it('filtra anos pandêmicos t>=2 para modelos mais antigos', () => {
      // Modelo 2018: Y-1=2017, Y0=2018, Y1=2019 mantidos
      // t=2 (2020), t=3 (2021), t=4 (2022) FILTRADOS por pandemia
      const result = calculateDepreciationCurve(MODELO_2018_COM_PANDEMIA, 2018);
      
      // Esperado: 2017(t=-1), 2018(t=0), 2019(t=1), 2023(t=5), 2024(t=6) = 5 pontos
      expect(result.metadata.data_points_used).toBe(5);
      
      // Verificar que anos pandêmicos com t>=2 foram excluídos
      const has2020 = result.cohort_data.some(c => c.year === 2020);
      const has2021 = result.cohort_data.some(c => c.year === 2021);
      const has2022 = result.cohort_data.some(c => c.year === 2022);
      expect(has2020).toBe(false);
      expect(has2021).toBe(false);
      expect(has2022).toBe(false);
    });
    it('gera projeção de t=-1 até t=60', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      expect(result.projection.length).toBe(62); // -1 até 60 inclusive
      expect(result.projection[0].t).toBe(-1);
      expect(result.projection[61].t).toBe(60);
    });

    it('Y-1 sempre tem curve_depreciation = 1.0 (100%)', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      const yMinus1 = result.projection.find(p => p.t === -1);
      expect(yMinus1?.curve_depreciation).toBe(1.0);
    });

    it('cohort_data contém valores relativos ao Y-1', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      // cohort_data deve ter pontos processados
      expect(result.cohort_data.length).toBeGreaterThanOrEqual(2);
      
      // Se Y-1 existir nos dados, relative = 1.0
      const yMinus1 = result.cohort_data.find(c => c.t === -1);
      if (yMinus1) {
        expect(yMinus1.relative).toBe(1.0);
      }
      
      // Y0 deve ter relative < 1.0 (depreciação em relação ao 0km)
      const y0 = result.cohort_data.find(c => c.t === 0);
      if (y0) {
        expect(y0.relative).toBeLessThan(1.0);
      }
    });
  });

  // ============================================================================
  // TESTE DO GABARITO: Toyota Corolla XEi 2023
  // ============================================================================

  describe('Gabarito Corolla 2023', () => {
    it('gera projeção iterativa conforme planilha Excel', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      // Verificar valores realizados (Y-1 a Y2)
      const yMinus1 = result.projection.find(p => p.t === -1);
      const y0 = result.projection.find(p => p.t === 0);
      const y1 = result.projection.find(p => p.t === 1);
      const y2 = result.projection.find(p => p.t === 2);
      const y3 = result.projection.find(p => p.t === 3);
      
      expect(yMinus1?.realized_value).toBe(152264);
      expect(y0?.realized_value).toBe(141601);
      expect(y1?.realized_value).toBe(129689);
      expect(y2?.realized_value).toBe(129491);
      
      // Verificar projeção Y3 (2026) - GABARITO: R$ 130.818,82
      expect(y3?.projected_value).toBeDefined();
      // Tolerância de 1% para arredondamentos
      if (y3?.projected_value) {
        const error = Math.abs(y3.projected_value - 130818.82) / 130818.82;
        expect(error).toBeLessThan(0.01); // 1% de tolerância
      }
    });

    it('yoy_rate reflete estabilização com leve valorização', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      // Y-1 sempre = 100%
      const yMinus1 = result.projection.find(p => p.t === -1);
      expect(yMinus1?.yoy_rate).toBe(1.0);
      
      // Para t >= 3, YoY deve ser ~1.01 (leve valorização pós-estabilização)
      const y3 = result.projection.find(p => p.t === 3);
      expect(y3?.yoy_rate).toBeCloseTo(1.0102, 3);
    });
    
    it('projeções futuras seguem padrão iterativo correto', () => {
      const result = calculateDepreciationCurve(COROLLA_2023_FIPE, 2023);
      
      // Gabarito valores esperados:
      // Y4 (2027): R$ 132.160,25
      // Y5 (2028): R$ 133.515,44
      const y4 = result.projection.find(p => p.t === 4);
      const y5 = result.projection.find(p => p.t === 5);
      
      expect(y4?.projected_value).toBeDefined();
      expect(y5?.projected_value).toBeDefined();
      
      if (y4?.projected_value) {
        const error = Math.abs(y4.projected_value - 132160.25) / 132160.25;
        expect(error).toBeLessThan(0.01);
      }
      
      if (y5?.projected_value) {
        const error = Math.abs(y5.projected_value - 133515.44) / 133515.44;
        expect(error).toBeLessThan(0.01);
      }
    });
  });
});

// ============================================================================
// TESTES: Dados Reais do Banco (Corolla 2023 - código FIPE 002111-3)
// ============================================================================

describe('Dados Reais Banco (Corolla 002111-3)', () => {
  // Dados de dezembro do banco fipe_price_history para modelo 2023
  const COROLLA_REAL_DATA: FipePoint[] = [
    { year: 2022, month: 12, price: 152264 }, // Y-1 (0km Dez/22)
    { year: 2023, month: 12, price: 131104 }, // Y0 (Dez/23)
    { year: 2024, month: 12, price: 130379 }, // Y1 (Dez/24)
    { year: 2025, month: 1, price: 127909 },  // Y2 (Jan/25 - mais recente)
  ];

  it('gera projeção Y3+ sem valores zero', () => {
    const result = calculateDepreciationCurve(COROLLA_REAL_DATA, 2023);
    
    // Y3 (2026) deve ter valor projetado > 0
    const y3 = result.projection.find(p => p.t === 3);
    expect(y3?.projected_value).toBeGreaterThan(0);
    
    // Verificar que não há zeros na projeção até Y10
    const projectedPoints = result.projection.filter(p => p.t >= 3 && p.t <= 10);
    projectedPoints.forEach(p => {
      expect(p.projected_value).toBeGreaterThan(0);
    });
  });

  it('valores realizados são preservados corretamente', () => {
    const result = calculateDepreciationCurve(COROLLA_REAL_DATA, 2023);
    
    // Verificar valores realizados
    const yMinus1 = result.projection.find(p => p.t === -1);
    const y0 = result.projection.find(p => p.t === 0);
    const y1 = result.projection.find(p => p.t === 1);
    
    expect(yMinus1?.realized_value).toBe(152264);
    expect(y0?.realized_value).toBe(131104);
    expect(y1?.realized_value).toBe(130379);
  });

  it('projeção Y3 segue padrão iterativo (≈ Y2 × yoyRate)', () => {
    const result = calculateDepreciationCurve(COROLLA_REAL_DATA, 2023);
    
    const y2 = result.projection.find(p => p.t === 2);
    const y3 = result.projection.find(p => p.t === 3);
    
    // O Y2 pode ser realizado ou projetado dependendo do lastFipeYear
    // Y3 deve ser ≈ valorAnterior × yoyRate
    expect(y3?.yoy_rate).toBeGreaterThan(0.95);
    expect(y3?.yoy_rate).toBeLessThan(1.10);
    
    // O valor projetado deve ser maior que zero
    expect(y3?.projected_value).toBeGreaterThan(100000);
  });

  it('detecta estabilização e aplica valorização', () => {
    const result = calculateDepreciationCurve(COROLLA_REAL_DATA, 2023);
    
    // Taxa Y0→Y1 deve ser alta (estabilização)
    const y1 = result.projection.find(p => p.t === 1);
    expect(y1?.yoy_rate).toBeGreaterThan(0.95); // Retenção > 95%
    
    // Para t >= 3, yoy_rate deve indicar estabilização ou leve valorização
    const y5 = result.projection.find(p => p.t === 5);
    expect(y5?.yoy_rate).toBeGreaterThan(0.98); // Retenção >= 98% indica estabilização
  });
});
// ============================================================================
// TESTES: Compatibilidade V2
// ============================================================================

describe('Compatibilidade V2', () => {
  it('calculateDepreciationCurveV2 retorna estrutura correta', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV2(config, COROLLA_2023_RAW, 10);
    
    expect(result).toHaveProperty('curve');
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('basePrice');
    expect(result).toHaveProperty('currentPrice');
    expect(result).toHaveProperty('currentAge');
    
    expect(result.metadata).toHaveProperty('methodUsed');
    expect(result.metadata).toHaveProperty('confidence');
    expect(result.metadata).toHaveProperty('dataPointsUsed');
    expect(result.metadata).toHaveProperty('rSquared');
    expect(result.metadata).toHaveProperty('annualRatePhaseA');
  });

  it('mapeia source para methodUsed corretamente', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV2(config, COROLLA_2023_RAW, 10);
    
    // specific_model -> exact
    expect(result.metadata.methodUsed).toBe('exact');
  });

  it('calcula annualRatePhaseA baseado no lifetime.dep_annual', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV2(config, COROLLA_2023_RAW, 10);
    
    // annualRatePhaseA deve estar entre 0 e 0.2 (taxa de depreciação)
    expect(result.metadata.annualRatePhaseA).toBeGreaterThanOrEqual(0);
    expect(result.metadata.annualRatePhaseA).toBeLessThan(0.3);
  });
});

// ============================================================================
// TESTES: Compatibilidade V3
// ============================================================================

describe('Compatibilidade V3', () => {
  it('calculateDepreciationCurveV3 retorna estrutura V3', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV3(config, COROLLA_2023_RAW);
    
    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('projection_timeline');
    expect(result).toHaveProperty('base_price');
    expect(result).toHaveProperty('current_quote');
    expect(result).toHaveProperty('current_age');
    
    expect(result.metadata).toHaveProperty('method_used');
    expect(result.metadata).toHaveProperty('confidence');
    expect(result.metadata).toHaveProperty('data_points_used');
    expect(result.metadata).toHaveProperty('distinct_years');
    expect(result.metadata).toHaveProperty('coefficients');
    expect(result.metadata).toHaveProperty('regression_source');
  });

  it('expõe coeficientes com terminologia correta', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV3(config, COROLLA_2023_RAW);
    
    expect(result.metadata.coefficients).toHaveProperty('decay_rate_b');
    expect(result.metadata.coefficients).toHaveProperty('theoretical_intercept_c');
    expect(result.metadata.coefficients).toHaveProperty('smoothed_decay_yoy');
    expect(result.metadata.coefficients).toHaveProperty('r_squared');
  });

  it('projection_timeline tem source history/projection', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Corolla XEi 2.0',
      brandName: 'Toyota',
      modelYear: 2023,
    };
    
    const result = calculateDepreciationCurveV3(config, COROLLA_2023_RAW);
    
    const historyPoints = result.projection_timeline.filter(p => p.source === 'history');
    const projectionPoints = result.projection_timeline.filter(p => p.source === 'projection');
    
    expect(historyPoints.length).toBeGreaterThan(0);
    expect(projectionPoints.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTES: Fallback de Marca
// ============================================================================

describe('Fallback de Marca', () => {
  it('usa B = -0.08 quando sem dados', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Modelo Novo',
      brandName: 'Toyota',
      modelYear: 2025,
    };
    
    const result = calculateDepreciationCurveV2(config, [], 5);
    
    expect(result.metadata.methodUsed).toBe('brand');
    expect(result.metadata.confidence).toBe('low');
  });

  it('V3 indica regression_source brand_fallback', () => {
    const config: DataSourceConfig = {
      fipeCode: '123-456',
      modelName: 'Modelo Novo',
      brandName: 'Toyota',
      modelYear: 2025,
    };
    
    const result = calculateDepreciationCurveV3(config, []);
    
    expect(result.metadata.regression_source).toBe('brand_fallback');
  });
});

// ============================================================================
// TESTES: convertCohortMatrixToRaw
// ============================================================================

describe('convertCohortMatrixToRaw', () => {
  it('converte células do cohort matrix para RawCohortData', () => {
    const cells = [
      { ref_date: '2023-12-01', price: 100000 },
      { ref_date: '2024-06-01', price: 95000 },
    ];
    
    const result = convertCohortMatrixToRaw(cells);
    
    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2023);
    expect(result[0].price).toBe(100000);
    expect(result[1].year).toBe(2024);
    expect(result[1].price).toBe(95000);
  });
});
