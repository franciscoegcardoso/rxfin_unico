import React from 'react';
import { 
  Calculator, 
  Car, 
  TrendingUp, 
  Target,
  Wallet,
  BarChart3,
  PiggyBank,
  Shield,
  Clock,
  CheckCircle2,
  Lightbulb,
  DollarSign,
  LineChart,
  Percent,
  Scale,
  Calendar,
  FileText,
  TrendingDown
} from 'lucide-react';
import { FeaturePreviewContent, FeatureSlide } from './FeaturePreviewDialog';

// Helper to create standard CTA slide
const createCTASlide = (featureName: string): FeatureSlide => ({
  type: 'cta',
  title: `Receba ${featureName} em primeira mão`,
  content: `Faça seu cadastro agora e garanta acesso vitalício aos simuladores gratuitos. Seja um dos primeiros a usar ${featureName}!`
});

// Simulador: Custo Real por Hora
export const custoHoraContent: FeaturePreviewContent = {
  featureName: 'Custo Real por Hora',
  featureIcon: <Calculator className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Descubra quanto vale seu tempo',
      content: 'Muitas pessoas subestimam o valor real do seu tempo de trabalho. Este simulador revela quanto você realmente ganha por hora trabalhada.'
    },
    {
      type: 'feature',
      title: 'O que você vai descobrir',
      content: 'Calcule seu custo real considerando todos os fatores que impactam seu tempo.',
      bulletPoints: [
        { icon: <DollarSign className="h-4 w-4" />, text: 'Salário líquido real após impostos e deduções' },
        { icon: <Clock className="h-4 w-4" />, text: 'Tempo de deslocamento casa-trabalho' },
        { icon: <Wallet className="h-4 w-4" />, text: 'Gastos relacionados ao trabalho (transporte, alimentação, vestuário)' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Valor real da sua hora considerando tudo' }
      ]
    },
    {
      type: 'benefit',
      title: 'Por que isso importa?',
      content: 'Saber o valor real do seu tempo ajuda a tomar decisões mais inteligentes sobre gastos e investimentos.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Avalie se vale a pena fazer hora extra' },
        { icon: <Scale className="h-4 w-4" />, text: 'Decida quando terceirizar tarefas domésticas' },
        { icon: <Target className="h-4 w-4" />, text: 'Negocie melhor aumentos e propostas de emprego' }
      ]
    },
    createCTASlide('o Simulador de Custo por Hora')
  ]
};

// Simulador: FIPE
export const fipeContent: FeaturePreviewContent = {
  featureName: 'Simulador FIPE',
  featureIcon: <TrendingUp className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Consulta e Projeção FIPE',
      content: 'Consulte valores atualizados da tabela FIPE e projete a depreciação futura do seu veículo com base no histórico real.'
    },
    {
      type: 'feature',
      title: 'Funcionalidades principais',
      content: 'Dados precisos e projeções inteligentes para ajudar na sua decisão.',
      bulletPoints: [
        { icon: <Car className="h-4 w-4" />, text: 'Consulta atualizada da tabela FIPE' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Histórico de depreciação dos últimos 5 anos' },
        { icon: <LineChart className="h-4 w-4" />, text: 'Projeção de valor futuro baseada em dados reais' },
        { icon: <Scale className="h-4 w-4" />, text: 'Comparativo entre modelos similares' }
      ]
    },
    {
      type: 'benefit',
      title: 'Tome decisões embasadas',
      content: 'Entenda o comportamento do mercado automotivo e proteja seu patrimônio.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Saiba o melhor momento para vender seu carro' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Identifique veículos que desvalorizam menos' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Negocie com base em dados concretos' }
      ]
    },
    createCTASlide('o Simulador FIPE')
  ]
};

// Simulador: Comparador Carro A vs B
export const comparativoCarrosContent: FeaturePreviewContent = {
  featureName: 'Comparador: Carro A vs B',
  featureIcon: <Target className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Compare veículos de forma inteligente',
      content: 'Descubra qual carro é o melhor investimento considerando não apenas o preço, mas o custo total de propriedade.'
    },
    {
      type: 'feature',
      title: 'Análise completa lado a lado',
      content: 'Compare dois ou mais veículos considerando todos os custos envolvidos.',
      bulletPoints: [
        { icon: <Wallet className="h-4 w-4" />, text: 'Custo de aquisição e financiamento' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'IPVA, seguro e documentação' },
        { icon: <Car className="h-4 w-4" />, text: 'Consumo e manutenção estimada' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Projeção de depreciação' }
      ]
    },
    {
      type: 'benefit',
      title: 'O resultado pode te surpreender',
      content: 'Muitas vezes o carro mais barato acaba custando mais no longo prazo.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Visão de custo total em 3, 5 e 10 anos' },
        { icon: <Target className="h-4 w-4" />, text: 'Ranking de melhor custo-benefício' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Recomendação personalizada' }
      ]
    },
    createCTASlide('o Comparativo de Carros')
  ]
};

// Simulador: Desconto Justo
export const descontoJustoContent: FeaturePreviewContent = {
  featureName: 'Desconto Justo',
  featureIcon: <Wallet className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Calcule o desconto real',
      content: 'Descubra se aquele "super desconto" à vista realmente compensa ou se você está perdendo dinheiro.'
    },
    {
      type: 'feature',
      title: 'Análise inteligente de descontos',
      content: 'Compare o desconto oferecido com o que seu dinheiro renderia aplicado.',
      bulletPoints: [
        { icon: <Percent className="h-4 w-4" />, text: 'Cálculo do desconto real considerando inflação' },
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Comparativo com rendimento de aplicações' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Valor presente do pagamento parcelado' },
        { icon: <Target className="h-4 w-4" />, text: 'Recomendação: à vista ou parcelado?' }
      ]
    },
    {
      type: 'benefit',
      title: 'Nunca mais caia em armadilhas',
      content: 'Entenda quando o parcelamento "sem juros" é na verdade a melhor opção.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Saiba negociar descontos maiores' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Entenda o custo real do dinheiro no tempo' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Tome decisões financeiras mais inteligentes' }
      ]
    },
    createCTASlide('o Simulador de Desconto Justo')
  ]
};

// Simulador: Financiamento
export const financiamentoContent: FeaturePreviewContent = {
  featureName: 'Simulador de Financiamento',
  featureIcon: <BarChart3 className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Entenda o custo real do financiamento',
      content: 'Descubra quanto você realmente vai pagar e qual o melhor caminho para realizar seu objetivo.'
    },
    {
      type: 'feature',
      title: 'Simulação completa e transparente',
      content: 'Visualize todos os custos envolvidos em um financiamento.',
      bulletPoints: [
        { icon: <Calculator className="h-4 w-4" />, text: 'Cálculo de parcelas e CET (Custo Efetivo Total)' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Comparativo entre diferentes prazos' },
        { icon: <BarChart3 className="h-4 w-4" />, text: 'Tabela SAC vs Tabela Price' },
        { icon: <LineChart className="h-4 w-4" />, text: 'Simulação de amortização antecipada' }
      ]
    },
    {
      type: 'benefit',
      title: 'Economize milhares de reais',
      content: 'Pequenas diferenças na taxa podem significar grandes economias.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Descubra o melhor prazo para seu bolso' },
        { icon: <Target className="h-4 w-4" />, text: 'Entenda quando vale a pena antecipar parcelas' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Negocie melhores condições com os bancos' }
      ]
    },
    createCTASlide('o Simulador de Financiamento')
  ]
};

// Features: Lançamentos (anteriormente Fluxo Financeiro)
export const fluxoFinanceiroContent: FeaturePreviewContent = {
  featureName: 'Lançamentos',
  featureIcon: <BarChart3 className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Controle total das suas finanças',
      content: 'Gerencie contas a pagar e receber com visão clara do seu fluxo de caixa mensal e anual.'
    },
    {
      type: 'feature',
      title: 'Organização simplificada',
      content: 'Cadastre suas receitas e despesas fixas e variáveis de forma intuitiva.',
      bulletPoints: [
        { icon: <Calendar className="h-4 w-4" />, text: 'Visão mensal e anual do fluxo de caixa' },
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Projeção de saldo futuro' },
        { icon: <Target className="h-4 w-4" />, text: 'Alertas de contas a vencer' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Categorização automática inteligente' }
      ]
    },
    {
      type: 'benefit',
      title: 'Nunca mais seja pego de surpresa',
      content: 'Saiba exatamente quanto vai sobrar (ou faltar) nos próximos meses.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Planeje compras maiores com segurança' },
        { icon: <Shield className="h-4 w-4" />, text: 'Evite o cheque especial e juros do cartão' },
        { icon: <PiggyBank className="h-4 w-4" />, text: 'Identifique oportunidades de economia' }
      ]
    },
    createCTASlide('os Lançamentos')
  ]
};

// Features: Planejamento de Metas
export const planejamentoMetasContent: FeaturePreviewContent = {
  featureName: 'Planejamento de Metas',
  featureIcon: <Target className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Transforme sonhos em realidade',
      content: 'Defina suas metas financeiras e acompanhe seu progresso com planos de ação concretos.'
    },
    {
      type: 'feature',
      title: 'Sistema inteligente de metas',
      content: 'Crie e gerencie objetivos de curto, médio e longo prazo.',
      bulletPoints: [
        { icon: <Target className="h-4 w-4" />, text: 'Metas SMART com prazos e valores definidos' },
        { icon: <LineChart className="h-4 w-4" />, text: 'Acompanhamento visual do progresso' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Cálculo automático de quanto poupar por mês' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Celebração de conquistas' }
      ]
    },
    {
      type: 'benefit',
      title: 'Motivação para continuar',
      content: 'Ver seu progresso é o combustível para manter a disciplina financeira.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Visualize o caminho até sua meta' },
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Ajuste planos conforme sua realidade' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Histórico de metas alcançadas' }
      ]
    },
    createCTASlide('o Planejamento de Metas')
  ]
};

// Features: Balanço Patrimonial
export const balancoPatrimonialContent: FeaturePreviewContent = {
  featureName: 'Balanço Patrimonial',
  featureIcon: <PiggyBank className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Seu patrimônio em um só lugar',
      content: 'Consolide todos os seus bens, investimentos e dívidas para ter uma visão completa da sua saúde financeira.'
    },
    {
      type: 'feature',
      title: 'Visão 360° do seu patrimônio',
      content: 'Cadastre e acompanhe a evolução de todos os seus ativos.',
      bulletPoints: [
        { icon: <Car className="h-4 w-4" />, text: 'Veículos com valor atualizado pela FIPE' },
        { icon: <PiggyBank className="h-4 w-4" />, text: 'Investimentos e aplicações' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Imóveis e outros bens' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Dívidas e financiamentos' }
      ]
    },
    {
      type: 'benefit',
      title: 'Acompanhe sua evolução',
      content: 'Veja seu patrimônio líquido crescer mês a mês.',
      bulletPoints: [
        { icon: <LineChart className="h-4 w-4" />, text: 'Gráfico de evolução patrimonial' },
        { icon: <Target className="h-4 w-4" />, text: 'Metas de patrimônio líquido' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Alertas de depreciação e vencimentos' }
      ]
    },
    createCTASlide('o Balanço Patrimonial')
  ]
};

// Features: Gestão de Veículos
export const gestaoVeiculosContent: FeaturePreviewContent = {
  featureName: 'Gestão de Veículos',
  featureIcon: <Car className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Controle completo dos seus veículos',
      content: 'Gerencie custos, manutenções, depreciação e histórico de todos os seus veículos em um só lugar.'
    },
    {
      type: 'feature',
      title: 'Gestão profissional de frota pessoal',
      content: 'Todas as informações do seu veículo organizadas.',
      bulletPoints: [
        { icon: <Car className="h-4 w-4" />, text: 'Ficha completa do veículo com FIPE integrada' },
        { icon: <Calendar className="h-4 w-4" />, text: 'Histórico de manutenções e revisões' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Controle de abastecimento e consumo' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Projeção de depreciação' }
      ]
    },
    {
      type: 'benefit',
      title: 'Decisões mais inteligentes',
      content: 'Saiba exatamente quanto seu carro custa e quando é hora de trocar.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Custo por km rodado' },
        { icon: <Target className="h-4 w-4" />, text: 'Alertas de manutenção preventiva' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Histórico para revenda' }
      ]
    },
    createCTASlide('a Gestão de Veículos')
  ]
};

// Features: Organização para o IR
export const organizacaoIRContent: FeaturePreviewContent = {
  featureName: 'Organização para o IR',
  featureIcon: <Shield className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Imposto de Renda sem dor de cabeça',
      content: 'Mantenha seus dados organizados durante o ano e simplifique a declaração do Imposto de Renda.'
    },
    {
      type: 'feature',
      title: 'Preparação durante o ano todo',
      content: 'Organize documentos e informações conforme acontecem.',
      bulletPoints: [
        { icon: <FileText className="h-4 w-4" />, text: 'Armazenamento de comprovantes e recibos' },
        { icon: <PiggyBank className="h-4 w-4" />, text: 'Investimentos sempre atualizados' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Rendimentos e pagamentos catalogados' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Checklist de documentos necessários' }
      ]
    },
    {
      type: 'benefit',
      title: 'Menos estresse, mais restituição',
      content: 'Dados organizados ajudam a não perder deduções permitidas.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Identifique todas as deduções possíveis' },
        { icon: <Target className="h-4 w-4" />, text: 'Exportação para o programa da Receita' },
        { icon: <Shield className="h-4 w-4" />, text: 'Histórico de declarações anteriores' }
      ]
    },
    createCTASlide('a Organização para o IR')
  ]
};

// Features: Projeção de 30 Anos
export const projecao30AnosContent: FeaturePreviewContent = {
  featureName: 'Projeção de 30 Anos',
  featureIcon: <Clock className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Visualize seu futuro financeiro',
      content: 'Projete cenários de longo prazo baseados em índices econômicos reais e seus hábitos atuais.'
    },
    {
      type: 'feature',
      title: 'Simulações realistas',
      content: 'Cenários que consideram inflação, rendimentos e mudanças de vida.',
      bulletPoints: [
        { icon: <LineChart className="h-4 w-4" />, text: 'Projeção de patrimônio ano a ano' },
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Cenários otimista, realista e pessimista' },
        { icon: <Target className="h-4 w-4" />, text: 'Planejamento para aposentadoria' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Impacto de decisões no longo prazo' }
      ]
    },
    {
      type: 'benefit',
      title: 'Pequenas mudanças, grandes resultados',
      content: 'Veja como pequenos ajustes hoje impactam seu futuro.',
      bulletPoints: [
        { icon: <Lightbulb className="h-4 w-4" />, text: 'Simule aumento de aportes' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Projete herança e independência financeira' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Defina marcos importantes' }
      ]
    },
    createCTASlide('a Projeção de 30 Anos')
  ]
};

// Map feature names to content
export const featureContentMap: Record<string, FeaturePreviewContent> = {
  // Simulators
  'Custo Real por Hora': custoHoraContent,
  'Simulador FIPE': fipeContent,
  'Comparativo de Carros': comparativoCarrosContent,
  'Desconto Justo': descontoJustoContent,
  'Financiamento': financiamentoContent,
  
  // Features
  'Lançamentos': fluxoFinanceiroContent,
  'Planejamento de Metas': planejamentoMetasContent,
  'Balanço Patrimonial': balancoPatrimonialContent,
  'Gestão de Veículos': gestaoVeiculosContent,
  'Organização para o IR': organizacaoIRContent,
  'Projeção de 30 Anos': projecao30AnosContent,
};
