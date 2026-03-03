import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ArrowRight,
  Wallet,
  Car,
  Fuel,
  CreditCard,
  Landmark
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealCostSummaryCardProps {
  capitalInicial: number;
  parcelasAcumuladas: number;
  despesasAcumuladas: number;
  depreciacaoTotal: number; // vehicleValue - valorResidualCarro
  rendimentosPerdidos: number;
  montantePotencial: number;
  valorResidualCarro: number;
  anos: number;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const RealCostSummaryCard: React.FC<RealCostSummaryCardProps> = ({
  capitalInicial,
  parcelasAcumuladas,
  despesasAcumuladas,
  depreciacaoTotal,
  rendimentosPerdidos,
  montantePotencial,
  valorResidualCarro,
  anos
}) => {
  // Custo total = Capital + Parcelas + Despesas + Depreciação
  // Mas Capital já está imobilizado, então o custo de saída é:
  // Parcelas + Despesas + Depreciação + Rendimentos Perdidos
  
  const custoDesembolsado = parcelasAcumuladas + despesasAcumuladas;
  const custoDepreciacao = depreciacaoTotal;
  const custoOportunidade = rendimentosPerdidos;
  const custoRealTotal = custoDesembolsado + custoDepreciacao + custoOportunidade;
  
  // Custo mensal médio
  const meses = anos * 12;
  const custoMensalMedio = meses > 0 ? custoRealTotal / meses : 0;
  
  // Percentuais
  const pctDesembolsado = custoRealTotal > 0 ? (custoDesembolsado / custoRealTotal) * 100 : 0;
  const pctDepreciacao = custoRealTotal > 0 ? (custoDepreciacao / custoRealTotal) * 100 : 0;
  const pctOportunidade = custoRealTotal > 0 ? (custoOportunidade / custoRealTotal) * 100 : 0;

  const costBreakdown = [
    {
      icon: Wallet,
      label: 'Despesas Desembolsadas',
      sublabel: 'Parcelas + custos operacionais',
      value: custoDesembolsado,
      percent: pctDesembolsado,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
    },
    {
      icon: TrendingDown,
      label: 'Depreciação',
      sublabel: 'Perda de valor do veículo',
      value: custoDepreciacao,
      percent: pctDepreciacao,
      color: 'text-red-600',
      bgColor: 'bg-red-500',
    },
    {
      icon: TrendingUp,
      label: 'Rendimento Perdido',
      sublabel: 'CDI sobre capital imobilizado',
      value: custoOportunidade,
      percent: pctOportunidade,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
    },
  ];

  return (
    <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Custo Real do Carro em {anos} ano{anos > 1 ? 's' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor total de destaque */}
        <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-muted-foreground mb-1">Custo Real Total</p>
          <p className="text-3xl font-bold text-destructive">
            {formatMoney(custoRealTotal)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ou <span className="font-semibold">{formatMoney(custoMensalMedio)}</span> /mês
          </p>
        </div>

        {/* Barra de composição */}
        <div className="h-3 rounded-full overflow-hidden flex bg-muted">
          {costBreakdown.map((item, index) => (
            <div 
              key={index}
              className={cn(item.bgColor, "transition-all duration-500")}
              style={{ width: `${item.percent}%` }}
            />
          ))}
        </div>

        {/* Breakdown detalhado */}
        <div className="space-y-2">
          {costBreakdown.map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded", item.bgColor.replace('bg-', 'bg-').replace('500', '100'))}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatMoney(item.value)}</p>
                <p className="text-[10px] text-muted-foreground">{item.percent.toFixed(0)}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparação visual */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center p-3 rounded-lg bg-primary/10">
              <p className="text-[10px] text-muted-foreground mb-1">Se tivesse investido</p>
              <p className="text-lg font-bold text-primary">{formatMoney(montantePotencial)}</p>
            </div>
            
            <div className="flex flex-col items-center">
              <Minus className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex-1 text-center p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground mb-1">Valor do carro hoje</p>
              <p className="text-lg font-bold">{formatMoney(valorResidualCarro)}</p>
            </div>
          </div>
          
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs text-muted-foreground">Diferença de patrimônio</p>
            <p className="text-xl font-bold text-amber-600">
              {formatMoney(montantePotencial - valorResidualCarro)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Riqueza que deixou de acumular mantendo o carro
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
