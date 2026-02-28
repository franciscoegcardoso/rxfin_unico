// Sócio Tax Types - Brazilian tax calculations for Partners/Shareholders
// Includes Pró-labore taxation, Profit Distribution, Dividends, and Company Tax Regimes

// ==================== COMPANY TAX REGIME TYPES ====================

export type SocioCompanyRegime = 'simples' | 'lucro_presumido' | 'lucro_real';

// ==================== INSS & IRRF TABLES 2026 ====================

// INSS for Pró-labore (11% capped at ceiling)
export const INSS_PROLABORE_RATE = 0.11;
export const INSS_CEILING_2026 = 951.63; // Teto INSS 2026 estimado
export const SALARIO_MINIMO_2026 = 1518.00;

// IRPF Progressive Table 2026 (estimated)
export const IRPF_BRACKETS_2026 = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0, label: 'Isento' },
  { min: 2259.20, max: 2826.65, rate: 0.075, deduction: 169.44, label: '7,5%' },
  { min: 2826.65, max: 3751.05, rate: 0.15, deduction: 381.44, label: '15%' },
  { min: 3751.05, max: 4664.68, rate: 0.225, deduction: 662.77, label: '22,5%' },
  { min: 4664.68, max: Infinity, rate: 0.275, deduction: 896.00, label: '27,5%' },
];

export const DEPENDENT_DEDUCTION_2026 = 189.59;

// ==================== CALCULATION FUNCTIONS ====================

/**
 * Calculate INSS for Pró-labore
 * Fixed 11% rate, capped at ceiling
 */
export const calculateINSSProLabore = (proLabore: number): {
  value: number;
  rate: number;
  base: number;
} => {
  const inss = Math.min(proLabore * INSS_PROLABORE_RATE, INSS_CEILING_2026);
  return {
    value: inss,
    rate: proLabore > 0 ? (inss / proLabore) * 100 : 0,
    base: proLabore,
  };
};

/**
 * Calculate IRPF for Pró-labore (after INSS deduction)
 */
export const calculateIRPFProLabore = (
  baseCalculo: number,
  dependents: number = 0
): {
  value: number;
  effectiveRate: number;
  bracket: string;
  bracketRate: number;
  baseCalculo: number;
} => {
  // Apply dependent deductions
  const adjustedBase = Math.max(0, baseCalculo - (dependents * DEPENDENT_DEDUCTION_2026));
  
  for (const bracket of IRPF_BRACKETS_2026) {
    if (adjustedBase <= bracket.max) {
      const ir = Math.max(0, adjustedBase * bracket.rate - bracket.deduction);
      return {
        value: ir,
        effectiveRate: baseCalculo > 0 ? (ir / baseCalculo) * 100 : 0,
        bracket: bracket.label,
        bracketRate: bracket.rate * 100,
        baseCalculo: adjustedBase,
      };
    }
  }
  
  return { value: 0, effectiveRate: 0, bracket: 'Isento', bracketRate: 0, baseCalculo: adjustedBase };
};

// ==================== COMPANY TAX CONFIGURATIONS ====================

export interface CompanyTaxConfig {
  label: string;
  description: string;
  // Estimated company tax rate on profits (for context)
  avgTaxRate: number;
  // Can distribute profits tax-free?
  profitDistributionTaxFree: boolean;
  // Notes about the regime
  notes: string[];
}

export const COMPANY_TAX_CONFIGS: Record<SocioCompanyRegime, CompanyTaxConfig> = {
  simples: {
    label: 'Simples Nacional',
    description: 'Regime simplificado para pequenas empresas',
    avgTaxRate: 10, // Média aproximada
    profitDistributionTaxFree: true,
    notes: [
      'Lucros distribuídos são isentos de IR para o sócio',
      'Pró-labore obrigatório com INSS + IR',
      'Recomendado: pró-labore de pelo menos 1 salário mínimo',
    ],
  },
  lucro_presumido: {
    label: 'Lucro Presumido',
    description: 'Regime com presunção de lucro sobre faturamento',
    avgTaxRate: 16, // Média serviços
    profitDistributionTaxFree: true,
    notes: [
      'Lucros distribuídos são isentos de IR para o sócio',
      'Pró-labore obrigatório com INSS + IR',
      'Base de presunção: 32% para serviços, 8% para comércio',
    ],
  },
  lucro_real: {
    label: 'Lucro Real',
    description: 'Regime baseado no lucro contábil real',
    avgTaxRate: 34, // IRPJ 15% + CSLL 9% + adicional
    profitDistributionTaxFree: true,
    notes: [
      'Lucros distribuídos são isentos de IR para o sócio',
      'Regime obrigatório para faturamento > R$ 78 milhões/ano',
      'Pode ser vantajoso para empresas com margens baixas',
    ],
  },
};

// ==================== PARTNER INCOME TYPES ====================

export type PartnerIncomeType = 
  | 'pro_labore'
  | 'distribuicao_lucros'
  | 'juros_capital_proprio'
  | 'dividendos';

export interface PartnerIncomeConfig {
  type: PartnerIncomeType;
  label: string;
  description: string;
  hasINSS: boolean;
  hasIRPF: boolean;
  irrfRate?: number; // For JCP
  icon: string;
}

export const PARTNER_INCOME_TYPES: PartnerIncomeConfig[] = [
  {
    type: 'pro_labore',
    label: 'Pró-labore',
    description: 'Remuneração pela atuação na administração da empresa',
    hasINSS: true,
    hasIRPF: true,
    icon: 'Briefcase',
  },
  {
    type: 'distribuicao_lucros',
    label: 'Distribuição de Lucros',
    description: 'Parte do lucro distribuída aos sócios (isenta de IR)',
    hasINSS: false,
    hasIRPF: false,
    icon: 'TrendingUp',
  },
  {
    type: 'juros_capital_proprio',
    label: 'Juros sobre Capital Próprio (JCP)',
    description: 'Remuneração do capital investido (IRRF 15%)',
    hasINSS: false,
    hasIRPF: true,
    irrfRate: 15,
    icon: 'Percent',
  },
  {
    type: 'dividendos',
    label: 'Dividendos',
    description: 'Distribuição formal de dividendos (isenta de IR)',
    hasINSS: false,
    hasIRPF: false,
    icon: 'Coins',
  },
];

// ==================== SÓCIO BENEFITS (shared structure) ====================

export interface SocioBenefit {
  id: string;
  name: string;
  enabled: boolean;
  monthlyValue: number;
  description: string;
  icon: string;
  isCustom?: boolean;
  // Some benefits can be company-paid (tax advantage)
  paidByCompany?: boolean;
}

export interface SocioBenefitsState {
  planoSaude: SocioBenefit;
  seguroVida: SocioBenefit;
  previdenciaPrivada: SocioBenefit;
  auxilioEducacao: SocioBenefit;
  gympass: SocioBenefit;
  veiculoEmpresa: SocioBenefit;
  aluguelEscritorio: SocioBenefit;
  customBenefits: SocioBenefit[];
}

export const DEFAULT_SOCIO_BENEFITS: SocioBenefitsState = {
  planoSaude: {
    id: 'plano_saude',
    name: 'Plano de Saúde',
    enabled: false,
    monthlyValue: 800,
    description: 'Plano de saúde empresarial (pode ser pago pela empresa)',
    icon: 'Heart',
    paidByCompany: true,
  },
  seguroVida: {
    id: 'seguro_vida',
    name: 'Seguro de Vida',
    enabled: false,
    monthlyValue: 80,
    description: 'Seguro de vida empresarial',
    icon: 'Shield',
    paidByCompany: true,
  },
  previdenciaPrivada: {
    id: 'previdencia_privada',
    name: 'Previdência Privada (PGBL)',
    enabled: false,
    monthlyValue: 0,
    description: 'Contribuição para previdência privada (dedutível até 12% da renda)',
    icon: 'PiggyBank',
    paidByCompany: false,
  },
  auxilioEducacao: {
    id: 'auxilio_educacao',
    name: 'Investimento em Educação',
    enabled: false,
    monthlyValue: 500,
    description: 'MBA, cursos, certificações profissionais',
    icon: 'GraduationCap',
    paidByCompany: true,
  },
  gympass: {
    id: 'gympass',
    name: 'Gympass / TotalPass',
    enabled: false,
    monthlyValue: 150,
    description: 'Benefício de bem-estar e academia',
    icon: 'Dumbbell',
    paidByCompany: true,
  },
  veiculoEmpresa: {
    id: 'veiculo_empresa',
    name: 'Veículo da Empresa',
    enabled: false,
    monthlyValue: 2000,
    description: 'Carro corporativo (leasing, combustível, manutenção)',
    icon: 'Car',
    paidByCompany: true,
  },
  aluguelEscritorio: {
    id: 'aluguel_escritorio',
    name: 'Escritório / Coworking',
    enabled: false,
    monthlyValue: 1500,
    description: 'Aluguel de espaço de trabalho pago pela empresa',
    icon: 'Building',
    paidByCompany: true,
  },
  customBenefits: [],
};

export const createCustomSocioBenefit = (name: string, value: number = 200): SocioBenefit => ({
  id: `custom_${Date.now()}`,
  name,
  enabled: true,
  monthlyValue: value,
  description: 'Benefício personalizado',
  icon: 'Gift',
  isCustom: true,
  paidByCompany: true,
});

export const calculateSocioBenefitsCost = (benefits: SocioBenefitsState): {
  totalPersonal: number;
  totalCompanyPaid: number;
  total: number;
} => {
  const allBenefits = [
    benefits.planoSaude,
    benefits.seguroVida,
    benefits.previdenciaPrivada,
    benefits.auxilioEducacao,
    benefits.gympass,
    benefits.veiculoEmpresa,
    benefits.aluguelEscritorio,
    ...benefits.customBenefits,
  ].filter(b => b.enabled);
  
  const totalPersonal = allBenefits
    .filter(b => !b.paidByCompany)
    .reduce((sum, b) => sum + b.monthlyValue, 0);
  
  const totalCompanyPaid = allBenefits
    .filter(b => b.paidByCompany)
    .reduce((sum, b) => sum + b.monthlyValue, 0);
  
  return {
    totalPersonal,
    totalCompanyPaid,
    total: totalPersonal + totalCompanyPaid,
  };
};

// ==================== SÓCIO INPUT DATA ====================

export interface SocioInputData {
  // Company regime context
  companyRegime: SocioCompanyRegime;
  
  // Primary income
  proLabore: number;
  distribuicaoLucros: number;
  
  // Optional income
  jurosCapitalProprio: number;
  dividendos: number;
  
  // Variable income (bonuses from company)
  bonusAnual: number;
  
  // Tax settings
  dependents: number;
  
  // Benefits
  benefits: SocioBenefitsState;
  
  // Work hours
  weeklyHours: number;
  
  // Calculated result (stored for optimization)
  calculation: SocioFullCalculation | null;
}

export interface SocioFullCalculation {
  // Income breakdown
  proLabore: {
    bruto: number;
    inss: number;
    irpf: number;
    liquido: number;
  };
  distribuicaoLucros: {
    bruto: number;
    liquido: number; // Same as bruto (tax-free)
  };
  jurosCapitalProprio: {
    bruto: number;
    irrf: number;
    liquido: number;
  };
  dividendos: {
    bruto: number;
    liquido: number; // Same as bruto (tax-free)
  };
  bonus: {
    bruto: number;
    irpf: number;
    liquido: number;
  };
  
  // Totals
  totalBrutoMensal: number;
  totalImpostosMensal: number;
  totalLiquidoMensal: number;
  
  // Effective rates
  aliquotaEfetivaGeral: number;
  
  // Benefits
  benefitsPersonal: number;
  benefitsCompanyPaid: number;
  
  // For display
  breakdown: {
    label: string;
    value: number;
    type: 'income' | 'tax' | 'benefit' | 'net';
    percentage?: number;
  }[];
  
  regime: string;
}

// ==================== MAIN CALCULATION FUNCTION ====================

export const calculateSocioFull = (data: SocioInputData): SocioFullCalculation => {
  // --- Pró-labore calculations ---
  const inssProLabore = calculateINSSProLabore(data.proLabore);
  const irpfBase = data.proLabore - inssProLabore.value;
  const irpfProLabore = calculateIRPFProLabore(irpfBase, data.dependents);
  const proLaboreLiquido = data.proLabore - inssProLabore.value - irpfProLabore.value;
  
  // --- Distribuição de Lucros (tax-free for partner) ---
  const distribuicaoLiquido = data.distribuicaoLucros;
  
  // --- JCP (15% IRRF withheld at source) ---
  const jcpIRRF = data.jurosCapitalProprio * 0.15;
  const jcpLiquido = data.jurosCapitalProprio - jcpIRRF;
  
  // --- Dividendos (tax-free) ---
  const dividendosLiquido = data.dividendos;
  
  // --- Bonus (taxed as regular income - simplified using IRPF table) ---
  const bonusMensal = data.bonusAnual / 12;
  const bonusIrpf = bonusMensal > 0 ? calculateIRPFProLabore(bonusMensal, 0).value : 0;
  const bonusLiquido = bonusMensal - bonusIrpf;
  
  // --- Benefits ---
  const benefitsCost = calculateSocioBenefitsCost(data.benefits);
  
  // --- Totals ---
  const totalBrutoMensal = data.proLabore + data.distribuicaoLucros + data.jurosCapitalProprio + data.dividendos + bonusMensal;
  const totalImpostosMensal = inssProLabore.value + irpfProLabore.value + jcpIRRF + bonusIrpf;
  const totalLiquidoMensal = proLaboreLiquido + distribuicaoLiquido + jcpLiquido + dividendosLiquido + bonusLiquido;
  
  const aliquotaEfetivaGeral = totalBrutoMensal > 0 
    ? (totalImpostosMensal / totalBrutoMensal) * 100 
    : 0;
  
  // Build breakdown for display
  const breakdown: SocioFullCalculation['breakdown'] = [];
  
  if (data.proLabore > 0) {
    breakdown.push({ label: 'Pró-labore', value: data.proLabore, type: 'income' });
    breakdown.push({ label: 'INSS (11%)', value: inssProLabore.value, type: 'tax', percentage: inssProLabore.rate });
    breakdown.push({ label: `IRPF (${irpfProLabore.bracket})`, value: irpfProLabore.value, type: 'tax', percentage: irpfProLabore.effectiveRate });
  }
  
  if (data.distribuicaoLucros > 0) {
    breakdown.push({ label: 'Distribuição de Lucros (isenta)', value: data.distribuicaoLucros, type: 'income' });
  }
  
  if (data.jurosCapitalProprio > 0) {
    breakdown.push({ label: 'JCP', value: data.jurosCapitalProprio, type: 'income' });
    breakdown.push({ label: 'IRRF JCP (15%)', value: jcpIRRF, type: 'tax', percentage: 15 });
  }
  
  if (data.dividendos > 0) {
    breakdown.push({ label: 'Dividendos (isentos)', value: data.dividendos, type: 'income' });
  }
  
  if (bonusMensal > 0) {
    breakdown.push({ label: 'Bônus (mensal)', value: bonusMensal, type: 'income' });
    breakdown.push({ label: 'IRPF Bônus', value: bonusIrpf, type: 'tax' });
  }
  
  if (benefitsCost.totalCompanyPaid > 0) {
    breakdown.push({ label: 'Benefícios (empresa)', value: benefitsCost.totalCompanyPaid, type: 'benefit' });
  }
  
  breakdown.push({ 
    label: 'Total Líquido', 
    value: totalLiquidoMensal + benefitsCost.totalCompanyPaid, 
    type: 'net' 
  });
  
  return {
    proLabore: {
      bruto: data.proLabore,
      inss: inssProLabore.value,
      irpf: irpfProLabore.value,
      liquido: proLaboreLiquido,
    },
    distribuicaoLucros: {
      bruto: data.distribuicaoLucros,
      liquido: distribuicaoLiquido,
    },
    jurosCapitalProprio: {
      bruto: data.jurosCapitalProprio,
      irrf: jcpIRRF,
      liquido: jcpLiquido,
    },
    dividendos: {
      bruto: data.dividendos,
      liquido: dividendosLiquido,
    },
    bonus: {
      bruto: data.bonusAnual,
      irpf: bonusIrpf * 12,
      liquido: bonusLiquido * 12,
    },
    totalBrutoMensal,
    totalImpostosMensal,
    totalLiquidoMensal,
    aliquotaEfetivaGeral,
    benefitsPersonal: benefitsCost.totalPersonal,
    benefitsCompanyPaid: benefitsCost.totalCompanyPaid,
    breakdown,
    regime: COMPANY_TAX_CONFIGS[data.companyRegime].label,
  };
};

// ==================== DEFAULT DATA ====================

export const getDefaultSocioData = (): SocioInputData => ({
  companyRegime: 'simples',
  proLabore: 0,
  distribuicaoLucros: 0,
  jurosCapitalProprio: 0,
  dividendos: 0,
  bonusAnual: 0,
  dependents: 0,
  benefits: DEFAULT_SOCIO_BENEFITS,
  weeklyHours: 40,
  calculation: null,
});

// ==================== HELP INFORMATION ====================

export const SOCIO_HELP_INFO = {
  pro_labore: {
    title: 'Pró-labore',
    description: 'Remuneração obrigatória do sócio que trabalha na empresa.',
    tips: [
      'Mínimo recomendado: 1 salário mínimo (R$ 1.518)',
      'Incide INSS (11%, teto R$ 951) + IRPF progressivo',
      'Contribui para aposentadoria pelo INSS',
      'Quanto maior o pró-labore, maior a contribuição ao INSS',
    ],
  },
  distribuicao_lucros: {
    title: 'Distribuição de Lucros',
    description: 'Parte do lucro da empresa distribuída aos sócios.',
    tips: [
      'Isenta de IR e INSS para o sócio pessoa física',
      'Só pode ser distribuída se houver lucro contábil',
      'Não conta para aposentadoria pelo INSS',
      'Estratégia comum: pró-labore baixo + lucros altos',
    ],
  },
  jcp: {
    title: 'Juros sobre Capital Próprio (JCP)',
    description: 'Remuneração do capital investido pelo sócio na empresa.',
    tips: [
      'IRRF de 15% retido na fonte',
      'Dedutível como despesa para a empresa (Lucro Real)',
      'Limitado pela TJLP × Patrimônio Líquido',
      'Vantajoso em empresas de Lucro Real com alto PL',
    ],
  },
  company_regime: {
    title: 'Regime da Empresa',
    description: 'O regime tributário afeta como a empresa paga impostos, não diretamente o sócio.',
    tips: [
      'Simples Nacional: mais simples, até R$ 4,8M/ano',
      'Lucro Presumido: base presumida sobre faturamento',
      'Lucro Real: baseado no lucro contábil real',
      'A distribuição de lucros é isenta em todos os regimes',
    ],
  },
  benefits: {
    title: 'Benefícios via Empresa',
    description: 'Benefícios pagos pela empresa podem ter vantagens fiscais.',
    tips: [
      'Plano de saúde empresarial: não incide IR para o sócio',
      'Veículo da empresa: custos dedutíveis para a PJ',
      'Educação: pode ser deduzida como capacitação',
      'Avalie com seu contador a melhor estrutura',
    ],
  },
};
