import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Calculator,
  ShieldAlert,
  Car,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FipeOwnershipCostCard } from './FipeOwnershipCostCard';

import { 
  inferVehicleCategory,
  highTheftVehicles
} from '@/utils/insuranceEstimator';

// Componente HelpButton reutilizável para dialogs de ajuda
const HelpButton: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Dialog>
    <DialogTrigger asChild>
      <button 
        type="button" 
        className="p-0.5 hover:bg-muted rounded-full transition-colors"
        aria-label={`Ajuda: ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4 text-primary" />
          {title}
        </DialogTitle>
      </DialogHeader>
      <div className="text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </DialogContent>
  </Dialog>
);

// Taxas de depreciação por idade (mesmo padrão do Carro A x B)
const DEPRECIATION_RATES = {
  year1: 0.15,  // 15% no primeiro ano (0 km)
  year2: 0.10,  // 10% no segundo ano
  year3: 0.08,  // 8% no terceiro ano
  year4: 0.06,  // 6% no quarto ano
  year5: 0.05,  // 5% no quinto ano
  year6plus: 0.03, // 3% após 6 anos
};

const getDepreciationRate = (age: number): number => {
  if (age <= 1) return DEPRECIATION_RATES.year1;
  if (age === 2) return DEPRECIATION_RATES.year2;
  if (age === 3) return DEPRECIATION_RATES.year3;
  if (age === 4) return DEPRECIATION_RATES.year4;
  if (age === 5) return DEPRECIATION_RATES.year5;
  return DEPRECIATION_RATES.year6plus;
};

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface FipeInsightsSectionProps {
  fipeValue: number;
  modelName: string;
  brandName?: string;
  yearLabel: string; // Ex: "2024 Gasolina"
  vehicleType?: 'carros' | 'motos' | 'caminhoes';
  // Nova prop opcional para receber depreciação calculada externamente
  calculatedDepreciationRate?: number;
}

export const FipeInsightsSection: React.FC<FipeInsightsSectionProps> = ({
  fipeValue,
  modelName,
  brandName,
  yearLabel,
  vehicleType = 'carros',
  calculatedDepreciationRate,
}) => {
  const [showOwnershipCost, setShowOwnershipCost] = useState(false);
  

  // Extrai ano do yearLabel (ex: "2024 Gasolina" -> 2024)
  const vehicleYear = useMemo(() => {
    const match = yearLabel.match(/(\d{4})/);
    return match ? parseInt(match[1]) : new Date().getFullYear();
  }, [yearLabel]);

  // Calcula idade do veículo
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - vehicleYear;

  // Badge de idade
  const ageBadge = useMemo(() => {
    if (vehicleAge <= 0) return { color: 'bg-emerald-500', label: '0 km', variant: 'success' as const };
    if (vehicleAge <= 3) return { color: 'bg-emerald-500', label: `${vehicleAge} ${vehicleAge === 1 ? 'ano' : 'anos'}`, variant: 'success' as const };
    if (vehicleAge <= 5) return { color: 'bg-amber-500', label: `${vehicleAge} anos`, variant: 'warning' as const };
    if (vehicleAge <= 10) return { color: 'bg-orange-500', label: `${vehicleAge} anos`, variant: 'warning' as const };
    return { color: 'bg-red-500', label: `${vehicleAge} anos`, variant: 'destructive' as const };
  }, [vehicleAge]);

  // Calcula depreciação - usa taxa calculada se disponível, senão fallback para tabela estática
  const depreciation = useMemo(() => {
    const rate = calculatedDepreciationRate ?? getDepreciationRate(vehicleAge);
    const annualLoss = fipeValue * rate;
    const monthlyLoss = annualLoss / 12;
    const isFromRegression = calculatedDepreciationRate !== undefined;
    return { rate, annual: annualLoss, monthly: monthlyLoss, isFromRegression };
  }, [fipeValue, vehicleAge, calculatedDepreciationRate]);

  // Faixa de negociação (95% a 100% do FIPE)
  const negotiationRange = useMemo(() => ({
    min: fipeValue * 0.95,
    max: fipeValue * 1.00,
  }), [fipeValue]);

  // Verifica se é veículo visado para roubo
  const theftRisk = useMemo(() => {
    if (!modelName) return null;
    const normalized = modelName.toLowerCase();
    
    for (const vehicle of highTheftVehicles) {
      for (const keyword of vehicle.keywords) {
        if (normalized.includes(keyword)) {
          return {
            isHighRisk: true,
            adjustment: vehicle.adjustmentFactor,
            reason: vehicle.reason,
          };
        }
      }
    }
    return null;
  }, [modelName]);

  // Alertas do veículo
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'info' | 'danger'; message: string }[] = [];
    
    if (vehicleAge > 10) {
      list.push({ 
        type: 'warning', 
        message: 'Veículos com mais de 10 anos têm dificuldade de financiamento bancário' 
      });
    }
    
    if (vehicleAge > 15) {
      list.push({ 
        type: 'danger', 
        message: 'Veículos com mais de 15 anos podem ter restrições em seguradoras' 
      });
    }
    
    // theftRisk é exibido via botão de metodologia, não mais como alerta
    
    return list;
  }, [vehicleAge, theftRisk]);


  // Categoria do veículo
  const vehicleCategory = useMemo(() => {
    return inferVehicleCategory(modelName, vehicleType);
  }, [modelName, vehicleType]);

  return (
    <div className="space-y-4">
      {/* Card Principal: Insights Financeiros */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Insights Financeiros</CardTitle>
            </div>
            <Badge className={ageBadge.color + ' text-white'}>
              <Car className="h-3 w-3 mr-1" />
              {ageBadge.label}
            </Badge>
          </div>
          <CardDescription>
            Análise automática baseada no valor FIPE e idade do veículo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Depreciação Mensal */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3.5 w-3.5" />
                Depreciação Esperada/mês
                <HelpButton title="Depreciação Esperada/mês">
                  <p>
                    A <strong>depreciação</strong> representa a perda de valor do veículo ao longo do tempo. 
                  </p>
                  {depreciation.isFromRegression ? (
                    <>
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 my-2">
                        <p className="flex items-center gap-1 text-primary font-medium">
                          <Sparkles className="h-3.5 w-3.5" />
                          Projeção Inteligente
                        </p>
                        <p className="text-xs mt-1">
                          Taxa calculada por regressão exponencial baseada nos preços FIPE 
                          reais de múltiplos anos deste modelo específico.
                        </p>
                      </div>
                      <p className="mt-2">
                        Taxa calculada: <strong>{(depreciation.rate * 100).toFixed(1)}% ao ano</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>A taxa aplicada varia conforme a idade (tabela estática):</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>1º ano (0 km): 15%</li>
                        <li>2º ano: 10%</li>
                        <li>3º ano: 8%</li>
                        <li>4º ano: 6%</li>
                        <li>5º ano: 5%</li>
                        <li>6+ anos: 3%</li>
                      </ul>
                      <p className="mt-2">
                        Este veículo tem <strong>{(depreciation.rate * 100).toFixed(0)}% ao ano</strong> de depreciação 
                        baseado na sua idade.
                      </p>
                    </>
                  )}
                </HelpButton>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-destructive">
                  -{formatMoney(depreciation.monthly)}
                </span>
                {depreciation.isFromRegression && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    IA
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatMoney(depreciation.annual)}/ano ({(depreciation.rate * 100).toFixed(1)}%)
              </div>
            </div>

            {/* Faixa de Negociação */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Faixa p/ Compra
                <HelpButton title="Faixa para Compra">
                  <p>
                    A <strong>Tabela FIPE</strong> representa um valor de referência para veículos usados no Brasil, 
                    calculado com base em preços praticados no mercado.
                  </p>
                  <p className="mt-2">
                    Na prática, a maioria das negociações acontece entre <strong>95% e 100%</strong> do valor FIPE:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><strong>95%:</strong> Bom ponto de partida para negociação</li>
                    <li><strong>100%:</strong> Valor máximo recomendado</li>
                    <li><strong>&lt;90%:</strong> Pode indicar problemas ocultos ou oportunidade</li>
                    <li><strong>&gt;100%:</strong> Prêmio por modelo/versão diferenciada</li>
                  </ul>
                </HelpButton>
              </div>
              <div className="text-lg font-bold text-primary">
                {formatMoney(negotiationRange.min)}
              </div>
              <div className="text-xs text-muted-foreground">
                até {formatMoney(negotiationRange.max)} (FIPE)
              </div>
            </div>

            {/* Categoria do Veículo */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Car className="h-3.5 w-3.5" />
                Categoria
              </div>
              <div className="text-sm font-medium capitalize">
                {vehicleCategory.replace(/_/g, ' ')}
              </div>
              {theftRisk && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button 
                      className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium cursor-pointer hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm group animate-[pulse_2s_ease-in-out_3]"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      <span>Veículo Visado</span>
                      <ChevronRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        Por que este veículo é considerado visado?
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      {/* Impacto no seguro */}
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="font-medium text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          +{((theftRisk.adjustment - 1) * 100).toFixed(0)}% no custo do seguro
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Este modelo tem alto índice de roubo/furto, resultando em prêmio de seguro mais elevado.
                        </p>
                      </div>
                      
                      {/* Motivo específico */}
                      <div>
                        <p className="font-medium mb-1">Motivo:</p>
                        <p className="text-muted-foreground">{theftRisk.reason}</p>
                      </div>
                      
                      {/* Lista de veículos mais visados */}
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <Car className="h-4 w-4" />
                          Veículos mais visados no Brasil
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {highTheftVehicles
                            .sort((a, b) => b.adjustmentFactor - a.adjustmentFactor)
                            .slice(0, 10)
                            .map((vehicle, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-muted-foreground capitalize">{vehicle.keywords[0]}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  +{((vehicle.adjustmentFactor - 1) * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">
                          Fonte: ISP-RJ, SUSEP, Sindicato das Seguradoras (2024)
                        </p>
                      </div>
                      
                      {/* Metodologia */}
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Metodologia
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>
                            <strong>Fonte:</strong> Índice de Veículos Roubados (IVR) compilado a partir de dados de 
                            seguradoras, ISP (Instituto de Segurança Pública) e SUSEP.
                          </p>
                          <p>
                            <strong>Critério:</strong> Veículos são classificados como "visados" quando apresentam 
                            sinistralidade significativamente acima da média de sua categoria.
                          </p>
                          <p>
                            <strong>Fator aplicado:</strong> O ajuste de {((theftRisk.adjustment - 1) * 100).toFixed(0)}% 
                            é multiplicado sobre a taxa base de seguro da categoria para refletir o risco adicional.
                          </p>
                        </div>
                      </div>
                      
                      {/* Dicas de economia */}
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="font-medium mb-2 flex items-center gap-2 text-primary">
                          <DollarSign className="h-4 w-4" />
                          Como reduzir o custo do seguro
                        </p>
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-medium">📍</span>
                            <p><strong>Rastreador/Bloqueador:</strong> Desconto de 5-15%. Algumas seguradoras exigem para veículos visados.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-medium">🏠</span>
                            <p><strong>Garagem fechada:</strong> Pernoite em garagem pode reduzir 3-8% no prêmio.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-medium">🛡️</span>
                            <p><strong>Franquia maior:</strong> Aumentar a franquia reduz o prêmio em 10-20%.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-medium">📊</span>
                            <p><strong>Bônus de classe:</strong> Renovar sem sinistros garante desconto progressivo de até 40%.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-medium">🚗</span>
                            <p><strong>Km controlada:</strong> Rodar menos de 10.000 km/ano pode gerar desconto de 5-10%.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx}
                  className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                    alert.type === 'danger' 
                      ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                      : alert.type === 'warning'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Módulo Colapsável: Custo de Propriedade */}
      <Collapsible open={showOwnershipCost} onOpenChange={setShowOwnershipCost}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Quanto custa ter esse carro?</CardTitle>
                    <CardDescription className="text-xs">
                      Estimativa mensal de IPVA, seguro, depreciação e licenciamento
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label={showOwnershipCost ? 'Recolher custo de propriedade' : 'Expandir custo de propriedade'}>
                  {showOwnershipCost ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <FipeOwnershipCostCard
              fipeValue={fipeValue}
              modelName={modelName}
              brandName={brandName}
              vehicleAge={vehicleAge}
              vehicleType={vehicleType}
              depreciationMonthly={depreciation.monthly}
              yearLabel={yearLabel}
            />
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
};
