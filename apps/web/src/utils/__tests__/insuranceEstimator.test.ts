import { describe, it, expect } from 'vitest';
import {
  calculateInsuranceEstimate,
  inferVehicleCategory,
  categoryRiskFactors,
  highTheftVehicles,
  profileAdjustments,
  type VehicleCategory,
  type UserProfile,
} from '../insuranceEstimator';

describe('insuranceEstimator', () => {
  describe('inferVehicleCategory', () => {
    it('should return default for empty model name', () => {
      expect(inferVehicleCategory('')).toBe('default');
      expect(inferVehicleCategory('', 'carros')).toBe('default');
    });

    it('should identify hatch compacto vehicles', () => {
      expect(inferVehicleCategory('Fiat Argo')).toBe('hatch_compacto');
      expect(inferVehicleCategory('VW Gol')).toBe('hatch_compacto');
      expect(inferVehicleCategory('Chevrolet Onix')).toBe('hatch_compacto');
      expect(inferVehicleCategory('Hyundai HB20')).toBe('hatch_compacto');
      expect(inferVehicleCategory('VW Polo')).toBe('hatch_compacto');
    });

    it('should identify sedan compacto vehicles', () => {
      expect(inferVehicleCategory('Fiat Cronos')).toBe('sedan_compacto');
      expect(inferVehicleCategory('VW Virtus')).toBe('sedan_compacto');
      expect(inferVehicleCategory('Honda City')).toBe('sedan_compacto');
      expect(inferVehicleCategory('VW Voyage')).toBe('sedan_compacto');
    });

    it('should identify sedan medio vehicles', () => {
      expect(inferVehicleCategory('Toyota Corolla')).toBe('sedan_medio');
      expect(inferVehicleCategory('Honda Civic')).toBe('sedan_medio');
      expect(inferVehicleCategory('Nissan Sentra')).toBe('sedan_medio');
      expect(inferVehicleCategory('Chevrolet Cruze')).toBe('sedan_medio');
    });

    it('should identify SUV compacto vehicles', () => {
      expect(inferVehicleCategory('Fiat Pulse')).toBe('suv_compacto');
      expect(inferVehicleCategory('VW T-Cross')).toBe('suv_compacto');
      expect(inferVehicleCategory('Chevrolet Tracker')).toBe('suv_compacto');
      expect(inferVehicleCategory('Hyundai Creta')).toBe('suv_compacto');
      expect(inferVehicleCategory('Nissan Kicks')).toBe('suv_compacto');
      expect(inferVehicleCategory('Honda HR-V')).toBe('suv_compacto');
    });

    it('should identify SUV medio vehicles', () => {
      expect(inferVehicleCategory('Jeep Compass')).toBe('suv_medio');
      expect(inferVehicleCategory('VW Taos')).toBe('suv_medio');
      expect(inferVehicleCategory('Toyota Corolla Cross')).toBe('suv_medio');
      expect(inferVehicleCategory('Hyundai Tucson')).toBe('suv_medio');
    });

    it('should identify SUV grande vehicles', () => {
      expect(inferVehicleCategory('Toyota SW4')).toBe('suv_grande');
      expect(inferVehicleCategory('Toyota SW-4')).toBe('suv_grande');
      expect(inferVehicleCategory('Jeep Commander')).toBe('suv_grande');
      expect(inferVehicleCategory('Mitsubishi Outlander')).toBe('suv_grande');
    });

    it('should identify pickup compacta vehicles', () => {
      expect(inferVehicleCategory('Fiat Strada')).toBe('pickup_compacta');
      expect(inferVehicleCategory('VW Saveiro')).toBe('pickup_compacta');
      expect(inferVehicleCategory('Chevrolet Montana')).toBe('pickup_compacta');
    });

    it('should identify pickup media vehicles', () => {
      expect(inferVehicleCategory('Fiat Toro')).toBe('pickup_media');
      expect(inferVehicleCategory('Renault Oroch')).toBe('pickup_media');
    });

    it('should identify pickup grande vehicles', () => {
      expect(inferVehicleCategory('Toyota Hilux')).toBe('pickup_grande');
      expect(inferVehicleCategory('Chevrolet S10')).toBe('pickup_grande');
      expect(inferVehicleCategory('Ford Ranger')).toBe('pickup_grande');
      expect(inferVehicleCategory('VW Amarok')).toBe('pickup_grande');
      expect(inferVehicleCategory('Nissan Frontier')).toBe('pickup_grande');
    });

    it('should identify motos when vehicleType is motos', () => {
      expect(inferVehicleCategory('Honda CG 160', 'motos')).toBe('moto');
      expect(inferVehicleCategory('Yamaha Fazer', 'motos')).toBe('moto');
    });
  });

  describe('calculateInsuranceEstimate', () => {
    it('should return zero values for invalid FIPE value', () => {
      const result = calculateInsuranceEstimate(0, 'Gol');
      expect(result.valorMedio).toBe(0);
      expect(result.valorMinimo).toBe(0);
      expect(result.valorMaximo).toBe(0);

      const resultNegative = calculateInsuranceEstimate(-1000, 'Gol');
      expect(resultNegative.valorMedio).toBe(0);
    });

    it('should calculate insurance for a popular hatch', () => {
      const fipeValue = 60000; // R$ 60.000
      const result = calculateInsuranceEstimate(fipeValue, 'VW Polo');

      // Polo = hatch_compacto = 4.0% rate
      // 60000 * 0.04 = R$ 2400/ano = R$ 200/mês
      expect(result.taxaBase).toBe(0.04);
      expect(result.ajusteIVR).toBe(1); // Polo não tem alto IVR
      expect(result.ajustePerfil).toBe(1); // Perfil padrão
      expect(result.valorMedio).toBeCloseTo(200, 0); // R$ 200/mês
    });

    it('should apply IVR adjustment for high-theft vehicles', () => {
      const fipeValue = 100000;
      
      // Hilux has 35% IVR adjustment
      const hiluxResult = calculateInsuranceEstimate(fipeValue, 'Toyota Hilux');
      expect(hiluxResult.ajusteIVR).toBe(1.35);
      
      // Gol has 25% IVR adjustment
      const golResult = calculateInsuranceEstimate(fipeValue, 'VW Gol');
      expect(golResult.ajusteIVR).toBe(1.25);
      
      // HB20 has 20% IVR adjustment
      const hb20Result = calculateInsuranceEstimate(fipeValue, 'Hyundai HB20');
      expect(hb20Result.ajusteIVR).toBe(1.20);
    });

    it('should apply user profile adjustments', () => {
      const fipeValue = 80000;
      const model = 'VW Polo';

      const conservadorResult = calculateInsuranceEstimate(fipeValue, model, undefined, 'conservador');
      const padraoResult = calculateInsuranceEstimate(fipeValue, model, undefined, 'padrao');
      const arriscadoResult = calculateInsuranceEstimate(fipeValue, model, undefined, 'arriscado');

      expect(conservadorResult.ajustePerfil).toBe(0.90);
      expect(padraoResult.ajustePerfil).toBe(1.00);
      expect(arriscadoResult.ajustePerfil).toBe(1.20);

      // Conservador should be cheaper than padrão
      expect(conservadorResult.valorMedio).toBeLessThan(padraoResult.valorMedio);
      // Arriscado should be more expensive than padrão
      expect(arriscadoResult.valorMedio).toBeGreaterThan(padraoResult.valorMedio);
    });

    it('should calculate correct min/max range', () => {
      const result = calculateInsuranceEstimate(100000, 'VW Polo');
      
      // Min = 90% of medium, Max = 115% of medium
      expect(result.valorMinimo).toBeCloseTo(result.valorMedio * 0.90, 0);
      expect(result.valorMaximo).toBeCloseTo(result.valorMedio * 1.15, 0);
    });

    it('should have higher rates for pickup grande', () => {
      const fipeValue = 200000;
      
      const hiluxResult = calculateInsuranceEstimate(fipeValue, 'Toyota Hilux');
      const poloResult = calculateInsuranceEstimate(fipeValue, 'VW Polo');
      
      // Pickup grande (7.0%) should be higher than hatch (4.0%)
      // Even accounting for IVR, the base rate is much higher
      expect(hiluxResult.taxaBase).toBe(0.07);
      expect(poloResult.taxaBase).toBe(0.04);
    });

    it('should include justifications in result', () => {
      const result = calculateInsuranceEstimate(100000, 'Toyota Hilux');
      
      expect(result.justificativas.length).toBeGreaterThan(0);
      expect(result.justificativas.some(j => j.includes('Categoria'))).toBe(true);
      expect(result.justificativas.some(j => j.includes('visado'))).toBe(true);
    });

    it('should include methodology in result', () => {
      const result = calculateInsuranceEstimate(100000, 'VW Polo');
      
      expect(result.metodologia).toContain('Fórmula Aplicada');
      expect(result.metodologia).toContain('COMPARAÇÃO');
    });
  });

  describe('categoryRiskFactors', () => {
    it('should have correct rates for each category', () => {
      expect(categoryRiskFactors.hatch_compacto.rate).toBe(0.04);
      expect(categoryRiskFactors.sedan_compacto.rate).toBe(0.038);
      expect(categoryRiskFactors.sedan_medio.rate).toBe(0.035);
      expect(categoryRiskFactors.suv_compacto.rate).toBe(0.042);
      expect(categoryRiskFactors.suv_medio.rate).toBe(0.045);
      expect(categoryRiskFactors.suv_grande.rate).toBe(0.055);
      expect(categoryRiskFactors.pickup_compacta.rate).toBe(0.048);
      expect(categoryRiskFactors.pickup_media.rate).toBe(0.058);
      expect(categoryRiskFactors.pickup_grande.rate).toBe(0.07);
      expect(categoryRiskFactors.moto.rate).toBe(0.065);
    });
  });

  describe('highTheftVehicles', () => {
    it('should have Hilux as highest theft vehicle', () => {
      const hilux = highTheftVehicles.find(v => v.keywords.includes('hilux'));
      expect(hilux).toBeDefined();
      expect(hilux!.adjustmentFactor).toBe(1.35);
    });

    it('should include common high-theft vehicles', () => {
      const keywords = highTheftVehicles.flatMap(v => v.keywords);
      expect(keywords).toContain('gol');
      expect(keywords).toContain('hb20');
      expect(keywords).toContain('onix');
      expect(keywords).toContain('hilux');
      expect(keywords).toContain('s10');
    });
  });

  describe('profileAdjustments', () => {
    it('should have correct factors', () => {
      expect(profileAdjustments.conservador.factor).toBe(0.90);
      expect(profileAdjustments.padrao.factor).toBe(1.00);
      expect(profileAdjustments.arriscado.factor).toBe(1.20);
    });
  });

  describe('edge cases', () => {
    it('should handle very high FIPE values', () => {
      const result = calculateInsuranceEstimate(500000, 'BMW X5');
      expect(result.valorMedio).toBeGreaterThan(0);
      expect(result.valorMedio).toBeLessThan(result.valorMaximo);
    });

    it('should handle very low FIPE values', () => {
      const result = calculateInsuranceEstimate(10000, 'VW Gol');
      expect(result.valorMedio).toBeGreaterThan(0);
    });

    it('should be case-insensitive for model matching', () => {
      const result1 = calculateInsuranceEstimate(100000, 'TOYOTA HILUX');
      const result2 = calculateInsuranceEstimate(100000, 'toyota hilux');
      const result3 = calculateInsuranceEstimate(100000, 'Toyota Hilux');
      
      expect(result1.ajusteIVR).toBe(result2.ajusteIVR);
      expect(result2.ajusteIVR).toBe(result3.ajusteIVR);
    });
  });
});
