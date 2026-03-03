import React from 'react';
import { 
  ShoppingCart, 
  Heart, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Bell,
  TrendingUp,
  AlertCircle,
  Package,
  Plane,
  FileText,
  MinusCircle,
  PlusCircle,
  Eye,
  Gift,
  Calendar,
  Users,
  DollarSign,
  Smile,
  Target,
  Rocket,
  Building2,
  Car,
  PiggyBank,
  Shield,
  ArrowRightLeft,
  Wallet,
  CreditCard,
  Receipt,
  Fuel,
  Wrench,
  BarChart3,
  LineChart,
  Layers,
  Sparkles,
  Lightbulb,
  Star,
  RefreshCw,
  Lock,
  Calculator,
  TrendingDown
} from 'lucide-react';
import { PageHelpSlideContent } from '@/components/shared/PageHelpSlideDialog';

export const PAGE_HELP_SLIDE_CONTENT: Record<string, PageHelpSlideContent> = {
  // ========== BENS E INVESTIMENTOS ==========
  bensInvestimentos: {
    title: 'Bens e Investimentos',
    icon: <Building2 className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Seu Patrimônio Completo',
        content: 'Controle imóveis, veículos, empresas e investimentos em um só lugar. Saiba exatamente quanto você vale.',
        icon: <Building2 className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'O Que Você Pode Cadastrar',
        features: [
          {
            icon: <Building2 className="h-5 w-5" />,
            title: 'Imóveis',
            description: 'Casas, apartamentos, terrenos com valor de mercado atualizado.',
          },
          {
            icon: <Car className="h-5 w-5" />,
            title: 'Veículos',
            description: 'Carros e motos com consulta FIPE integrada e curva de depreciação.',
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            title: 'Investimentos',
            description: 'Renda fixa, ações, fundos, previdência e FGTS consolidados.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Inteligente', variant: 'primary' },
        title: 'Evolução Patrimonial',
        content: 'Acompanhe mês a mês como seu patrimônio cresce ou se deprecia. Projeções automáticas baseadas em índices reais.',
        visualElement: (
          <div className="flex items-end justify-between h-20 gap-1 px-4">
            {[40, 45, 42, 50, 55, 60, 65, 72].map((h, idx) => (
              <div key={idx} className="flex-1 bg-primary/60 rounded-t transition-all" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Balanço Patrimonial',
        content: 'Veja a diferença entre o que você possui (ativos) e o que deve (passivos). O resultado é seu patrimônio líquido real.',
        bulletPoints: [
          { icon: <TrendingUp className="h-4 w-4" />, text: 'Ativos: Imóveis + Veículos + Investimentos' },
          { icon: <TrendingDown className="h-4 w-4" />, text: 'Passivos: Financiamentos + Consórcios + Dívidas' },
          { icon: <PiggyBank className="h-4 w-4" />, text: 'Patrimônio Líquido = Ativos - Passivos' },
        ],
      },
      {
        type: 'conclusion',
        title: 'Conhecimento é Poder',
        content: 'Quem conhece seu patrimônio toma melhores decisões. Comece cadastrando seus bens agora.',
        icon: <Star className="h-6 w-6" />,
      },
    ],
  },

  // ========== MEU IR ==========
  meuIR: {
    title: 'Meu Imposto de Renda',
    icon: <FileText className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Organize Seu IR ao Longo do Ano',
        content: 'Chega de correria em abril! Reúna comprovantes, simule impostos e declare com tranquilidade.',
        icon: <FileText className="h-8 w-8" />,
      },
      {
        type: 'feature',
        badge: { text: 'Assistente IA', variant: 'success' },
        title: 'Chat Fiscal Inteligente',
        content: 'Tire dúvidas sobre deduções, categorias e documentos necessários. O assistente guia você passo a passo.',
        visualElement: (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex gap-2 items-start">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs bg-primary/10 rounded-lg p-2">"Despesas médicas de dependentes podem ser deduzidas?"</p>
            </div>
            <div className="flex gap-2 items-start justify-end">
              <p className="text-xs bg-muted rounded-lg p-2">"Sim! Gastos com saúde de dependentes são dedutíveis sem limite..."</p>
            </div>
          </div>
        ),
      },
      {
        type: 'steps',
        title: 'Comprovantes Organizados',
        features: [
          {
            icon: <Receipt className="h-5 w-5" />,
            title: 'Saúde',
            description: 'Consultas, exames, planos - tudo categorizado automaticamente.',
          },
          {
            icon: <Users className="h-5 w-5" />,
            title: 'Educação',
            description: 'Mensalidades escolares e cursos com limite anual calculado.',
          },
          {
            icon: <Heart className="h-5 w-5" />,
            title: 'Doações',
            description: 'Incentivos fiscais para projetos sociais e culturais.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Simulador', variant: 'warning' },
        title: 'Quanto Vou Pagar ou Receber?',
        content: 'Simule seu imposto a qualquer momento. Veja se terá restituição ou imposto a pagar antes da declaração oficial.',
        visualElement: (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-income/10 rounded-full text-income font-semibold">
              <TrendingUp className="h-4 w-4" />
              Restituição estimada: R$ 2.450
            </div>
          </div>
        ),
      },
      {
        type: 'conclusion',
        title: 'Declare com Confiança',
        content: 'Organize durante o ano, declare em minutos. Seu IR nunca mais será uma dor de cabeça.',
        icon: <CheckCircle2 className="h-6 w-6" />,
      },
    ],
  },

  // ========== FLUXO FINANCEIRO ==========
  fluxoFinanceiro: {
    title: 'Fluxo Financeiro',
    icon: <ArrowRightLeft className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Controle Total do Seu Dinheiro',
        content: 'Registre contas a pagar, a receber e lançamentos realizados. Nunca mais perca um vencimento.',
        icon: <ArrowRightLeft className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'Três Visões Essenciais',
        features: [
          {
            icon: <TrendingDown className="h-5 w-5" />,
            title: 'A Pagar',
            description: 'Boletos, faturas e compromissos futuros com alertas de vencimento.',
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            title: 'A Receber',
            description: 'Salários, aluguéis e receitas esperadas no mês.',
          },
          {
            icon: <CheckCircle2 className="h-5 w-5" />,
            title: 'Realizados',
            description: 'Histórico de tudo que já foi pago ou recebido.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Automático', variant: 'success' },
        title: 'Contas Recorrentes',
        content: 'Cadastre uma vez, repita automaticamente. Aluguel, internet, streaming - tudo no piloto automático.',
        visualElement: (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="text-sm">📱 Internet</span>
              <span className="text-xs text-muted-foreground">Todo dia 10</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="text-sm">🏠 Aluguel</span>
              <span className="text-xs text-muted-foreground">Todo dia 5</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="text-sm">🎬 Streaming</span>
              <span className="text-xs text-muted-foreground">Todo dia 15</span>
            </div>
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Status Visual Imediato',
        content: 'Cores indicam a situação de cada conta. Verde, amarelo ou vermelho - você sabe na hora.',
        bulletPoints: [
          { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Pago: Conta quitada com sucesso' },
          { icon: <Clock className="h-4 w-4" />, text: 'A vencer: Próximo de 7 dias' },
          { icon: <AlertCircle className="h-4 w-4" />, text: 'Vencido: Requer atenção imediata' },
        ],
      },
      {
        type: 'conclusion',
        title: 'Fluxo Sob Controle',
        content: 'Saiba o que entra e o que sai. Evite surpresas e multas por esquecimento.',
        icon: <Wallet className="h-6 w-6" />,
      },
    ],
  },

  // ========== GESTÃO DE VEÍCULOS ==========
  gestaoVeiculos: {
    title: 'Gestão de Veículos',
    icon: <Car className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Quanto Seu Carro Realmente Custa?',
        content: 'Registre combustível, manutenções e despesas. Descubra o custo real por km rodado.',
        icon: <Car className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'Três Tipos de Registro',
        features: [
          {
            icon: <Fuel className="h-5 w-5" />,
            title: 'Abastecimentos',
            description: 'Litros, preço e km rodado. Calcule o consumo médio automaticamente.',
          },
          {
            icon: <Wrench className="h-5 w-5" />,
            title: 'Manutenções',
            description: 'Revisões, trocas de óleo, pneus e reparos preventivos.',
          },
          {
            icon: <Receipt className="h-5 w-5" />,
            title: 'Despesas',
            description: 'IPVA, seguro, licenciamento, multas e estacionamento.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Por Motorista', variant: 'primary' },
        title: 'Controle por Condutor',
        content: 'Famílias com mais de um motorista? Saiba quem gasta mais e onde estão os excessos.',
        visualElement: (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="text-sm">👨 João</span>
              <span className="text-sm font-semibold">R$ 850/mês</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="text-sm">👩 Maria</span>
              <span className="text-sm font-semibold">R$ 620/mês</span>
            </div>
          </div>
        ),
      },
      {
        type: 'feature',
        badge: { text: 'Relatórios', variant: 'success' },
        title: 'Análises Visuais',
        content: 'Gráficos de consumo, custo por categoria e evolução mensal. Dados para decisões inteligentes.',
        visualElement: (
          <div className="flex items-end justify-between h-16 gap-2 px-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-8 bg-primary/60 rounded-t"></div>
              <span className="text-[10px] text-center text-muted-foreground">Comb.</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-5 bg-warning/60 rounded-t"></div>
              <span className="text-[10px] text-center text-muted-foreground">Manut.</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-4 bg-expense/60 rounded-t"></div>
              <span className="text-[10px] text-center text-muted-foreground">Desp.</span>
            </div>
          </div>
        ),
      },
      {
        type: 'conclusion',
        title: 'Decisão na Hora Certa',
        content: 'Saiba quando vale a pena trocar de carro ou manter o atual. Dados reais, não achismo.',
        icon: <BarChart3 className="h-6 w-6" />,
      },
    ],
  },

  // ========== SEGUROS ==========
  seguros: {
    title: 'Seguros',
    icon: <Shield className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Proteção Organizada',
        content: 'Centralize todas as suas apólices. Auto, residência, vida, saúde - tudo em um painel.',
        icon: <Shield className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'Tipos de Seguro',
        features: [
          {
            icon: <Car className="h-5 w-5" />,
            title: 'Veículos',
            description: 'Seguro auto com alertas de renovação e comparativo de coberturas.',
          },
          {
            icon: <Building2 className="h-5 w-5" />,
            title: 'Residência',
            description: 'Proteção patrimonial para sua casa ou apartamento.',
          },
          {
            icon: <Heart className="h-5 w-5" />,
            title: 'Vida e Saúde',
            description: 'Seguros de vida, planos de saúde e garantias estendidas.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Alertas', variant: 'warning' },
        title: 'Nunca Esqueça uma Renovação',
        content: 'Receba lembretes antes do vencimento. Evite ficar descoberto por esquecimento.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border-l-4 border-warning">
            <Bell className="h-5 w-5 text-warning" />
            <div className="text-sm">
              <p className="font-medium text-warning">Atenção!</p>
              <p className="text-muted-foreground">Seguro Auto vence em 15 dias</p>
            </div>
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Visão Consolidada',
        content: 'Veja quanto gasta anualmente com proteção e identifique gaps de cobertura.',
        bulletPoints: [
          { icon: <DollarSign className="h-4 w-4" />, text: 'Custo anual total de seguros' },
          { icon: <Shield className="h-4 w-4" />, text: 'Bens protegidos vs. descobertos' },
          { icon: <Calendar className="h-4 w-4" />, text: 'Calendário de renovações' },
        ],
      },
      {
        type: 'conclusion',
        title: 'Tranquilidade Garantida',
        content: 'Patrimônio protegido é patrimônio seguro. Organize seus seguros agora.',
        icon: <Lock className="h-6 w-6" />,
      },
    ],
  },

  // ========== PLANEJAMENTO MENSAL ==========
  planejamentoMensal: {
    title: 'Planejamento Mensal',
    icon: <Calendar className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Seu Orçamento Mês a Mês',
        content: 'Planeje receitas e despesas, compare previsto vs. realizado e ajuste em tempo real.',
        icon: <Calendar className="h-8 w-8" />,
      },
      {
        type: 'feature',
        badge: { text: 'Visual', variant: 'primary' },
        title: 'Planilha Interativa',
        content: 'Edite valores diretamente na tabela. Veja o impacto no saldo imediatamente.',
        visualElement: (
          <div className="grid grid-cols-4 gap-1 p-2 text-xs">
            <div className="p-1 bg-muted/50 rounded text-center font-medium">Item</div>
            <div className="p-1 bg-muted/50 rounded text-center font-medium">Jan</div>
            <div className="p-1 bg-muted/50 rounded text-center font-medium">Fev</div>
            <div className="p-1 bg-muted/50 rounded text-center font-medium">Mar</div>
            <div className="p-1 text-muted-foreground">Salário</div>
            <div className="p-1 text-income text-center">5.000</div>
            <div className="p-1 text-income text-center">5.000</div>
            <div className="p-1 text-income text-center">5.200</div>
            <div className="p-1 text-muted-foreground">Aluguel</div>
            <div className="p-1 text-expense text-center">1.500</div>
            <div className="p-1 text-expense text-center">1.500</div>
            <div className="p-1 text-expense text-center">1.500</div>
          </div>
        ),
      },
      {
        type: 'steps',
        title: 'Funcionalidades Chave',
        features: [
          {
            icon: <Layers className="h-5 w-5" />,
            title: 'Agrupamento Flexível',
            description: 'Organize por forma de pagamento, categoria ou responsável.',
          },
          {
            icon: <RefreshCw className="h-5 w-5" />,
            title: 'Projeções Automáticas',
            description: 'Baseadas em histórico, médias ou valores fixos.',
          },
          {
            icon: <Target className="h-5 w-5" />,
            title: 'Metas Integradas',
            description: 'Compare seu planejamento com as metas definidas.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Consolidação', variant: 'success' },
        title: 'Feche o Mês com Precisão',
        content: 'Ao final de cada mês, consolide os valores realizados. Histórico vira referência para projeções futuras.',
        visualElement: (
          <div className="text-center py-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-income/10 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-income" />
              <span className="text-sm font-medium text-income">Janeiro consolidado!</span>
            </div>
          </div>
        ),
      },
      {
        type: 'conclusion',
        title: 'Orçamento é Liberdade',
        content: 'Quem planeja gasta melhor. Comece a organizar seu mês agora.',
        icon: <Calculator className="h-6 w-6" />,
      },
    ],
  },

  // ========== PROJEÇÃO 30 ANOS ==========
  projecao30Anos: {
    title: 'Projeção 30 Anos',
    icon: <LineChart className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Visualize Seu Futuro Financeiro',
        content: 'Projete seu patrimônio e fluxo de caixa para as próximas décadas. Juros compostos em ação.',
        icon: <LineChart className="h-8 w-8" />,
      },
      {
        type: 'feature',
        badge: { text: 'Índices Reais', variant: 'primary' },
        title: 'Baseado em Dados Históricos',
        content: 'Use IPCA, CDI, IGP-M ou Ibovespa como referência. Médias dos últimos 5, 10 ou 15 anos.',
        visualElement: (
          <div className="grid grid-cols-2 gap-2 p-2">
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-xs text-muted-foreground">IPCA</p>
              <p className="text-sm font-bold">5.2% a.a.</p>
            </div>
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-xs text-muted-foreground">CDI</p>
              <p className="text-sm font-bold">10.8% a.a.</p>
            </div>
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-xs text-muted-foreground">IGP-M</p>
              <p className="text-sm font-bold">6.5% a.a.</p>
            </div>
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-xs text-muted-foreground">Ibovespa</p>
              <p className="text-sm font-bold">8.3% a.a.</p>
            </div>
          </div>
        ),
      },
      {
        type: 'feature',
        badge: { text: 'Gráfico', variant: 'success' },
        title: 'Evolução Visual do Patrimônio',
        content: 'Veja como seus bens, investimentos e dívidas evoluem ao longo dos anos.',
        visualElement: (
          <div className="flex items-end justify-between h-20 gap-1 px-2">
            {[15, 18, 22, 28, 35, 45, 58, 75, 95].map((h, idx) => (
              <div key={idx} className={`flex-1 rounded-t transition-all ${idx < 3 ? 'bg-muted' : 'bg-primary/60'}`} style={{ height: `${h}%` }}></div>
            ))}
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Cenários Comparativos',
        content: 'Simule diferentes taxas de retorno e veja o impacto em 30 anos.',
        bulletPoints: [
          { icon: <TrendingUp className="h-4 w-4" />, text: 'Cenário otimista: CDI + 2%' },
          { icon: <Target className="h-4 w-4" />, text: 'Cenário base: IPCA + 4%' },
          { icon: <TrendingDown className="h-4 w-4" />, text: 'Cenário conservador: IPCA' },
        ],
      },
      {
        type: 'conclusion',
        title: 'Pense no Longo Prazo',
        content: 'O tempo é seu maior aliado. Comece a projetar agora e colha os frutos no futuro.',
        icon: <Rocket className="h-6 w-6" />,
      },
    ],
  },

  // ========== SONHOS ==========
  sonhos: {
    title: 'Sonhos',
    icon: <Target className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Transforme Desejos em Metas',
        content: 'Carro novo, viagem, casa própria - tudo com prazo, valor e acompanhamento de progresso.',
        icon: <Target className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'Como Funciona',
        features: [
          {
            icon: <Star className="h-5 w-5" />,
            title: '1. Defina o Sonho',
            description: 'Nome, valor total e data limite para realização.',
          },
          {
            icon: <PiggyBank className="h-5 w-5" />,
            title: '2. Registre o Acumulado',
            description: 'Quanto você já tem guardado para esse objetivo.',
          },
          {
            icon: <Calculator className="h-5 w-5" />,
            title: '3. Calcule o Mensal',
            description: 'Sistema calcula quanto poupar por mês automaticamente.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Visual', variant: 'primary' },
        title: 'Linha do Tempo dos Sonhos',
        content: 'Veja todos os seus objetivos ordenados por data. Acompanhe o progresso de cada um.',
        visualElement: (
          <div className="relative py-4 px-2">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
            <div className="space-y-3 pl-8">
              <div className="relative flex items-center gap-2">
                <div className="absolute -left-8 w-3 h-3 rounded-full bg-income border-2 border-background"></div>
                <span className="text-lg">🚗</span>
                <span className="text-sm">Carro Novo</span>
              </div>
              <div className="relative flex items-center gap-2">
                <div className="absolute -left-8 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                <span className="text-lg">✈️</span>
                <span className="text-sm">Viagem Europa</span>
              </div>
              <div className="relative flex items-center gap-2">
                <div className="absolute -left-8 w-3 h-3 rounded-full bg-warning border-2 border-background"></div>
                <span className="text-lg">🏠</span>
                <span className="text-sm">Casa Própria</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        type: 'feature',
        badge: { text: 'Consistência', variant: 'success' },
        title: 'Verificação de Patrimônio',
        content: 'O sistema alerta se o total acumulado nos sonhos for maior que seu patrimônio cadastrado.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border-l-4 border-warning">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-xs text-muted-foreground">Acumulado maior que patrimônio? Verifique seus bens.</p>
          </div>
        ),
      },
      {
        type: 'conclusion',
        title: 'Sonhos Documentados Se Realizam',
        content: 'Saia do "um dia eu vou" para "em X meses eu consigo". Comece agora.',
        icon: <Sparkles className="h-6 w-6" />,
      },
    ],
  },

  // ========== REGISTRO DE COMPRAS (existente) ==========
  registroCompras: {
    title: 'Registro de Compras',
    icon: <ShoppingCart className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Registro de Compras',
        content: 'Controle sua lista de desejos (Wishlist) e acompanhe as aquisições do ano. Transforme impulsos em planejamento.',
        icon: <ShoppingCart className="h-8 w-8" />,
      },
      {
        type: 'steps',
        title: 'O Ciclo da Compra Consciente',
        features: [
          {
            icon: <Heart className="h-5 w-5" />,
            title: '1. Lista de desejos',
            description: 'Centralize seus desejos. Insira o item e valor estimado para tirar a ansiedade da mente.',
          },
          {
            icon: <Clock className="h-5 w-5" />,
            title: '2. Planejamento',
            description: 'Analise seu fluxo financeiro anual e defina o mês perfeito para a compra.',
          },
          {
            icon: <CheckCircle2 className="h-5 w-5" />,
            title: '3. Realização',
            description: 'Concretizou? O item migra para o histórico, atualizando seu patrimônio automaticamente.',
          },
        ],
        quote: 'Não é sobre parar de comprar. É sobre comprar com intenção.',
      },
      {
        type: 'feature',
        badge: { text: 'Automático', variant: 'success' },
        title: 'Sincronia com Open Finance',
        content: 'O RXFin detecta transações no seu cartão via Open Finance e sugere associação com itens da sua lista.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Bell className="h-5 w-5 text-emerald-600" />
            <div className="text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Notificação</p>
              <p className="text-emerald-600 dark:text-emerald-500">"Compra de R$ 3.450 na Vivara. Associar ao item 'Relógio'?"</p>
            </div>
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Controle Orçamentário Visual',
        content: 'Visualize se seus desejos cabem no bolso antes de comprar. Cada categoria mostra o quanto já foi comprometido.',
        bulletPoints: [
          {
            icon: <TrendingUp className="h-4 w-4" />,
            text: 'Eletrônicos: R$ 8.000 de R$ 10.000 (80%)',
          },
          {
            icon: <AlertCircle className="h-4 w-4" />,
            text: 'Vestuário: Limite estourado!',
          },
          {
            icon: <CheckCircle2 className="h-4 w-4" />,
            text: 'Lazer: R$ 2.000 de R$ 5.000 (40%)',
          },
        ],
      },
      {
        type: 'conclusion',
        title: 'Comece Agora',
        content: 'Organize seus sonhos de compra e proteja seu futuro financeiro. Cada item planejado é um impulso evitado.',
        icon: <Rocket className="h-6 w-6" />,
      },
    ],
  },

  // ========== PACOTES DE ORÇAMENTO (existente) ==========
  pacotesOrcamento: {
    title: 'Pacotes de Orçamento',
    icon: <Package className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Pacotes de Orçamento',
        content: 'Imagine sua viagem dos sonhos, de 15 a 22 de janeiro. Defina as datas e o RXFin faz a mágica de acompanhar tudo automaticamente!',
        icon: <Package className="h-8 w-8" />,
      },
      {
        type: 'feature',
        badge: { text: 'Automático', variant: 'success' },
        title: '1. A Mágica do Open Finance',
        content: 'Ao criar seu pacote, o RXFin conecta-se às suas contas via Open Finance.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
            <Zap className="h-5 w-5 text-primary" />
            <p className="text-sm">Qualquer gasto no cartão ou PIX feito durante o período da viagem é identificado e "puxado" automaticamente para dentro do pacote.</p>
          </div>
        ),
      },
      {
        type: 'feature',
        badge: { text: 'Flexibilidade', variant: 'warning' },
        title: '2. "Mas eu paguei a conta de luz..."',
        content: 'Sabemos que a vida real acontece. Se você pagou um boleto de casa durante a viagem, ele pode aparecer no pacote.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
            <MinusCircle className="h-5 w-5 text-red-500" />
            <div className="text-sm">
              <p className="font-medium text-red-700 dark:text-red-400">A Solução</p>
              <p className="text-red-600 dark:text-red-500">Basta um toque para remover manualmente esse gasto. Ele continua no extrato, mas não afeta o orçamento da viagem.</p>
            </div>
          </div>
        ),
      },
      {
        type: 'feature',
        badge: { text: 'Visão Completa', variant: 'primary' },
        title: '3. "E o voo que comprei antes?"',
        content: 'Passagens e hotéis costumam ser pagos meses antes. Para ter o custo real, você precisa deles no pacote.',
        visualElement: (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-400">
            <PlusCircle className="h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">A Solução</p>
              <p className="text-amber-600 dark:text-amber-500">Navegue no histórico e inclua manualmente gastos antigos dentro do seu pacote atual.</p>
            </div>
          </div>
        ),
      },
      {
        type: 'conclusion',
        title: 'Visão 360º de Verdade',
        content: 'Você saberá exatamente quanto custou sua experiência, onde economizou e onde exagerou.',
        icon: <Eye className="h-6 w-6" />,
      },
    ],
  },

  // ========== LISTA DE PRESENTES (existente) ==========
  listaPresentes: {
    title: 'Lista de Presentes',
    icon: <Gift className="h-5 w-5" />,
    slides: [
      {
        type: 'hero',
        title: 'Presentear é um ato de Amor',
        content: 'Mas sem controle, o carinho vira dívida. Vamos transformar suas intenções em planejamento real.',
        icon: <Gift className="h-8 w-8" />,
      },
      {
        type: 'feature',
        badge: { text: 'O Problema', variant: 'danger' },
        title: 'O "Dezembro Vermelho"',
        content: 'Datas comemorativas acontecem todo ano, mas sempre parecem nos pegar de surpresa financeiramente. O resultado? Picos de gastos que destroem seu orçamento mensal.',
        visualElement: (
          <div className="flex items-end justify-between h-24 gap-2 px-4 pt-4">
            {[
              { m: 'Jan', h: 'h-6', danger: false },
              { m: 'Mai', h: 'h-12', danger: true },
              { m: 'Ago', h: 'h-10', danger: true },
              { m: 'Out', h: 'h-10', danger: true },
              { m: 'Dez', h: 'h-full', danger: true },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-full ${bar.h} ${bar.danger ? 'bg-red-400 dark:bg-red-500' : 'bg-muted'} rounded-t transition-all`}></div>
                <span className="text-xs text-muted-foreground mt-1">{bar.m}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        type: 'steps',
        title: 'Passo 1: Organize as Pessoas',
        features: [
          {
            icon: <Users className="h-5 w-5" />,
            title: 'Cadastre pessoas importantes',
            description: 'Família, amigos, colegas de trabalho - todos com suas datas especiais.',
          },
          {
            icon: <Calendar className="h-5 w-5" />,
            title: 'Vincule às ocasiões',
            description: 'Cada pessoa participa de quais datas? Natal, aniversário, Dia das Mães...',
          },
          {
            icon: <DollarSign className="h-5 w-5" />,
            title: 'Defina orçamento por pessoa',
            description: 'Quanto você pretende gastar com cada um em cada ocasião.',
          },
        ],
      },
      {
        type: 'feature',
        badge: { text: 'Mágica', variant: 'success' },
        title: 'Previsibilidade Total',
        content: 'Ao vincular pessoas e datas, criamos uma projeção anual. Você sabe exatamente quanto precisa economizar por mês.',
        visualElement: (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-400 font-semibold animate-pulse">
              <TrendingUp className="h-4 w-4" />
              R$ 150,00 / mês constantes
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Em vez de gastar R$ 1.000 de uma vez em Dezembro, você dilui ao longo do ano.
            </p>
          </div>
        ),
      },
      {
        type: 'comparison',
        title: 'Controle: Pendente vs. Realizado',
        content: 'Acompanhe o que já foi comprado e o que ainda está por vir. Nada é esquecido, nada é surpresa.',
        bulletPoints: [
          {
            icon: <Calendar className="h-4 w-4" />,
            text: 'Visualize os próximos aniversariantes',
          },
          {
            icon: <DollarSign className="h-4 w-4" />,
            text: 'Compare valor Estimado vs. Gasto Real',
          },
          {
            icon: <CheckCircle2 className="h-4 w-4" />,
            text: 'Marque presentes como "Comprado"',
          },
        ],
      },
      {
        type: 'conclusion',
        title: 'Dinheiro organizado, coração tranquilo',
        content: 'Configure sua Lista de Presentes e nunca mais deixe uma data especial virar dor de cabeça.',
        icon: <Smile className="h-6 w-6" />,
      },
    ],
  },
};
