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
  TrendingDown,
  Layers,
  Brain,
  Plug,
  Gift,
  ShoppingBag,
  Package
} from 'lucide-react';
import { FeaturePreviewContent, FeatureSlide } from './FeaturePreviewDialog';

const createCTASlide = (featureName: string): FeatureSlide => ({
  type: 'cta',
  title: `Receba ${featureName} em primeira mão`,
  content: `Faça seu cadastro agora e garanta acesso vitalício aos simuladores gratuitos. Seja um dos primeiros a usar ${featureName}!`
});

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

export const comparativoCarrosContent: FeaturePreviewContent = {
  featureName: 'Comparativo de Carros',
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

export const fluxoFinanceiroContent: FeaturePreviewContent = {
  featureName: 'Fluxo Financeiro Inteligente',
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
    createCTASlide('o Fluxo Financeiro Inteligente')
  ]
};

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
        { icon: <PiggyBank className="h-4 w-4" />, text: 'Bens e direitos sempre atualizados' },
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

export const aiMentorContent: FeaturePreviewContent = {
  featureName: 'Mentor de Bolso (IA)',
  featureIcon: <Lightbulb className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'IA que encontra vazamentos e sugere ajustes',
      content: 'Identifique gastos invisíveis e receba recomendações práticas.'
    },
    {
      type: 'feature',
      title: 'Como funciona',
      content: 'A IA analisa seus dados financeiros e gera recomendações práticas.',
      bulletPoints: [
        { icon: <DollarSign className="h-4 w-4" />, text: 'Detecta gastos recorrentes desnecessários' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Identifica padrões de vazamento de dinheiro' },
        { icon: <Target className="h-4 w-4" />, text: 'Sugere ajustes concretos para economizar' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Acompanha o impacto das mudanças' }
      ]
    },
    createCTASlide('o Mentor de Bolso')
  ]
};

export const openFinanceContent: FeaturePreviewContent = {
  featureName: 'Conexão Automática',
  featureIcon: <LineChart className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Conecte bancos e cartões com segurança',
      content: '+300 bancos e fintechs conectados via Open Finance.'
    },
    {
      type: 'feature',
      title: 'Integração segura',
      content: 'Conecte suas contas de forma rápida e protegida.',
      bulletPoints: [
        { icon: <Shield className="h-4 w-4" />, text: 'Conexão via Open Finance regulamentado pelo Banco Central' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Importação automática de transações' },
        { icon: <Calendar className="h-4 w-4" />, text: 'Sincronização contínua de saldos' },
        { icon: <Target className="h-4 w-4" />, text: 'Você controla o que conecta e compartilha' }
      ]
    },
    createCTASlide('a Conexão Automática')
  ]
};

export const custoCarroContent: FeaturePreviewContent = {
  featureName: 'Custo do seu carro',
  featureIcon: <Car className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Quanto realmente custa seu carro?',
      content: 'A maioria subestima em até 40%. Descubra todos os custos visíveis e invisíveis de manter seu veículo.'
    },
    {
      type: 'feature',
      title: 'Análise completa de custos',
      content: 'Calcule o custo real considerando todos os fatores que impactam seu bolso.',
      bulletPoints: [
        { icon: <Car className="h-4 w-4" />, text: 'IPVA, seguro, licenciamento e documentação' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Combustível, manutenção e revisões' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Depreciação e perda de valor no tempo' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Custo de oportunidade do capital investido' }
      ]
    },
    {
      type: 'benefit',
      title: 'O resultado pode te surpreender',
      content: 'Descubra quanto seu carro realmente custa por mês e por km rodado.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Custo mensal real detalhado' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Custo por km rodado' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Comparativo com alternativas de transporte' }
      ]
    },
    createCTASlide('o Simulador de Custo do Carro')
  ]
};

export const custoOportunidadeCarroContent: FeaturePreviewContent = {
  featureName: 'Custo de oportunidade do seu carro',
  featureIcon: <TrendingUp className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Quanto seu carro custa em oportunidades perdidas?',
      content: 'Descubra o que seu dinheiro renderia se estivesse investido em vez de parado no carro.'
    },
    {
      type: 'feature',
      title: 'Simulação de custo de oportunidade',
      content: 'Compare o patrimônio investido no veículo versus aplicações financeiras.',
      bulletPoints: [
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Rendimento do valor do carro se aplicado' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Impacto da depreciação no patrimônio' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Custo real incluindo oportunidade perdida' },
        { icon: <Target className="h-4 w-4" />, text: 'Comparação em horizonte de 5 e 10 anos' }
      ]
    },
    {
      type: 'benefit',
      title: 'Decisões mais inteligentes',
      content: 'Entenda se vale a pena manter o carro ou buscar alternativas.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Visualize o impacto real no seu patrimônio' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Saiba o melhor momento para trocar' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Compare com aplicações de renda fixa e variável' }
      ]
    },
    createCTASlide('o Simulador de Custo de Oportunidade')
  ]
};

export const carroVsAlternativasContent: FeaturePreviewContent = {
  featureName: 'Carro próprio Vs Alternativas',
  featureIcon: <Target className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Carro próprio ou alternativas de transporte?',
      content: 'Compare o custo real de ter carro próprio com alternativas como Uber, aluguel e transporte público.'
    },
    {
      type: 'feature',
      title: 'Comparação completa',
      content: 'Analise todos os cenários para tomar a melhor decisão.',
      bulletPoints: [
        { icon: <Car className="h-4 w-4" />, text: 'Custo total do carro próprio por mês' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Custo mensal com Uber/99 baseado no seu perfil' },
        { icon: <Calculator className="h-4 w-4" />, text: 'Aluguel de carro por demanda' },
        { icon: <Target className="h-4 w-4" />, text: 'Mix ideal de transporte para seu perfil' }
      ]
    },
    {
      type: 'benefit',
      title: 'Economize sem perder mobilidade',
      content: 'Muitas pessoas economizariam milhares de reais por ano repensando o transporte.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Descubra se o carro próprio faz sentido pra você' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Simule com base no seu km mensal' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Veja quanto sobraria para investir' }
      ]
    },
    createCTASlide('o Simulador Carro vs Alternativas')
  ]
};

export const consorcioVsFinanciamentoContent: FeaturePreviewContent = {
  featureName: 'Consórcio Vs Financiamento',
  featureIcon: <BarChart3 className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Consórcio ou financiamento: qual compensa mais?',
      content: 'Compare lado a lado os custos reais e descubra a melhor opção para o seu objetivo.'
    },
    {
      type: 'feature',
      title: 'Simulação completa e transparente',
      content: 'Entenda os custos escondidos de cada modalidade.',
      bulletPoints: [
        { icon: <Calculator className="h-4 w-4" />, text: 'CET real do financiamento (juros + taxas)' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Taxa de administração total do consórcio' },
        { icon: <BarChart3 className="h-4 w-4" />, text: 'Comparativo de parcelas e valor final pago' },
        { icon: <Clock className="h-4 w-4" />, text: 'Prazo médio para contemplação vs entrega imediata' }
      ]
    },
    {
      type: 'benefit',
      title: 'Faça a escolha certa',
      content: 'Cada perfil tem uma opção ideal. Descubra a sua.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Valor total pago em cada modalidade' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Simulação de lances no consórcio' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Recomendação personalizada' }
      ]
    },
    createCTASlide('o Simulador Consórcio vs Financiamento')
  ]
};

export const renegociacaoDividasContent: FeaturePreviewContent = {
  featureName: 'Renegociação de dívidas',
  featureIcon: <Wallet className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Renegocie com inteligência',
      content: 'Descubra se a proposta de renegociação realmente compensa ou se você está trocando seis por meia dúzia.'
    },
    {
      type: 'feature',
      title: 'Análise inteligente de propostas',
      content: 'Compare o custo real de cada proposta de renegociação.',
      bulletPoints: [
        { icon: <Calculator className="h-4 w-4" />, text: 'Valor presente líquido de cada proposta' },
        { icon: <Percent className="h-4 w-4" />, text: 'Taxa de juros real embutida' },
        { icon: <TrendingDown className="h-4 w-4" />, text: 'Impacto real do desconto oferecido' },
        { icon: <Target className="h-4 w-4" />, text: 'Melhor estratégia: quitar ou parcelar?' }
      ]
    },
    {
      type: 'benefit',
      title: 'Negocie de igual para igual',
      content: 'Tenha dados concretos para negociar melhores condições.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Saiba o desconto mínimo aceitável' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Compare propostas de diferentes credores' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Planeje o pagamento sem comprometer o orçamento' }
      ]
    },
    createCTASlide('o Simulador de Renegociação')
  ]
};

export const econographContent: FeaturePreviewContent = {
  featureName: 'Econograph',
  featureIcon: <LineChart className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Visualize a economia de forma simples',
      content: 'Gráficos interativos dos principais indicadores econômicos que afetam seu dinheiro no dia a dia.'
    },
    {
      type: 'feature',
      title: 'Indicadores que importam',
      content: 'Acompanhe os índices que impactam diretamente suas finanças.',
      bulletPoints: [
        { icon: <LineChart className="h-4 w-4" />, text: 'Selic, IPCA, CDI e IGP-M em tempo real' },
        { icon: <TrendingUp className="h-4 w-4" />, text: 'Histórico e tendências dos indicadores' },
        { icon: <DollarSign className="h-4 w-4" />, text: 'Impacto no seu poder de compra' },
        { icon: <Target className="h-4 w-4" />, text: 'Projeções de mercado atualizadas' }
      ]
    },
    {
      type: 'benefit',
      title: 'Decisões baseadas em dados',
      content: 'Entenda o cenário econômico sem precisar ser economista.',
      bulletPoints: [
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Saiba o melhor momento para investir' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Entenda o impacto da inflação no seu bolso' },
        { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Compare rendimentos com inflação real' }
      ]
    },
    createCTASlide('o Econograph')
  ]
};

export const appScreensContent: FeaturePreviewContent = {
  featureName: 'Conheça o RXFin',
  featureIcon: <Layers className="h-8 w-8" />,
  slides: [
    {
      type: 'intro',
      title: 'Tudo o que você precisa, em um só lugar',
      content: 'O RXFin organiza sua vida financeira de ponta a ponta — do dia a dia até o planejamento de longo prazo.'
    },
    {
      type: 'feature',
      title: 'Controle inteligente do seu dinheiro',
      content: 'Configure suas receitas e despesas uma vez. O sistema faz o resto.',
      bulletPoints: [
        { icon: <DollarSign className="h-4 w-4" />, text: 'Receitas e despesas organizadas por categoria' },
        { icon: <Plug className="h-4 w-4" />, text: 'Conexão automática com seu banco via Open Finance' },
        { icon: <Brain className="h-4 w-4" />, text: 'Categorização automática com sugestão de IA' },
        { icon: <BarChart3 className="h-4 w-4" />, text: 'Histórico consolidado de entradas e saídas' }
      ]
    },
    {
      type: 'feature',
      title: 'Planejamento e gestão de ativos',
      content: 'Defina metas, gerencie bens e acompanhe tudo em um painel visual.',
      bulletPoints: [
        { icon: <Target className="h-4 w-4" />, text: 'Plano de metas com cálculo automático' },
        { icon: <Car className="h-4 w-4" />, text: 'Gestão completa de veículos com FIPE integrada' },
        { icon: <Package className="h-4 w-4" />, text: 'Pacotes de orçamento por evento ou projeto' },
        { icon: <ShoppingBag className="h-4 w-4" />, text: 'Registro de compras com rastreamento' }
      ]
    },
    {
      type: 'benefit',
      title: 'E ainda mais módulos',
      content: 'Ferramentas extras para simplificar decisões do dia a dia.',
      bulletPoints: [
        { icon: <Gift className="h-4 w-4" />, text: 'Lista de presentes com orçamento por pessoa' },
        { icon: <FileText className="h-4 w-4" />, text: 'Organização para o Imposto de Renda' },
        { icon: <LineChart className="h-4 w-4" />, text: 'Projeção de 30 anos e independência financeira' }
      ]
    },
    createCTASlide('o RXFin')
  ]
};

export const featureContentMap: Record<string, FeaturePreviewContent> = {
  // IDs estáveis para features
  'cashflow': fluxoFinanceiroContent,
  'goals': planejamentoMetasContent,
  'ai': aiMentorContent,
  'freedom': projecao30AnosContent,
  'connection': openFinanceContent,
  'tax': organizacaoIRContent,
  'app-screens': appScreensContent,
  // Simuladores por ID estável
  'custo-carro': custoCarroContent,
  'comparativo-carros': comparativoCarrosContent,
  'custo-oportunidade-carro': custoOportunidadeCarroContent,
  'carro-vs-alternativas': carroVsAlternativasContent,
  'consorcio-vs-financiamento': consorcioVsFinanciamentoContent,
  'custo-hora': custoHoraContent,
  'renegociacao-dividas': renegociacaoDividasContent,
  'desconto-justo': descontoJustoContent,
  'econograph': econographContent,
  // Mapeamentos legados (por título)
  'Custo Real por Hora': custoHoraContent,
  'Comparativo de Carros': comparativoCarrosContent,
  'Desconto Justo': descontoJustoContent,
  'Financiamento': financiamentoContent,
};
