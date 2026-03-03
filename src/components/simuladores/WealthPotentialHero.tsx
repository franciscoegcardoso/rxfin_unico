import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, ArrowRight, Coins, Car } from 'lucide-react';

interface WealthPotentialHeroProps {
  selectedHorizon: number; // anos (1-5)
  onHorizonChange: (years: number) => void;
  montanteAcumulado: number;
  valorResidualCarro: number;
  gapRiqueza: number;
  custoMensalTotal: number;
  capitalInicial?: number; // valor inicial investido (FIPE ou entrada + parcelas pagas)
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const WealthPotentialHero: React.FC<WealthPotentialHeroProps> = ({
  selectedHorizon,
  onHorizonChange,
  montanteAcumulado,
  valorResidualCarro,
  gapRiqueza,
  custoMensalTotal,
  capitalInicial = 0
}) => {
  const horizonText = selectedHorizon === 1 ? '1 ano' : `${selectedHorizon} anos`;
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
      <CardContent className="pt-6 pb-8">
        <div className="space-y-8">
          {/* Seletor de Horizonte */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Horizonte de Análise
            </p>
            <ToggleGroup 
              type="single" 
              value={String(selectedHorizon)}
              onValueChange={(v) => v && onHorizonChange(Number(v))}
              className="justify-center bg-muted/50 rounded-lg p-1 inline-flex"
            >
              {[1, 2, 3, 4, 5].map(anos => (
                <ToggleGroupItem 
                  key={anos} 
                  value={String(anos)}
                  className="px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md transition-all"
                >
                  {anos} ano{anos > 1 ? 's' : ''}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Narrativa Didática */}
          <div className="space-y-6">
            {/* Step 1: Valor do Carro */}
            <div className="flex items-center gap-4 p-4 bg-destructive/5 rounded-xl border border-destructive/10">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  Daqui a {horizonText}, seu carro valerá
                </p>
                <p className="text-2xl font-bold text-destructive truncate">
                  {formatMoney(valorResidualCarro)}
                </p>
              </div>
              <TrendingDown className="h-5 w-5 text-destructive/50 flex-shrink-0" />
            </div>

            {/* Divider com "Em contrapartida" */}
            <div className="flex items-center gap-3 px-4">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Em contrapartida
              </span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Step 2: Potencial de Investimento */}
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  Se investir {formatMoney(capitalInicial > 0 ? capitalInicial : custoMensalTotal * 12 * selectedHorizon)} a 100% do CDI
                </p>
                <p className="text-2xl font-bold text-primary truncate">
                  {formatMoney(montanteAcumulado)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary/50 flex-shrink-0" />
            </div>

            {/* Arrow para resultado */}
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
            </div>

            {/* Step 3: Custo de Oportunidade (Resultado) */}
            <div className="text-center p-6 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 rounded-xl border border-amber-500/20">
              <p className="text-sm text-muted-foreground mb-2">
                Seu <span className="font-semibold text-foreground">Custo de Oportunidade</span> em {horizonText}
              </p>
              <p className="text-4xl md:text-5xl font-bold text-amber-600 dark:text-amber-500">
                {formatMoney(gapRiqueza)}
              </p>
              <p className="text-xs text-muted-foreground mt-3 max-w-md mx-auto">
                Isso é o quanto você "perde" ao manter o capital no carro ao invés de investir
              </p>
            </div>
          </div>

          {/* Custo Mensal de Referência */}
          {custoMensalTotal > 0 && (
            <div className="pt-4 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                Custo mensal total considerado:{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(custoMensalTotal)}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
