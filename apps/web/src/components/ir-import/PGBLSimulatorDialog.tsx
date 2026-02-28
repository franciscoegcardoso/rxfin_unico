import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Info,
  PiggyBank,
  RotateCcw,
  CheckCircle2,
  History,
  Wallet,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useFinancial } from '@/contexts/FinancialContext';
import { useIRImport, IRImportData } from '@/hooks/useIRImport';
import { cn } from '@/lib/utils';

interface PGBLSimulatorDialogProps {
  trigger?: React.ReactNode;
  onLimitCalculated?: (limit: number) => void;
}

interface IncomeHistory {
  year: number;
  income: number;
  growthPercent: number | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}Mn`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(value);
};

export const PGBLSimulatorDialog: React.FC<PGBLSimulatorDialogProps> = ({
  trigger,
  onLimitCalculated,
}) => {
  const [open, setOpen] = useState(false);
  const { config, updateUserProfile } = useFinancial();
  const { imports, fetchImports } = useIRImport();
  const { userProfile, assets } = config;

  // State - default to 0%
  const [growthRate, setGrowthRate] = useState(userProfile.pgblIncomeGrowthRate ?? 0);
  const [manualLimit, setManualLimit] = useState<number | null>(null);

  // Fetch IR imports on open
  useEffect(() => {
    if (open) {
      fetchImports();
    }
  }, [open]);

  // Get last 3 years of income history
  const incomeHistory: IncomeHistory[] = useMemo(() => {
    if (!imports.length) return [];
    
    // Sort by year descending
    const sorted = [...imports]
      .sort((a, b) => b.anoExercicio - a.anoExercicio)
      .slice(0, 3);
    
    // Calculate income for each year
    const history: IncomeHistory[] = sorted.map((ir, idx) => {
      const income = ir.rendimentosTributaveis.reduce((sum, r) => sum + r.valor, 0);
      
      // Calculate growth vs previous year (next item in array since sorted desc)
      let growthPercent: number | null = null;
      if (idx < sorted.length - 1) {
        const previousIncome = sorted[idx + 1].rendimentosTributaveis.reduce((sum, r) => sum + r.valor, 0);
        if (previousIncome > 0) {
          growthPercent = ((income - previousIncome) / previousIncome) * 100;
        }
      }
      
      return {
        year: ir.anoCalendario,
        income,
        growthPercent,
      };
    });
    
    return history;
  }, [imports]);

  // Get latest IR declaration
  const latestIR: IRImportData | null = useMemo(() => {
    if (!imports.length) return null;
    return imports.reduce((latest, current) => 
      current.anoExercicio > latest.anoExercicio ? current : latest
    , imports[0]);
  }, [imports]);

  // Calculate base income from last declaration
  const baseIncome = useMemo(() => {
    if (!latestIR) return 0;
    return latestIR.rendimentosTributaveis.reduce((sum, r) => sum + r.valor, 0);
  }, [latestIR]);

  // Get existing PGBL investments
  const pgblInvestments = useMemo(() => {
    return assets.filter(a => 
      a.type === 'investment' && a.investmentType === 'previdencia_privada'
    );
  }, [assets]);

  const totalPGBLValue = useMemo(() => {
    return pgblInvestments.reduce((sum, a) => sum + a.value, 0);
  }, [pgblInvestments]);

  // Calculate projected income with growth
  const projectedIncome = useMemo(() => {
    if (!baseIncome) return 0;
    return baseIncome * (1 + growthRate / 100);
  }, [baseIncome, growthRate]);

  // Calculate PGBL limit (12% of projected income)
  const calculatedLimit = useMemo(() => {
    return projectedIncome * 0.12;
  }, [projectedIncome]);

  // Final limit (manual or calculated)
  const finalLimit = manualLimit !== null ? manualLimit : calculatedLimit;

  // Estimated tax savings (using max rate 27.5%)
  const estimatedSavings = finalLimit * 0.275;

  // Average historical growth
  const averageGrowth = useMemo(() => {
    const growths = incomeHistory.filter(h => h.growthPercent !== null).map(h => h.growthPercent!);
    if (growths.length === 0) return null;
    return growths.reduce((sum, g) => sum + g, 0) / growths.length;
  }, [incomeHistory]);

  // Handle save
  const handleSave = () => {
    updateUserProfile({
      pgblLimit: finalLimit,
      pgblIncomeGrowthRate: growthRate,
    });
    onLimitCalculated?.(finalLimit);
    setOpen(false);
  };

  // Handle reset to calculated value
  const handleReset = () => {
    setManualLimit(null);
  };

  // Apply average growth
  const handleApplyAverageGrowth = () => {
    if (averageGrowth !== null) {
      setGrowthRate(Math.max(0, averageGrowth));
    }
  };

  // Sync growth rate from profile on open
  useEffect(() => {
    if (open && userProfile.pgblIncomeGrowthRate !== undefined) {
      setGrowthRate(userProfile.pgblIncomeGrowthRate);
    }
  }, [open, userProfile.pgblIncomeGrowthRate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="h-4 w-4" />
            Simular PGBL
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-green-500" />
            Simulador de Limite PGBL
          </DialogTitle>
          <DialogDescription>
            Calcule o limite de dedução de 12% da renda tributável para PGBL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Income History */}
          {incomeHistory.length > 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Histórico de Renda Tributável</span>
                </div>
                <div className="space-y-2">
                  {incomeHistory.map((item, idx) => (
                    <div 
                      key={item.year} 
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded-md",
                        idx === 0 && "bg-primary/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          idx === 0 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {item.year}
                        </span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4">
                            Mais recente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {formatCompactCurrency(item.income)}
                        </span>
                        {item.growthPercent !== null && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "font-mono text-xs gap-1",
                              item.growthPercent >= 0 
                                ? "text-green-600 border-green-500/30" 
                                : "text-red-600 border-red-500/30"
                            )}
                          >
                            {item.growthPercent >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {item.growthPercent >= 0 ? '+' : ''}{item.growthPercent.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {averageGrowth !== null && (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Crescimento médio: <strong className={cn(
                        averageGrowth >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {averageGrowth >= 0 ? '+' : ''}{averageGrowth.toFixed(1)}%
                      </strong>
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={handleApplyAverageGrowth}
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <Info className="h-4 w-4" />
                  <p className="text-sm">
                    Importe declarações de IR para ver histórico de renda
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing PGBL investments */}
          {totalPGBLValue > 0 && (
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Previdência Privada atual</span>
                  </div>
                  <span className="font-medium text-green-600">
                    {formatCurrency(totalPGBLValue)}
                  </span>
                </div>
                {pgblInvestments.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {pgblInvestments.length} investimentos em previdência
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Growth projection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Projeção de aumento de renda
              </Label>
              <Badge variant="outline" className="font-mono">
                +{growthRate.toFixed(1)}%
              </Badge>
            </div>
            <Slider
              value={[growthRate]}
              onValueChange={([v]) => setGrowthRate(v)}
              min={0}
              max={30}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
            </div>
          </div>

          <Separator />

          {/* Calculation breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renda tributável ({latestIR?.anoCalendario || 'última'})</span>
              <span className="font-medium">{formatCurrency(baseIncome)}</span>
            </div>
            {growthRate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Projeção de aumento (+{growthRate.toFixed(1)}%)</span>
                <span className="font-medium text-primary">
                  +{formatCurrency(projectedIncome - baseIncome)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renda projetada</span>
              <span className="font-medium">{formatCurrency(projectedIncome)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-green-600">Limite PGBL (12%)</span>
              <span className="text-green-600">{formatCurrency(calculatedLimit)}</span>
            </div>
          </div>

          <Separator />

          {/* Editable limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Limite final de dedução
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Você pode editar o valor calculado caso tenha uma estimativa mais precisa da sua renda</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              {manualLimit !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3 w-3" />
                  Resetar
                </Button>
              )}
            </div>

            <div className="relative">
              <CurrencyInput
                value={finalLimit}
                onChange={(v) => setManualLimit(v)}
                className={cn(
                  "text-xl font-bold text-center h-14",
                  manualLimit !== null && "border-amber-500"
                )}
              />
              {manualLimit !== null && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 right-2 text-xs bg-amber-500/20 text-amber-700"
                >
                  Editado
                </Badge>
              )}
            </div>
          </div>

          {/* Tax savings estimate */}
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Economia estimada de imposto</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(estimatedSavings)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Considerando alíquota máxima de 27,5%
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave}>
              <CheckCircle2 className="h-4 w-4" />
              Salvar limite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
