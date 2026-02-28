import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { ExpenseItem, PaymentMethod } from '@/types/financial';
import { 
  Grid3X3,
  CreditCard, 
  QrCode, 
  Banknote, 
  Building,
  Receipt
} from 'lucide-react';

interface CategoryPaymentMatrixProps {
  expenseItems: ExpenseItem[];
  getItemGoal: (itemId: string) => number;
  onCellClick?: (category: string, paymentMethod: PaymentMethod) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['credit_card', 'pix', 'debit_card', 'auto_debit', 'boleto', 'cash'];

const paymentMethodConfig: Record<PaymentMethod, { label: string; shortLabel: string; icon: React.ReactNode; color: string }> = {
  credit_card: { 
    label: 'Cartão de Crédito', 
    shortLabel: 'Crédito',
    icon: <CreditCard className="h-4 w-4" />, 
    color: 'bg-amber-500' 
  },
  debit_card: { 
    label: 'Cartão de Débito', 
    shortLabel: 'Débito',
    icon: <CreditCard className="h-4 w-4" />, 
    color: 'bg-blue-500' 
  },
  auto_debit: { 
    label: 'Débito Automático', 
    shortLabel: 'Auto',
    icon: <Building className="h-4 w-4" />, 
    color: 'bg-indigo-500' 
  },
  pix: { 
    label: 'PIX', 
    shortLabel: 'PIX',
    icon: <QrCode className="h-4 w-4" />, 
    color: 'bg-primary' 
  },
  boleto: { 
    label: 'Boleto', 
    shortLabel: 'Boleto',
    icon: <Receipt className="h-4 w-4" />, 
    color: 'bg-slate-500' 
  },
  cash: { 
    label: 'Dinheiro em Espécie', 
    shortLabel: 'Dinheiro',
    icon: <Banknote className="h-4 w-4" />, 
    color: 'bg-income' 
  },
};

export function CategoryPaymentMatrix({ 
  expenseItems, 
  getItemGoal,
  onCellClick 
}: CategoryPaymentMatrixProps) {
  const { isHidden } = useVisibility();
  const isVisible = !isHidden;

  const formatCurrency = (value: number, abbreviated = false) => {
    if (!isVisible) return '••••';
    if (abbreviated) {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return value.toFixed(0);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  // Agrupar itens por categoria
  const categoriesMap = useMemo(() => {
    const map: Record<string, ExpenseItem[]> = {};
    expenseItems.forEach(item => {
      if (!map[item.category]) {
        map[item.category] = [];
      }
      map[item.category].push(item);
    });
    return map;
  }, [expenseItems]);

  const categories = Object.keys(categoriesMap).sort();

  // Calcular matriz: categoria x método de pagamento
  const matrixData = useMemo(() => {
    const matrix: Record<string, Partial<Record<PaymentMethod, number>>> = {};
    const categoryTotals: Record<string, number> = {};
    const paymentTotals: Partial<Record<PaymentMethod, number>> = {};
    let grandTotal = 0;

    // Inicializar
    categories.forEach(cat => {
      matrix[cat] = {};
      PAYMENT_METHODS.forEach(pm => {
        matrix[cat][pm] = 0;
      });
      categoryTotals[cat] = 0;
    });
    PAYMENT_METHODS.forEach(pm => {
      paymentTotals[pm] = 0;
    });

    // Popular com valores das metas
    expenseItems.forEach(item => {
      const goal = getItemGoal(item.id);
      const method = item.paymentMethod || 'cash';
      
      if (matrix[item.category]) {
        matrix[item.category][method] = (matrix[item.category][method] || 0) + goal;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + goal;
      }
      paymentTotals[method] = (paymentTotals[method] || 0) + goal;
      grandTotal += goal;
    });

    return { matrix, categoryTotals, paymentTotals, grandTotal };
  }, [categories, expenseItems, getItemGoal]);

  // Filtrar métodos de pagamento que têm valores > 0
  const activePaymentMethods = PAYMENT_METHODS.filter(
    pm => matrixData.paymentTotals[pm] > 0
  );

  // Calcular intensidade da cor baseada no valor
  const getIntensity = (value: number, maxValue: number) => {
    if (value === 0 || maxValue === 0) return 0;
    return Math.min(value / maxValue, 1);
  };

  const maxCellValue = Math.max(
    ...Object.values(matrixData.matrix).flatMap(row => Object.values(row))
  );

  if (categories.length === 0 || activePaymentMethods.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-5 w-5 text-primary" />
          Matriz Categoria × Pagamento
        </CardTitle>
        <CardDescription>
          Distribuição das metas por categoria e forma de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Categoria</TableHead>
              {activePaymentMethods.map(pm => (
                <TableHead key={pm} className="text-center min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "h-6 w-6 rounded flex items-center justify-center text-white",
                      paymentMethodConfig[pm].color
                    )}>
                      {paymentMethodConfig[pm].icon}
                    </div>
                    <span className="text-xs font-normal">
                      {paymentMethodConfig[pm].shortLabel}
                    </span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[100px] bg-muted/50">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category}>
                <TableCell className="font-medium text-sm">
                  {category}
                </TableCell>
                {activePaymentMethods.map(pm => {
                  const value = matrixData.matrix[category]?.[pm] || 0;
                  const intensity = getIntensity(value, maxCellValue);
                  
                  return (
                    <TableCell 
                      key={pm}
                      className={cn(
                        "text-center text-sm cursor-pointer transition-colors hover:bg-muted/80",
                        value > 0 && "font-mono"
                      )}
                      style={{
                        backgroundColor: value > 0 
                          ? `hsl(var(--primary) / ${0.1 + intensity * 0.25})` 
                          : undefined
                      }}
                      onClick={() => onCellClick?.(category, pm)}
                    >
                      {value > 0 ? formatCurrency(value, true) : '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-semibold font-mono bg-muted/30">
                  {formatCurrency(matrixData.categoryTotals[category], true)}
                </TableCell>
              </TableRow>
            ))}
            {/* Linha de totais */}
            <TableRow className="border-t-2 bg-muted/50 font-semibold">
              <TableCell>Total</TableCell>
              {activePaymentMethods.map(pm => (
                <TableCell key={pm} className="text-center font-mono">
                  {formatCurrency(matrixData.paymentTotals[pm], true)}
                </TableCell>
              ))}
              <TableCell className="text-center font-mono text-primary">
                {formatCurrency(matrixData.grandTotal, true)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        
        {/* Legenda de destaque para cartão de crédito */}
        {matrixData.paymentTotals.credit_card > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Total previsto no Cartão de Crédito</span>
              </div>
              <Badge variant="outline" className="font-mono border-amber-300 text-amber-700 dark:text-amber-300">
                {formatCurrency(matrixData.paymentTotals.credit_card)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isVisible && matrixData.grandTotal > 0 && (
                <>
                  Representa {((matrixData.paymentTotals.credit_card / matrixData.grandTotal) * 100).toFixed(0)}% 
                  do total de despesas previstas
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
