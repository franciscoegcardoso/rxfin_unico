import { Car, CreditCard, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CardConfig {
  slug: string;
  title: string;
  tags: string[];
  bullets: string[];
  buttonLabel: string;
  buttonVariant: 'default' | 'outline' | 'link';
  featured?: boolean;
}

export interface CategoryConfig {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind color classes for category theming */
  color: {
    iconBg: string;
    iconText: string;
    headerBorder: string;
  };
  cards: CardConfig[];
}

export const SIMULATOR_CATEGORIES: CategoryConfig[] = [
  {
    id: 'veiculos',
    icon: Car,
    title: 'Veículos',
    description: 'Análises estruturadas antes de comprar, vender ou trocar seu carro.',
    color: {
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      iconText: 'text-blue-600 dark:text-blue-400',
      headerBorder: 'border-blue-500/20',
    },
    cards: [
      {
        slug: 'simulador-fipe',
        title: 'Valor de mercado (FIPE) e Custo real',
        tags: ['Preço atualizado', 'Custo total', 'Impacto no orçamento'],
        bullets: [
          'Compare preço de mercado atualizado',
          'Projete custo total de posse',
          'Avalie impacto no seu orçamento',
        ],
        buttonLabel: 'Descobrir custo real',
        buttonVariant: 'default',
        featured: true,
      },
      {
        slug: 'simulador-carro-ab',
        title: 'Comparador Carro A vs B',
        tags: ['Custo total', 'Depreciação', 'Decisão racional'],
        bullets: [
          'Compare custo total entre modelos',
          'Analise depreciação e despesas',
          'Tome decisão baseada em números',
        ],
        buttonLabel: 'Comparar cenários',
        buttonVariant: 'outline',
      },
      {
        slug: 'simulador-custo-oportunidade-carro',
        title: 'Carro próprio vs alternativas',
        tags: ['Uber', 'Transporte público', 'Assinatura'],
        bullets: [
          'Compare com Uber, transporte público ou assinatura',
          'Avalie custo mensal real',
          'Identifique a opção mais racional',
        ],
        buttonLabel: 'Comparar opções',
        buttonVariant: 'outline',
      },
      {
        slug: 'simulador-comparativo-carro',
        title: 'Comparativo de carros',
        tags: ['Cenários', 'Financiamento', 'Longo prazo'],
        bullets: [
          'Avalie diferentes cenários de compra',
          'Simule variações de entrada e financiamento',
          'Analise impacto no longo prazo',
        ],
        buttonLabel: 'Simular agora',
        buttonVariant: 'outline',
      },
    ],
  },
  {
    id: 'dividas',
    icon: CreditCard,
    title: 'Dívidas',
    description: 'Estruture um plano racional para reduzir juros e recuperar controle financeiro.',
    color: {
      iconBg: 'bg-orange-500/10 dark:bg-orange-500/15',
      iconText: 'text-orange-600 dark:text-orange-400',
      headerBorder: 'border-orange-500/20',
    },
    cards: [
      {
        slug: 'renegociacao-dividas',
        title: 'SOS Quitação de dívidas',
        tags: ['Priorização', 'Estratégia', 'Redução de juros'],
        bullets: [
          'Organize dívidas por prioridade',
          'Simule estratégias de pagamento',
          'Reduza custo total de juros',
        ],
        buttonLabel: 'Estruturar plano',
        buttonVariant: 'default',
        featured: true,
      },
      {
        slug: 'financiamento-consorcio',
        title: 'Financiamento vs Consórcio',
        tags: ['Custos', 'Fluxo de caixa', 'CET'],
        bullets: [
          'Compare estrutura de custos',
          'Analise prazo e fluxo de caixa',
          'Avalie custo efetivo total',
        ],
        buttonLabel: 'Comparar opções',
        buttonVariant: 'outline',
      },
    ],
  },
  {
    id: 'planejamento',
    icon: TrendingUp,
    title: 'Planejamento Financeiro',
    description: 'Ferramentas para decisões financeiras mais conscientes e estratégicas.',
    color: {
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      iconText: 'text-violet-600 dark:text-violet-400',
      headerBorder: 'border-violet-500/20',
    },
    cards: [
      {
        slug: 'simulador-custo-hora',
        title: 'Quanto vale sua hora',
        tags: ['Valor do tempo', 'Custo operacional', 'Otimização'],
        bullets: [
          'Calcule valor real do seu tempo',
          'Analise custo de decisões operacionais',
          'Otimize alocação de esforço',
        ],
        buttonLabel: 'Calcular impacto',
        buttonVariant: 'default',
        featured: true,
      },
      {
        slug: 'simulador-desconto-justo',
        title: 'Desconto justo',
        tags: ['À vista vs parcelado', 'Taxa implícita', 'Base financeira'],
        bullets: [
          'Compare pagamento à vista vs parcelado',
          'Calcule taxa implícita',
          'Tome decisão com base financeira',
        ],
        buttonLabel: 'Ver análise',
        buttonVariant: 'outline',
      },
      {
        slug: 'econograph',
        title: 'Histórico de índices econômicos',
        tags: ['Indicadores', 'Dados históricos', 'Macroeconomia'],
        bullets: [
          'Consulte evolução de indicadores',
          'Apoie decisões em dados históricos',
          'Entenda contexto macroeconômico',
        ],
        buttonLabel: 'Consultar dados',
        buttonVariant: 'outline',
      },
    ],
  },
];
