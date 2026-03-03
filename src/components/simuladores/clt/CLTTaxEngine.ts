// CLT Tax Engine 2026 - Progressive INSS & IRRF Calculations
// Based on official 2026 tax brackets (estimated from 2024 + adjustments)

// ==================== INSS 2026 ====================
// Faixas INSS progressivas 2026 (estimativa)
export const INSS_BRACKETS_2026 = [
  { min: 0, max: 1518.00, rate: 0.075, deduction: 0 },
  { min: 1518.00, max: 2793.88, rate: 0.09, deduction: 22.77 },
  { min: 2793.88, max: 4190.83, rate: 0.12, deduction: 106.59 },
  { min: 4190.83, max: 8157.41, rate: 0.14, deduction: 190.40 },
];

export const INSS_CEILING_2026 = 951.63; // Teto INSS 2026 estimado

export const calculateINSS2026 = (grossSalary: number): { 
  value: number; 
  effectiveRate: number;
  breakdown: { bracket: number; taxable: number; tax: number; rate: number }[];
} => {
  let inss = 0;
  let prevMax = 0;
  const breakdown: { bracket: number; taxable: number; tax: number; rate: number }[] = [];
  
  for (let i = 0; i < INSS_BRACKETS_2026.length; i++) {
    const bracket = INSS_BRACKETS_2026[i];
    if (grossSalary > bracket.min) {
      const taxableAmount = Math.min(grossSalary, bracket.max) - bracket.min;
      const tax = taxableAmount * bracket.rate;
      inss += tax;
      breakdown.push({
        bracket: i + 1,
        taxable: taxableAmount,
        tax,
        rate: bracket.rate * 100,
      });
    }
    prevMax = bracket.max;
  }
  
  const finalValue = Math.min(inss, INSS_CEILING_2026);
  const effectiveRate = grossSalary > 0 ? (finalValue / grossSalary) * 100 : 0;
  
  return { value: finalValue, effectiveRate, breakdown };
};

// ==================== IRRF 2026 ====================
// Tabela IRRF progressiva 2026 (estimativa baseada em correção inflacionária)
export const IRRF_BRACKETS_2026 = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0, label: 'Isento' },
  { min: 2259.20, max: 2826.65, rate: 0.075, deduction: 169.44, label: '7,5%' },
  { min: 2826.65, max: 3751.05, rate: 0.15, deduction: 381.44, label: '15%' },
  { min: 3751.05, max: 4664.68, rate: 0.225, deduction: 662.77, label: '22,5%' },
  { min: 4664.68, max: Infinity, rate: 0.275, deduction: 896.00, label: '27,5%' },
];

export const DEPENDENT_DEDUCTION_2026 = 189.59; // Dedução por dependente

export const calculateIRRF2026 = (
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
  
  for (const bracket of IRRF_BRACKETS_2026) {
    if (adjustedBase > bracket.min && adjustedBase <= bracket.max) {
      const ir = Math.max(0, adjustedBase * bracket.rate - bracket.deduction);
      return { 
        value: ir, 
        effectiveRate: baseCalculo > 0 ? (ir / baseCalculo) * 100 : 0,
        bracket: bracket.label,
        bracketRate: bracket.rate * 100,
        baseCalculo: adjustedBase,
      };
    }
    if (adjustedBase > bracket.max && bracket.max === Infinity) {
      const ir = adjustedBase * bracket.rate - bracket.deduction;
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

// ==================== EMPLOYER COSTS (Encargos Patronais) ====================
export interface EmployerCosts {
  // Simples Nacional
  simplesNacional: {
    inss: number; // 0% - já incluso na guia
    fgts: number; // 8%
    provisaoFerias: number; // 11.11%
    provisao13: number; // 8.33%
    total: number;
  };
  // Lucro Real/Presumido
  lucroRealPresumido: {
    inssPatronal: number; // 20%
    rat: number; // 1-3% (média 2%)
    sistemaS: number; // 5.8% (SENAI, SESI, SEBRAE, etc.)
    salarioEducacao: number; // 2.5%
    fgts: number; // 8%
    provisaoFerias: number; // 11.11%
    provisao13: number; // 8.33%
    total: number;
  };
}

export type TaxRegime = 'simples' | 'lucro_real';

export const calculateEmployerCosts = (grossSalary: number, regime: TaxRegime): EmployerCosts => {
  const fgts = grossSalary * 0.08;
  const provisaoFerias = grossSalary * 0.1111; // 1/9 do salário
  const provisao13 = grossSalary * 0.0833; // 1/12 do salário
  
  const simplesNacional = {
    inss: 0, // Já incluído na alíquota do Simples
    fgts,
    provisaoFerias,
    provisao13,
    total: fgts + provisaoFerias + provisao13,
  };
  
  const inssPatronal = grossSalary * 0.20; // 20% patronal
  const rat = grossSalary * 0.02; // RAT médio 2%
  const sistemaS = grossSalary * 0.058; // Sistema S 5.8%
  const salarioEducacao = grossSalary * 0.025; // 2.5%
  
  const lucroRealPresumido = {
    inssPatronal,
    rat,
    sistemaS,
    salarioEducacao,
    fgts,
    provisaoFerias,
    provisao13,
    total: inssPatronal + rat + sistemaS + salarioEducacao + fgts + provisaoFerias + provisao13,
  };
  
  return { simplesNacional, lucroRealPresumido };
};

// ==================== COMPLETE CLT CALCULATION ====================
export interface CLTFullCalculation {
  // Worker perspective (what they receive)
  grossSalary: number;
  inss: { value: number; effectiveRate: number; breakdown: any[] };
  irrf: { value: number; effectiveRate: number; bracket: string; bracketRate: number };
  netSalary: number;
  
  // Provisions (for the worker to know)
  provisions: {
    ferias: number; // 11.11%
    tercoConstitucional: number; // 1/3 of vacation
    decimoTerceiro: number; // 8.33%
    fgtsMonthly: number; // 8%
    fgtsAnnual: number; // FGTS yearly
    total: number;
  };
  
  // Employer perspective (total cost)
  employerCosts: EmployerCosts;
  totalEmployerCost: number;
  
  // Tax regime info
  taxRegime: TaxRegime;
}

export const calculateCLTFull = (
  grossSalary: number, 
  taxRegime: TaxRegime,
  dependents: number = 0
): CLTFullCalculation => {
  // INSS (worker's portion)
  const inss = calculateINSS2026(grossSalary);
  
  // IRRF base = gross - INSS
  const irrfBase = grossSalary - inss.value;
  const irrf = calculateIRRF2026(irrfBase, dependents);
  
  // Net salary
  const netSalary = grossSalary - inss.value - irrf.value;
  
  // Provisions (calculated on gross)
  const ferias = grossSalary * 0.1111;
  const tercoConstitucional = ferias / 3;
  const decimoTerceiro = grossSalary * 0.0833;
  const fgtsMonthly = grossSalary * 0.08;
  const fgtsAnnual = fgtsMonthly * 13; // Including 13th
  
  const provisions = {
    ferias,
    tercoConstitucional,
    decimoTerceiro,
    fgtsMonthly,
    fgtsAnnual,
    total: ferias + tercoConstitucional + decimoTerceiro + fgtsMonthly,
  };
  
  // Employer costs
  const employerCosts = calculateEmployerCosts(grossSalary, taxRegime);
  const totalEmployerCost = taxRegime === 'simples' 
    ? grossSalary + employerCosts.simplesNacional.total
    : grossSalary + employerCosts.lucroRealPresumido.total;
  
  return {
    grossSalary,
    inss,
    irrf,
    netSalary,
    provisions,
    employerCosts,
    totalEmployerCost,
    taxRegime,
  };
};

// ==================== BONUS/PLR TAX CALCULATION ====================
export const calculateBonusTax = (
  bonusGross: number, 
  type: 'plr' | 'bonus'
): { gross: number; net: number; tax: number; effectiveRate: number } => {
  if (type === 'plr') {
    // PLR has exclusive taxation table (separate from salary)
    // Simplified: using IRRF table exclusively
    const { value: ir } = calculateIRRF2026(bonusGross);
    return {
      gross: bonusGross,
      net: bonusGross - ir,
      tax: ir,
      effectiveRate: bonusGross > 0 ? (ir / bonusGross) * 100 : 0,
    };
  } else {
    // Regular bonus is taxed together with salary (simplified: same as salary)
    const inss = calculateINSS2026(bonusGross).value;
    const { value: ir } = calculateIRRF2026(bonusGross - inss);
    return {
      gross: bonusGross,
      net: bonusGross - inss - ir,
      tax: inss + ir,
      effectiveRate: bonusGross > 0 ? ((inss + ir) / bonusGross) * 100 : 0,
    };
  }
};
