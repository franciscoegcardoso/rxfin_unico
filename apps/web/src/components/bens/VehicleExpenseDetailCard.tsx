import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Asset, AssetLinkedExpense, PaymentMethod } from '@/types/financial';
import { 
  ChevronDown, 
  ChevronUp, 
  Link2, 
  Calendar,
  CreditCard,
  Receipt,
  Wallet,
  Banknote,
  Info,
  Pencil,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX', icon: <Wallet className="h-3 w-3" /> },
  boleto: { label: 'Boleto', icon: <Receipt className="h-3 w-3" /> },
  credit_card: { label: 'Cartão', icon: <CreditCard className="h-3 w-3" /> },
  debit_card: { label: 'Débito', icon: <CreditCard className="h-3 w-3" /> },
  auto_debit: { label: 'Déb. Auto', icon: <RefreshCcw className="h-3 w-3" /> },
  cash: { label: 'Espécie', icon: <Banknote className="h-3 w-3" /> },
};

interface VehicleExpenseDetailCardProps {
  asset: Asset;
  expense: {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    frequency?: 'monthly' | 'annual';
    hasBenchmark?: boolean;
  };
  linkedExpense?: AssetLinkedExpense;
  benchmarkValue: number;
  isLinked: boolean;
  tooltipText?: string | null;
  onLink: () => void;
  onConfigure?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const VehicleExpenseDetailCard: React.FC<VehicleExpenseDetailCardProps> = ({
  asset,
  expense,
  linkedExpense,
  benchmarkValue,
  isLinked,
  tooltipText,
  onLink,
  onConfigure,
  onEdit,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ExpenseIcon = expense.icon;

  // Calculate monthly average from linkedExpense configuration
  const calculateMonthlyAverage = (): number => {
    if (!linkedExpense) return benchmarkValue;
    
    if (linkedExpense.frequency === 'annual' && linkedExpense.annualMonths?.length) {
      // For annual expenses, calculate the monthly equivalent
      const totalAnnual = linkedExpense.monthlyValue * linkedExpense.annualMonths.length;
      return totalAnnual / 12;
    }
    
    return linkedExpense.monthlyValue;
  };

  const monthlyAverage = calculateMonthlyAverage();

  // Check if we have configuration to show
  const hasConfiguration = !!linkedExpense;
  const isAnnualExpense = linkedExpense?.frequency === 'annual' || expense.frequency === 'annual';

  // Compact mode - single row layout
  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-expense/10 bg-expense/5">
        <div className="flex items-center gap-2 min-w-0">
          <ExpenseIcon className="h-4 w-4 text-expense shrink-0" />
          <span className="text-sm font-medium truncate">{expense.name}</span>
          {isAnnualExpense ? (
            <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-warning/20 text-warning shrink-0">
              Anual
            </span>
          ) : (
            <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-primary/20 text-primary shrink-0">
              Mensal
            </span>
          )}
          {isLinked && (
            <Link2 className="h-3 w-3 text-income shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-expense">
            {formatCurrency(monthlyAverage)}/mês
          </span>
          {!hasConfiguration && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure?.();
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {hasConfiguration && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Full mode - detailed layout
  return (
    <div className="rounded-lg border border-expense/10 bg-expense/5 overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className={cn(
          "flex flex-col p-3 cursor-pointer hover:bg-expense/10 transition-colors gap-2",
          hasConfiguration && "cursor-pointer"
        )}
        onClick={() => hasConfiguration && setIsExpanded(!isExpanded)}
      >
        {/* First row: Icon, Name, Badge, Info */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ExpenseIcon className="h-4 w-4 text-expense shrink-0" />
            <span className="font-medium text-sm">{expense.name}</span>
            {isAnnualExpense ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-warning/20 text-warning shrink-0">
                Anual
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/20 text-primary shrink-0">
                Mensal
              </span>
            )}
            {tooltipText && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {/* Chevron for expansion */}
          {hasConfiguration && (
            <div className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Second row: Description */}
        <p className="text-xs text-muted-foreground pl-6">{expense.description}</p>

        {/* Third row: Value and Action */}
        <div className="flex items-center justify-between pl-6 gap-2">
          <div className="flex items-center gap-2">
            {isLinked && (
              <span className="text-[10px] text-income bg-income/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Vinculado
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {hasConfiguration ? 'média calculada' : benchmarkValue > 0 ? 'benchmark' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-expense whitespace-nowrap">
              {formatCurrency(monthlyAverage)}/mês
            </span>
            
            {!hasConfiguration && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure?.();
                }}
              >
                Configurar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Detail - Only when hasConfiguration */}
      {hasConfiguration && isExpanded && linkedExpense && (
        <div className="border-t border-expense/10 p-3 bg-background/50 space-y-3">
          {/* Configuration Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Info */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Forma de Pagamento</p>
              <div className="flex items-center gap-2">
                {linkedExpense.paymentMethod && paymentMethodLabels[linkedExpense.paymentMethod] && (
                  <>
                    {paymentMethodLabels[linkedExpense.paymentMethod].icon}
                    <span className="text-sm">{paymentMethodLabels[linkedExpense.paymentMethod].label}</span>
                  </>
                )}
              </div>
            </div>

            {/* Value Info */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {linkedExpense.frequency === 'annual' ? 'Valor por Parcela' : 'Valor Mensal'}
              </p>
              <p className="text-sm font-medium">{formatCurrency(linkedExpense.monthlyValue)}</p>
            </div>
          </div>

          {/* Payment Months - Only for annual expenses */}
          {linkedExpense.frequency === 'annual' && linkedExpense.annualMonths && linkedExpense.annualMonths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Meses de Pagamento
              </p>
              <div className="flex flex-wrap gap-1">
                {months.map((month, index) => {
                  const monthNum = index + 1;
                  const isSelected = linkedExpense.annualMonths?.includes(monthNum);
                  return (
                    <Badge
                      key={month}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "text-[10px] px-2 py-0.5",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground opacity-50"
                      )}
                    >
                      {month}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {linkedExpense.annualMonths.length}x de {formatCurrency(linkedExpense.monthlyValue)} = {formatCurrency(linkedExpense.monthlyValue * linkedExpense.annualMonths.length)}/ano
              </p>
            </div>
          )}

          {/* Monthly costs detail */}
          {linkedExpense.frequency === 'monthly' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Custo Anual Projetado</p>
              <p className="text-sm">{formatCurrency(linkedExpense.monthlyValue * 12)}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-expense/10 flex gap-2">
            {/* Edit Button */}
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>

            {/* Link Button */}
            {!isLinked && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8 border-expense/30 text-expense hover:bg-expense/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onLink();
                }}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Vincular
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
