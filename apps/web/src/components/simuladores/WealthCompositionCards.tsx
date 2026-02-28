import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Landmark, 
  CreditCard,
  Fuel,
  TrendingUp, 
  Car,
  Percent
} from 'lucide-react';

interface WealthCompositionCardsProps {
  capitalInicial: number;
  parcelasAcumuladas: number;
  despesasAcumuladas: number;
  rendimentosGanhos: number;
  valorResidualCarro: number;
  montanteTotal: number;
  anos: number;
  cdiAnual: number;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'percent', 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

export const WealthCompositionCards: React.FC<WealthCompositionCardsProps> = ({
  capitalInicial,
  parcelasAcumuladas,
  despesasAcumuladas,
  rendimentosGanhos,
  valorResidualCarro,
  montanteTotal,
  anos,
  cdiAnual
}) => {
  // Calcular percentuais
  const percentCapital = montanteTotal > 0 ? (capitalInicial / montanteTotal) * 100 : 0;
  const percentParcelas = montanteTotal > 0 ? (parcelasAcumuladas / montanteTotal) * 100 : 0;
  const percentDespesas = montanteTotal > 0 ? (despesasAcumuladas / montanteTotal) * 100 : 0;
  const percentRendimentos = montanteTotal > 0 ? (rendimentosGanhos / montanteTotal) * 100 : 0;
  
  // Taxa de retorno efetiva
  const totalInvestido = capitalInicial + parcelasAcumuladas + despesasAcumuladas;
  const retornoEfetivo = totalInvestido > 0 
    ? ((montanteTotal - totalInvestido) / totalInvestido) * 100 
    : 0;

  const hasParcelas = parcelasAcumuladas > 0;
  const hasDespesas = despesasAcumuladas > 0;

  const cards = [
    {
      icon: Landmark,
      label: 'Capital Inicial',
      sublabel: 'Valor imobilizado no carro',
      value: capitalInicial,
      percent: percentCapital,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      barColor: 'bg-blue-500',
      show: true,
    },
    {
      icon: CreditCard,
      label: 'Parcelas Pagas',
      sublabel: `Financiamento/consórcio`,
      value: parcelasAcumuladas,
      percent: percentParcelas,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      barColor: 'bg-amber-500',
      show: hasParcelas,
    },
    {
      icon: Fuel,
      label: 'Despesas Operacionais',
      sublabel: `IPVA, seguro, combustível, etc.`,
      value: despesasAcumuladas,
      percent: percentDespesas,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      barColor: 'bg-orange-500',
      show: hasDespesas,
    },
    {
      icon: TrendingUp,
      label: 'Rendimentos',
      sublabel: `CDI ${formatPercent(cdiAnual)} a.a.`,
      value: rendimentosGanhos,
      percent: percentRendimentos,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      barColor: 'bg-primary',
      show: true,
    },
    {
      icon: Car,
      label: 'Valor Residual Carro',
      sublabel: `Após ${anos} ano${anos > 1 ? 's' : ''} de depreciação`,
      value: valorResidualCarro,
      percent: null,
      color: 'text-destructive',
      bgColor: 'bg-destructive/5',
      barColor: 'bg-destructive',
      show: true,
    },
  ];

  const visibleCards = cards.filter(c => c.show);
  const gridCols = visibleCards.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 
                   visibleCards.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
                   'grid-cols-2 lg:grid-cols-5';

  // Calcular widths para a barra de progresso
  const barWidths = [
    { color: 'bg-blue-500', width: percentCapital },
    ...(hasParcelas ? [{ color: 'bg-amber-500', width: percentParcelas }] : []),
    ...(hasDespesas ? [{ color: 'bg-orange-500', width: percentDespesas }] : []),
    { color: 'bg-primary', width: percentRendimentos },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Composição do Patrimônio
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Percent className="h-3.5 w-3.5" />
          <span>Retorno efetivo: </span>
          <span className="font-semibold text-primary">
            {formatPercent(retornoEfetivo)}
          </span>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-3`}>
        {visibleCards.map((card, index) => (
          <Card key={index} className={`${card.bgColor} border-0`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                {card.percent !== null && (
                  <span className="text-xs text-muted-foreground">
                    {card.percent.toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(card.value)}
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {card.label}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                {card.sublabel}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar visual */}
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {barWidths.map((bar, index) => (
          <div 
            key={index}
            className={`${bar.color} transition-all duration-500`}
            style={{ width: `${bar.width}%` }}
          />
        ))}
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Capital</span>
        </div>
        {hasParcelas && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Parcelas</span>
          </div>
        )}
        {hasDespesas && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Despesas</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span>Rendimentos</span>
        </div>
      </div>
    </div>
  );
};
