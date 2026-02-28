export type InsuranceType = 
  | 'auto'
  | 'residencial'
  | 'vida'
  | 'saude'
  | 'odontologico'
  | 'viagem'
  | 'empresarial'
  | 'pet'
  | 'celular'
  | 'bike'
  | 'rc_profissional'
  | 'garantia_estendida'
  | 'outro';

export interface InsuranceCoverage {
  nome: string;
  valor_cobertura: number;
  incluida: boolean;
}

export interface Insurance {
  id: string;
  user_id: string;
  nome: string;
  tipo: InsuranceType;
  seguradora: string;
  numero_apolice?: string;
  premio_mensal: number;
  premio_anual: number;
  valor_cobertura: number;
  franquia?: number;
  data_inicio: string;
  data_fim: string;
  renovacao_automatica: boolean;
  asset_id?: string;
  coberturas?: InsuranceCoverage[];
  forma_pagamento?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'a_vista';
  dia_vencimento?: number;
  observacoes?: string;
  arquivo_path?: string;
  arquivo_nome?: string;
  // Campos para garantia de compra
  is_warranty?: boolean; // Se é uma garantia de compra (vs seguro tradicional)
  warranty_extended?: boolean; // Se contratou garantia estendida
  warranty_extended_months?: number; // Meses de garantia estendida adicionais
  warranty_store?: string; // Loja onde contratou a garantia
  created_at: string;
  updated_at: string;
}

export const insuranceTypeLabels: Record<InsuranceType, string> = {
  auto: 'Auto',
  residencial: 'Residencial',
  vida: 'Vida',
  saude: 'Saúde',
  odontologico: 'Odontológico',
  viagem: 'Viagem',
  empresarial: 'Empresarial',
  pet: 'Pet',
  celular: 'Celular/Eletrônicos',
  bike: 'Bicicleta',
  rc_profissional: 'RC Profissional',
  garantia_estendida: 'Garantia Estendida',
  outro: 'Outro',
};

export const insuranceTypeOptions: { value: InsuranceType; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'residencial', label: 'Residencial' },
  { value: 'vida', label: 'Vida' },
  { value: 'saude', label: 'Saúde' },
  { value: 'odontologico', label: 'Odontológico' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'empresarial', label: 'Empresarial' },
  { value: 'pet', label: 'Pet' },
  { value: 'celular', label: 'Celular/Eletrônicos' },
  { value: 'bike', label: 'Bicicleta' },
  { value: 'rc_profissional', label: 'RC Profissional' },
  { value: 'garantia_estendida', label: 'Garantia Estendida' },
  { value: 'outro', label: 'Outro' },
];

// ==============================================================
// INTEGRAÇÃO FISCAL - IMPOSTO DE RENDA
// ==============================================================

export type IRDeclarationType = 
  | 'pagamentos_efetuados'  // Ficha Pagamentos Efetuados - Dedutíveis
  | 'rendimentos_isentos'   // Ficha Rendimentos Isentos e Não Tributáveis
  | 'bens_direitos'         // Ficha Bens e Direitos
  | 'nao_declaravel';       // Não precisa declarar

export interface InsuranceIRConfig {
  /** Tipo de seguro */
  type: InsuranceType;
  /** Se o prêmio é dedutível do IR */
  isDeductible: boolean;
  /** Onde declarar no IR */
  declarationType: IRDeclarationType;
  /** Código na ficha (se aplicável) */
  irCode?: string;
  /** Descrição para a ficha */
  declarationLabel: string;
  /** Observação sobre declaração */
  declarationNote: string;
  /** Categoria de dedução (saude/educacao/etc) */
  deductionCategory?: 'saude' | null;
}

/**
 * Mapeamento fiscal dos tipos de seguro para IR
 * 
 * DEDUTÍVEIS (Pagamentos Efetuados):
 * - Plano de Saúde/Seguro Saúde
 * - Plano Odontológico
 * 
 * A DECLARAR (sem abatimento):
 * - Seguro de Vida: Rendimentos Isentos (código 03) - apenas indenizações
 * - Seguro Auto/Residencial: Não declarar prêmio, apenas indenizações
 */
export const insuranceIRMapping: Record<InsuranceType, InsuranceIRConfig> = {
  saude: {
    type: 'saude',
    isDeductible: true,
    declarationType: 'pagamentos_efetuados',
    irCode: '26',
    declarationLabel: 'Pagamentos Efetuados',
    declarationNote: 'Prêmios 100% dedutíveis. Informe o CNPJ da operadora. Sem limite de valor.',
    deductionCategory: 'saude',
  },
  odontologico: {
    type: 'odontologico',
    isDeductible: true,
    declarationType: 'pagamentos_efetuados',
    irCode: '26',
    declarationLabel: 'Pagamentos Efetuados',
    declarationNote: 'Prêmios 100% dedutíveis. Informe o CNPJ da operadora. Sem limite de valor.',
    deductionCategory: 'saude',
  },
  vida: {
    type: 'vida',
    isDeductible: false,
    declarationType: 'rendimentos_isentos',
    irCode: '03',
    declarationLabel: 'Rendimentos Isentos',
    declarationNote: 'Prêmios NÃO são dedutíveis. Declarar apenas indenizações recebidas (código 03).',
    deductionCategory: null,
  },
  auto: {
    type: 'auto',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO precisam ser declarados. Indenizações por perda total devem ser informadas em Rendimentos Isentos.',
    deductionCategory: null,
  },
  residencial: {
    type: 'residencial',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO precisam ser declarados. Indenizações por sinistro devem ser informadas em Rendimentos Isentos.',
    deductionCategory: null,
  },
  viagem: {
    type: 'viagem',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO são dedutíveis e não precisam ser declarados.',
    deductionCategory: null,
  },
  empresarial: {
    type: 'empresarial',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Consultar tratamento fiscal específico para pessoa jurídica.',
    deductionCategory: null,
  },
  pet: {
    type: 'pet',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO são dedutíveis e não precisam ser declarados.',
    deductionCategory: null,
  },
  celular: {
    type: 'celular',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO são dedutíveis e não precisam ser declarados.',
    deductionCategory: null,
  },
  bike: {
    type: 'bike',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO são dedutíveis e não precisam ser declarados.',
    deductionCategory: null,
  },
  rc_profissional: {
    type: 'rc_profissional',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Livro Caixa (Autônomos)',
    declarationNote: 'Pode ser deduzido no Livro Caixa para profissionais autônomos.',
    deductionCategory: null,
  },
  garantia_estendida: {
    type: 'garantia_estendida',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Não Declarável',
    declarationNote: 'Prêmios NÃO são dedutíveis e não precisam ser declarados.',
    deductionCategory: null,
  },
  outro: {
    type: 'outro',
    isDeductible: false,
    declarationType: 'nao_declaravel',
    declarationLabel: 'Verificar',
    declarationNote: 'Verificar tratamento fiscal específico com contador.',
    deductionCategory: null,
  },
};

/** Helper para calcular totais fiscais de seguros */
export function calculateInsuranceIRTotals(seguros: Insurance[]) {
  const today = new Date().toISOString().split('T')[0];
  const activeInsurances = seguros.filter(s => s.data_fim >= today && s.data_inicio <= today);
  
  const deductible = activeInsurances.filter(s => insuranceIRMapping[s.tipo]?.isDeductible);
  const nonDeductible = activeInsurances.filter(s => !insuranceIRMapping[s.tipo]?.isDeductible);
  
  const totalDeductibleAnnual = deductible.reduce((sum, s) => sum + s.premio_anual, 0);
  const totalNonDeductibleAnnual = nonDeductible.reduce((sum, s) => sum + s.premio_anual, 0);
  
  // Agrupa por tipo de declaração
  const byDeclarationType = activeInsurances.reduce((acc, s) => {
    const config = insuranceIRMapping[s.tipo];
    if (!acc[config.declarationType]) {
      acc[config.declarationType] = { items: [], total: 0 };
    }
    acc[config.declarationType].items.push(s);
    acc[config.declarationType].total += s.premio_anual;
    return acc;
  }, {} as Record<IRDeclarationType, { items: Insurance[]; total: number }>);
  
  return {
    deductible,
    nonDeductible,
    totalDeductibleAnnual,
    totalNonDeductibleAnnual,
    byDeclarationType,
    taxSavingsEstimate: totalDeductibleAnnual * 0.275, // Estimativa na alíquota máxima
  };
}
