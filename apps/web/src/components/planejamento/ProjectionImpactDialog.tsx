import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, Calculator, Calendar, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectionImpact {
  totalIncomeChange: number;
  totalExpenseChange: number;
  totalBalanceChange: number;
  itemsAffected: number;
  monthsAffected: number;
  details: Array<{
    itemId: string;
    month: string;
    type: 'income' | 'expense';
    projectedValue: number;
    baseValue: number;
    adjustmentApplied: number;
    calculationBase: string;
  }>;
}

interface ProjectionImpactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: ProjectionImpact | null;
  scope: 'all' | 'month' | 'cell';
  targetMonth?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

export const ProjectionImpactDialog: React.FC<ProjectionImpactDialogProps> = ({
  open,
  onOpenChange,
  impact,
  scope,
  targetMonth,
  onConfirm,
  isLoading = false,
}) => {
  if (!impact) return null;

  const scopeLabels = {
    all: 'Todas as Projeções',
    month: targetMonth ? `Mês ${formatMonthLabel(targetMonth)}` : 'Mês Selecionado',
    cell: 'Célula Selecionada',
  };

  const hasChanges = impact.itemsAffected > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Atualizar Projeção
          </DialogTitle>
          <DialogDescription>
            Escopo: <span className="font-semibold">{scopeLabels[scope]}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Itens Afetados</p>
                <p className="font-semibold">{impact.itemsAffected}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Meses Afetados</p>
                <p className="font-semibold">{impact.monthsAffected}</p>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          {hasChanges ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Impacto nas Projeções:</h4>
              
              <div className="space-y-2">
                <div className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  impact.totalIncomeChange >= 0 ? "bg-income/10" : "bg-expense/10"
                )}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={cn(
                      "h-4 w-4",
                      impact.totalIncomeChange >= 0 ? "text-income" : "text-expense"
                    )} />
                    <span className="text-sm">Receitas</span>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    impact.totalIncomeChange >= 0 ? "text-income" : "text-expense"
                  )}>
                    {impact.totalIncomeChange >= 0 ? '+' : ''}{formatCurrency(impact.totalIncomeChange)}
                  </span>
                </div>

                <div className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  impact.totalExpenseChange <= 0 ? "bg-income/10" : "bg-expense/10"
                )}>
                  <div className="flex items-center gap-2">
                    <TrendingDown className={cn(
                      "h-4 w-4",
                      impact.totalExpenseChange <= 0 ? "text-income" : "text-expense"
                    )} />
                    <span className="text-sm">Despesas</span>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    impact.totalExpenseChange <= 0 ? "text-income" : "text-expense"
                  )}>
                    {impact.totalExpenseChange >= 0 ? '+' : ''}{formatCurrency(impact.totalExpenseChange)}
                  </span>
                </div>

                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg border-2",
                  impact.totalBalanceChange >= 0 ? "border-income/30 bg-income/5" : "border-expense/30 bg-expense/5"
                )}>
                  <span className="font-medium">Impacto no Saldo</span>
                  <span className={cn(
                    "text-lg font-bold",
                    impact.totalBalanceChange >= 0 ? "text-income" : "text-expense"
                  )}>
                    {impact.totalBalanceChange >= 0 ? '+' : ''}{formatCurrency(impact.totalBalanceChange)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma alteração será aplicada. Os valores projetados são iguais aos atuais ou as células têm ajustes manuais.
              </AlertDescription>
            </Alert>
          )}

          {/* Details Preview */}
          {hasChanges && impact.details.length <= 10 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Detalhes:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                {impact.details.slice(0, 10).map((detail, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">
                      {formatMonthLabel(detail.month)} - {detail.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={cn(
                      "font-medium",
                      detail.adjustmentApplied >= 0 ? "text-income" : "text-expense"
                    )}>
                      {detail.adjustmentApplied >= 0 ? '+' : ''}{formatCurrency(detail.adjustmentApplied)}
                    </span>
                  </div>
                ))}
                {impact.details.length > 10 && (
                  <p className="text-muted-foreground text-center py-1">
                    ... e mais {impact.details.length - 10} itens
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs">
              <strong>Atenção:</strong> Valores com ajuste manual não serão alterados. 
              Esta ação aplicará as projeções baseadas nos parâmetros configurados.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!hasChanges || isLoading}
            className="bg-primary"
          >
            {isLoading ? 'Aplicando...' : 'Aplicar Projeção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
