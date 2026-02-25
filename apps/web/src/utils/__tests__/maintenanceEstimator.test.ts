import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  calculateMaintenanceEstimate,
  inferComplexityIndex,
  getMaintenanceMethodology,
  getComplexityCategories,
  type ComplexityIndex,
  type MaintenanceEstimate,
} from '../maintenanceEstimator';

describe('maintenanceEstimator', () => {
  // Mock current year to ensure consistent test results
  const MOCK_YEAR = 2024;
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(MOCK_YEAR, 0, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('inferComplexityIndex', () => {
    it('should return popular_nacional for empty model name', () => {
      expect(inferComplexityIndex('')).toBe('popular_nacional');
    });

    it('should identify importado premium vehicles', () => {
      expect(inferComplexityIndex('BMW 320i')).toBe('importado_premium');
      expect(inferComplexityIndex('Mercedes C200')).toBe('importado_premium');
      expect(inferComplexityIndex('Audi A4')).toBe('importado_premium');
      expect(inferComplexityIndex('Land Rover Evoque')).toBe('importado_premium');
      expect(inferComplexityIndex('Volvo XC60')).toBe('importado_premium');
      expect(inferComplexityIndex('Porsche Cayenne')).toBe('importado_premium');
      expect(inferComplexityIndex('Lexus NX')).toBe('importado_premium');
    });

    it('should identify importado padrao vehicles', () => {
      expect(inferComplexityIndex('VW Golf')).toBe('importado_padrao');
      expect(inferComplexityIndex('VW Jetta')).toBe('importado_padrao');
      expect(inferComplexityIndex('VW Passat')).toBe('importado_padrao');
      expect(inferComplexityIndex('VW Tiguan Allspace')).toBe('importado_padrao');
    });

    it('should identify pickup vehicles', () => {
      expect(inferComplexityIndex('Toyota Hilux')).toBe('pickup');
      expect(inferComplexityIndex('Chevrolet S10')).toBe('pickup');
      expect(inferComplexityIndex('Ford Ranger')).toBe('pickup');
      expect(inferComplexityIndex('VW Amarok')).toBe('pickup');
      expect(inferComplexityIndex('Nissan Frontier')).toBe('pickup');
      expect(inferComplexityIndex('Fiat Toro')).toBe('pickup');
    });

    it('should identify SUV medio vehicles', () => {
      expect(inferComplexityIndex('Jeep Compass')).toBe('suv_medio');
      expect(inferComplexityIndex('Toyota SW4')).toBe('suv_medio');
      expect(inferComplexityIndex('VW Tiguan')).toBe('suv_medio');
      expect(inferComplexityIndex('Hyundai Tucson')).toBe('suv_medio');
      expect(inferComplexityIndex('Toyota RAV4')).toBe('suv_medio');
      expect(inferComplexityIndex('Honda CR-V')).toBe('suv_medio');
    });

    it('should identify SUV compacto vehicles', () => {
      expect(inferComplexityIndex('Jeep Renegade')).toBe('suv_compacto');
      expect(inferComplexityIndex('VW T-Cross')).toBe('suv_compacto');
      expect(inferComplexityIndex('Hyundai Creta')).toBe('suv_compacto');
      expect(inferComplexityIndex('Chevrolet Tracker')).toBe('suv_compacto');
      expect(inferComplexityIndex('Nissan Kicks')).toBe('suv_compacto');
      expect(inferComplexityIndex('Honda HR-V')).toBe('suv_compacto');
    });

    it('should identify sedan medio vehicles', () => {
      expect(inferComplexityIndex('Toyota Corolla')).toBe('sedan_medio');
      expect(inferComplexityIndex('Honda Civic')).toBe('sedan_medio');
      expect(inferComplexityIndex('Chevrolet Cruze')).toBe('sedan_medio');
      expect(inferComplexityIndex('Nissan Sentra')).toBe('sedan_medio');
    });

    it('should default to popular_nacional for unknown vehicles', () => {
      expect(inferComplexityIndex('VW Gol')).toBe('popular_nacional');
      expect(inferComplexityIndex('Chevrolet Onix')).toBe('popular_nacional');
      expect(inferComplexityIndex('Hyundai HB20')).toBe('popular_nacional');
      expect(inferComplexityIndex('Fiat Argo')).toBe('popular_nacional');
    });

    it('should be case-insensitive', () => {
      expect(inferComplexityIndex('BMW 320I')).toBe('importado_premium');
      expect(inferComplexityIndex('bmw 320i')).toBe('importado_premium');
      expect(inferComplexityIndex('Bmw 320i')).toBe('importado_premium');
    });
  });

  describe('calculateMaintenanceEstimate', () => {
    it('should calculate maintenance for a new popular vehicle', () => {
      const result = calculateMaintenanceEstimate(
        60000, // FIPE
        'VW Gol',
        2024, // current year = new vehicle
        10000 // low km
      );

      // Base = R$ 800, Age factor = 1.0, Complexity = 1.0
      // No km adjustment for < 60k
      expect(result.custoAnual).toBe(800);
      expect(result.custoMensal).toBe(67); // 800 / 12 rounded
      expect(result.veredito).toBe('baixo_custo');
      expect(result.fatores.base).toBe(800);
      expect(result.fatores.fatorIdade).toBe(1.0);
      expect(result.fatores.indiceComplexidade).toBe(1.0);
      expect(result.fatores.regraRestoRico).toBe(false);
    });

    it('should apply age factor for older vehicles', () => {
      // 5-year-old vehicle
      const result5Years = calculateMaintenanceEstimate(
        60000,
        'VW Gol',
        MOCK_YEAR - 5,
        60000
      );

      expect(result5Years.fatores.fatorIdade).toBe(2.0); // 5-7 years
      expect(result5Years.custoAnual).toBeGreaterThan(800);

      // 10-year-old vehicle
      const result10Years = calculateMaintenanceEstimate(
        60000,
        'VW Gol',
        MOCK_YEAR - 10,
        120000
      );

      expect(result10Years.fatores.fatorIdade).toBe(2.5); // 8-10 years
    });

    it('should apply km adjustment for high-mileage vehicles', () => {
      // Same car, different km
      const lowKm = calculateMaintenanceEstimate(60000, 'VW Gol', MOCK_YEAR, 30000);
      const medKm = calculateMaintenanceEstimate(60000, 'VW Gol', MOCK_YEAR, 70000);
      const highKm = calculateMaintenanceEstimate(60000, 'VW Gol', MOCK_YEAR, 120000);

      expect(medKm.custoAnual).toBeGreaterThan(lowKm.custoAnual);
      expect(highKm.custoAnual).toBeGreaterThan(medKm.custoAnual);
    });

    it('should apply higher complexity for premium vehicles', () => {
      const fipe = 150000;
      const year = MOCK_YEAR - 3;

      const gol = calculateMaintenanceEstimate(fipe, 'VW Gol', year);
      const corolla = calculateMaintenanceEstimate(fipe, 'Toyota Corolla', year);
      const bmw = calculateMaintenanceEstimate(fipe, 'BMW 320i', year);

      expect(gol.fatores.indiceComplexidade).toBe(1.0);
      expect(corolla.fatores.indiceComplexidade).toBe(1.4);
      expect(bmw.fatores.indiceComplexidade).toBe(4.0);

      expect(corolla.custoAnual).toBeGreaterThan(gol.custoAnual);
      expect(bmw.custoAnual).toBeGreaterThan(corolla.custoAnual);
    });

    it('should apply Regra do Resto de Rico for old imported vehicles', () => {
      // Old imported premium (8+ years)
      const result = calculateMaintenanceEstimate(
        80000, // Low FIPE due to depreciation
        'BMW 320i',
        MOCK_YEAR - 10, // 10 years old
        100000
      );

      expect(result.fatores.regraRestoRico).toBe(true);
      // Minimum for 8-10 year premium = R$ 8,000
      expect(result.custoAnual).toBeGreaterThanOrEqual(8000);
    });

    it('should not apply Regra do Resto de Rico for popular vehicles', () => {
      const result = calculateMaintenanceEstimate(
        30000,
        'VW Gol',
        MOCK_YEAR - 12,
        150000
      );

      expect(result.fatores.regraRestoRico).toBe(false);
    });

    it('should return bomba_relogio verdict for old imports', () => {
      const result = calculateMaintenanceEstimate(
        100000,
        'BMW 320i',
        MOCK_YEAR - 10,
        120000
      );

      expect(result.veredito).toBe('bomba_relogio');
      expect(result.vereditoLabel).toContain('Bomba');
    });

    it('should return alto verdict for high maintenance costs', () => {
      const result = calculateMaintenanceEstimate(
        200000,
        'Toyota SW4', // SUV médio
        MOCK_YEAR - 8,
        100000
      );

      if (result.custoAnual >= 8000) {
        expect(result.veredito).toBe('alto');
      }
    });

    it('should calculate appropriate emergency reserve', () => {
      // Popular vehicle: 50% reserve
      const gol = calculateMaintenanceEstimate(60000, 'VW Gol', MOCK_YEAR);
      expect(gol.reservaEmergencia).toBe(Math.round(gol.custoAnual * 0.5 / 100) * 100);

      // Imported/Premium: 100% reserve
      const bmw = calculateMaintenanceEstimate(150000, 'BMW 320i', MOCK_YEAR);
      expect(bmw.reservaEmergencia).toBe(Math.round(bmw.custoAnual / 100) * 100);
    });

    it('should include detalhamento with useful info', () => {
      const result = calculateMaintenanceEstimate(
        100000,
        'VW Gol',
        MOCK_YEAR - 5,
        80000
      );

      expect(result.detalhamento.length).toBeGreaterThan(0);
      expect(result.detalhamento.some(d => d.includes('Categoria'))).toBe(true);
      expect(result.detalhamento.some(d => d.includes('Idade'))).toBe(true);
      expect(result.detalhamento.some(d => d.includes('Quilometragem'))).toBe(true);
    });

    it('should accept explicit category override', () => {
      const result = calculateMaintenanceEstimate(
        100000,
        'Some Unknown Car',
        MOCK_YEAR,
        10000,
        'importado_premium'
      );

      expect(result.fatores.indiceComplexidade).toBe(4.0);
    });

    it('should estimate km when not provided', () => {
      const result = calculateMaintenanceEstimate(
        60000,
        'VW Gol',
        MOCK_YEAR - 5
        // km not provided
      );

      // Should estimate 5 years * 12000km = 60000km
      expect(result.detalhamento.some(d => d.includes('60.000km') || d.includes('60000'))).toBe(true);
    });
  });

  describe('Regra do Resto de Rico thresholds', () => {
    it('should apply minimum R$ 4,000 for 5-7 year old premium', () => {
      const result = calculateMaintenanceEstimate(50000, 'Mercedes C180', MOCK_YEAR - 6);
      expect(result.custoAnual).toBeGreaterThanOrEqual(4000);
    });

    it('should apply minimum R$ 8,000 for 8-10 year old premium', () => {
      const result = calculateMaintenanceEstimate(50000, 'Audi A4', MOCK_YEAR - 9);
      expect(result.custoAnual).toBeGreaterThanOrEqual(8000);
    });

    it('should apply minimum R$ 12,000 for 11-14 year old premium', () => {
      const result = calculateMaintenanceEstimate(40000, 'BMW 320i', MOCK_YEAR - 12);
      expect(result.custoAnual).toBeGreaterThanOrEqual(12000);
    });

    it('should apply minimum R$ 15,000 for 15+ year old premium', () => {
      const result = calculateMaintenanceEstimate(30000, 'Mercedes C200', MOCK_YEAR - 16);
      expect(result.custoAnual).toBeGreaterThanOrEqual(15000);
    });
  });

  describe('getMaintenanceMethodology', () => {
    it('should return methodology string', () => {
      const methodology = getMaintenanceMethodology();

      expect(methodology).toContain('Metodologia');
      expect(methodology).toContain('Fórmula Base');
      expect(methodology).toContain('Índice de Complexidade');
      expect(methodology).toContain('Fator de Idade');
      expect(methodology).toContain('Regra do Resto de Rico');
    });
  });

  describe('getComplexityCategories', () => {
    it('should return all categories', () => {
      const categories = getComplexityCategories();

      expect(categories.length).toBe(8);
      expect(categories.some(c => c.value === 'popular_nacional')).toBe(true);
      expect(categories.some(c => c.value === 'importado_premium')).toBe(true);
    });

    it('should include labels and examples', () => {
      const categories = getComplexityCategories();

      categories.forEach(cat => {
        expect(cat.label).toBeTruthy();
        expect(cat.examples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very old vehicles (20+ years)', () => {
      const result = calculateMaintenanceEstimate(20000, 'VW Gol', MOCK_YEAR - 25);
      
      expect(result.fatores.fatorIdade).toBe(3.5); // Max age factor
      expect(result.custoAnual).toBeGreaterThan(0);
    });

    it('should handle zero year (brand new)', () => {
      const result = calculateMaintenanceEstimate(100000, 'VW Polo', MOCK_YEAR);
      
      expect(result.fatores.fatorIdade).toBe(1.0);
    });

    it('should handle future year gracefully', () => {
      const result = calculateMaintenanceEstimate(100000, 'VW Polo', MOCK_YEAR + 1);
      
      // Should treat as brand new (age 0 or negative handled)
      expect(result.fatores.fatorIdade).toBe(1.0);
    });

    it('should round costs to nearest hundred', () => {
      const result = calculateMaintenanceEstimate(65432, 'VW Gol', MOCK_YEAR);
      
      expect(result.custoAnual % 100).toBe(0);
      expect(result.reservaEmergencia % 100).toBe(0);
    });
  });
});
