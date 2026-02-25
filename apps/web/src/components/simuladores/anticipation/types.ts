// Configuração financeira central do simulador
export const FINANCIAL_CONFIG = {
  saleAmount: 100,           // Valor da venda
  supplierCost: 60,          // Custo do fornecedor
  mdrRate: 0.025,            // Taxa MDR (2.5%)
  installments: 5,           // Número de parcelas
  grossInstallment: 20,      // Parcela bruta (100 / 5)
  netInstallment: 19.50,     // Parcela líquida após MDR
  totalReceivable: 97.50,    // Total a receber (5 x 19.50)
  anticipationRate: 0.15,    // Taxa de antecipação (15%)
  anticipationCost: 14.63,   // Custo da antecipação (arredondado)
  finalNetValue: 82.87,      // Valor líquido final (97.50 - 14.63)
};

// Glossário de termos financeiros para educação do usuário
export const GLOSSARY: Record<string, {
  term: string;
  definition: string;
  example?: string;
  icon?: string;
}> = {
  mdr: {
    term: 'MDR (Merchant Discount Rate)',
    definition: 'Taxa cobrada pela adquirente sobre cada transação com cartão. É o "pedágio" para processar o pagamento.',
    example: 'Em uma venda de R$ 100 com MDR de 2,5%, o lojista recebe R$ 97,50.',
    icon: '💳'
  },
  rav: {
    term: 'RAV (Recebíveis Antecipados de Vendas)',
    definition: 'Operação que permite ao lojista receber hoje o valor de vendas parceladas futuras, pagando uma taxa por isso.',
    example: 'Se você tem R$ 100 para receber em 30 dias, pode antecipar hoje por R$ 85 (taxa de 15%).',
    icon: '⚡'
  },
  adquirente: {
    term: 'Adquirente',
    definition: 'Empresa que processa os pagamentos com cartão (ex: Stone, Cielo, Rede). Ela conecta o lojista às bandeiras e bancos.',
    example: 'Quando você passa o cartão, a Stone captura a transação e repassa para a Visa/Master.',
    icon: '🏢'
  },
  bandeira: {
    term: 'Bandeira',
    definition: 'Rede que conecta adquirentes aos bancos emissores (ex: Visa, Mastercard). Define regras e roteia transações.',
    example: 'A Visa identifica que seu cartão é do Nubank e direciona a cobrança para lá.',
    icon: '🌐'
  },
  emissor: {
    term: 'Banco Emissor',
    definition: 'Banco que emitiu o cartão do consumidor. É quem aprova ou nega a transação e cobra a fatura.',
    example: 'Se você tem cartão Nubank, o Nubank é o emissor que analisa seu limite.',
    icon: '🏦'
  },
  descasamento: {
    term: 'Descasamento de Caixa',
    definition: 'Situação onde as datas de recebimento não coincidem com as datas de pagamento, gerando gap financeiro.',
    example: 'Você recebe em 30 dias, mas precisa pagar o fornecedor hoje = caixa negativo.',
    icon: '📊'
  },
  recebivel: {
    term: 'Recebível',
    definition: 'Valor que você tem direito a receber no futuro por uma venda já realizada.',
    example: 'Vendeu R$ 100 parcelado em 5x = você tem 5 recebíveis de R$ 20 cada.',
    icon: '📅'
  },
  valorPresente: {
    term: 'Valor Presente',
    definition: 'Quanto vale hoje um dinheiro que você só receberia no futuro. O valor presente é sempre menor.',
    example: 'R$ 100 daqui a 30 dias podem valer R$ 98 hoje (desconto pelo tempo).',
    icon: '⏳'
  },
  liquidoMdr: {
    term: 'Valor Líquido (pós-MDR)',
    definition: 'Valor que sobra após descontar a taxa da maquininha. É o que realmente entra no seu caixa.',
    example: 'Venda de R$ 100 - MDR 2,5% = R$ 97,50 líquido.',
    icon: '💰'
  },
  taxaAntecipacao: {
    term: 'Taxa de Antecipação',
    definition: 'Custo cobrado para trazer o dinheiro futuro para hoje. Geralmente é um percentual sobre o valor antecipado.',
    example: 'Taxa de 15% sobre R$ 100 = você paga R$ 15 para receber hoje.',
    icon: '📉'
  },
};

// Definição dos capítulos/fases do wizard
export const WIZARD_CHAPTERS = [
  { id: 1, title: 'Participantes', icon: 'Users', description: 'Quem são os atores' },
  { id: 2, title: 'Negociação', icon: 'Package', description: 'Compra de estoque' },
  { id: 3, title: 'Venda', icon: 'CreditCard', description: 'Transação com cartão' },
  { id: 4, title: 'Problema', icon: 'AlertCircle', description: 'Descasamento de caixa' },
  { id: 5, title: 'Solução', icon: 'Zap', description: 'Antecipação de recebíveis' },
];

// Mapeamento de passos para capítulos (8 passos, 5 capítulos)
export const STEP_TO_CHAPTER: Record<number, number> = {
  1: 1,  // Stakeholders -> Participantes
  2: 2,  // Estoque inicial -> Negociação
  3: 2,  // Compra do estoque -> Negociação
  4: 3,  // Venda ao consumidor -> Venda
  5: 3,  // Fluxo da informação -> Venda
  6: 4,  // Cronograma e Problema -> Problema
  7: 5,  // A Solução -> Solução
  8: 5,  // Resultado Final -> Solução
};

// Tipos de notas explicativas
export type NoteType = 'info' | 'tip' | 'warning' | 'success';

export interface ExplanatoryNote {
  type: NoteType;
  title?: string;
  content: string;
}
