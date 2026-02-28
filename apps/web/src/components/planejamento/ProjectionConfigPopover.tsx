import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, TrendingUp, TrendingDown, CreditCard, Banknote, Wallet, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  IncomeItem, 
  ExpenseItem, 
  PaymentMethod, 
  AdjustmentType,
  CalculationBase,
  IncomeProjectionConfig,
  ExpenseProjectionConfig,
  ProjectionDefaults
} from '@/types/financial';
import { paymentMethods } from '@/data/defaultData';
import { Switch } from '@/components/ui/switch';

interface ProjectionConfigPopoverProps {
  item: IncomeItem | ExpenseItem;
  type: 'income' | 'expense';
  allMonths: string[];
  currentMonth: string;
  onUpdateIncome?: (id: string, updates: Partial<IncomeItem>) => void;
  onUpdateExpense?: (id: string, updates: Partial<ExpenseItem>) => void;
  projectionDefaults?: ProjectionDefaults;
}

const adjustmentTypes: { value: AdjustmentType; label: string; description: string }[] = [
  { value: 'none', label: 'Sem reajuste', description: 'Valor fixo sem correção' },
  { value: 'ipca', label: 'IPCA', description: 'Índice de Preços ao Consumidor' },
  { value: 'igpm', label: 'IGPM', description: 'Índice Geral de Preços do Mercado' },
  { value: 'ibovespa', label: 'Ibovespa', description: 'Índice da Bolsa de Valores' },
  { value: 'fixed', label: 'Pré-fixado', description: 'Taxa fixa anual definida' },
];

const incomeAdjustmentTypes: { value: 'percentage' | 'fixed_value' | 'none'; label: string }[] = [
  { value: 'none', label: 'Sem reajuste' },
  { value: 'percentage', label: 'Aumento percentual (%)' },
  { value: 'fixed_value', label: 'Aumento em R$' },
];

const calculationBases: { value: CalculationBase; label: string }[] = [
  { value: 'last_month', label: 'Último mês' },
  { value: 'avg_3_months', label: 'Média últimos 3 meses' },
  { value: 'avg_6_months', label: 'Média últimos 6 meses' },
  { value: 'avg_12_months', label: 'Média últimos 12 meses' },
];

const getPaymentIcon = (method: PaymentMethod) => {
  switch (method) {
    case 'pix':
      return <QrCode className="h-3 w-3" />;
    case 'credit_card':
      return <CreditCard className="h-3 w-3" />;
    case 'debit_card':
      return <Wallet className="h-3 w-3" />;
    case 'boleto':
    case 'cash':
      return <Banknote className="h-3 w-3" />;
    default:
      return <CreditCard className="h-3 w-3" />;
  }
};

const formatMonthLabel = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year}`;
};

export function ProjectionConfigPopover({
  item,
  type,
  allMonths,
  currentMonth,
  onUpdateIncome,
  onUpdateExpense,
  projectionDefaults,
}: ProjectionConfigPopoverProps) {
  const [open, setOpen] = useState(false);
  
  const isExpense = type === 'expense';
  const expenseItem = isExpense ? (item as ExpenseItem) : null;
  const incomeItem = !isExpense ? (item as IncomeItem) : null;

  // Get defaults from global settings or fallback
  const getExpenseDefault = <T,>(key: keyof ExpenseProjectionConfig, fallback: T): T => {
    if (expenseItem?.projectionConfig?.[key] !== undefined) {
      return expenseItem.projectionConfig[key] as T;
    }
    if (projectionDefaults) {
      switch (key) {
        case 'adjustmentType': return projectionDefaults.expenseAdjustmentType as T;
        case 'additionalPercentage': return projectionDefaults.expenseAdditionalPercentage as T;
        case 'calculationBase': return projectionDefaults.expenseCalculationBase as T;
        case 'includeZeroMonths': return projectionDefaults.expenseIncludeZeroMonths as T;
      }
    }
    return fallback;
  };

  const getIncomeDefault = <T,>(key: keyof IncomeProjectionConfig, fallback: T): T => {
    if (incomeItem?.projectionConfig?.[key] !== undefined) {
      return incomeItem.projectionConfig[key] as T;
    }
    if (projectionDefaults) {
      switch (key) {
        case 'adjustmentType': return projectionDefaults.incomeAdjustmentType as T;
        case 'adjustmentValue': return projectionDefaults.incomeAdjustmentValue as T;
        case 'calculationBase': return projectionDefaults.incomeCalculationBase as T;
        case 'includeZeroMonths': return projectionDefaults.incomeIncludeZeroMonths as T;
      }
    }
    return fallback;
  };

  // Expense state
  const [expenseAdjustment, setExpenseAdjustment] = useState<AdjustmentType>(
    getExpenseDefault('adjustmentType', 'none')
  );
  const [expenseAdditionalPct, setExpenseAdditionalPct] = useState(
    getExpenseDefault('additionalPercentage', 0)
  );
  const [expenseStartMonth, setExpenseStartMonth] = useState(
    expenseItem?.projectionConfig?.startMonth || ''
  );
  const [expenseCalculationBase, setExpenseCalculationBase] = useState<CalculationBase>(
    getExpenseDefault('calculationBase', 'last_month')
  );
  const [expenseIncludeZeros, setExpenseIncludeZeros] = useState(
    getExpenseDefault('includeZeroMonths', false)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    expenseItem?.paymentMethod || projectionDefaults?.defaultPaymentMethod || 'credit_card'
  );

  // Income state
  const [incomeAdjustment, setIncomeAdjustment] = useState<'percentage' | 'fixed_value' | 'none'>(
    getIncomeDefault('adjustmentType', 'none')
  );
  const [incomeAdjustmentValue, setIncomeAdjustmentValue] = useState(
    getIncomeDefault('adjustmentValue', 0)
  );
  const [incomeStartMonth, setIncomeStartMonth] = useState(
    incomeItem?.projectionConfig?.startMonth || ''
  );
  const [incomeCalculationBase, setIncomeCalculationBase] = useState<CalculationBase>(
    getIncomeDefault('calculationBase', 'last_month')
  );
  const [incomeIncludeZeros, setIncomeIncludeZeros] = useState(
    getIncomeDefault('includeZeroMonths', false)
  );

  // Reset state when item changes
  useEffect(() => {
    if (isExpense && expenseItem) {
      setExpenseAdjustment(getExpenseDefault('adjustmentType', 'none'));
      setExpenseAdditionalPct(getExpenseDefault('additionalPercentage', 0));
      setExpenseStartMonth(expenseItem.projectionConfig?.startMonth || '');
      setExpenseCalculationBase(getExpenseDefault('calculationBase', 'last_month'));
      setExpenseIncludeZeros(getExpenseDefault('includeZeroMonths', false));
      setPaymentMethod(expenseItem.paymentMethod || projectionDefaults?.defaultPaymentMethod || 'credit_card');
    } else if (!isExpense && incomeItem) {
      setIncomeAdjustment(getIncomeDefault('adjustmentType', 'none'));
      setIncomeAdjustmentValue(getIncomeDefault('adjustmentValue', 0));
      setIncomeStartMonth(incomeItem.projectionConfig?.startMonth || '');
      setIncomeCalculationBase(getIncomeDefault('calculationBase', 'last_month'));
      setIncomeIncludeZeros(getIncomeDefault('includeZeroMonths', false));
    }
  }, [item, isExpense, projectionDefaults]);

  const handleSave = () => {
    if (isExpense && onUpdateExpense && expenseItem) {
      const projectionConfig: ExpenseProjectionConfig = {
        adjustmentType: expenseAdjustment,
        additionalPercentage: expenseAdditionalPct,
        startMonth: expenseStartMonth || undefined,
        calculationBase: expenseCalculationBase,
        includeZeroMonths: expenseIncludeZeros,
      };
      onUpdateExpense(expenseItem.id, { 
        projectionConfig,
        paymentMethod 
      });
    } else if (!isExpense && onUpdateIncome && incomeItem) {
      const projectionConfig: IncomeProjectionConfig = {
        adjustmentType: incomeAdjustment,
        adjustmentValue: incomeAdjustmentValue,
        startMonth: incomeStartMonth || undefined,
        calculationBase: incomeCalculationBase,
        includeZeroMonths: incomeIncludeZeros,
      };
      onUpdateIncome(incomeItem.id, { projectionConfig });
    }
    setOpen(false);
  };

  // Filter future months for selection
  const futureMonths = allMonths.filter(m => m >= currentMonth);

  const hasConfig = isExpense 
    ? (expenseItem?.projectionConfig?.adjustmentType && expenseItem.projectionConfig.adjustmentType !== 'none')
    : (incomeItem?.projectionConfig?.adjustmentType && incomeItem.projectionConfig.adjustmentType !== 'none');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-0.5 rounded hover:bg-muted/80 transition-colors",
            hasConfig && "text-primary"
          )}
          title="Configurar projeção"
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {isExpense ? (
              <TrendingDown className="h-4 w-4 text-expense" />
            ) : (
              <TrendingUp className="h-4 w-4 text-income" />
            )}
            <h4 className="font-medium text-sm">{item.name}</h4>
          </div>

          {isExpense ? (
            <>
              {/* Expense projection config */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo de reajuste</Label>
                <Select value={expenseAdjustment} onValueChange={(v) => setExpenseAdjustment(v as AdjustmentType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map((adj) => (
                      <SelectItem key={adj.value} value={adj.value}>
                        <div className="flex flex-col">
                          <span>{adj.label}</span>
                          <span className="text-[10px] text-muted-foreground">{adj.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(expenseAdjustment === 'ipca' || expenseAdjustment === 'igpm' || expenseAdjustment === 'ibovespa' || expenseAdjustment === 'fixed') && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    {expenseAdjustment === 'fixed' ? 'Taxa anual (%)' : 'Adicional ao índice (%)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={expenseAdditionalPct}
                    onChange={(e) => setExpenseAdditionalPct(Number(e.target.value))}
                    className="h-8 text-sm"
                    placeholder={expenseAdjustment === 'fixed' ? 'Ex: 5.0' : 'Ex: +2.0'}
                  />
                </div>
              )}

              {expenseAdjustment !== 'none' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Base de cálculo</Label>
                    <Select value={expenseCalculationBase} onValueChange={(v) => setExpenseCalculationBase(v as CalculationBase)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {calculationBases.map((base) => (
                          <SelectItem key={base.value} value={base.value}>
                            {base.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Considerar meses com valor zero</Label>
                    <Switch
                      checked={expenseIncludeZeros}
                      onCheckedChange={setExpenseIncludeZeros}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Aplicar a partir de</Label>
                    <Select value={expenseStartMonth || 'current'} onValueChange={(v) => setExpenseStartMonth(v === 'current' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Mês atual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Mês atual</SelectItem>
                        {futureMonths.map((month) => (
                          <SelectItem key={month} value={month}>
                            {formatMonthLabel(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs">Forma de pagamento padrão</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        {getPaymentIcon(paymentMethod)}
                        {paymentMethods.find(m => m.value === paymentMethod)?.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <span className="flex items-center gap-2">
                          {getPaymentIcon(method.value as PaymentMethod)}
                          {method.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Income projection config */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo de aumento</Label>
                <Select value={incomeAdjustment} onValueChange={(v) => setIncomeAdjustment(v as 'percentage' | 'fixed_value' | 'none')}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeAdjustmentTypes.map((adj) => (
                      <SelectItem key={adj.value} value={adj.value}>
                        {adj.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {incomeAdjustment !== 'none' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {incomeAdjustment === 'percentage' ? 'Aumento (%)' : 'Aumento (R$)'}
                    </Label>
                    <Input
                      type="number"
                      step={incomeAdjustment === 'percentage' ? '0.1' : '100'}
                      value={incomeAdjustmentValue}
                      onChange={(e) => setIncomeAdjustmentValue(Number(e.target.value))}
                      className="h-8 text-sm"
                      placeholder={incomeAdjustment === 'percentage' ? 'Ex: 5.0' : 'Ex: 500'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Base de cálculo</Label>
                    <Select value={incomeCalculationBase} onValueChange={(v) => setIncomeCalculationBase(v as CalculationBase)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {calculationBases.map((base) => (
                          <SelectItem key={base.value} value={base.value}>
                            {base.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Considerar meses com valor zero</Label>
                    <Switch
                      checked={incomeIncludeZeros}
                      onCheckedChange={setIncomeIncludeZeros}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Aplicar a partir de</Label>
                    <Select value={incomeStartMonth || 'current'} onValueChange={(v) => setIncomeStartMonth(v === 'current' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Mês atual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Mês atual</SelectItem>
                        {futureMonths.map((month) => (
                          <SelectItem key={month} value={month}>
                            {formatMonthLabel(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
