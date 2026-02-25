import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, Barcode, QrCode, CreditCard, Banknote, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethod, ExpenseItem, ExpenseNature, RecurrenceType } from '@/types/financial';
import { paymentMethods } from '@/data/defaultData';

// Nature and recurrence labels
const natureLabels: Record<ExpenseNature, string> = {
  fixed: 'Fixa',
  semi_variable: 'Semi',
  variable: 'Var.',
};

const recurrenceLabels: Record<RecurrenceType, string> = {
  daily: 'Diária',
  weekly: 'Sem.',
  monthly: 'Mensal',
  quarterly: 'Trim.',
  semiannual: 'Sem.',
  annual: 'Anual',
};

interface ExpenseListMobileProps {
  items: ExpenseItem[];
  onToggle: (id: string) => void;
  onUpdatePaymentMethod: (id: string, method: PaymentMethod) => void;
  onEdit: (item: ExpenseItem) => void;
  onDelete: (item: ExpenseItem) => void;
}

// Payment method icon mapping
const getPaymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'boleto':
      return <Barcode className="h-5 w-5" />;
    case 'pix':
      return <Zap className="h-5 w-5" />;
    case 'credit_card':
    case 'debit_card':
      return <CreditCard className="h-5 w-5" />;
    case 'cash':
      return <Banknote className="h-5 w-5" />;
    default:
      return <CreditCard className="h-5 w-5" />;
  }
};

// Payment method helper text
const getPaymentHelperText = (method: string): string => {
  switch (method) {
    case 'boleto':
      return 'Compensação em até 3 dias úteis';
    case 'pix':
      return 'Pagamento instantâneo';
    case 'credit_card':
      return 'Lançado na fatura do cartão';
    case 'debit_card':
      return 'Débito imediato no cartão';
    case 'cash':
      return 'Pagamento em dinheiro vivo';
    default:
      return '';
  }
};

export const ExpenseListMobile: React.FC<ExpenseListMobileProps> = ({
  items,
  onToggle,
  onUpdatePaymentMethod,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="divide-y divide-border">
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 px-3 py-3 transition-colors",
            item.enabled ? "bg-expense-light/5" : "bg-card"
          )}
        >
          {/* Element 1: Toggle (Left) */}
          <div className="flex-shrink-0">
            <Switch
              checked={item.enabled}
              onCheckedChange={() => onToggle(item.id)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Element 2: Name + Badges (Center - flex-1) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "text-sm font-medium truncate",
                item.enabled ? "text-foreground" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
              {item.expenseNature && (
                <span className={cn(
                  "flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium",
                  item.expenseNature === 'fixed' 
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : item.expenseNature === 'semi_variable'
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                )}>
                  {natureLabels[item.expenseNature]}
                </span>
              )}
              {item.recurrenceType && item.recurrenceType !== 'monthly' && (
                <span className="flex-shrink-0 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                  {recurrenceLabels[item.recurrenceType]}
                </span>
              )}
            </div>
          </div>

          {/* Element 3: Payment Icon with Select (Right) */}
          <div className="flex-shrink-0">
            <Select
              value={item.paymentMethod}
              onValueChange={(value) => onUpdatePaymentMethod(item.id, value as PaymentMethod)}
              disabled={!item.enabled}
            >
              <SelectTrigger 
                className={cn(
                  "w-10 h-10 p-0 border-none bg-transparent hover:bg-accent/50 transition-colors flex items-center justify-center",
                  !item.enabled && "opacity-40"
                )}
              >
                <span className={cn(
                  "text-primary",
                  !item.enabled && "text-muted-foreground"
                )}>
                  {getPaymentIcon(item.paymentMethod)}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-popover w-56" align="end">
                {paymentMethods.map(method => (
                  <SelectItem 
                    key={method.value} 
                    value={method.value}
                    className="py-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-primary mt-0.5">
                        {getPaymentIcon(method.value as PaymentMethod)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{method.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {getPaymentHelperText(method.value)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(item)}
              disabled={!item.enabled}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            {/* Delete button removed from mobile - available in edit sheet */}
          </div>
        </div>
      ))}
    </div>
  );
};
