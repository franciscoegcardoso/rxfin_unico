import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Target
} from 'lucide-react';
import { useFinancial } from '@/contexts/FinancialContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const EmergencyReserveCard: React.FC = () => {
  const { config, getMonthlyEntry } = useFinancial();

  const monthlyCostOfLiving = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let totalExpenses = 0;
    config.expenseItems.forEach(item => {
      if (item.enabled) {
        totalExpenses += getMonthlyEntry(currentMonth, item.id, 'expense');
      }
    });
    
    if (totalExpenses === 0) {
      const months: string[] = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
      
      let total = 0;
      let monthsWithData = 0;
      
      months.forEach(month => {
        let monthTotal = 0;
        config.expenseItems.forEach(item => {
          if (item.enabled) {
            monthTotal += getMonthlyEntry(month, item.id, 'expense');
          }
        });
        if (monthTotal > 0) {
          total += monthTotal;
          monthsWithData++;
        }
      });
      
      totalExpenses = monthsWithData > 0 ? total / monthsWithData : 0;
    }
    
    return totalExpenses;
  }, [config.expenseItems, getMonthlyEntry]);

  const totalInvestments = useMemo(() => {
    return config.assets
      .filter(asset => asset.type === 'investment')
      .reduce((sum, asset) => sum + asset.value, 0);
  }, [config.assets]);

  const minimumReserve = monthlyCostOfLiving * 6;
  const safeReserve = monthlyCostOfLiving * 12;

  const progressToMinimum = minimumReserve > 0 ? Math.min((totalInvestments / minimumReserve) * 100, 100) : 0;
  const progressToSafe = safeReserve > 0 ? Math.min((totalInvestments / safeReserve) * 100, 100) : 0;

  const status = useMemo(() => {
    if (monthlyCostOfLiving === 0) return { type: 'no-data', color: 'text-muted-foreground' };
    if (totalInvestments >= safeReserve) return { type: 'safe', color: 'text-income' };
    if (totalInvestments >= minimumReserve) return { type: 'minimum', color: 'text-warning' };
    return { type: 'risk', color: 'text-expense' };
  }, [totalInvestments, minimumReserve, safeReserve, monthlyCostOfLiving]);

  if (monthlyCostOfLiving === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="text-sm">Cadastre despesas no Planejamento para calcular a reserva de emergência</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={status.type === 'risk' ? 'border-expense/20' : status.type === 'safe' ? 'border-income/20' : ''}>
      <CardContent className="py-3 px-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Header + Help */}
          <div className="flex items-center gap-2 lg:min-w-[180px]">
            {status.type === 'safe' && <ShieldCheck className="h-4 w-4 text-income" />}
            {status.type === 'minimum' && <ShieldAlert className="h-4 w-4 text-warning" />}
            {status.type === 'risk' && <AlertTriangle className="h-4 w-4 text-expense" />}
            <span className="text-sm font-medium">Reserva de Emergência</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-xs" side="bottom">
                <p className="font-medium mb-2">Reserva de Emergência</p>
                <p className="text-muted-foreground mb-2">
                  Valor para cobrir imprevistos como demissão ou emergências.
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="text-warning">● Mínima:</span> 6x custo mensal</p>
                  <p><span className="text-income">● Segura:</span> 12x custo mensal</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                  Custo mensal: {formatCurrency(monthlyCostOfLiving)}
                </p>
              </PopoverContent>
            </Popover>
          </div>

          {/* Current value */}
          <div className="flex items-center gap-2 lg:min-w-[140px]">
            <span className="text-xs text-muted-foreground">Atual:</span>
            <span className={`text-sm font-bold ${status.color}`}>
              {formatCurrency(totalInvestments)}
            </span>
          </div>

          {/* Progress bars */}
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Minimum */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">6x</span>
              <div className="flex-1 relative">
                <Progress value={progressToMinimum} className="h-1.5" />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatCurrency(minimumReserve)}
              </span>
              {totalInvestments >= minimumReserve && (
                <CheckCircle2 className="h-3 w-3 text-income" />
              )}
            </div>

            {/* Safe */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">12x</span>
              <div className="flex-1 relative">
                <Progress value={progressToSafe} className="h-1.5" />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatCurrency(safeReserve)}
              </span>
              {totalInvestments >= safeReserve && (
                <CheckCircle2 className="h-3 w-3 text-income" />
              )}
            </div>
          </div>

          {/* Status indicator */}
          {status.type === 'risk' && (
            <span className="text-[10px] text-expense whitespace-nowrap">
              Faltam {formatCurrency(minimumReserve - totalInvestments)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
