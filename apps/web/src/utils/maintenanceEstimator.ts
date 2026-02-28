/**
 * Calculadora de Manutenção Preventiva e Corretiva
 * 
 * Fórmula: Custo Anual = Base × Fator Idade × Índice Complexidade
 * 
 * Inclui a "Regra do Resto de Rico": veículos premium antigos têm custo
 * mínimo nominal independente do valor FIPE depreciado.
 */

// Índice de Complexidade por categoria
export type ComplexityIndex = 
  | 'popular_nacional'
  | 'sedan_medio'
  | 'suv_compacto'
  | 'suv_medio'
  | 'pickup'
  | 'premium_nacional'
  | 'importado_padrao'
  | 'importado_premium';

export interface ComplexityConfig {
  weight: number;
  label: string;
  examples: string[];
  isImported: boolean;
  isPremium: boolean;
}

const complexityIndexes: Record<ComplexityIndex, ComplexityConfig> = {
  popular_nacional: {
    weight: 1.0,
    label: 'Popular Nacional',
    examples: ['Gol', 'Onix', 'HB20', 'Argo', 'Polo', 'Ka'],
    isImported: false,
    isPremium: false,
  },
  sedan_medio: {
    weight: 1.4,
    label: 'Sedan Médio',
    examples: ['Corolla', 'Civic', 'Cruze', 'Sentra', 'Virtus'],
    isImported: false,
    isPremium: false,
  },
  suv_compacto: {
    weight: 1.6,
    label: 'SUV Compacto',
    examples: ['Renegade', 'T-Cross', 'Creta', 'Tracker', 'Kicks'],
    isImported: false,
    isPremium: false,
  },
  suv_medio: {
    weight: 1.8,
    label: 'SUV Médio',
    examples: ['Compass', 'Tiguan', 'Tucson', 'RAV4', 'CR-V'],
    isImported: false,
    isPremium: false,
  },
  pickup: {
    weight: 2.0,
    label: 'Picape',
    examples: ['Hilux', 'S10', 'Ranger', 'Amarok', 'Frontier'],
    isImported: false,
    isPremium: false,
  },
  premium_nacional: {
    weight: 2.5,
    label: 'Premium Nacional',
    examples: ['Corolla Cross', 'SW4', 'Tiguan Allspace'],
    isImported: false,
    isPremium: true,
  },
  importado_padrao: {
    weight: 3.0,
    label: 'Importado Padrão',
    examples: ['Golf', 'A3', 'Série 1', 'C180'],
    isImported: true,
    isPremium: false,
  },
  importado_premium: {
    weight: 4.0,
    label: 'Importado Premium',
    examples: ['BMW 320i', 'Mercedes C200', 'Audi A4', 'Land Rover', 'Volvo XC60'],
    isImported: true,
    isPremium: true,
  },
};

// Fator de idade baseado no ciclo de vida do veículo
interface AgeFactor {
  min: number;
  max: number;
  factor: number;
  description: string;
}

const ageFactors: AgeFactor[] = [
  { min: 0, max: 2, factor: 1.0, description: 'Veículo novo, apenas revisões programadas' },
  { min: 3, max: 4, factor: 1.5, description: 'Início de trocas: pneus, freios, bateria' },
  { min: 5, max: 7, factor: 2.0, description: 'Manutenção preventiva mais frequente' },
  { min: 8, max: 10, factor: 2.5, description: 'Manutenção pesada: embreagem, suspensão' },
  { min: 11, max: 15, factor: 3.0, description: 'Corretivas frequentes, peças de desgaste' },
  { min: 16, max: 99, factor: 3.5, description: 'Alto risco de falhas mecânicas maiores' },
];

// Custo base anual por categoria (R$)
const baseCosts: Record<ComplexityIndex, number> = {
  popular_nacional: 800,
  sedan_medio: 1200,
  suv_compacto: 1400,
  suv_medio: 1800,
  pickup: 2200,
  premium_nacional: 2800,
  importado_padrao: 3500,
  importado_premium: 5000,
};

// Custos mínimos nominais para a "Regra do Resto de Rico"
// Veículos premium antigos têm custo fixo mínimo
const premiumMinimumCosts: Record<number, number> = {
  5: 4000,   // 5-7 anos
  8: 8000,   // 8-10 anos
  11: 12000, // 11-14 anos
  15: 15000, // 15+ anos
};

export type MaintenanceVerdict = 'baixo_custo' | 'medio' | 'alto' | 'bomba_relogio';

export interface MaintenanceEstimate {
  custoAnual: number;
  custoMensal: number;
  reservaEmergencia: number;
  veredito: MaintenanceVerdict;
  vereditoLabel: string;
  vereditoDescricao: string;
  fatores: {
    base: number;
    fatorIdade: number;
    indiceComplexidade: number;
    regraRestoRico: boolean;
  };
  detalhamento: string[];
}

/**
 * Infere a categoria de complexidade baseado no nome do modelo
 */
export const inferComplexityIndex = (modelName: string): ComplexityIndex => {
  if (!modelName) return 'popular_nacional';
  
  const normalized = modelName.toLowerCase();
  
  // Importados Premium
  const importadosPremium = [
    'bmw', 'mercedes', 'audi', 'land rover', 'range rover', 
    'porsche', 'jaguar', 'volvo', 'lexus', 'infiniti', 'mini cooper'
  ];
  if (importadosPremium.some(k => normalized.includes(k))) {
    return 'importado_premium';
  }
  
  // Importados Padrão
  const importadosPadrao = ['golf', 'jetta', 'passat', 'tiguan allspace'];
  if (importadosPadrao.some(k => normalized.includes(k))) {
    return 'importado_padrao';
  }
  
  // Pickups
  const pickups = ['hilux', 's10', 's-10', 'ranger', 'amarok', 'frontier', 'toro', 'montana'];
  if (pickups.some(k => normalized.includes(k))) {
    return 'pickup';
  }
  
  // SUV Médio / Premium Nacional
  const suvMedio = ['compass', 'sw4', 'sw-4', 'tiguan', 'tucson', 'rav4', 'cr-v', 'crv', 'sorento'];
  if (suvMedio.some(k => normalized.includes(k))) {
    return 'suv_medio';
  }
  
  // SUV Compacto
  const suvCompacto = [
    'renegade', 't-cross', 'tcross', 'creta', 'tracker', 'kicks', 
    'ecosport', 'duster', 'captur', 'hrv', 'hr-v'
  ];
  if (suvCompacto.some(k => normalized.includes(k))) {
    return 'suv_compacto';
  }
  
  // Sedan Médio
  const sedanMedio = ['corolla', 'civic', 'cruze', 'sentra', 'jetta', 'cerato', 'elantra'];
  if (sedanMedio.some(k => normalized.includes(k))) {
    return 'sedan_medio';
  }
  
  // Popular Nacional (default)
  return 'popular_nacional';
};

/**
 * Obtém o fator de idade baseado na idade do veículo
 */
const getAgeFactor = (age: number): AgeFactor => {
  for (const factor of ageFactors) {
    if (age >= factor.min && age <= factor.max) {
      return factor;
    }
  }
  return ageFactors[ageFactors.length - 1];
};

/**
 * Calcula a estimativa de manutenção anual
 */
export const calculateMaintenanceEstimate = (
  fipeValue: number,
  modelName: string,
  manufacturingYear?: number,
  currentKm?: number,
  category?: ComplexityIndex
): MaintenanceEstimate => {
  const currentYear = new Date().getFullYear();
  const year = manufacturingYear || currentYear;
  const age = currentYear - year;
  const km = currentKm || (age * 12000); // Estima 12.000km/ano se não informado
  
  // Determinar categoria
  const complexityCategory = category || inferComplexityIndex(modelName);
  const complexity = complexityIndexes[complexityCategory];
  
  // Obter custos base
  const baseCost = baseCosts[complexityCategory];
  const ageFactor = getAgeFactor(age);
  
  // Calcular custo base
  let annualCost = baseCost * ageFactor.factor * complexity.weight;
  
  // Ajuste por quilometragem (veículos com alta km têm mais manutenção)
  const kmFactor = km > 100000 ? 1.3 : km > 60000 ? 1.15 : 1.0;
  annualCost *= kmFactor;
  
  // Aplicar "Regra do Resto de Rico"
  let restoRicoApplied = false;
  if ((complexity.isPremium || complexity.isImported) && age >= 5) {
    let minimumCost = 0;
    
    if (age >= 15) minimumCost = premiumMinimumCosts[15];
    else if (age >= 11) minimumCost = premiumMinimumCosts[11];
    else if (age >= 8) minimumCost = premiumMinimumCosts[8];
    else if (age >= 5) minimumCost = premiumMinimumCosts[5];
    
    // Se o custo calculado for menor que o mínimo, usar o mínimo
    if (annualCost < minimumCost) {
      annualCost = minimumCost;
      restoRicoApplied = true;
    }
  }
  
  // Arredondar
  annualCost = Math.round(annualCost / 100) * 100;
  
  // Calcular custos derivados
  const monthlyCost = annualCost / 12;
  
  // Reserva de emergência: 50% do custo anual para popular, 100% para premium
  const emergencyFactor = complexity.isPremium || complexity.isImported ? 1.0 : 0.5;
  const emergencyReserve = Math.round((annualCost * emergencyFactor) / 100) * 100;
  
  // Determinar veredito
  let verdict: MaintenanceVerdict;
  let verdictLabel: string;
  let verdictDescription: string;
  
  if (complexity.isImported && age >= 8) {
    verdict = 'bomba_relogio';
    verdictLabel = '💣 Bomba-Relógio';
    verdictDescription = 'Importado antigo: custos imprevisíveis e peças caras. Considere reserva robusta.';
  } else if (annualCost >= 8000) {
    verdict = 'alto';
    verdictLabel = '⚠️ Alto Custo';
    verdictDescription = 'Manutenção acima da média. Planeje reserva financeira dedicada.';
  } else if (annualCost >= 3000) {
    verdict = 'medio';
    verdictLabel = '📊 Custo Médio';
    verdictDescription = 'Custos dentro do esperado para a categoria. Mantenha revisões em dia.';
  } else {
    verdict = 'baixo_custo';
    verdictLabel = '✅ Baixo Custo';
    verdictDescription = 'Manutenção econômica. Ideal para orçamento controlado.';
  }
  
  // Montar detalhamento
  const details: string[] = [];
  details.push(`Categoria: ${complexity.label} (peso ${complexity.weight}x)`);
  details.push(`Idade: ${age} anos - ${ageFactor.description}`);
  
  if (km > 0) {
    details.push(`Quilometragem: ${km.toLocaleString()}km ${kmFactor > 1 ? `(+${Math.round((kmFactor - 1) * 100)}% ajuste)` : ''}`);
  }
  
  if (restoRicoApplied) {
    details.push('⚠️ Regra do Resto de Rico aplicada: custo mínimo nominal para veículo premium/importado antigo');
  }
  
  return {
    custoAnual: annualCost,
    custoMensal: Math.round(monthlyCost),
    reservaEmergencia: emergencyReserve,
    veredito: verdict,
    vereditoLabel: verdictLabel,
    vereditoDescricao: verdictDescription,
    fatores: {
      base: baseCost,
      fatorIdade: ageFactor.factor,
      indiceComplexidade: complexity.weight,
      regraRestoRico: restoRicoApplied,
    },
    detalhamento: details,
  };
};

/**
 * Obtém a metodologia de cálculo para exibição
 */
export const getMaintenanceMethodology = (): string => {
  return `
## Metodologia de Estimativa de Manutenção

### Fórmula Base
\`Custo Anual = Base × Fator Idade × Índice Complexidade\`

### Índice de Complexidade por Categoria
| Categoria | Peso | Exemplos |
|-----------|------|----------|
| Popular Nacional | 1.0x | Gol, Onix, HB20 |
| Sedan Médio | 1.4x | Corolla, Civic |
| SUV Compacto | 1.6x | Creta, T-Cross |
| SUV Médio | 1.8x | Compass, Tucson |
| Picape | 2.0x | Hilux, S10 |
| Premium Nacional | 2.5x | SW4 |
| Importado Padrão | 3.0x | Golf, A3 |
| Importado Premium | 4.0x | BMW, Mercedes, Land Rover |

### Fator de Idade
| Idade | Fator | Motivo |
|-------|-------|--------|
| 0-2 anos | 1.0x | Apenas revisões |
| 3-4 anos | 1.5x | Pneus, freios, bateria |
| 5-7 anos | 2.0x | Preventiva frequente |
| 8-10 anos | 2.5x | Embreagem, suspensão |
| 11-15 anos | 3.0x | Corretivas frequentes |
| 16+ anos | 3.5x | Alto risco de falhas |

### Regra do Resto de Rico
Veículos premium/importados com mais de 7 anos têm **custo mínimo nominal**:
- 5-7 anos: mínimo R$ 4.000/ano
- 8-10 anos: mínimo R$ 8.000/ano
- 11-14 anos: mínimo R$ 12.000/ano
- 15+ anos: mínimo R$ 15.000/ano

*Justificativa: O valor FIPE depreciado não reflete o custo real de peças e mão-de-obra especializada.*
  `.trim();
};

/**
 * Lista todas as categorias de complexidade para UI
 */
export const getComplexityCategories = (): { value: ComplexityIndex; label: string; examples: string[] }[] => {
  return Object.entries(complexityIndexes).map(([key, config]) => ({
    value: key as ComplexityIndex,
    label: config.label,
    examples: config.examples,
  }));
};
