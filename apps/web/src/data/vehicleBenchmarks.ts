// Alíquotas de IPVA por estado (2024/2025)
// Fonte: legislação estadual de cada UF
export const ipvaRates: Record<string, { rate: number; name: string }> = {
  AC: { rate: 2.0, name: 'Acre' },
  AL: { rate: 3.0, name: 'Alagoas' },
  AP: { rate: 3.0, name: 'Amapá' },
  AM: { rate: 3.0, name: 'Amazonas' },
  BA: { rate: 2.5, name: 'Bahia' },
  CE: { rate: 3.0, name: 'Ceará' },
  DF: { rate: 3.5, name: 'Distrito Federal' },
  ES: { rate: 2.0, name: 'Espírito Santo' },
  GO: { rate: 3.75, name: 'Goiás' },
  MA: { rate: 2.5, name: 'Maranhão' },
  MT: { rate: 3.0, name: 'Mato Grosso' },
  MS: { rate: 3.5, name: 'Mato Grosso do Sul' },
  MG: { rate: 4.0, name: 'Minas Gerais' },
  PA: { rate: 2.5, name: 'Pará' },
  PB: { rate: 2.5, name: 'Paraíba' },
  PR: { rate: 3.5, name: 'Paraná' },
  PE: { rate: 3.0, name: 'Pernambuco' },
  PI: { rate: 2.5, name: 'Piauí' },
  RJ: { rate: 4.0, name: 'Rio de Janeiro' },
  RN: { rate: 3.0, name: 'Rio Grande do Norte' },
  RS: { rate: 3.0, name: 'Rio Grande do Sul' },
  RO: { rate: 3.0, name: 'Rondônia' },
  RR: { rate: 3.0, name: 'Roraima' },
  SC: { rate: 2.0, name: 'Santa Catarina' },
  SP: { rate: 4.0, name: 'São Paulo' },
  SE: { rate: 2.5, name: 'Sergipe' },
  TO: { rate: 2.0, name: 'Tocantins' },
};

// Benefícios de IPVA para veículos elétricos e híbridos por estado (2024/2025)
// Fontes: Legislação estadual, AutoEsporte (19/12/2025), G1 (08/02/2025)
export interface ElectricIPVABenefit {
  electricRate: number | null; // null = isenção total
  hybridRate: number | null; // null = isenção total
  electricExemption: boolean;
  hybridExemption: boolean;
  valueCap?: number; // Limite de valor FIPE para isenção (se aplicável)
  notes: string;
  source: string;
}

export const electricIPVABenefits: Record<string, ElectricIPVABenefit> = {
  // Estados com isenção total para elétricos
  DF: {
    electricRate: null,
    hybridRate: null,
    electricExemption: true,
    hybridExemption: true,
    notes: 'Isenção total para veículos elétricos e híbridos',
    source: 'Lei Distrital nº 7.431/2024',
  },
  RS: {
    electricRate: null,
    hybridRate: 3.0,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para 100% elétricos. Híbridos pagam alíquota padrão',
    source: 'Lei Estadual RS nº 15.576/2020',
  },
  PE: {
    electricRate: null,
    hybridRate: 2.4,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para 100% elétricos. Híbridos: 2,4%',
    source: 'Lei Estadual PE nº 16.977/2021',
  },
  MA: {
    electricRate: null,
    hybridRate: 2.5,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual MA nº 11.001/2019',
  },
  PI: {
    electricRate: null,
    hybridRate: 2.5,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual PI nº 7.431/2021',
  },
  RN: {
    electricRate: null,
    hybridRate: 3.0,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual RN nº 10.943/2021',
  },
  MS: {
    electricRate: null,
    hybridRate: 3.5,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual MS nº 5.780/2021',
  },
  GO: {
    electricRate: null,
    hybridRate: 3.75,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual GO nº 21.413/2022',
  },
  AL: {
    electricRate: null,
    hybridRate: 3.0,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual AL nº 8.779/2022',
  },
  SE: {
    electricRate: null,
    hybridRate: 2.5,
    electricExemption: true,
    hybridExemption: false,
    notes: 'Isenção total para elétricos',
    source: 'Lei Estadual SE nº 8.939/2021',
  },
  // Estados com alíquotas reduzidas
  RJ: {
    electricRate: 0.5,
    hybridRate: 1.5,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Elétricos: 0,5%. Híbridos: 1,5% (reduzido de 4%)',
    source: 'Lei Estadual RJ nº 9.394/2021',
  },
  BA: {
    electricRate: null,
    hybridRate: 2.5,
    electricExemption: true,
    hybridExemption: false,
    valueCap: 300000,
    notes: 'Isenção para elétricos até R$ 300 mil',
    source: 'Lei Estadual BA nº 14.415/2021',
  },
  CE: {
    electricRate: 2.0,
    hybridRate: 2.5,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Alíquota reduzida de 2% para elétricos',
    source: 'Lei Estadual CE nº 18.115/2022',
  },
  PR: {
    electricRate: 3.5,
    hybridRate: 3.5,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Isenção automática revogada em 2024. Alíquota padrão',
    source: 'Lei Estadual PR - revogação 2024',
  },
  // Estados sem benefício específico
  SP: {
    electricRate: 4.0,
    hybridRate: 4.0,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Sem isenção estadual. Híbridos flex podem ter benefício pontual',
    source: 'SEFAZ-SP 2024',
  },
  MG: {
    electricRate: 4.0,
    hybridRate: 4.0,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Isenção apenas para veículos fabricados em MG',
    source: 'SEF-MG 2024',
  },
  SC: {
    electricRate: 2.0,
    hybridRate: 2.0,
    electricExemption: false,
    hybridExemption: false,
    notes: 'Sem benefício específico. Alíquota padrão de 2%',
    source: 'SEF-SC 2024',
  },
};

// Função para obter a alíquota efetiva de IPVA considerando tipo de combustível
export const getEffectiveIPVARate = (
  stateUF: string,
  fuelType: string,
  vehicleValue: number
): { rate: number; hasExemption: boolean; discount: number; notes: string } => {
  const baseRate = ipvaRates[stateUF]?.rate || 4.0;
  const benefit = electricIPVABenefits[stateUF];
  
  // Se não há benefício registrado ou não é elétrico/híbrido, usa taxa padrão
  if (!benefit || (fuelType !== 'electric' && fuelType !== 'hybrid_plugin')) {
    return { rate: baseRate, hasExemption: false, discount: 0, notes: '' };
  }
  
  const isElectric = fuelType === 'electric';
  const isHybrid = fuelType === 'hybrid_plugin';
  
  // Verifica limite de valor para isenção
  if (benefit.valueCap && vehicleValue > benefit.valueCap) {
    return { 
      rate: baseRate, 
      hasExemption: false, 
      discount: 0, 
      notes: `Valor acima do limite de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(benefit.valueCap)} para isenção` 
    };
  }
  
  if (isElectric) {
    if (benefit.electricExemption || benefit.electricRate === null) {
      return { rate: 0, hasExemption: true, discount: 100, notes: benefit.notes };
    }
    const discount = ((baseRate - benefit.electricRate) / baseRate) * 100;
    return { rate: benefit.electricRate, hasExemption: false, discount, notes: benefit.notes };
  }
  
  if (isHybrid) {
    if (benefit.hybridExemption || benefit.hybridRate === null) {
      return { rate: 0, hasExemption: true, discount: 100, notes: benefit.notes };
    }
    const discount = ((baseRate - benefit.hybridRate) / baseRate) * 100;
    return { rate: benefit.hybridRate, hasExemption: false, discount, notes: benefit.notes };
  }
  
  return { rate: baseRate, hasExemption: false, discount: 0, notes: '' };
};

// Função para calcular IPVA mensal com suporte a veículos elétricos
export const calculateMonthlyIPVAWithBenefits = (
  vehicleValue: number,
  stateUF: string,
  fuelType: string
): { monthly: number; annual: number; rate: number; hasExemption: boolean; discount: number; notes: string } => {
  const { rate, hasExemption, discount, notes } = getEffectiveIPVARate(stateUF, fuelType, vehicleValue);
  const annualIPVA = vehicleValue * (rate / 100);
  return {
    monthly: annualIPVA / 12,
    annual: annualIPVA,
    rate,
    hasExemption,
    discount,
    notes,
  };
};

// Preços médios de combustível (R$/litro) - valores de referência
export const fuelPrices: Record<string, number> = {
  gasoline: 5.79,
  ethanol: 3.99,
  diesel: 5.89,
  flex: 5.79, // usa gasolina como referência
  eletrico: 0.85, // R$/kWh
  hibrido: 5.79,
};

// Benchmarks de custos de veículo (valores mensais estimados)
export const vehicleBenchmarks = {
  // Seguro: ~3-5% do valor FIPE ao ano (média 4%)
  insuranceAnnualRate: 0.04,
  // Licenciamento anual (média nacional) - inclui taxas DETRAN + CRLV
  annualLicensingBase: 150,
  // DPVAT/Seguro obrigatório (extinto em 2020, mas valores de referência)
  // A partir de 2020, o DPVAT foi extinto, mas o SPVAT pode ser cobrado em alguns estados
  dpvatReference: 5.23, // Valor simbólico de referência (última cobrança antes da extinção)
  // Total licenciamento (sem DPVAT ativo atualmente)
  annualLicensing: 150,
  // Manutenção: ~2-3% do valor FIPE ao ano para carros usados
  maintenanceAnnualRate: 0.025,
  // Estacionamento médio mensal
  averageParking: 200,
};

// Consumo médio por categoria (km/l) - Dados baseados no PBE Veicular INMETRO
// Valores para combustível flex (gasolina)
export interface CategoryConsumption {
  urban: number;
  highway: number;
  average: number;
}

export const fuelConsumptionBenchmarks: Record<string, CategoryConsumption> = {
  // Hatches compactos (Argo, Mobi, Onix, HB20, Polo)
  hatch_compacto: { urban: 12.2, highway: 14.4, average: 13.3 },
  // Sedans compactos (Cronos, Virtus, Onix Plus, HB20S)
  sedan_compacto: { urban: 11.6, highway: 13.8, average: 12.7 },
  // Sedans médios (Corolla, Civic)
  sedan_medio: { urban: 10.8, highway: 13.5, average: 12.2 },
  // SUVs compactos (Pulse, T-Cross, Tracker, Creta, Kicks)
  suv_compacto: { urban: 10.4, highway: 12.8, average: 11.6 },
  // SUVs médios (Compass, Corolla Cross, Taos)
  suv_medio: { urban: 9.4, highway: 11.8, average: 10.6 },
  // SUVs grandes (SW4, Commander, Outlander)
  suv_grande: { urban: 8.2, highway: 10.8, average: 9.5 },
  // Pickups compactas (Strada, Saveiro, Montana)
  pickup_compacta: { urban: 10.2, highway: 12.6, average: 11.4 },
  // Pickups médias (Toro, Oroch)
  pickup_media: { urban: 9.2, highway: 11.8, average: 10.5 },
  // Pickups grandes (Hilux, S10, Ranger, Amarok)
  pickup_grande: { urban: 8.0, highway: 10.8, average: 9.4 },
  // Default para desconhecidos
  default: { urban: 11.0, highway: 13.0, average: 12.0 },
};

// Mapeamento de palavras-chave para categorias
export const categoryKeywords: Record<string, string[]> = {
  hatch_compacto: ['argo', 'mobi', 'onix', 'hb20', 'polo', 'kwid', 'sandero', 'yaris', '208', 'c3', 'dolphin'],
  sedan_compacto: ['cronos', 'virtus', 'onix plus', 'hb20s', 'city', 'versa', 'yaris sedan'],
  sedan_medio: ['corolla', 'civic', 'sentra', 'jetta', 'cruze'],
  suv_compacto: ['pulse', 't-cross', 'tcross', 'tracker', 'creta', 'kicks', 'hr-v', 'hrv', 'renegade', 'duster', '2008', 'tiggo 5', 'nivus', 'fastback', 'c4 cactus'],
  suv_medio: ['compass', 'corolla cross', 'taos', 'territory', 'zr-v', 'zrv', 'tiggo 7', 'haval'],
  suv_grande: ['sw4', 'commander', 'outlander', 'tiggo 8', 'pajero', 'trailblazer'],
  pickup_compacta: ['strada', 'saveiro', 'montana', 'oroch'],
  pickup_media: ['toro'],
  pickup_grande: ['hilux', 's10', 'ranger', 'amarok', 'frontier', 'l200', 'triton', 'rampage', 'ram 1500', '1500'],
};

// Função para inferir categoria pelo nome do modelo
export const inferCategoryFromModel = (modelName: string): string => {
  const normalizedModel = modelName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (normalizedModel.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'default';
};

// Função para obter consumo por categoria
export const getConsumptionByCategory = (category: string): CategoryConsumption => {
  return fuelConsumptionBenchmarks[category] || fuelConsumptionBenchmarks.default;
};

// Lista de estados ordenada
export const statesList = Object.entries(ipvaRates)
  .map(([uf, data]) => ({ uf, ...data }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Função para calcular IPVA mensal
export const calculateMonthlyIPVA = (vehicleValue: number, stateUF: string): number => {
  const rate = ipvaRates[stateUF]?.rate || 4.0;
  const annualIPVA = vehicleValue * (rate / 100);
  return annualIPVA / 12;
};

// Função para calcular custo de combustível mensal
export const calculateMonthlyFuel = (
  monthlyKm: number,
  consumption: number, // km/l
  fuelType: string
): number => {
  if (!monthlyKm || !consumption || consumption === 0) return 0;
  const pricePerLiter = fuelPrices[fuelType] || fuelPrices.gasoline;
  const litersNeeded = monthlyKm / consumption;
  return litersNeeded * pricePerLiter;
};

// Função para calcular seguro mensal estimado
export const calculateMonthlyInsurance = (vehicleValue: number): number => {
  const annualInsurance = vehicleValue * vehicleBenchmarks.insuranceAnnualRate;
  return annualInsurance / 12;
};

// Função para calcular manutenção mensal estimada
export const calculateMonthlyMaintenance = (vehicleValue: number): number => {
  const annualMaintenance = vehicleValue * vehicleBenchmarks.maintenanceAnnualRate;
  return annualMaintenance / 12;
};

// Função para calcular licenciamento mensal
export const calculateMonthlyLicensing = (): number => {
  return vehicleBenchmarks.annualLicensing / 12;
};
