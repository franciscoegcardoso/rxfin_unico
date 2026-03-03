import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Layers, 
  Clock, 
  TrendingUp,
  Info,
  PlayCircle,
  Banknote,
  Calendar,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnticipationSimulatorDialog } from './AnticipationSimulatorDialog';

interface ContextSectionProps {
  purchaseValue: number;
  installments: number;
  effectiveRate: number;
}

type ViewMode = 'comprador' | 'lojista';

export const DescontoJustoContextSection: React.FC<ContextSectionProps> = ({
  purchaseValue,
  installments,
  effectiveRate
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('comprador');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bar heights state for animations
  const [barHeights, setBarHeights] = useState({
    avista: 0,
    parcelado: [0, 0, 0, 0, 0],
    parceladoYield: [0, 0, 0, 0, 0],
    retailerNormal: [0, 0, 0, 0, 0],
    retailerAntLiq: 0,
    retailerAntTax: 0,
  });

  const monthsToShow = Math.min(installments, 5);

  // Reset and run animations when view changes or values change
  useEffect(() => {
    resetAnimations();
    
    const timeout = setTimeout(() => {
      if (viewMode === 'comprador') {
        runConsumerAnimation();
      } else {
        runRetailerAnimation();
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) clearTimeout(animationRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [viewMode, purchaseValue, installments, effectiveRate]);

  const resetAnimations = () => {
    if (animationRef.current) clearTimeout(animationRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setBarHeights({
      avista: 0,
      parcelado: [0, 0, 0, 0, 0],
      parceladoYield: [0, 0, 0, 0, 0],
      retailerNormal: [0, 0, 0, 0, 0],
      retailerAntLiq: 0,
      retailerAntTax: 0,
    });
  };

  const runConsumerAnimation = () => {
    setIsAnimating(true);
    
    const animate = () => {
      // À vista bar grows to 100%
      setBarHeights(prev => ({ ...prev, avista: 100 }));

      // Parcelas grow sequentially (each ~20%)
      const delays = [200, 400, 600, 800, 1000];
      delays.slice(0, monthsToShow).forEach((delay, i) => {
        setTimeout(() => {
          setBarHeights(prev => ({
            ...prev,
            parcelado: prev.parcelado.map((h, idx) => idx === i ? 20 : h)
          }));
        }, delay);
      });

      // Yield grows AFTER parcelas (increasing over time - simulating accumulated yield)
      const yieldDelays = [1200, 1400, 1600, 1800, 2000];
      const yieldHeights = [0, 5, 10, 15, 20]; // M1 = 0 (paid immediately), M5 = most yield
      yieldDelays.slice(0, monthsToShow).forEach((delay, i) => {
        setTimeout(() => {
          setBarHeights(prev => ({
            ...prev,
            parceladoYield: prev.parceladoYield.map((h, idx) => idx === i ? yieldHeights[i] : h)
          }));
        }, delay);
      });
    };

    animate();
    
    // Loop animation every 6 seconds
    intervalRef.current = setInterval(() => {
      resetAnimations();
      animationRef.current = setTimeout(animate, 500);
    }, 6000);
  };

  const runRetailerAnimation = () => {
    setIsAnimating(true);
    
    const animate = () => {
      // Normal flow: parcelas arriving sequentially
      const delays = [200, 400, 600, 800, 1000];
      delays.slice(0, monthsToShow).forEach((delay, i) => {
        setTimeout(() => {
          setBarHeights(prev => ({
            ...prev,
            retailerNormal: prev.retailerNormal.map((h, idx) => idx === i ? 20 : h)
          }));
        }, delay);
      });

      // Antecipação: tudo no M1
      setTimeout(() => {
        setBarHeights(prev => ({
          ...prev,
          retailerAntLiq: 85,
          retailerAntTax: 15,
        }));
      }, 500);
    };

    animate();
    
    intervalRef.current = setInterval(() => {
      resetAnimations();
      animationRef.current = setTimeout(animate, 500);
    }, 6000);
  };

  return (
    <div className="space-y-4">
      {/* Card de Contexto Visual */}
      <Card className="overflow-hidden shadow-xl border-border">
        <CardContent className="p-0">
          {/* Tabs de Perspectiva */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setViewMode('comprador')}
              className={cn(
                "flex-1 py-4 text-base font-bold transition-colors flex items-center justify-center gap-2",
                viewMode === 'comprador'
                  ? "text-primary border-b-4 border-primary bg-primary/5"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              🛒 Visão do Comprador
            </button>
            <button
              onClick={() => setViewMode('lojista')}
              className={cn(
                "flex-1 py-4 text-base font-bold transition-colors flex items-center justify-center gap-2",
                viewMode === 'lojista'
                  ? "text-primary border-b-4 border-primary bg-primary/5"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              🏪 Visão do Lojista
            </button>
          </div>

          {/* Conteúdo dos Gráficos */}
          <div className="p-6 md:p-8 min-h-[380px] relative">
            {/* Consumer Scene */}
            <div className={cn(
              "flex flex-col md:flex-row gap-8 items-start transition-opacity duration-500 w-full",
              viewMode === 'comprador' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            )}>
              {/* À Vista */}
              <div className="flex-1 w-full text-center md:border-r border-border md:pr-8 flex flex-col h-full">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950 rounded-full text-red-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">À Vista</h3>
                </div>
                
                {/* Gráfico À Vista */}
                <div className="h-48 flex items-end justify-between gap-2 px-4 bg-muted/30 rounded-lg pt-4 border border-border mb-4">
                  <div className="w-1/5 flex flex-col justify-end h-full">
                    <div 
                      className="w-full bg-red-500 rounded-t shadow-sm transition-all duration-1000 ease-out"
                      style={{ height: `${barHeights.avista}%` }}
                    />
                    <span className="text-xs font-medium text-muted-foreground mt-1">M1</span>
                  </div>
                  {[2, 3, 4, 5].slice(0, monthsToShow - 1).map((month) => (
                    <div key={month} className="w-1/5 flex flex-col justify-end h-full">
                      <div className="w-full bg-muted rounded-t h-0.5" />
                      <span className="text-xs font-medium text-muted-foreground mt-1">M{month}</span>
                    </div>
                  ))}
                </div>

                {/* Card Explicativo */}
                <div className="mt-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left shadow-sm">
                  <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Saída Imediata de Caixa
                  </h4>
                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                    O valor sai integralmente da sua carteira agora. Você não gera compromissos futuros, mas <strong>abre mão da liquidez imediata</strong> e dos juros que esse dinheiro renderia se ficasse aplicado.
                  </p>
                </div>
              </div>

              {/* Venda Parcelada */}
              <div className="flex-1 w-full text-center flex flex-col h-full">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-full text-blue-600">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Venda parcelada</h3>
                </div>
                
                {/* Gráfico Parcelado */}
                <div className="h-48 flex items-end justify-between gap-2 px-4 bg-muted/30 rounded-lg pt-4 border border-border relative mb-4">
                  {/* Legenda */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1 text-[10px] md:text-xs font-bold">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                      Rendimento
                    </span>
                    <span className="text-blue-600 flex items-center gap-1">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                      Valor da parcela
                    </span>
                  </div>

                  {[1, 2, 3, 4, 5].slice(0, monthsToShow).map((month, i) => (
                    <div key={month} className="w-1/5 flex flex-col justify-end h-full">
                      <div 
                        className="w-full bg-emerald-400 opacity-80 transition-all duration-1000 ease-out"
                        style={{ height: `${barHeights.parceladoYield[i]}%` }}
                      />
                      <div 
                        className="w-full bg-blue-500 rounded-b-sm shadow-sm z-10 transition-all duration-1000 ease-out"
                        style={{ height: `${barHeights.parcelado[i]}%` }}
                      />
                      <span className="text-xs font-medium text-muted-foreground mt-1">M{month}</span>
                    </div>
                  ))}
                </div>

                {/* Card Explicativo */}
                <div className="mt-auto bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-left shadow-sm">
                  <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Rendimento sobre Saldo
                  </h4>
                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                    Ao parcelar e aplicar o dinheiro, ele rende. Note o verde no gráfico: <strong>o rendimento diminui a cada mês</strong>, pois o saldo aplicado vai diminuindo conforme você paga as parcelas.
                  </p>
                </div>
              </div>
            </div>

            {/* Retailer Scene */}
            <div className={cn(
              "flex flex-col md:flex-row gap-8 items-start transition-opacity duration-500 w-full",
              viewMode === 'lojista' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none p-6 md:p-8'
            )}>
              {/* Fluxo Normal */}
              <div className="flex-1 w-full text-center md:border-r border-border md:pr-8 flex flex-col h-full">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-full text-blue-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Fluxo Normal</h3>
                </div>
                
                {/* Gráfico Normal */}
                <div className="h-48 flex items-end justify-between gap-2 px-4 bg-muted/30 rounded-lg pt-4 border border-border mb-4">
                  {[1, 2, 3, 4, 5].slice(0, monthsToShow).map((month, i) => (
                    <div key={month} className="w-1/5 flex flex-col justify-end h-full">
                      <div 
                        className="w-full bg-blue-400 rounded-t transition-all duration-1000 ease-out"
                        style={{ height: `${barHeights.retailerNormal[i]}%` }}
                      />
                      <span className="text-xs font-medium text-muted-foreground mt-1">M{month}</span>
                    </div>
                  ))}
                </div>

                {/* Card Explicativo */}
                <div className="mt-auto bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left shadow-sm">
                  <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">
                    Recebimento "Pingado"
                  </h4>
                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                    O lojista recebe o valor da venda parcelado em {monthsToShow}x. Isso exige que ele tenha caixa próprio para pagar fornecedores e despesas imediatas.
                  </p>
                </div>
              </div>

              {/* Antecipado */}
              <div className="flex-1 w-full text-center flex flex-col h-full">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-full text-orange-600">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg">Antecipado</h3>
                </div>
                
                {/* Gráfico Antecipado */}
                <div className="h-48 flex items-end justify-between gap-2 px-4 bg-muted/30 rounded-lg pt-4 border border-border mb-4">
                  <div className="w-1/5 flex flex-col justify-end h-full">
                    <div 
                      className="w-full bg-red-400 rounded-t transition-all duration-1000 ease-out"
                      style={{ height: `${barHeights.retailerAntTax}%` }}
                    />
                    <div 
                      className="w-full bg-emerald-500 transition-all duration-1000 ease-out"
                      style={{ height: `${barHeights.retailerAntLiq}%` }}
                    />
                    <span className="text-xs font-medium text-muted-foreground mt-1">M1</span>
                  </div>
                  {[2, 3, 4, 5].slice(0, monthsToShow - 1).map((month) => (
                    <div key={month} className="w-1/5 flex flex-col justify-end h-full">
                      <div className="w-full bg-muted h-0.5" />
                      <span className="text-xs font-medium text-muted-foreground mt-1">M{month}</span>
                    </div>
                  ))}
                </div>

                {/* Card Explicativo */}
                <div className="mt-auto bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-left shadow-sm">
                  <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-2">
                    Liquidez com Custo
                  </h4>
                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                    O banco adianta todas as parcelas para hoje, resolvendo o problema de caixa imediato. O custo disso é a <strong>Taxa de Antecipação (Vermelho)</strong>, que reduz a margem de lucro.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="flex items-center justify-center gap-2 py-4 border-t border-border text-muted-foreground bg-muted/20">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">
              {viewMode === 'comprador' 
                ? 'Sem desconto à vista = Você está pagando mais caro.'
                : 'Antecipar é caro. Às vezes, dar desconto sai mais barato que pagar o banco.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CTA Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 shadow-lg">
        <CardContent className="py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <PlayCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  Quer entender a mecânica técnica da Antecipação?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Veja nossa animação interativa detalhando o ciclo completo: do pagamento na maquininha ao repasse do banco e pagamento de fornecedores.
                </p>
              </div>
            </div>
            <Button 
              variant="default" 
              className="shrink-0 gap-2"
              onClick={() => setShowSimulator(true)}
            >
              <PlayCircle className="h-4 w-4" />
              Ver Animação Completa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anticipation Simulator Dialog */}
      <AnticipationSimulatorDialog
        open={showSimulator}
        onOpenChange={setShowSimulator}
        purchaseValue={purchaseValue}
        installments={installments}
      />
    </div>
  );
};
