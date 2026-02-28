// PJ Tax Types - Brazilian tax regimes for PJ (Pessoa Jurídica)
// Includes MEI, Simples Nacional (all annexes), Lucro Presumido

// ==================== TAX REGIME TYPES ====================

export type PJTaxRegime = 'mei' | 'simples' | 'lucro_presumido';

export type SimplesAnexo = 'anexo_i' | 'anexo_ii' | 'anexo_iii' | 'anexo_iv' | 'anexo_v';

export type AtividadeEconomica = 
  | 'comercio' 
  | 'industria' 
  | 'servicos_gerais'
  | 'tecnologia' 
  | 'saude'
  | 'advocacia'
  | 'contabilidade'
  | 'arquitetura_engenharia'
  | 'consultoria'
  | 'marketing_publicidade'
  | 'educacao'
  | 'transporte'
  | 'construcao'
  | 'outros_servicos';

// ==================== MEI CONFIGURATION ====================

export const MEI_CONFIG = {
  limiteFaturamento: 81000, // R$ 81.000/ano
  tolerancia20: 97200, // R$ 97.200 (tolerância 20%)
  dasFixo2026: {
    comercioIndustria: 76.90, // INSS + ICMS
    servicos: 80.90, // INSS + ISS
    comercioServicos: 81.90, // INSS + ICMS + ISS
  },
  inssContribuicao: 70.60, // 5% do salário mínimo (R$ 1.412 * 5% = 70.60)
};

// ==================== SIMPLES NACIONAL TABLES 2026 ====================

interface SimplesNacionalFaixa {
  faixa: number;
  rbt12Min: number;
  rbt12Max: number;
  aliquotaNominal: number;
  parcelaADeduzir: number;
}

// Anexo I - Comércio
export const SIMPLES_ANEXO_I: SimplesNacionalFaixa[] = [
  { faixa: 1, rbt12Min: 0, rbt12Max: 180000, aliquotaNominal: 4.0, parcelaADeduzir: 0 },
  { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000, aliquotaNominal: 7.3, parcelaADeduzir: 5940 },
  { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000, aliquotaNominal: 9.5, parcelaADeduzir: 13860 },
  { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000, aliquotaNominal: 10.7, parcelaADeduzir: 22500 },
  { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000, aliquotaNominal: 14.3, parcelaADeduzir: 87300 },
  { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000, aliquotaNominal: 19.0, parcelaADeduzir: 378000 },
];

// Anexo II - Indústria
export const SIMPLES_ANEXO_II: SimplesNacionalFaixa[] = [
  { faixa: 1, rbt12Min: 0, rbt12Max: 180000, aliquotaNominal: 4.5, parcelaADeduzir: 0 },
  { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000, aliquotaNominal: 7.8, parcelaADeduzir: 5940 },
  { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000, aliquotaNominal: 10.0, parcelaADeduzir: 13860 },
  { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000, aliquotaNominal: 11.2, parcelaADeduzir: 22500 },
  { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000, aliquotaNominal: 14.7, parcelaADeduzir: 85500 },
  { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000, aliquotaNominal: 30.0, parcelaADeduzir: 720000 },
];

// Anexo III - Serviços (instalação, reparos, manutenção, representação comercial, academias, etc.)
export const SIMPLES_ANEXO_III: SimplesNacionalFaixa[] = [
  { faixa: 1, rbt12Min: 0, rbt12Max: 180000, aliquotaNominal: 6.0, parcelaADeduzir: 0 },
  { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000, aliquotaNominal: 11.2, parcelaADeduzir: 9360 },
  { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000, aliquotaNominal: 13.5, parcelaADeduzir: 17640 },
  { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000, aliquotaNominal: 16.0, parcelaADeduzir: 35640 },
  { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000, aliquotaNominal: 21.0, parcelaADeduzir: 125640 },
  { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000, aliquotaNominal: 33.0, parcelaADeduzir: 648000 },
];

// Anexo IV - Serviços (limpeza, vigilância, construção, advocacia)
export const SIMPLES_ANEXO_IV: SimplesNacionalFaixa[] = [
  { faixa: 1, rbt12Min: 0, rbt12Max: 180000, aliquotaNominal: 4.5, parcelaADeduzir: 0 },
  { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000, aliquotaNominal: 9.0, parcelaADeduzir: 8100 },
  { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000, aliquotaNominal: 10.2, parcelaADeduzir: 12420 },
  { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000, aliquotaNominal: 14.0, parcelaADeduzir: 39780 },
  { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000, aliquotaNominal: 22.0, parcelaADeduzir: 183780 },
  { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000, aliquotaNominal: 33.0, parcelaADeduzir: 828000 },
];

// Anexo V - Serviços intelectuais (tecnologia, consultoria, engenharia, contabilidade, arquitetura)
export const SIMPLES_ANEXO_V: SimplesNacionalFaixa[] = [
  { faixa: 1, rbt12Min: 0, rbt12Max: 180000, aliquotaNominal: 15.5, parcelaADeduzir: 0 },
  { faixa: 2, rbt12Min: 180000.01, rbt12Max: 360000, aliquotaNominal: 18.0, parcelaADeduzir: 4500 },
  { faixa: 3, rbt12Min: 360000.01, rbt12Max: 720000, aliquotaNominal: 19.5, parcelaADeduzir: 9900 },
  { faixa: 4, rbt12Min: 720000.01, rbt12Max: 1800000, aliquotaNominal: 20.5, parcelaADeduzir: 17100 },
  { faixa: 5, rbt12Min: 1800000.01, rbt12Max: 3600000, aliquotaNominal: 23.0, parcelaADeduzir: 62100 },
  { faixa: 6, rbt12Min: 3600000.01, rbt12Max: 4800000, aliquotaNominal: 30.5, parcelaADeduzir: 540000 },
];

// ==================== LUCRO PRESUMIDO RATES ====================

export interface LucroPresumidoConfig {
  basePresumidaIR: number; // % sobre faturamento
  basePresumidaCSLL: number; // % sobre faturamento
  irpj: number; // 15%
  adicionalIR: number; // 10% sobre excedente R$ 20.000/mês
  csll: number; // 9%
  pis: number; // 0.65%
  cofins: number; // 3%
  iss: number; // 2-5%
}

export const LUCRO_PRESUMIDO_SERVICOS: LucroPresumidoConfig = {
  basePresumidaIR: 32, // 32% para serviços
  basePresumidaCSLL: 32,
  irpj: 15,
  adicionalIR: 10,
  csll: 9,
  pis: 0.65,
  cofins: 3,
  iss: 3, // média
};

export const LUCRO_PRESUMIDO_COMERCIO: LucroPresumidoConfig = {
  basePresumidaIR: 8, // 8% para comércio
  basePresumidaCSLL: 12,
  irpj: 15,
  adicionalIR: 10,
  csll: 9,
  pis: 0.65,
  cofins: 3,
  iss: 0,
};

// ==================== ACTIVITY TO ANNEX MAPPING ====================

export interface AtividadeInfo {
  id: AtividadeEconomica;
  label: string;
  anexoPadrao: SimplesAnexo;
  anexoFatorR?: SimplesAnexo; // Anexo com Fator R >= 28%
  lucroPresumidoConfig: LucroPresumidoConfig;
  isMEIPermitido: boolean;
  descricao: string;
}

export const ATIVIDADES: AtividadeInfo[] = [
  {
    id: 'comercio',
    label: 'Comércio',
    anexoPadrao: 'anexo_i',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_COMERCIO,
    isMEIPermitido: true,
    descricao: 'Venda de produtos, e-commerce, lojas',
  },
  {
    id: 'industria',
    label: 'Indústria',
    anexoPadrao: 'anexo_ii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_COMERCIO,
    isMEIPermitido: true,
    descricao: 'Fabricação, produção, manufatura',
  },
  {
    id: 'servicos_gerais',
    label: 'Serviços Gerais',
    anexoPadrao: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Instalação, reparos, manutenção, academias',
  },
  {
    id: 'tecnologia',
    label: 'Tecnologia / TI',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Desenvolvimento de software, consultoria TI, SaaS',
  },
  {
    id: 'saude',
    label: 'Saúde',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Médicos, dentistas, psicólogos, fisioterapeutas',
  },
  {
    id: 'advocacia',
    label: 'Advocacia',
    anexoPadrao: 'anexo_iv',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Escritórios de advocacia, advogados autônomos',
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Escritórios contábeis, auditoria',
  },
  {
    id: 'arquitetura_engenharia',
    label: 'Arquitetura / Engenharia',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Projetos, consultoria técnica, laudos',
  },
  {
    id: 'consultoria',
    label: 'Consultoria',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: false,
    descricao: 'Consultoria empresarial, gestão, RH',
  },
  {
    id: 'marketing_publicidade',
    label: 'Marketing / Publicidade',
    anexoPadrao: 'anexo_v',
    anexoFatorR: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Agências, design, social media, produção de conteúdo',
  },
  {
    id: 'educacao',
    label: 'Educação',
    anexoPadrao: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Cursos, treinamentos, professores',
  },
  {
    id: 'transporte',
    label: 'Transporte',
    anexoPadrao: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Uber, entregas, frete, logística',
  },
  {
    id: 'construcao',
    label: 'Construção Civil',
    anexoPadrao: 'anexo_iv',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Obras, reformas, empreiteiras',
  },
  {
    id: 'outros_servicos',
    label: 'Outros Serviços',
    anexoPadrao: 'anexo_iii',
    lucroPresumidoConfig: LUCRO_PRESUMIDO_SERVICOS,
    isMEIPermitido: true,
    descricao: 'Demais atividades de prestação de serviços',
  },
];

// ==================== CALCULATION FUNCTIONS ====================

export const getAnexoTable = (anexo: SimplesAnexo): SimplesNacionalFaixa[] => {
  switch (anexo) {
    case 'anexo_i': return SIMPLES_ANEXO_I;
    case 'anexo_ii': return SIMPLES_ANEXO_II;
    case 'anexo_iii': return SIMPLES_ANEXO_III;
    case 'anexo_iv': return SIMPLES_ANEXO_IV;
    case 'anexo_v': return SIMPLES_ANEXO_V;
    default: return SIMPLES_ANEXO_III;
  }
};

export const getAnexoLabel = (anexo: SimplesAnexo): string => {
  switch (anexo) {
    case 'anexo_i': return 'Anexo I (Comércio)';
    case 'anexo_ii': return 'Anexo II (Indústria)';
    case 'anexo_iii': return 'Anexo III (Serviços)';
    case 'anexo_iv': return 'Anexo IV (Advocacia/Construção)';
    case 'anexo_v': return 'Anexo V (Serviços Intelectuais)';
    default: return 'Anexo III';
  }
};

/**
 * Calculate effective Simples Nacional rate
 * @param rbt12 - Receita Bruta dos últimos 12 meses
 * @param anexo - Anexo aplicável
 * @returns Alíquota efetiva (%)
 */
export const calculateSimplesTotalRate = (rbt12: number, anexo: SimplesAnexo): {
  aliquotaEfetiva: number;
  aliquotaNominal: number;
  faixa: number;
  parcelaADeduzir: number;
} => {
  const table = getAnexoTable(anexo);
  
  // Find applicable bracket
  let faixa = table[0];
  for (const f of table) {
    if (rbt12 >= f.rbt12Min && rbt12 <= f.rbt12Max) {
      faixa = f;
      break;
    }
  }
  
  // Calculate effective rate: (RBT12 × AlíquotaNominal - ParcelaADeduzir) / RBT12
  const aliquotaEfetiva = rbt12 > 0 
    ? ((rbt12 * (faixa.aliquotaNominal / 100)) - faixa.parcelaADeduzir) / rbt12 * 100
    : faixa.aliquotaNominal;
  
  return {
    aliquotaEfetiva: Math.max(0, aliquotaEfetiva),
    aliquotaNominal: faixa.aliquotaNominal,
    faixa: faixa.faixa,
    parcelaADeduzir: faixa.parcelaADeduzir,
  };
};

/**
 * Determine if Fator R applies (payroll >= 28% of revenue)
 * This can move company from Anexo V to Anexo III
 */
export const calculateFatorR = (
  folhaSalarios12: number, 
  rbt12: number
): { fatorR: number; aplicavel: boolean } => {
  if (rbt12 <= 0) return { fatorR: 0, aplicavel: false };
  const fatorR = (folhaSalarios12 / rbt12) * 100;
  return {
    fatorR,
    aplicavel: fatorR >= 28,
  };
};

/**
 * Calculate Lucro Presumido taxes
 */
export const calculateLucroPresumido = (
  faturamentoMensal: number,
  config: LucroPresumidoConfig
): {
  irpj: number;
  csll: number;
  pis: number;
  cofins: number;
  iss: number;
  total: number;
  aliquotaEfetiva: number;
} => {
  // Calculate presumed profit bases
  const baseIR = faturamentoMensal * (config.basePresumidaIR / 100);
  const baseCSLL = faturamentoMensal * (config.basePresumidaCSLL / 100);
  
  // Calculate taxes
  const irpjBase = baseIR * (config.irpj / 100);
  // Additional IR: 10% on excess of R$ 20,000/month on presumed base
  const adicionalIR = baseIR > 20000 ? (baseIR - 20000) * (config.adicionalIR / 100) : 0;
  const irpj = irpjBase + adicionalIR;
  
  const csll = baseCSLL * (config.csll / 100);
  const pis = faturamentoMensal * (config.pis / 100);
  const cofins = faturamentoMensal * (config.cofins / 100);
  const iss = faturamentoMensal * (config.iss / 100);
  
  const total = irpj + csll + pis + cofins + iss;
  const aliquotaEfetiva = faturamentoMensal > 0 ? (total / faturamentoMensal) * 100 : 0;
  
  return { irpj, csll, pis, cofins, iss, total, aliquotaEfetiva };
};

// ==================== PJ BENEFITS (shared from CLT) ====================

export interface PJBenefit {
  id: string;
  name: string;
  enabled: boolean;
  monthlyValue: number;
  description: string;
  icon: string;
  isCustom?: boolean;
}

export interface PJBenefitsState {
  planoSaude: PJBenefit;
  seguroVida: PJBenefit;
  previdenciaPrivada: PJBenefit;
  auxilioEducacao: PJBenefit;
  gympass: PJBenefit;
  customBenefits: PJBenefit[];
}

export const DEFAULT_PJ_BENEFITS: PJBenefitsState = {
  planoSaude: {
    id: 'plano_saude',
    name: 'Plano de Saúde',
    enabled: false,
    monthlyValue: 600,
    description: 'Plano de saúde empresarial (média mercado PJ)',
    icon: 'Heart',
  },
  seguroVida: {
    id: 'seguro_vida',
    name: 'Seguro de Vida',
    enabled: false,
    monthlyValue: 50,
    description: 'Seguro de vida empresarial',
    icon: 'Shield',
  },
  previdenciaPrivada: {
    id: 'previdencia_privada',
    name: 'Previdência Privada (PGBL)',
    enabled: false,
    monthlyValue: 0,
    description: 'Contribuição para previdência privada (dedutível até 12% da renda)',
    icon: 'PiggyBank',
  },
  auxilioEducacao: {
    id: 'auxilio_educacao',
    name: 'Investimento em Educação',
    enabled: false,
    monthlyValue: 300,
    description: 'Cursos, certificações, capacitação profissional',
    icon: 'GraduationCap',
  },
  gympass: {
    id: 'gympass',
    name: 'Gympass / TotalPass',
    enabled: false,
    monthlyValue: 100,
    description: 'Benefício de bem-estar e academia',
    icon: 'Dumbbell',
  },
  customBenefits: [],
};

export const createCustomPJBenefit = (name: string, value: number = 100): PJBenefit => ({
  id: `custom_${Date.now()}`,
  name,
  enabled: true,
  monthlyValue: value,
  description: 'Benefício personalizado',
  icon: 'Gift',
  isCustom: true,
});

export const calculatePJBenefitsCost = (benefits: PJBenefitsState): number => {
  const standardBenefits = [
    benefits.planoSaude,
    benefits.seguroVida,
    benefits.previdenciaPrivada,
    benefits.auxilioEducacao,
    benefits.gympass,
  ];
  
  const standardTotal = standardBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.monthlyValue, 0);
  
  const customTotal = benefits.customBenefits
    .filter(b => b.enabled)
    .reduce((sum, b) => sum + b.monthlyValue, 0);
  
  return standardTotal + customTotal;
};

// ==================== PJ INPUT DATA ====================

export interface PJInputData {
  // Tax Regime
  taxRegime: PJTaxRegime;
  atividade: AtividadeEconomica;
  
  // Revenue
  faturamentoMensal: number;
  rbt12: number; // Receita Bruta últimos 12 meses (auto-calculated or manual)
  useAutoRBT12: boolean; // Calculate RBT12 from monthly * 12
  
  // Simples Nacional specifics
  anexo: SimplesAnexo;
  folhaSalarios12: number; // For Fator R calculation
  useFatorR: boolean;
  
  // Fixed costs
  custosFixos: number; // Contador, software, etc.
  proLabore: number; // Retirada mensal obrigatória (INSS base)
  
  // Benefits
  benefits: PJBenefitsState;
  
  // Journey
  weeklyHours: number;
  
  // Calculated (stored for display)
  calculation?: PJFullCalculation;
}

export interface PJFullCalculation {
  faturamentoMensal: number;
  rbt12: number;
  
  // Tax calculation
  impostosMensais: number;
  aliquotaEfetiva: number;
  regime: string;
  
  // Pro-labore taxes
  inssProLabore: number;
  irProLabore: number;
  
  // Deductions
  custosFixos: number;
  beneficiosCusto: number;
  
  // Net
  lucroLiquido: number;
  
  // Breakdown for display
  breakdown: {
    label: string;
    value: number;
    percentage?: number;
    type: 'income' | 'tax' | 'cost' | 'net';
  }[];
}

export const getDefaultPJData = (): PJInputData => ({
  taxRegime: 'simples',
  atividade: 'tecnologia',
  faturamentoMensal: 0,
  rbt12: 0,
  useAutoRBT12: true,
  anexo: 'anexo_v',
  folhaSalarios12: 0,
  useFatorR: false,
  custosFixos: 300,
  proLabore: 1412, // 1 salário mínimo 2026
  benefits: DEFAULT_PJ_BENEFITS,
  weeklyHours: 40,
});

// ==================== PJ FULL CALCULATION ====================

export const calculatePJFull = (data: PJInputData): PJFullCalculation => {
  const { taxRegime, atividade, faturamentoMensal, custosFixos, proLabore, benefits } = data;
  
  // Get RBT12
  const rbt12 = data.useAutoRBT12 ? faturamentoMensal * 12 : data.rbt12;
  
  // Get activity info
  const atividadeInfo = ATIVIDADES.find(a => a.id === atividade);
  
  let impostosMensais = 0;
  let aliquotaEfetiva = 0;
  let regime = '';
  const breakdown: PJFullCalculation['breakdown'] = [];
  
  // Add revenue
  breakdown.push({
    label: 'Faturamento Bruto',
    value: faturamentoMensal,
    type: 'income',
  });
  
  if (taxRegime === 'mei') {
    // MEI: fixed DAS
    const dasType = atividadeInfo?.anexoPadrao === 'anexo_i' ? 'comercioIndustria' : 'servicos';
    impostosMensais = MEI_CONFIG.dasFixo2026[dasType];
    aliquotaEfetiva = faturamentoMensal > 0 ? (impostosMensais / faturamentoMensal) * 100 : 0;
    regime = 'MEI';
    
    breakdown.push({
      label: 'DAS MEI',
      value: impostosMensais,
      percentage: aliquotaEfetiva,
      type: 'tax',
    });
  } else if (taxRegime === 'simples') {
    // Determine which annex to use
    let anexoEfetivo = data.anexo;
    
    // Check Fator R
    if (data.useFatorR && atividadeInfo?.anexoFatorR) {
      const { aplicavel } = calculateFatorR(data.folhaSalarios12, rbt12);
      if (aplicavel) {
        anexoEfetivo = atividadeInfo.anexoFatorR;
      }
    }
    
    const calc = calculateSimplesTotalRate(rbt12, anexoEfetivo);
    impostosMensais = faturamentoMensal * (calc.aliquotaEfetiva / 100);
    aliquotaEfetiva = calc.aliquotaEfetiva;
    regime = `Simples Nacional - ${getAnexoLabel(anexoEfetivo)} (Faixa ${calc.faixa})`;
    
    breakdown.push({
      label: `Simples Nacional (${calc.aliquotaEfetiva.toFixed(2)}%)`,
      value: impostosMensais,
      percentage: calc.aliquotaEfetiva,
      type: 'tax',
    });
  } else if (taxRegime === 'lucro_presumido') {
    const config = atividadeInfo?.lucroPresumidoConfig || LUCRO_PRESUMIDO_SERVICOS;
    const calc = calculateLucroPresumido(faturamentoMensal, config);
    impostosMensais = calc.total;
    aliquotaEfetiva = calc.aliquotaEfetiva;
    regime = 'Lucro Presumido';
    
    breakdown.push(
      { label: `IRPJ (${config.irpj}%)`, value: calc.irpj, type: 'tax' },
      { label: `CSLL (${config.csll}%)`, value: calc.csll, type: 'tax' },
      { label: `PIS (${config.pis}%)`, value: calc.pis, type: 'tax' },
      { label: `COFINS (${config.cofins}%)`, value: calc.cofins, type: 'tax' },
    );
    if (calc.iss > 0) {
      breakdown.push({ label: `ISS (${config.iss}%)`, value: calc.iss, type: 'tax' });
    }
  }
  
  // Pro-labore taxes (INSS 11% up to ceiling)
  const inssProLabore = Math.min(proLabore * 0.11, 951.63);
  
  // IR on pro-labore (simplified)
  const irBaseProLabore = proLabore - inssProLabore;
  let irProLabore = 0;
  if (irBaseProLabore > 4664.68) {
    irProLabore = irBaseProLabore * 0.275 - 896.00;
  } else if (irBaseProLabore > 3751.05) {
    irProLabore = irBaseProLabore * 0.225 - 662.77;
  } else if (irBaseProLabore > 2826.65) {
    irProLabore = irBaseProLabore * 0.15 - 381.44;
  } else if (irBaseProLabore > 2259.20) {
    irProLabore = irBaseProLabore * 0.075 - 169.44;
  }
  irProLabore = Math.max(0, irProLabore);
  
  if (proLabore > 0) {
    breakdown.push(
      { label: 'INSS Pró-labore (11%)', value: inssProLabore, type: 'tax' },
    );
    if (irProLabore > 0) {
      breakdown.push({ label: 'IR Pró-labore', value: irProLabore, type: 'tax' });
    }
  }
  
  // Costs
  const beneficiosCusto = calculatePJBenefitsCost(benefits);
  
  breakdown.push({ label: 'Custos Fixos', value: custosFixos, type: 'cost' });
  if (beneficiosCusto > 0) {
    breakdown.push({ label: 'Benefícios', value: beneficiosCusto, type: 'cost' });
  }
  
  // Net calculation
  const lucroLiquido = faturamentoMensal - impostosMensais - custosFixos - beneficiosCusto - inssProLabore - irProLabore;
  
  breakdown.push({
    label: 'Líquido Disponível',
    value: lucroLiquido,
    type: 'net',
  });
  
  return {
    faturamentoMensal,
    rbt12,
    impostosMensais,
    aliquotaEfetiva,
    regime,
    inssProLabore,
    irProLabore,
    custosFixos,
    beneficiosCusto,
    lucroLiquido,
    breakdown,
  };
};

// ==================== HELP INFO FOR PJ ====================

export interface PJHelpInfo {
  title: string;
  description: string;
  tips: string[];
}

export const PJ_HELP_INFO: Record<string, PJHelpInfo> = {
  mei: {
    title: 'MEI - Microempreendedor Individual',
    description: 'Regime simplificado para faturamento até R$ 81.000/ano com imposto fixo mensal.',
    tips: [
      'DAS fixo próximo a R$ 80/mês independente do faturamento',
      'Limite de R$ 81.000/ano (R$ 6.750/mês)',
      'Não pode ter sócio ou funcionário (máx 1 empregado)',
      'Algumas atividades não são permitidas',
    ],
  },
  simples: {
    title: 'Simples Nacional',
    description: 'Regime simplificado com alíquotas progressivas baseadas no faturamento dos últimos 12 meses.',
    tips: [
      'Limite de R$ 4,8 milhões/ano',
      'Alíquota baseada no Anexo da atividade e faixa de faturamento',
      'Fator R ≥28% pode reduzir alíquota (Anexo V → III)',
      'Ideal para faturamentos entre R$ 81.000 e R$ 1,2 milhão/ano',
    ],
  },
  lucro_presumido: {
    title: 'Lucro Presumido',
    description: 'Regime onde o lucro é presumido com base em percentuais fixos do faturamento.',
    tips: [
      'Base de cálculo: 32% para serviços, 8% para comércio',
      'IRPJ 15% + adicional 10% acima de R$ 20.000/mês',
      'PIS 0,65% + COFINS 3% sobre faturamento',
      'Pode ser vantajoso para margens de lucro altas',
    ],
  },
  fator_r: {
    title: 'Fator R',
    description: 'Relação entre folha de salários e faturamento que pode reduzir a alíquota.',
    tips: [
      'Fator R = Folha 12 meses ÷ Faturamento 12 meses',
      'Se ≥ 28%, pode sair do Anexo V para o III',
      'Redução significativa de alíquota para serviços intelectuais',
      'Inclui pró-labore + encargos + salários de funcionários',
    ],
  },
  pro_labore: {
    title: 'Pró-labore',
    description: 'Retirada mensal obrigatória do sócio, sujeita a INSS e IR.',
    tips: [
      'Valor mínimo: 1 salário mínimo (R$ 1.412 em 2026)',
      'INSS: 11% limitado ao teto (R$ 951,63)',
      'IR: tabela progressiva igual a CLT',
      'Base para aposentadoria e benefícios INSS',
    ],
  },
};
