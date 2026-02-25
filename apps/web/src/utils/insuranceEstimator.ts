/**
 * Estimador de Seguro Automotivo
 * 
 * Fórmula: Seguro Estimado = (Valor FIPE) × (Fator Categoria) × (Ajuste IVR)
 * 
 * Este estimador é projetado para COMPARABILIDADE, não precisão absoluta.
 * O objetivo é mostrar diferenças relativas entre veículos, não valores exatos.
 */

export type VehicleCategory = 
  | 'hatch_compacto'
  | 'sedan_compacto' 
  | 'sedan_medio'
  | 'suv_compacto'
  | 'suv_medio'
  | 'suv_grande'
  | 'pickup_compacta'
  | 'pickup_media'
  | 'pickup_grande'
  | 'moto'
  | 'default';

export type UserProfile = 'conservador' | 'padrao' | 'arriscado';

export interface InsuranceEstimate {
  valorMinimo: number;
  valorMedio: number;
  valorMaximo: number;
  taxaBase: number;
  ajusteIVR: number;
  ajustePerfil: number;
  justificativas: string[];
  metodologia: string;
}

// Fatores de risco por categoria de veículo
// Baseados em estudos de sinistralidade e custo de peças
const categoryRiskFactors: Record<VehicleCategory, { rate: number; label: string }> = {
  hatch_compacto: { rate: 0.040, label: 'Hatch Compacto' },
  sedan_compacto: { rate: 0.038, label: 'Sedan Compacto' },
  sedan_medio: { rate: 0.035, label: 'Sedan Médio' },
  suv_compacto: { rate: 0.042, label: 'SUV Compacto' },
  suv_medio: { rate: 0.045, label: 'SUV Médio' },
  suv_grande: { rate: 0.055, label: 'SUV Grande' },
  pickup_compacta: { rate: 0.048, label: 'Picape Compacta' },
  pickup_media: { rate: 0.058, label: 'Picape Média' },
  pickup_grande: { rate: 0.070, label: 'Picape Grande' },
  moto: { rate: 0.065, label: 'Motocicleta' },
  default: { rate: 0.040, label: 'Padrão' },
};

// Veículos com alto Índice de Veículo Roubado (IVR)
// Lista baseada em dados de seguradoras (ISP, Susep)
const highTheftVehicles: { keywords: string[]; adjustmentFactor: number; reason: string }[] = [
  { 
    keywords: ['gol', 'voyage'], 
    adjustmentFactor: 1.25, 
    reason: 'Histórico elevado de furto/roubo e peças visadas' 
  },
  { 
    keywords: ['hb20'], 
    adjustmentFactor: 1.20, 
    reason: 'Alto volume de mercado e índice de sinistralidade' 
  },
  { 
    keywords: ['onix'], 
    adjustmentFactor: 1.18, 
    reason: 'Popularidade elevada no mercado' 
  },
  { 
    keywords: ['hilux'], 
    adjustmentFactor: 1.35, 
    reason: 'Veículo mais visado do Brasil para roubo' 
  },
  { 
    keywords: ['s10', 's-10'], 
    adjustmentFactor: 1.28, 
    reason: 'Alta incidência de roubo em pickups' 
  },
  { 
    keywords: ['ranger'], 
    adjustmentFactor: 1.25, 
    reason: 'Pickup visada, especialmente versões diesel' 
  },
  { 
    keywords: ['compass'], 
    adjustmentFactor: 1.15, 
    reason: 'SUV com custo de peças elevado' 
  },
  { 
    keywords: ['civic'], 
    adjustmentFactor: 1.12, 
    reason: 'Histórico de furto de rodas e componentes' 
  },
  { 
    keywords: ['corolla'], 
    adjustmentFactor: 1.08, 
    reason: 'Veículo popular com peças valorizadas' 
  },
  { 
    keywords: ['tracker'], 
    adjustmentFactor: 1.15, 
    reason: 'SUV com crescente índice de sinistros' 
  },
  { 
    keywords: ['creta'], 
    adjustmentFactor: 1.12, 
    reason: 'SUV popular com sinistralidade acima da média' 
  },
  { 
    keywords: ['amarok'], 
    adjustmentFactor: 1.30, 
    reason: 'Pickup premium muito visada' 
  },
  { 
    keywords: ['sw4', 'sw-4'], 
    adjustmentFactor: 1.32, 
    reason: 'SUV de luxo com alto índice de roubo' 
  },
];

// Ajuste por perfil de condutor
const profileAdjustments: Record<UserProfile, { factor: number; description: string }> = {
  conservador: { 
    factor: 0.90, 
    description: 'Condutor experiente (>30 anos), sem sinistros, baixa km/ano' 
  },
  padrao: { 
    factor: 1.00, 
    description: 'Perfil médio de mercado' 
  },
  arriscado: { 
    factor: 1.20, 
    description: 'Condutor jovem (<25 anos) ou histórico de sinistros' 
  },
};

/**
 * Infere categoria do veículo baseado no modelo
 */
export const inferVehicleCategory = (modelName: string, vehicleType?: string): VehicleCategory => {
  if (!modelName) return 'default';
  
  const normalized = modelName.toLowerCase();
  
  // Mapeamento de keywords para categorias
  const categoryMappings: { category: VehicleCategory; keywords: string[] }[] = [
    { category: 'hatch_compacto', keywords: ['argo', 'mobi', 'onix', 'hb20', 'polo', 'kwid', 'sandero', 'yaris', '208', 'c3', 'dolphin', 'uno', 'palio', 'fox', 'gol'] },
    { category: 'sedan_compacto', keywords: ['cronos', 'virtus', 'onix plus', 'hb20s', 'city', 'versa', 'yaris sedan', 'voyage', 'prisma'] },
    { category: 'sedan_medio', keywords: ['corolla', 'civic', 'sentra', 'jetta', 'cruze', 'fusion', 'accord'] },
    { category: 'suv_compacto', keywords: ['pulse', 't-cross', 'tcross', 'tracker', 'creta', 'kicks', 'hr-v', 'hrv', 'renegade', 'duster', '2008', 'tiggo 5', 'nivus', 'fastback', 'c4 cactus', 'ecosport'] },
    { category: 'suv_medio', keywords: ['compass', 'corolla cross', 'taos', 'territory', 'zr-v', 'zrv', 'tiggo 7', 'haval', 'tucson', 'sportage'] },
    { category: 'suv_grande', keywords: ['sw4', 'sw-4', 'commander', 'outlander', 'tiggo 8', 'pajero', 'trailblazer', 'grand cherokee', 'defender'] },
    { category: 'pickup_compacta', keywords: ['strada', 'saveiro', 'montana'] },
    { category: 'pickup_media', keywords: ['toro', 'oroch'] },
    { category: 'pickup_grande', keywords: ['hilux', 's10', 's-10', 'ranger', 'amarok', 'frontier', 'l200', 'triton', 'rampage', 'ram 1500', 'ram1500', 'ram 2500', 'ram2500'] },
  ];
  
  // Verifica motos
  if (vehicleType === 'motos') {
    return 'moto';
  }
  
  for (const mapping of categoryMappings) {
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword)) {
        return mapping.category;
      }
    }
  }
  
  return 'default';
};

/**
 * Verifica se o veículo tem alto índice de roubo
 */
const checkHighTheftVehicle = (modelName: string): { isHighTheft: boolean; adjustment: number; reason: string } => {
  if (!modelName) return { isHighTheft: false, adjustment: 1.0, reason: '' };
  
  const normalized = modelName.toLowerCase();
  
  for (const vehicle of highTheftVehicles) {
    for (const keyword of vehicle.keywords) {
      if (normalized.includes(keyword)) {
        return {
          isHighTheft: true,
          adjustment: vehicle.adjustmentFactor,
          reason: vehicle.reason
        };
      }
    }
  }
  
  return { isHighTheft: false, adjustment: 1.0, reason: '' };
};

/**
 * Calcula estimativa de seguro automotivo
 * 
 * @param fipeValue - Valor FIPE do veículo
 * @param modelName - Nome do modelo
 * @param category - Categoria do veículo (opcional, inferida se não fornecida)
 * @param userProfile - Perfil do usuário (opcional, padrão = 'padrao')
 * @param vehicleType - Tipo do veículo (carros, motos, caminhoes)
 */
export const calculateInsuranceEstimate = (
  fipeValue: number,
  modelName: string,
  category?: VehicleCategory,
  userProfile: UserProfile = 'padrao',
  vehicleType?: string
): InsuranceEstimate => {
  if (!fipeValue || fipeValue <= 0) {
    return {
      valorMinimo: 0,
      valorMedio: 0,
      valorMaximo: 0,
      taxaBase: 0,
      ajusteIVR: 1,
      ajustePerfil: 1,
      justificativas: [],
      metodologia: ''
    };
  }

  const justificativas: string[] = [];
  
  // 1. Determinar categoria
  const vehicleCategory = category || inferVehicleCategory(modelName, vehicleType);
  const categoryFactor = categoryRiskFactors[vehicleCategory];
  
  justificativas.push(`Categoria: ${categoryFactor.label} (taxa base: ${(categoryFactor.rate * 100).toFixed(1)}%)`);
  
  // 2. Verificar índice de roubo (IVR)
  const theftCheck = checkHighTheftVehicle(modelName);
  let ivrAdjustment = 1.0;
  
  if (theftCheck.isHighTheft) {
    ivrAdjustment = theftCheck.adjustment;
    justificativas.push(`⚠️ Veículo visado: ${theftCheck.reason} (+${((theftCheck.adjustment - 1) * 100).toFixed(0)}%)`);
  }
  
  // 3. Ajuste de perfil
  const profile = profileAdjustments[userProfile];
  
  if (userProfile !== 'padrao') {
    justificativas.push(`Perfil ${userProfile}: ${profile.description}`);
  }
  
  // 4. Cálculo: Valor FIPE × Fator Categoria × Ajuste IVR × Ajuste Perfil
  const baseRate = categoryFactor.rate;
  const valorMedio = fipeValue * baseRate * ivrAdjustment * profile.factor;
  
  // Variação de -10% a +15% para min/max
  const valorMinimo = valorMedio * 0.90;
  const valorMaximo = valorMedio * 1.15;
  
  const metodologia = `
**Fórmula Aplicada:**
\`Seguro = Valor FIPE × Fator Categoria × Ajuste IVR × Ajuste Perfil\`

**Cálculo:**
- Valor FIPE: R$ ${fipeValue.toLocaleString('pt-BR')}
- Fator Categoria (${categoryFactor.label}): ${(categoryFactor.rate * 100).toFixed(1)}%
- Ajuste IVR: ×${ivrAdjustment.toFixed(2)}
- Ajuste Perfil: ×${profile.factor.toFixed(2)}

**Resultado Médio:** R$ ${valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} /ano

---
⚠️ **Importante:** Esta é uma estimativa para fins de COMPARAÇÃO entre veículos. 
O valor real do seguro varia conforme CEP, idade do condutor, bônus acumulado, 
coberturas selecionadas e política da seguradora.
`.trim();

  return {
    valorMinimo: valorMinimo / 12, // Mensal
    valorMedio: valorMedio / 12, // Mensal
    valorMaximo: valorMaximo / 12, // Mensal
    taxaBase: baseRate,
    ajusteIVR: ivrAdjustment,
    ajustePerfil: profile.factor,
    justificativas,
    metodologia
  };
};

/**
 * Retorna informações sobre a metodologia de cálculo
 */
export const getInsuranceMethodology = (): string => {
  return `
## Como Estimamos o Seguro

### Fórmula
\`\`\`
Seguro Estimado = Valor FIPE × Fator Categoria × Ajuste IVR
\`\`\`

### Fatores de Categoria
Cada tipo de veículo tem um fator de risco diferente baseado em:
- **Custo de reparo**: Peças importadas custam mais
- **Sinistralidade histórica**: Colisões, roubo, incêndio
- **Frequência de uso**: Pickups trabalham mais

| Categoria | Taxa Base |
|-----------|-----------|
| Sedan Médio | 3,5% |
| Sedan Compacto | 3,8% |
| Hatch Compacto | 4,0% |
| SUV Compacto | 4,2% |
| SUV Médio | 4,5% |
| Pickup Compacta | 4,8% |
| SUV Grande | 5,5% |
| Pickup Média | 5,8% |
| Moto | 6,5% |
| Pickup Grande | 7,0% |

### Índice de Veículos Roubados (IVR)
Veículos mais visados recebem acréscimo:
- Hilux: +35%
- SW4: +32%
- Amarok: +30%
- S10/Ranger: +25-28%
- Gol/Voyage: +25%
- HB20/Onix: +18-20%

### Limitações
Esta estimativa serve para **comparar** veículos, não para orçar seguro.
O valor real depende de: CEP, idade, bônus, coberturas, seguradora.
`.trim();
};

// Exportar constantes para uso externo
export { categoryRiskFactors, highTheftVehicles, profileAdjustments };
