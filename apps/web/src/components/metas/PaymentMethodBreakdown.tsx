import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { 
  Banknote, 
  Building, 
  CreditCard, 
  QrCode, 
  Receipt 
} from 'lucide-react';
import { PaymentMethod } from '@/types/financial';

interface PaymentMethodData {
  method: PaymentMethod;
  goalValue: number;
  avgValue: number;
}

interface PaymentMethodBreakdownProps {
  data: PaymentMethodData[];
  totalExpenseGoal: number;
}

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: React.ReactNode; color: string }> = {
  credit_card: { label: 'Cartão de Crédito', icon: <CreditCard className="h-4 w-4" />, color: 'bg-amber-500' },
  debit_card: { label: 'Cartão de Débito', icon: <CreditCard className="h-4 w-4" />, color: 'bg-blue-500' },
  auto_debit: { label: 'Débito Automático', icon: <Building className="h-4 w-4" />, color: 'bg-indigo-500' },
  pix: { label: 'PIX', icon: <QrCode className="h-4 w-4" />, color: 'bg-primary' },
  boleto: { label: 'Boleto', icon: <Receipt className="h-4 w-4" />, color: 'bg-slate-500' },
  cash: { label: 'Dinheiro em Espécie', icon: <Banknote className="h-4 w-4" />, color: 'bg-income' },
};

export function PaymentMethodBreakdown({ data, totalExpenseGoal }: PaymentMethodBreakdownProps) {
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

  const getPercentage = (value: number) => {
    if (totalExpenseGoal === 0) return 0;
    return (value / totalExpenseGoal) * 100;
  };

  const getDiffPercent = (goal: number, avg: number) => {
    if (avg === 0) return null;
    return ((goal - avg) / avg) * 100;
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">Meta por Meio de Pagamento</h3>
      <div className="space-y-4">
        {data.map(({ method, goalValue, avgValue }) => {
          const config = paymentMethodConfig[method];
          const percentage = getPercentage(goalValue);
          const diff = getDiffPercent(goalValue, avgValue);

          return (
            <div key={method} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-6 w-6 rounded flex items-center justify-center text-white", config.color)}>
                    {config.icon}
                  </div>
                  <span className="text-sm">{config.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold">{formatCurrency(goalValue)}</span>
                  {diff !== null && isVisible && (
                    <span className={cn(
                      "text-xs ml-2",
                      diff <= 0 ? "text-income" : "text-expense"
                    )}>
                      ({diff >= 0 ? '+' : ''}{diff.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
