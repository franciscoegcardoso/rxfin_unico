import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Glossário de termos financeiros para usuários leigos
export const FINANCIAL_TERMS = {
  // Termos de Financiamento
  cet: {
    term: 'CET',
    title: 'Custo Efetivo Total',
    simple: 'É o "preço real" do seu financiamento, incluindo tudo: juros, taxas e seguros.',
    detail: 'Quanto maior o CET, mais caro o financiamento. Use para comparar propostas de bancos diferentes.',
    icon: '💰',
  },
  iof: {
    term: 'IOF',
    title: 'Imposto sobre Operações Financeiras',
    simple: 'Um imposto cobrado pelo governo em toda operação de crédito.',
    detail: 'É obrigatório e já está incluso no seu financiamento. Geralmente é adicionado ao valor financiado.',
    icon: '🏛️',
  },
  amortizacao: {
    term: 'Amortização',
    title: 'Pagamento do Principal',
    simple: 'É a parte da parcela que realmente quita sua dívida (o que você pegou emprestado).',
    detail: 'O restante da parcela são juros. No SAC, a amortização é fixa. No Price, ela cresce ao longo do tempo.',
    icon: '📉',
  },
  juros: {
    term: 'Juros',
    title: 'Custo do Dinheiro Emprestado',
    simple: 'É o "aluguel" que você paga para usar o dinheiro do banco.',
    detail: 'No início do financiamento, a maior parte da parcela vai para juros. Com o tempo, essa proporção diminui.',
    icon: '📊',
  },
  saldoDevedor: {
    term: 'Saldo Devedor',
    title: 'Quanto Você Ainda Deve',
    simple: 'Valor total que você ainda deve ao banco naquele momento.',
    detail: 'Diminui a cada parcela paga. É sobre esse valor que os juros são calculados todo mês.',
    icon: '💳',
  },
  price: {
    term: 'Price',
    title: 'Sistema de Parcelas Fixas',
    simple: 'Todas as parcelas têm o mesmo valor do início ao fim.',
    detail: 'Vantagem: facilita o planejamento. Desvantagem: você paga mais juros no total.',
    icon: '📋',
  },
  sac: {
    term: 'SAC',
    title: 'Sistema de Amortização Constante',
    simple: 'Parcelas começam maiores e vão diminuindo ao longo do tempo.',
    detail: 'Vantagem: paga menos juros no total. Desvantagem: parcelas iniciais mais pesadas.',
    icon: '📉',
  },
  entrada: {
    term: 'Entrada',
    title: 'Valor Inicial Pago',
    simple: 'Dinheiro que você paga à vista, sem financiar.',
    detail: 'Quanto maior a entrada, menores os juros pagos. Ideal: acima de 20% do bem.',
    icon: '💵',
  },
  
  // Termos de Consórcio
  carta: {
    term: 'Carta de Crédito',
    title: 'Seu Poder de Compra',
    simple: 'É o valor que você receberá quando for contemplado.',
    detail: 'Esse valor é corrigido ao longo do tempo por um índice (como IPCA), então seu poder de compra é preservado.',
    icon: '📜',
  },
  contemplacao: {
    term: 'Contemplação',
    title: 'Quando Você Recebe o Crédito',
    simple: 'É o momento em que você finalmente pode usar sua carta de crédito para comprar o bem.',
    detail: 'Pode acontecer por sorteio (grátis) ou por lance (você oferece dinheiro para antecipar).',
    icon: '🎉',
  },
  lance: {
    term: 'Lance',
    title: 'Oferta para Antecipar',
    simple: 'Valor que você oferece para tentar ser contemplado mais rápido.',
    detail: 'Pode ser livre (do seu bolso) ou embutido (usando parte da carta). Quanto maior o lance, mais chances.',
    icon: '🎯',
  },
  lanceEmbutido: {
    term: 'Lance Embutido',
    title: 'Lance usando a Carta',
    simple: 'Você usa parte do próprio crédito como lance, sem tirar do bolso.',
    detail: 'Exemplo: em uma carta de R$ 100k, lance embutido de 20% = você recebe R$ 80k, mas não paga nada do bolso.',
    icon: '🔄',
  },
  taxaAdm: {
    term: 'Taxa Adm.',
    title: 'Taxa de Administração',
    simple: 'É o que a administradora do consórcio cobra para gerenciar o grupo.',
    detail: 'Fica entre 12% e 25% do valor da carta. É diluída nas parcelas.',
    icon: '🏢',
  },
  fundoReserva: {
    term: 'Fundo Reserva',
    title: 'Segurança do Grupo',
    simple: 'Dinheiro guardado para cobrir inadimplência de outros participantes.',
    detail: 'Geralmente entre 1% e 3%. Se não for usado, pode ser devolvido no final.',
    icon: '🛡️',
  },
  reajuste: {
    term: 'Reajuste',
    title: 'Correção Anual',
    simple: 'Atualização do valor da carta e das parcelas pela inflação.',
    detail: 'Índices comuns: IPCA (inflação), INCC (construção), IGPM (geral). Protege seu poder de compra.',
    icon: '📈',
  },
  ipca: {
    term: 'IPCA',
    title: 'Inflação Oficial',
    simple: 'Índice que mede quanto os preços subiram no Brasil.',
    detail: 'Usado para corrigir consórcios de veículos e serviços. Média histórica: 4-6% ao ano.',
    icon: '🇧🇷',
  },
  incc: {
    term: 'INCC',
    title: 'Custo da Construção',
    simple: 'Mede quanto subiu o custo de construir imóveis.',
    detail: 'Padrão para consórcios de imóveis. Geralmente maior que o IPCA.',
    icon: '🏗️',
  },
  igpm: {
    term: 'IGPM',
    title: 'Índice Geral de Preços',
    simple: 'Outro índice de inflação, mais volátil que o IPCA.',
    detail: 'Reflete atacado, varejo e construção. Pode subir ou cair mais que o IPCA.',
    icon: '📊',
  },
  
  // Termos de Investimento e Valor do Dinheiro
  cdi: {
    term: 'CDI',
    title: 'Certificado de Depósito Interbancário',
    simple: 'Taxa de referência para investimentos de renda fixa no Brasil.',
    detail: 'Quanto seu dinheiro rende se ficar aplicado. É usado como base para CDBs, LCIs e outros investimentos.',
    icon: '📈',
  },
  opportunityCost: {
    term: 'Custo de Oportunidade',
    title: 'O que você deixa de ganhar',
    simple: 'É o rendimento que seu dinheiro teria se estivesse investido em vez de gasto.',
    detail: 'Ao pagar parcelado, você mantém o dinheiro aplicado rendendo. Ao pagar à vista, abre mão desse rendimento.',
    icon: '🎯',
  },
  presentValue: {
    term: 'Valor Presente',
    title: 'Quanto vale hoje',
    simple: 'Quanto uma quantia futura vale em dinheiro de hoje.',
    detail: 'R$100 daqui a 1 ano vale menos que R$100 hoje, pois você deixa de ganhar juros durante esse período.',
    icon: '💵',
  },
  compoundInterest: {
    term: 'Juros Compostos',
    title: 'Juros sobre juros',
    simple: 'Quando o rendimento de um período é somado ao capital e gera mais rendimento no período seguinte.',
    detail: 'É o que faz seu dinheiro crescer exponencialmente ao longo do tempo. Albert Einstein chamou de "oitava maravilha do mundo".',
    icon: '🚀',
  },
} as const;

type TermKey = keyof typeof FINANCIAL_TERMS;

interface FinancialTermTooltipProps {
  termKey: TermKey;
  children?: React.ReactNode;
  showIcon?: boolean;
  iconOnly?: boolean;
  variant?: 'default' | 'inline' | 'badge';
  className?: string;
}

export const FinancialTermTooltip: React.FC<FinancialTermTooltipProps> = ({
  termKey,
  children,
  showIcon = true,
  iconOnly = false,
  variant = 'default',
  className,
}) => {
  const term = FINANCIAL_TERMS[termKey];
  
  if (!term) {
    return <>{children}</>;
  }

  const TriggerContent = () => {
    if (iconOnly) {
      return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />;
    }

    if (variant === 'badge') {
      return (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
          "bg-primary/10 text-primary text-xs font-medium cursor-help",
          "hover:bg-primary/20 transition-colors",
          className
        )}>
          {children || term.term}
          {showIcon && <Info className="h-3 w-3" />}
        </span>
      );
    }

    if (variant === 'inline') {
      return (
        <span className={cn(
          "inline-flex items-center gap-0.5 cursor-help",
          "border-b border-dashed border-muted-foreground/50 hover:border-primary",
          "transition-colors",
          className
        )}>
          {children || term.term}
          {showIcon && <HelpCircle className="h-3 w-3 text-muted-foreground" />}
        </span>
      );
    }

    return (
      <span className={cn(
        "inline-flex items-center gap-1 cursor-help",
        className
      )}>
        {children || term.term}
        {showIcon && <HelpCircle className="h-3 w-3 text-muted-foreground" />}
      </span>
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">
          <TriggerContent />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] p-0 overflow-hidden" side="top">
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{term.icon}</span>
            <span className="font-bold text-sm">{term.title}</span>
          </div>
          <p className="text-sm leading-relaxed">{term.simple}</p>
        </div>
        <div className="p-3 pt-2 border-t bg-muted/30">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{term.detail}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Componente para seção de ajuda contextual
interface ContextualHelpProps {
  title: string;
  description: string;
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  description,
  className,
}) => {
  return (
    <div className={cn(
      "p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800",
      "flex items-start gap-3",
      className
    )}>
      <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{title}</p>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

// Componente para insight educativo
interface InsightCardProps {
  type: 'tip' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  className,
}) => {
  const styles = {
    tip: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: '💡',
      textTitle: 'text-amber-800 dark:text-amber-300',
      textDesc: 'text-amber-700 dark:text-amber-400',
    },
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: '⚠️',
      textTitle: 'text-orange-800 dark:text-orange-300',
      textDesc: 'text-orange-700 dark:text-orange-400',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: '✅',
      textTitle: 'text-emerald-800 dark:text-emerald-300',
      textDesc: 'text-emerald-700 dark:text-emerald-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'ℹ️',
      textTitle: 'text-blue-800 dark:text-blue-300',
      textDesc: 'text-blue-700 dark:text-blue-400',
    },
  };

  const s = styles[type];

  return (
    <div className={cn(
      "p-3 rounded-lg border flex items-start gap-3",
      s.bg, s.border,
      className
    )}>
      <span className="text-lg flex-shrink-0">{s.icon}</span>
      <div>
        <p className={cn("text-sm font-medium", s.textTitle)}>{title}</p>
        <p className={cn("text-xs mt-0.5 leading-relaxed", s.textDesc)}>{description}</p>
      </div>
    </div>
  );
};

export default FinancialTermTooltip;
