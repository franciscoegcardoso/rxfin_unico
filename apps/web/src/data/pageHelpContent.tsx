import React from 'react';
import { 
  Building2, 
  FileText, 
  ArrowRightLeft, 
  Car, 
  Shield, 
  Calendar, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Gift, 
  Target 
} from 'lucide-react';
import { PageHelpContent } from '@/components/shared/PageHelpDialog';

export const PAGE_HELP_CONTENT: Record<string, PageHelpContent> = {
  bensInvestimentos: {
    title: 'Investimentos',
    description: 'Seu patrimônio completo em um só lugar',
    icon: <Building2 className="h-5 w-5" />,
    whatIs: 'Uma central de controle do seu patrimônio que reúne todos os seus bens (imóveis, veículos, empresas) e investimentos (aplicações financeiras, previdência, FGTS) em uma visão consolidada.',
    whatDoes: 'Permite cadastrar, acompanhar e projetar a evolução de todos os seus ativos. Mostra o valor atual, histórico de valorização/depreciação, e gera relatórios de patrimônio líquido.',
    whatSolves: 'Elimina a dispersão de informações sobre seus bens em diferentes lugares. Você consegue responder rapidamente "quanto eu tenho?" e entender como seu patrimônio evolui ao longo do tempo.',
    importance: 'Conhecer seu patrimônio real é o primeiro passo para tomar boas decisões financeiras, seja para planejar a aposentadoria, definir metas ou entender sua capacidade de investimento.',
  },

  meuIR: {
    title: 'Meu Imposto de Renda',
    description: 'Organize sua declaração ao longo do ano',
    icon: <FileText className="h-5 w-5" />,
    whatIs: 'Um organizador fiscal inteligente que centraliza todos os comprovantes, recibos e informações necessárias para sua declaração de Imposto de Renda ao longo do ano.',
    whatDoes: 'Permite anexar comprovantes médicos, educacionais e de doações, simula o imposto a pagar ou restituir, e gera um checklist do que você precisa reunir antes da declaração.',
    whatSolves: 'Acaba com a correria de última hora para encontrar comprovantes. Você organiza tudo durante o ano e, na época da declaração, já tem tudo pronto e categorizado.',
    importance: 'Uma boa organização fiscal pode significar economia de milhares de reais em impostos, além de evitar cair na malha fina por falta de documentação.',
  },

  fluxoFinanceiro: {
    title: 'Fluxo Financeiro',
    description: 'Controle suas entradas e saídas',
    icon: <ArrowRightLeft className="h-5 w-5" />,
    whatIs: 'O coração do seu controle financeiro: uma visão completa de todas as contas a pagar, a receber e lançamentos realizados, organizados por status e período.',
    whatDoes: 'Registra receitas e despesas, controla vencimentos, confirma pagamentos, importa faturas de cartão e mantém o histórico de todas as suas movimentações financeiras.',
    whatSolves: 'Evita esquecimentos de contas, multas por atraso e surpresas no final do mês. Você sabe exatamente o que entra e sai, e quando cada compromisso vence.',
    importance: 'O fluxo de caixa saudável é a base da estabilidade financeira. Quem controla o fluxo, controla o destino do seu dinheiro.',
  },

  gestaoVeiculos: {
    title: 'Gestão de Veículos',
    description: 'Controle completo dos seus automóveis',
    icon: <Car className="h-5 w-5" />,
    whatIs: 'Um centro de controle dedicado aos seus veículos, onde você registra todos os gastos com combustível, manutenções, seguros, IPVA e demais despesas automotivas.',
    whatDoes: 'Registra abastecimentos com cálculo de consumo médio, agenda manutenções preventivas, controla custos por veículo e por motorista, e gera relatórios de custo por km.',
    whatSolves: 'Responde perguntas como "quanto meu carro me custa por mês?", "está na hora de trocar?" e "qual motorista gasta mais?". Tudo com dados reais, não suposições.',
    importance: 'Veículos são um dos maiores ralos financeiros das famílias. Controlar seus custos reais pode revelar economias significativas ou indicar o momento certo de vender.',
  },

  seguros: {
    title: 'Seguros',
    description: 'Proteção organizada para você e seu patrimônio',
    icon: <Shield className="h-5 w-5" />,
    whatIs: 'Um painel centralizado de todas as suas apólices de seguro: auto, residência, vida, saúde, garantias estendidas e qualquer outro tipo de proteção contratada.',
    whatDoes: 'Armazena informações das apólices, alerta sobre vencimentos, calcula o custo anual de proteção por bem e mantém histórico de sinistros e acionamentos.',
    whatSolves: 'Elimina o risco de deixar bens descobertos por esquecimento de renovação. Você visualiza toda sua cobertura e identifica gaps de proteção.',
    importance: 'Seguros são a rede de segurança do seu patrimônio. Uma apólice esquecida pode significar uma perda irrecuperável em caso de sinistro.',
  },

  planejamentoMensal: {
    title: 'Planejamento Mensal',
    description: 'Orçamento inteligente mês a mês',
    icon: <Calendar className="h-5 w-5" />,
    whatIs: 'Uma planilha de orçamento interativa que permite planejar suas receitas e despesas mês a mês, comparando o previsto com o realizado ao longo do ano.',
    whatDoes: 'Define metas de gastos por categoria, acompanha a execução do orçamento, projeta saldos futuros e permite ajustes dinâmicos conforme a realidade financeira.',
    whatSolves: 'Transforma o orçamento de uma tarefa chata em um processo visual e intuitivo. Você vê onde está gastando mais e ajusta antes de estourar o limite.',
    importance: 'O planejamento mensal é o GPS das suas finanças. Sem ele, você pode até chegar a algum lugar, mas dificilmente será onde pretendia.',
  },

  projecao30Anos: {
    title: 'Projeção 30 Anos',
    description: 'Visualize seu futuro financeiro',
    icon: <TrendingUp className="h-5 w-5" />,
    whatIs: 'Um simulador de longo prazo que projeta sua situação patrimonial e fluxo de caixa para as próximas três décadas, considerando inflação, rendimentos e seus planos de vida.',
    whatDoes: 'Calcula a evolução do seu patrimônio, simula diferentes cenários econômicos (IPCA, CDI, Ibovespa), e mostra quando você atingirá seus objetivos financeiros.',
    whatSolves: 'Responde a pergunta crucial: "Estou no caminho certo para o futuro que quero?". Você consegue visualizar o impacto de decisões de hoje daqui a décadas.',
    importance: 'O longo prazo é onde os juros compostos fazem mágica. Quem planeja com visão de 30 anos toma decisões muito diferentes de quem só pensa no mês que vem.',
  },

  pacotesOrcamento: {
    title: 'Pacotes de Orçamento',
    description: 'Controle gastos de projetos e eventos',
    icon: <Package className="h-5 w-5" />,
    whatIs: 'Uma ferramenta para criar "envelopes virtuais" dedicados a projetos específicos como viagens, reformas, festas ou qualquer objetivo que tenha um orçamento definido.',
    whatDoes: 'Permite criar pacotes com meta de gasto, vincular despesas ao pacote, acompanhar o saldo disponível e ver em tempo real quanto ainda pode gastar.',
    whatSolves: 'Evita que gastos de projetos se misturem com o orçamento regular e acabem estourando. Cada projeto tem sua "caixinha" separada.',
    importance: 'Projetos especiais merecem controle especial. Um casamento, uma viagem ou uma reforma podem facilmente sair do controle sem um acompanhamento dedicado.',
  },

  registroCompras: {
    title: 'Registro de Compras',
    description: 'Sua lista de desejos sob controle',
    icon: <ShoppingCart className="h-5 w-5" />,
    whatIs: 'Um gerenciador de lista de compras planejadas que ajuda você a organizar aquisições futuras, comparar preços e registrar quando efetivamente comprou cada item.',
    whatDoes: 'Cadastra itens desejados com valor estimado, permite adicionar links de produtos, registra garantias de produtos comprados e conecta com suas despesas.',
    whatSolves: 'Acaba com compras por impulso. Você coloca o item na lista, deixa "esfriar" e toma a decisão com mais calma e informação.',
    importance: 'Compras planejadas são mais inteligentes. Você pesquisa melhor, espera promoções e evita arrependimentos que viram tralha em casa.',
  },

  listaPresentes: {
    title: 'Lista de Presentes',
    description: 'Nunca mais esqueça um presente',
    icon: <Gift className="h-5 w-5" />,
    whatIs: 'Um organizador de presentes que mapeia todas as pessoas importantes da sua vida, suas datas especiais e ajuda a planejar e controlar os gastos com presentes ao longo do ano.',
    whatDoes: 'Cadastra pessoas e datas comemorativas, sugere ocasiões por tipo de relacionamento, controla orçamento anual de presentes e marca o que já foi comprado.',
    whatSolves: 'Elimina o constrangimento de esquecer aniversários e datas especiais. Você planeja com antecedência e distribui os gastos ao longo do ano.',
    importance: 'Relacionamentos são importantes e presentes são uma forma de demonstrar carinho. Planejar evita tanto o esquecimento quanto o gasto excessivo de última hora.',
  },

  sonhos: {
    title: 'Sonhos',
    description: 'Transforme desejos em metas alcançáveis',
    icon: <Target className="h-5 w-5" />,
    whatIs: 'Um painel de metas de longo prazo onde você cadastra seus grandes objetivos financeiros (carro novo, casa própria, viagem dos sonhos) e acompanha o progresso rumo a eles.',
    whatDoes: 'Define metas com valor e prazo, calcula quanto você precisa poupar por mês, mostra a linha do tempo até a conquista e permite ajustar valores acumulados.',
    whatSolves: 'Transforma sonhos vagos em planos concretos com números e prazos. Você sai do "um dia eu vou" para "em X meses eu consigo".',
    importance: 'Sonhos documentados e quantificados têm muito mais chance de se tornarem realidade. O que é medido, é gerenciado.',
  },
};
