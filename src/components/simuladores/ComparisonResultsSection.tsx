import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Settings2, 
  Trophy,
  TrendingUp,
  TrendingDown,
  Smartphone,
  CarFront,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonResultsSectionProps {
  carOwnerMonthly: number;
  carOwnerAnnual: number;
  alternativeMonthly: number;
  alternativeAnnual: number;
  appMonthly: number;
  rentalMonthly: number;
  projectionYears: number;
  vehicleName?: string;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const ComparisonResultsSection: React.FC<ComparisonResultsSectionProps> = ({
  carOwnerMonthly,
  carOwnerAnnual,
  alternativeMonthly,
  alternativeAnnual,
  appMonthly,
  rentalMonthly,
  projectionYears,
  vehicleName,
}) => {
  const carOwnerTotal = carOwnerAnnual * projectionYears;
  const alternativeTotal = alternativeAnnual * projectionYears;
  
  const difference = carOwnerMonthly - alternativeMonthly;
  const differenceAnnual = carOwnerAnnual - alternativeAnnual;
  const differenceTotal = carOwnerTotal - alternativeTotal;
  
  const carOwnerIsCheaper = difference < 0;
  const alternativeIsCheaper = difference > 0;
  const areSimilar = Math.abs(difference) < 50; // Less than R$50 difference

  const winnerName = areSimilar 
    ? 'Empate' 
    : carOwnerIsCheaper 
      ? 'Carro Próprio' 
      : 'Alternativas';

  const winnerDescription = areSimilar
    ? 'Os custos são praticamente equivalentes'
    : carOwnerIsCheaper
      ? `Economia de ${formatMoney(Math.abs(difference))}/mês com carro próprio`
      : `Economia de ${formatMoney(Math.abs(difference))}/mês com alternativas`;

  return (
    <div className="space-y-4">
      {/* Winner Badge */}
      {(carOwnerMonthly > 0 || alternativeMonthly > 0) && (
        <Card className={cn(
          "border-2",
          areSimilar ? "border-amber-500/50 bg-amber-500/5" :
          carOwnerIsCheaper ? "border-income/50 bg-income/5" : "border-primary/50 bg-primary/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center",
                  areSimilar ? "bg-amber-500/20" :
                  carOwnerIsCheaper ? "bg-income/20" : "bg-primary/20"
                )}>
                  {areSimilar ? (
                    <Scale className="h-6 w-6 text-amber-600" />
                  ) : (
                    <Trophy className={cn(
                      "h-6 w-6",
                      carOwnerIsCheaper ? "text-income" : "text-primary"
                    )} />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opção mais econômica</p>
                  <p className={cn(
                    "text-xl font-bold",
                    areSimilar ? "text-amber-600" :
                    carOwnerIsCheaper ? "text-income" : "text-primary"
                  )}>
                    {winnerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{winnerDescription}</p>
                </div>
              </div>
              {!areSimilar && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Economia em {projectionYears} {projectionYears === 1 ? 'ano' : 'anos'}</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    carOwnerIsCheaper ? "text-income" : "text-primary"
                  )}>
                    {formatMoney(Math.abs(differenceTotal))}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carro Próprio */}
        <Card className={cn(
          "transition-all",
          carOwnerIsCheaper && "ring-2 ring-income/50"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span>Carro Próprio</span>
              </div>
              {carOwnerIsCheaper && !areSimilar && (
                <Badge className="bg-income text-white">
                  <Trophy className="h-3 w-3 mr-1" />
                  Mais econômico
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleName && (
              <p className="text-xs text-muted-foreground truncate">{vehicleName}</p>
            )}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custo mensal</span>
                <span className="text-xl font-bold">{formatMoney(carOwnerMonthly)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Custo anual</span>
                <span className="font-medium">{formatMoney(carOwnerAnnual)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t">
                <span className="text-muted-foreground">Total em {projectionYears}a</span>
                <span className="font-bold text-lg">{formatMoney(carOwnerTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternativas */}
        <Card className={cn(
          "transition-all",
          alternativeIsCheaper && "ring-2 ring-primary/50"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Alternativas</span>
              </div>
              {alternativeIsCheaper && !areSimilar && (
                <Badge className="bg-primary text-primary-foreground">
                  <Trophy className="h-3 w-3 mr-1" />
                  Mais econômico
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 text-xs">
              {appMonthly > 0 && (
                <Badge variant="outline" className="font-normal">
                  <Smartphone className="h-3 w-3 mr-1" />
                  App: {formatMoney(appMonthly)}
                </Badge>
              )}
              {rentalMonthly > 0 && (
                <Badge variant="outline" className="font-normal">
                  <CarFront className="h-3 w-3 mr-1" />
                  Aluguel: {formatMoney(rentalMonthly)}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custo mensal</span>
                <span className="text-xl font-bold">{formatMoney(alternativeMonthly)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Custo anual</span>
                <span className="font-medium">{formatMoney(alternativeAnnual)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t">
                <span className="text-muted-foreground">Total em {projectionYears}a</span>
                <span className="font-bold text-lg">{formatMoney(alternativeTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      {!areSimilar && Math.abs(difference) > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Diferença mensal</p>
                <p className={cn(
                  "text-lg font-bold",
                  difference > 0 ? "text-income" : "text-expense"
                )}>
                  {difference > 0 ? '+' : ''}{formatMoney(difference)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferença anual</p>
                <p className={cn(
                  "text-lg font-bold",
                  differenceAnnual > 0 ? "text-income" : "text-expense"
                )}>
                  {differenceAnnual > 0 ? '+' : ''}{formatMoney(differenceAnnual)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Em {projectionYears} anos</p>
                <p className={cn(
                  "text-lg font-bold",
                  differenceTotal > 0 ? "text-income" : "text-expense"
                )}>
                  {differenceTotal > 0 ? '+' : ''}{formatMoney(differenceTotal)}
                </p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3 italic">
              {difference > 0 
                ? `Carro próprio custa ${formatMoney(Math.abs(difference))}/mês a mais que as alternativas`
                : `Alternativas custam ${formatMoney(Math.abs(difference))}/mês a mais que o carro próprio`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
