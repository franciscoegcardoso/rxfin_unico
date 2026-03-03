// CLT Benefits Type Definitions

export interface Benefit {
  id: string;
  name: string;
  enabled: boolean;
  costToCompany: number;
  suggestedValue: number;
  description: string;
  icon: string; // Lucide icon name
  isCustom?: boolean;
}

export interface CLTBenefitsState {
  valeTransporte: Benefit;
  planoSaude: Benefit;
  seguroVida: Benefit;
  auxilioCreche: Benefit;
  beneficioEducacao: Benefit;
  gympass: Benefit;
  customBenefits: Benefit[];
}

export interface CLTVariableIncome {
  fgtsMonthly: number; // Calculated from salary
  plrAnnual: number;
  bonusCashAnnual: number;
}

export const DEFAULT_BENEFITS: CLTBenefitsState = {
  valeTransporte: {
    id: 'vale_transporte',
    name: 'Vale Transporte',
    enabled: false,
    costToCompany: 220,
    suggestedValue: 220,
    description: 'Valor médio de mercado para transporte público metropolitano',
    icon: 'Bus',
  },
  planoSaude: {
    id: 'plano_saude',
    name: 'Plano de Saúde',
    enabled: false,
    costToCompany: 450,
    suggestedValue: 450,
    description: 'Plano de saúde empresarial coparticipativo (média nacional)',
    icon: 'Heart',
  },
  seguroVida: {
    id: 'seguro_vida',
    name: 'Seguro de Vida',
    enabled: false,
    costToCompany: 35,
    suggestedValue: 35,
    description: 'Seguro de vida em grupo (média nacional)',
    icon: 'Shield',
  },
  auxilioCreche: {
    id: 'auxilio_creche',
    name: 'Auxílio Creche',
    enabled: false,
    costToCompany: 500,
    suggestedValue: 500,
    description: 'Reembolso de despesas com creche para filhos até 6 anos',
    icon: 'Baby',
  },
  beneficioEducacao: {
    id: 'beneficio_educacao',
    name: 'Benefício de Educação',
    enabled: false,
    costToCompany: 300,
    suggestedValue: 300,
    description: 'Auxílio para cursos, graduação ou pós-graduação',
    icon: 'GraduationCap',
  },
  gympass: {
    id: 'gympass',
    name: 'Gympass / TotalPass / SESI',
    enabled: false,
    costToCompany: 80,
    suggestedValue: 80,
    description: 'Benefício de bem-estar e academia',
    icon: 'Dumbbell',
  },
  customBenefits: [],
};

export const createCustomBenefit = (name: string, cost: number = 100): Benefit => ({
  id: `custom_${Date.now()}`,
  name,
  enabled: true,
  costToCompany: cost,
  suggestedValue: cost,
  description: 'Benefício personalizado adicionado pelo usuário',
  icon: 'Gift',
  isCustom: true,
});

export const calculateTotalBenefitsCost = (benefits: CLTBenefitsState): number => {
  const standardBenefits = [
    benefits.valeTransporte,
    benefits.planoSaude,
    benefits.seguroVida,
    benefits.auxilioCreche,
    benefits.beneficioEducacao,
    benefits.gympass,
  ];
  
  const standardTotal = standardBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.costToCompany, 0);
  
  const customTotal = benefits.customBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.costToCompany, 0);
  
  return standardTotal + customTotal;
};

// Calculate net value of benefits for the worker
// Some benefits are not taxed (health, transportation within limits)
export const calculateNetBenefitsValue = (benefits: CLTBenefitsState): number => {
  const standardBenefits = [
    benefits.valeTransporte,
    benefits.planoSaude,
    benefits.seguroVida,
    benefits.auxilioCreche,
    benefits.beneficioEducacao,
    benefits.gympass,
  ];
  
  // Most benefits are received tax-free by the worker
  const standardTotal = standardBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.costToCompany, 0);
  
  const customTotal = benefits.customBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.costToCompany, 0);
  
  return standardTotal + customTotal;
};
