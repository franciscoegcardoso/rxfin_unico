import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  CreditCard, 
  Users, 
  Trash2,
  Banknote
} from 'lucide-react';
import { BudgetPackage, BudgetPackageTransaction } from '@/hooks/useBudgetPackages';
import { useVisibility } from '@/contexts/VisibilityContext';
import { paymentMethods } from '@/data/defaultData';
import { format, parseISO, isPast, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PackageDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package: BudgetPackage;
  transactions: BudgetPackageTransaction[];
  stats: {
    totalSpent: number;
    totalIncome: number;
    netBalance: number;
    byPaymentMethod: Record<string, number>;
    byPerson: Record<string, number>;
    budgetRemaining: number | null;
    budgetPercentage: number | null;
    transactionCount: number;
  };
  onDeleteTransaction: (id: string) => Promise<boolean>;
}

export const PackageDetailSheet: React.FC<PackageDetailSheetProps> = ({
  open,
  onOpenChange,
  package: pkg,
  transactions,
  stats,
  onDeleteTransaction,
}) => {
  const { isHidden } = useVisibility();

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Não informado';
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const getPackageStatus = () => {
    const today = new Date();
    const startDate = parseISO(pkg.start_date);
    const endDate = parseISO(pkg.end_date);

    if (isPast(endDate)) return { label: 'Finalizado', color: 'secondary' };
    if (isWithinInterval(today, { start: startDate, end: endDate })) {
      return { label: 'Em Andamento', color: 'default' };
    }
    return { label: 'Agendado', color: 'outline' };
  };

  const status = getPackageStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {pkg.name}
            <Badge variant={status.color as any}>{status.label}</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 py-4">
            {/* Info Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(parseISO(pkg.start_date), "dd 'de' MMMM", { locale: ptBR })} até {format(parseISO(pkg.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <Badge variant="outline">{pkg.category_name}</Badge>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
              )}
            </div>

            <Separator />

            {/* Budget Progress */}
            {pkg.has_budget_goal && pkg.budget_goal && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Acompanhamento da Meta
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta</span>
                    <span>{formatCurrency(Number(pkg.budget_goal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gasto</span>
                    <span className={stats.budgetPercentage && stats.budgetPercentage > 100 ? 'text-destructive font-medium' : ''}>
                      {formatCurrency(stats.totalSpent)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(stats.budgetPercentage || 0, 100)} 
                    className={`h-3 ${stats.budgetPercentage && stats.budgetPercentage > 100 ? '[&>div]:bg-destructive' : ''}`}
                  />
                  <p className={`text-sm font-medium ${stats.budgetRemaining && stats.budgetRemaining >= 0 ? 'text-income' : 'text-destructive'}`}>
                    {stats.budgetRemaining !== null && stats.budgetRemaining >= 0 
                      ? `Restante: ${formatCurrency(stats.budgetRemaining)}`
                      : `Excedido em: ${formatCurrency(Math.abs(stats.budgetRemaining || 0))}`
                    }
                  </p>
                </div>
              </div>
            )}

            {!pkg.has_budget_goal && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-expense" />
                  <span className="font-medium">Total Gasto</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-sm text-muted-foreground">{stats.transactionCount} lançamentos</p>
              </div>
            )}

            <Separator />

            {/* By Payment Method */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Por Forma de Pagamento
              </h3>
              {Object.entries(stats.byPaymentMethod).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byPaymentMethod)
                    .sort((a, b) => b[1] - a[1])
                    .map(([method, value]) => {
                      const percentage = (value / stats.totalSpent) * 100;
                      return (
                        <div key={method} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{getPaymentMethodLabel(method)}</span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary/60 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <Separator />

            {/* By Person */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por Responsável
              </h3>
              {Object.entries(stats.byPerson).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byPerson)
                    .sort((a, b) => b[1] - a[1])
                    .map(([person, value]) => {
                      const percentage = (value / stats.totalSpent) * 100;
                      return (
                        <div key={person} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{person}</span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-secondary/60 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <Separator />

            {/* Transaction List */}
            <div className="space-y-3">
              <h3 className="font-medium">Lançamentos ({transactions.length})</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lançamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map(transaction => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          transaction.transaction_type === 'expense' 
                            ? 'bg-expense/10' 
                            : 'bg-income/10'
                        }`}>
                          {transaction.transaction_type === 'expense' 
                            ? <TrendingDown className="h-4 w-4 text-expense" />
                            : <TrendingUp className="h-4 w-4 text-income" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(parseISO(transaction.transaction_date), 'dd/MM/yy')}</span>
                            {transaction.payment_method && (
                              <>
                                <span>•</span>
                                <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                              </>
                            )}
                            {transaction.responsible_person_name && (
                              <>
                                <span>•</span>
                                <span>{transaction.responsible_person_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          transaction.transaction_type === 'expense' ? 'text-expense' : 'text-income'
                        }`}>
                          {transaction.transaction_type === 'expense' ? '-' : '+'}{formatCurrency(Number(transaction.amount))}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => onDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
