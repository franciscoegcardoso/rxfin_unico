// CLT Stock/Equity Bonus Types

export interface VestingScheduleEntry {
  year: number;
  percentage: number;
}

export interface StockEquityGrant {
  id: string;
  type: 'rsu' | 'stock_option' | 'phantom';
  ticker: string;
  companyName: string;
  isPublicCompany: boolean;
  grantQuantity: number;
  currentStockPrice: number;
  vestingYears: number; // 1, 2, 3, 4 anos
  vestingSchedule: VestingScheduleEntry[]; // Custom vesting schedule
  grantDate: string;
  vestedQuantity: number;
}

export interface StockEquityCalculation {
  totalGrantValue: number;
  annualVestedValue: number;
  monthlyVestedValue: number;
  vestedPercent: number;
}

export const VESTING_OPTIONS = [
  { value: 1, label: '1 ano' },
  { value: 2, label: '2 anos' },
  { value: 3, label: '3 anos' },
  { value: 4, label: '4 anos' },
  { value: 5, label: '5 anos' },
] as const;

export const STOCK_TYPE_OPTIONS = [
  { value: 'rsu', label: 'RSU (Restricted Stock Units)', description: 'Ações restritas que você recebe após vesting' },
  { value: 'stock_option', label: 'Stock Options', description: 'Opção de comprar ações a um preço fixo' },
  { value: 'phantom', label: 'Phantom Stock', description: 'Bônus baseado no valor das ações (sem ações reais)' },
] as const;

// Generate default vesting schedule based on years (linear vesting)
export const generateDefaultVestingSchedule = (years: number): VestingScheduleEntry[] => {
  const schedule: VestingScheduleEntry[] = [];
  for (let i = 1; i <= years; i++) {
    schedule.push({
      year: i,
      percentage: Math.round((100 / years) * i),
    });
  }
  // Ensure last year is always 100%
  if (schedule.length > 0) {
    schedule[schedule.length - 1].percentage = 100;
  }
  return schedule;
};

export const createDefaultStockGrant = (): StockEquityGrant => ({
  id: `stock_${Date.now()}`,
  type: 'rsu',
  ticker: '',
  companyName: '',
  isPublicCompany: true,
  grantQuantity: 0,
  currentStockPrice: 0,
  vestingYears: 4,
  vestingSchedule: generateDefaultVestingSchedule(4),
  grantDate: new Date().toISOString().split('T')[0],
  vestedQuantity: 0,
});

// Validate vesting schedule (must be increasing, end at 100%)
export const validateVestingSchedule = (schedule: VestingScheduleEntry[]): boolean => {
  if (schedule.length === 0) return false;
  
  // Check that values are increasing
  for (let i = 1; i < schedule.length; i++) {
    if (schedule[i].percentage < schedule[i - 1].percentage) {
      return false;
    }
  }
  
  // Check that last value is 100%
  if (schedule[schedule.length - 1].percentage !== 100) {
    return false;
  }
  
  // Check all values are between 0 and 100
  for (const entry of schedule) {
    if (entry.percentage < 0 || entry.percentage > 100) {
      return false;
    }
  }
  
  return true;
};

export const calculateStockEquity = (grant: StockEquityGrant): StockEquityCalculation => {
  const totalGrantValue = grant.grantQuantity * grant.currentStockPrice;
  const annualVestedValue = grant.vestingYears > 0 ? totalGrantValue / grant.vestingYears : totalGrantValue;
  const monthlyVestedValue = annualVestedValue / 12;
  const vestedPercent = grant.grantQuantity > 0 
    ? (grant.vestedQuantity / grant.grantQuantity) * 100 
    : 0;
  
  return {
    totalGrantValue,
    annualVestedValue,
    monthlyVestedValue,
    vestedPercent,
  };
};

// Tax calculation for stock equity (simplified - equity is taxed as income when vested)
export const calculateStockEquityTax = (annualValue: number): { gross: number; net: number; tax: number; effectiveRate: number } => {
  // RSUs and stock options are taxed as regular income when vested
  // Simplified calculation - using IRRF progressive table
  const irBrackets = [
    { min: 0, max: 27112.80, rate: 0, deduction: 0 },
    { min: 27112.80, max: 33919.92, rate: 0.075, deduction: 2033.46 },
    { min: 33919.92, max: 45012.60, rate: 0.15, deduction: 4574.58 },
    { min: 45012.60, max: 55976.16, rate: 0.225, deduction: 7949.10 },
    { min: 55976.16, max: Infinity, rate: 0.275, deduction: 10747.76 },
  ];
  
  let tax = 0;
  for (const bracket of irBrackets) {
    if (annualValue > bracket.min && annualValue <= bracket.max) {
      tax = annualValue * bracket.rate - bracket.deduction;
      break;
    }
    if (annualValue > bracket.max && bracket.max === Infinity) {
      tax = annualValue * bracket.rate - bracket.deduction;
    }
  }
  
  tax = Math.max(0, tax);
  
  return {
    gross: annualValue,
    net: annualValue - tax,
    tax,
    effectiveRate: annualValue > 0 ? (tax / annualValue) * 100 : 0,
  };
};

// Benefit help information
export interface BenefitHelpInfo {
  title: string;
  description: string;
  howToEstimate: string;
  marketRange: { min: number; max: number };
  tips: string[];
}

export const BENEFIT_HELP_INFO: Record<string, BenefitHelpInfo> = {
  vale_transporte: {
    title: 'Vale Transporte (VT)',
    description: 'Benefício obrigatório para custear o deslocamento casa-trabalho. O trabalhador pode ter até 6% descontado do salário.',
    howToEstimate: 'Calcule o custo das passagens diárias × dias úteis do mês. Ex: R$ 4,40 × 2 × 22 = R$ 193,60',
    marketRange: { min: 150, max: 400 },
    tips: [
      'Em SP/RJ metropolitano, o custo gira em torno de R$ 200-350/mês',
      'Se usa carro, a empresa pode oferecer auxílio combustível como alternativa',
      'Alguns optam por não receber VT para não ter o desconto de 6%',
    ],
  },
  plano_saude: {
    title: 'Plano de Saúde',
    description: 'Assistência médica empresarial. Pode ser 100% custeado pela empresa ou coparticipativo.',
    howToEstimate: 'Verifique no seu holerite o valor do plano ou pergunte ao RH. Planos individuais custam R$ 300-800, empresariais R$ 250-600.',
    marketRange: { min: 250, max: 800 },
    tips: [
      'Planos coparticipativos têm mensalidade menor, mas você paga parte das consultas',
      'Incluir dependentes aumenta significativamente o custo',
      'Planos com rede ampla (Bradesco, SulAmérica) custam mais que regionais',
    ],
  },
  seguro_vida: {
    title: 'Seguro de Vida',
    description: 'Proteção financeira para beneficiários em caso de morte ou invalidez do colaborador.',
    howToEstimate: 'Geralmente é um valor baixo (R$ 20-50/mês) subsidiado 100% pela empresa. Confira com RH.',
    marketRange: { min: 20, max: 80 },
    tips: [
      'Coberturas comuns: morte natural, morte acidental, invalidez',
      'Algumas empresas oferecem opção de aumentar a cobertura com custo adicional',
      'O valor da cobertura geralmente é múltiplo do salário (ex: 12x ou 24x)',
    ],
  },
  auxilio_creche: {
    title: 'Auxílio Creche',
    description: 'Reembolso ou pagamento direto para creches de filhos até 6 anos. Obrigatório em empresas com +30 mulheres.',
    howToEstimate: 'Verifique o teto de reembolso com o RH. Varia de R$ 300 a R$ 800 dependendo da região.',
    marketRange: { min: 300, max: 800 },
    tips: [
      'Geralmente limitado a crianças até 6 anos',
      'Pode ser oferecido como reembolso mediante comprovante',
      'Algumas empresas têm convênio com creches específicas',
    ],
  },
  beneficio_educacao: {
    title: 'Benefício de Educação',
    description: 'Subsídio para cursos, graduação, pós-graduação ou idiomas relacionados ao trabalho.',
    howToEstimate: 'Pergunte ao RH o valor anual ou mensal do subsídio. Varia muito: R$ 200-1000/mês.',
    marketRange: { min: 200, max: 1000 },
    tips: [
      'Algumas empresas exigem permanência mínima após usar o benefício',
      'Cursos de idiomas são os mais comuns',
      'MBAs e pós podem ter subsídio de 50-100%',
    ],
  },
  gympass: {
    title: 'Gympass / TotalPass / SESI',
    description: 'Benefício de bem-estar que dá acesso a academias e atividades físicas.',
    howToEstimate: 'O custo empresa do Gympass varia de R$ 50-150/mês dependendo do plano contratado.',
    marketRange: { min: 50, max: 150 },
    tips: [
      'Planos básicos dão acesso a academias simples, premium a redes maiores',
      'Algumas empresas subsidiam 100%, outras dividem o custo',
      'Inclui também apps de meditação e bem-estar digital',
    ],
  },
};
