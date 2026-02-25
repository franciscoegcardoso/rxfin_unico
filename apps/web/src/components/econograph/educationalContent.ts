// Educational content for EconoGraph indicators and concepts

export interface IndicatorEducation {
  shortName: string;
  fullName: string;
  whatIs: string;
  impact: string;
  interpretation: string;
  icon: string;
  category: 'inflação' | 'juros' | 'ações' | 'moedas' | 'alternativos';
}

export const INDICATOR_EDUCATION: Record<string, IndicatorEducation> = {
  ipca: {
    shortName: 'IPCA',
    fullName: 'Índice de Preços ao Consumidor Amplo',
    whatIs: 'Principal indicador de inflação do Brasil, mede a variação de preços para famílias com renda de 1 a 40 salários mínimos.',
    impact: 'Quando o IPCA sobe, seu dinheiro perde poder de compra. Se seus investimentos não rendem acima do IPCA, você está ficando mais pobre.',
    interpretation: 'Linha subindo = preços estão aumentando. Compare sempre seus rendimentos com o IPCA para ver se está ganhando dinheiro "de verdade".',
    icon: '📈',
    category: 'inflação',
  },
  incc: {
    shortName: 'INCC',
    fullName: 'Índice Nacional de Custo da Construção',
    whatIs: 'Mede a variação de custos de materiais e mão de obra na construção civil. Muito usado em contratos de compra de imóveis na planta.',
    impact: 'Se você está comprando um imóvel na planta, parcelas futuras são corrigidas pelo INCC. Quando sobe muito, sua dívida cresce.',
    interpretation: 'Essencial para quem investe em imóveis ou está financiando. INCC alto = construção mais cara = imóveis novos mais caros.',
    icon: '🏗️',
    category: 'inflação',
  },
  cdi: {
    shortName: 'CDI',
    fullName: 'Certificado de Depósito Interbancário',
    whatIs: 'Taxa de juros que os bancos cobram entre si. É a referência para praticamente todos os investimentos de renda fixa no Brasil.',
    impact: 'Quando o CDI sobe, CDBs, LCIs, fundos DI e outras aplicações rendem mais. É o "benchmark" para saber se seu investimento está bom.',
    interpretation: 'Seu investimento está "rendendo 100% do CDI" significa que ele acompanha essa taxa. Acima de 100% = está ganhando mais que a média.',
    icon: '💰',
    category: 'juros',
  },
  poupanca: {
    shortName: 'Poupança',
    fullName: 'Caderneta de Poupança',
    whatIs: 'Investimento mais tradicional do Brasil. Rendimento é definido por lei: 70% da Selic quando ela está abaixo de 8,5% ao ano.',
    impact: 'Geralmente perde para a inflação. É segura, mas seu dinheiro pode estar perdendo valor real ao longo do tempo.',
    interpretation: 'Compare com o IPCA: se a poupança está abaixo, você está perdendo poder de compra mesmo "ganhando" juros.',
    icon: '🏦',
    category: 'juros',
  },
  ibov: {
    shortName: 'Ibovespa',
    fullName: 'Índice Bovespa',
    whatIs: 'Termômetro da bolsa brasileira. Representa as ações mais negociadas no Brasil, como Petrobras, Vale, Itaú.',
    impact: 'Quando sobe, investidores estão otimistas com a economia brasileira. Quando cai, há pessimismo ou crise.',
    interpretation: 'Muito volátil no curto prazo, mas historicamente supera a inflação no longo prazo. Quedas são oportunidades de compra.',
    icon: '📊',
    category: 'ações',
  },
  ifix: {
    shortName: 'IFIX',
    fullName: 'Índice de Fundos Imobiliários',
    whatIs: 'Mede o desempenho médio dos fundos imobiliários (FIIs) listados na bolsa. FIIs investem em shoppings, galpões, escritórios.',
    impact: 'Quando sobe, os aluguéis e valores dos imóveis comerciais estão se valorizando. Muitos FIIs pagam dividendos mensais.',
    interpretation: 'Mais estável que ações, mas sensível a juros. Quando Selic sobe muito, IFIX tende a cair (investidores preferem renda fixa).',
    icon: '🏢',
    category: 'ações',
  },
  usd: {
    shortName: 'Dólar',
    fullName: 'Dólar Americano (USD/BRL)',
    whatIs: 'Taxa de câmbio entre o real e o dólar. Mostra quantos reais você precisa para comprar um dólar.',
    impact: 'Dólar alto = importações mais caras, inflação pode subir. Bom para exportadores e quem tem investimentos em dólar.',
    interpretation: 'Sobe em crises e incertezas (fuga para segurança). Ter parte do patrimônio em dólar protege contra crises brasileiras.',
    icon: '💵',
    category: 'moedas',
  },
  sp500: {
    shortName: 'S&P 500',
    fullName: 'Standard & Poor\'s 500',
    whatIs: 'Índice das 500 maiores empresas dos EUA: Apple, Microsoft, Amazon, Google. É o termômetro da economia americana.',
    impact: 'Quando sobe, a economia mundial tende a ir bem. É referência global para investimentos em ações.',
    interpretation: 'Historicamente, retorno médio de ~10% ao ano em dólar. Essencial para diversificação internacional.',
    icon: '🇺🇸',
    category: 'ações',
  },
  nasdaq: {
    shortName: 'Nasdaq',
    fullName: 'Nasdaq-100',
    whatIs: 'Índice das 100 maiores empresas de tecnologia dos EUA. Inclui Apple, Microsoft, Tesla, Netflix, Google.',
    impact: 'Representa o setor de inovação global. Muito sensível a juros americanos e tendências tecnológicas.',
    interpretation: 'Mais volátil que S&P 500, mas com maior potencial de crescimento. Caiu muito em 2022 com alta de juros.',
    icon: '💻',
    category: 'ações',
  },
  btc: {
    shortName: 'Bitcoin',
    fullName: 'Bitcoin (BTC)',
    whatIs: 'Primeira e maior criptomoeda do mundo. Descentralizada, com oferta limitada a 21 milhões de unidades.',
    impact: 'Altamente especulativo. Pode multiplicar valor rapidamente, mas também despencar. Não é regulado por governos.',
    interpretation: 'Só começou em 2010. Ciclos de alta e baixa intensos. Especialistas sugerem no máximo 5-10% do patrimônio.',
    icon: '₿',
    category: 'alternativos',
  },
  ouro: {
    shortName: 'Ouro',
    fullName: 'Ouro (XAU)',
    whatIs: 'Metal precioso usado como reserva de valor há milhares de anos. Considerado "porto seguro" em crises.',
    impact: 'Sobe em momentos de incerteza global, inflação alta ou guerras. Protege patrimônio em crises.',
    interpretation: 'Não gera renda (dividendos/juros), mas preserva valor. Bom para diversificação e proteção.',
    icon: '🪙',
    category: 'alternativos',
  },
};

export const CATEGORY_INFO = {
  inflação: {
    name: 'Inflação',
    description: 'Indicadores que medem a perda de poder de compra do seu dinheiro',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  juros: {
    name: 'Juros / Renda Fixa',
    description: 'Taxas que remuneram investimentos conservadores',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  ações: {
    name: 'Ações / Bolsa',
    description: 'Índices que medem o desempenho de empresas listadas',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  moedas: {
    name: 'Moedas / Câmbio',
    description: 'Variação de moedas estrangeiras frente ao real',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  alternativos: {
    name: 'Alternativos',
    description: 'Ativos não tradicionais para diversificação',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
};

export const CHART_INTERPRETATION_GUIDE = {
  overview: {
    title: 'Como interpretar este gráfico',
    points: [
      {
        icon: '📈',
        text: 'Base 100 significa que todos os ativos começam iguais para comparação justa',
      },
      {
        icon: '⬆️',
        text: 'Linha subindo = ativo se valorizou desde o início do período',
      },
      {
        icon: '⬇️',
        text: 'Linha descendo = ativo perdeu valor no período',
      },
      {
        icon: '📊',
        text: 'Compare as linhas: a mais alta teve melhor desempenho',
      },
    ],
  },
  portfolio: {
    title: 'Sua carteira simulada',
    points: [
      {
        icon: '💼',
        text: 'A linha preta grossa representa a evolução da SUA carteira',
      },
      {
        icon: '📏',
        text: 'Linhas tracejadas são benchmarks (referências de mercado)',
      },
      {
        icon: '✅',
        text: 'Sua carteira acima do benchmark = estratégia está funcionando',
      },
      {
        icon: '❌',
        text: 'Sua carteira abaixo = você poderia ter investido de forma mais simples',
      },
    ],
  },
};

export const ONBOARDING_STEPS = [
  {
    title: 'Bem-vindo ao EconoGraph',
    description: 'Aqui você compara indicadores econômicos de forma visual e simples, sem precisar ser especialista.',
    icon: '👋',
  },
  {
    title: 'Visão Geral',
    description: 'Compare diferentes indicadores lado a lado. Veja quem rendeu mais ao longo do tempo.',
    icon: '📊',
  },
  {
    title: 'Simulador de Carteira',
    description: 'Monte uma carteira hipotética e veja como ela teria se comportado. Aprenda na prática!',
    icon: '💼',
  },
];
