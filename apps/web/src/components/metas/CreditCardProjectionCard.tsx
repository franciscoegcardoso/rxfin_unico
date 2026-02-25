import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';

interface CreditCardProjectionCardProps {
  projectedValue: number;
  limit: number;
  avgValue: number;
}

export function CreditCardProjectionCard({ projectedValue, limit, avgValue }: CreditCardProjectionCardProps) {
  const { isHidden } = useVisibility();
  const isVisible = !isHidden;

  const formatCurrency = (value: number) => {
    if (!isVisible) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const usagePercent = limit > 0 ? (projectedValue / limit) * 100 : 0;
  const diffFromAvg = avgValue > 0 ? ((projectedValue - avgValue) / avgValue) * 100 : 0;

  const getStatus = () => {
    if (usagePercent <= 70) return { label: 'Dentro do limite', color: 'income', icon: CheckCircle2 };
    if (usagePercent <= 90) return { label: 'Atenção', color: 'amber-500', icon: AlertTriangle };
    return { label: 'Acima do limite', color: 'expense', icon: AlertTriangle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="p-4 border-2 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold">Projeção da Fatura</h3>
            <p className="text-xs text-muted-foreground">Baseado nas metas definidas</p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1",
            status.color === 'income' && "border-income text-income",
            status.color === 'amber-500' && "border-amber-500 text-amber-500",
            status.color === 'expense' && "border-expense text-expense"
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">{formatCurrency(projectedValue)}</p>
            {isVisible && (
              <p className={cn(
                "text-sm",
                diffFromAvg <= 0 ? "text-income" : "text-expense"
              )}>
                {diffFromAvg >= 0 ? '+' : ''}{diffFromAvg.toFixed(0)}% vs média
              </p>
            )}
          </div>
          {limit > 0 && isVisible && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Limite</p>
              <p className="font-mono">{formatCurrency(limit)}</p>
            </div>
          )}
        </div>

        {limit > 0 && (
          <div className="space-y-2">
            <Progress 
              value={Math.min(usagePercent, 100)} 
              className={cn(
                "h-3",
                usagePercent <= 70 && "[&>div]:bg-income",
                usagePercent > 70 && usagePercent <= 90 && "[&>div]:bg-amber-500",
                usagePercent > 90 && "[&>div]:bg-expense"
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium">{usagePercent.toFixed(0)}% utilizado</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
