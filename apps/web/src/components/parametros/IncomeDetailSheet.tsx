import React, { useState, useEffect, useCallback } from 'react';
import { IncomeItem, CalculationBase, SharedPerson, StockVestingConfig } from '@/types/financial';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, DollarSign, Percent, AlertCircle, User, Trash2, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MonthSelector } from './MonthSelector';
import { StockVestingForm } from '@/components/receitas/StockVestingForm';
import { useFinancial } from '@/contexts/FinancialContext';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];


const calculationBases: { value: CalculationBase; label: string }[] = [
  { value: 'last_month', label: 'Último mês' },
  { value: 'avg_3_months', label: 'Média últimos 3 meses' },
  { value: 'avg_6_months', label: 'Média últimos 6 meses' },
  { value: 'avg_12_months', label: 'Média últimos 12 meses' },
];

const incomeAdjustmentTypes: { value: 'percentage' | 'fixed_value' | 'none'; label: string }[] = [
  { value: 'none', label: 'Sem reajuste' },
  { value: 'percentage', label: 'Aumento percentual (%)' },
  { value: 'fixed_value', label: 'Aumento em R$' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Meses específicos' },
];

interface IncomeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: IncomeItem | null;
  onUpdate: (id: string, updates: Partial<IncomeItem>) => void;
  onUpdateResponsible?: (id: string, personId: string | undefined) => void;
  onDelete?: (item: IncomeItem, skipDialog?: boolean) => void;
  sharedWith?: SharedPerson[];
  isSharedAccount?: boolean;
  isMobile?: boolean;
  existingNames?: string[]; // Para validar nomes únicos
  incomeCount?: number; // Quantidade de receitas do mesmo tipo para validar CNPJ obrigatório
}

// Helper functions for formatting
const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

const parseCurrency = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : Math.round(parsed * 100);
};

const formatCurrencyWhileTyping = (value: string): string => {
  // Remove everything except digits and comma
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Handle decimal part
  const parts = cleaned.split(',');
  let integerPart = parts[0] || '';
  let decimalPart = parts.length > 1 ? parts[1] : '';
  
  // Limit decimal to 2 digits
  decimalPart = decimalPart.slice(0, 2);
  
  // Add thousand separators to integer part
  if (integerPart.length > 0) {
    integerPart = integerPart.replace(/^0+/, '') || '0';
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  
  // Rebuild the number
  if (parts.length > 1) {
    return `${integerPart},${decimalPart}`;
  }
  return integerPart;
};

const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return '';
  return value.toFixed(2).replace('.', ',');
};

const parsePercentage = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  const cleaned = value.replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return undefined;
  // Clamp between 0 and 100
  return Math.min(100, Math.max(0, parsed));
};

const formatPercentageWhileTyping = (value: string): string => {
  // Remove everything except digits and comma
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Handle decimal part
  const parts = cleaned.split(',');
  let integerPart = parts[0] || '';
  let decimalPart = parts.length > 1 ? parts[1] : '';
  
  // Limit decimal to 2 digits
  decimalPart = decimalPart.slice(0, 2);
  
  // Limit integer part to reasonable range (max 100)
  if (integerPart.length > 0) {
    const intValue = parseInt(integerPart, 10);
    if (intValue > 100) {
      integerPart = '100';
    }
  }
  
  // Rebuild the number
  if (parts.length > 1) {
    return `${integerPart},${decimalPart}`;
  }
  return integerPart;
};

export const IncomeDetailSheet: React.FC<IncomeDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  onUpdate,
  onUpdateResponsible,
  onDelete,
  sharedWith = [],
  isSharedAccount = false,
  isMobile = false,
  existingNames = [],
  incomeCount = 1,
}) => {
  const { config: financialConfig } = useFinancial();
  
  // Local state for the triangular calculation
  const [grossValue, setGrossValue] = useState<number | undefined>();
  const [discountRate, setDiscountRate] = useState<number | undefined>();
  const [netValue, setNetValue] = useState<number | undefined>();
  const [focusedField, setFocusedField] = useState<'gross' | 'discount' | 'net' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Display values for inputs
  const [grossDisplay, setGrossDisplay] = useState('');
  const [discountDisplay, setDiscountDisplay] = useState('');
  const [netDisplay, setNetDisplay] = useState('');

  // New fields state
  const [dueDay, setDueDay] = useState<number | undefined>();
  const [frequency, setFrequency] = useState<'monthly' | 'annual' | 'custom'>('monthly');
  const [occurrenceMonths, setOccurrenceMonths] = useState<number[]>([]);
  const [payerCnpj, setPayerCnpj] = useState('');
  const [payerCompanyName, setPayerCompanyName] = useState('');
  const [alias, setAlias] = useState('');
  
  // Stock vesting config state
  const [stockVestingConfig, setStockVestingConfig] = useState<Partial<StockVestingConfig>>({
    compensationType: 'rsu',
    vestingType: 'graded',
    cliffMonths: 12,
    vestingPeriodMonths: 48,
    vestedQuantity: 0,
  });

  // Check income types for auto-frequency
  const nameLower = item?.name.toLowerCase() || '';
  const isThirteenthSalary = nameLower.includes('13') || 
    nameLower.includes('décimo terceiro') ||
    nameLower.includes('decimo terceiro');
  const isSalary = nameLower.includes('salário') || nameLower.includes('salario');
  const isBonus = nameLower.includes('bônus') || nameLower.includes('bonus');
  const isPLR = nameLower.includes('plr') || nameLower.includes('participação nos lucros');
  
  // Determine if frequency should be locked
  const isAnnualType = isThirteenthSalary || isBonus || isPLR;
  const isMonthlyType = isSalary && !isThirteenthSalary;
  const isFrequencyLocked = isAnnualType || isMonthlyType;
  const autoFrequency: 'monthly' | 'annual' | 'custom' = isAnnualType ? 'annual' : 'monthly';

  // Check if item is rental income
  const isRentalIncome = nameLower.includes('aluguel');
  
  // Check if item is stock compensation
  const isStockCompensation = item?.isStockCompensation || false;

  // Check if CNPJ is required (multiple incomes of same type)
  const isCnpjRequired = incomeCount > 1;

  // Sync local state with item prop
  useEffect(() => {
    if (item) {
      setGrossValue(item.grossValue);
      setDiscountRate(item.discountRate);
      setNetValue(item.netValue);
      setGrossDisplay(formatCurrency(item.grossValue));
      setDiscountDisplay(formatPercentage(item.discountRate));
      setNetDisplay(formatCurrency(item.netValue));
      setValidationError(null);
      // Sync new fields - use auto frequency for locked types
      setDueDay(item.dueDay);
      setFrequency(isFrequencyLocked ? autoFrequency : (item.frequency || 'monthly'));
      setOccurrenceMonths(item.occurrenceMonths || []);
      setPayerCnpj(item.payerCnpj || '');
      setPayerCompanyName(item.payerCompanyName || '');
      setAlias(item.alias || '');
      // Sync stock vesting config
      if (item.stockVestingConfig) {
        setStockVestingConfig(item.stockVestingConfig);
      } else {
        setStockVestingConfig({
          compensationType: 'rsu',
          vestingType: 'graded',
          cliffMonths: 12,
          vestingPeriodMonths: 48,
          vestedQuantity: 0,
        });
      }
    }
  }, [item, open, isFrequencyLocked, autoFrequency]);

  // Triangular calculation logic
  const calculateTriangular = useCallback((
    field: 'gross' | 'discount' | 'net',
    gross: number | undefined,
    discount: number | undefined,
    net: number | undefined
  ) => {
    // Count filled fields (excluding the one being edited)
    const filled = [
      field !== 'gross' && gross !== undefined,
      field !== 'discount' && discount !== undefined,
      field !== 'net' && net !== undefined,
    ].filter(Boolean).length;

    // Only calculate if we have exactly 2 fields filled (including the current one being edited)
    const totalFilled = [gross, discount, net].filter(v => v !== undefined).length;
    
    if (totalFilled >= 2) {
      if (field === 'net' && gross !== undefined && discount !== undefined) {
        // Case A: Have Gross and Discount, calculate Net
        const calculated = Math.round(gross * (1 - discount / 100));
        setNetValue(calculated);
        setNetDisplay(formatCurrency(calculated));
      } else if (field === 'gross' && net !== undefined && discount !== undefined) {
        // Case B: Have Net and Discount, calculate Gross
        if (discount < 100) {
          const calculated = Math.round(net / (1 - discount / 100));
          setGrossValue(calculated);
          setGrossDisplay(formatCurrency(calculated));
        }
      } else if (field === 'discount' && gross !== undefined && net !== undefined) {
        // Case C: Have Gross and Net, calculate Discount
        if (gross > 0) {
          const calculated = (1 - net / gross) * 100;
          setDiscountRate(calculated);
          setDiscountDisplay(formatPercentage(calculated));
        }
      } else if (field === 'gross' && discount === undefined && net !== undefined && gross !== undefined) {
        // Calculate Discount from Gross and Net
        if (gross > 0) {
          const calculated = (1 - net / gross) * 100;
          setDiscountRate(calculated);
          setDiscountDisplay(formatPercentage(calculated));
        }
      } else if (field === 'net' && discount === undefined && gross !== undefined && net !== undefined) {
        // Calculate Discount from Gross and Net
        if (gross > 0) {
          const calculated = (1 - net / gross) * 100;
          setDiscountRate(calculated);
          setDiscountDisplay(formatPercentage(calculated));
        }
      } else if (field === 'discount' && gross === undefined && net !== undefined && discount !== undefined) {
        // Calculate Gross from Net and Discount
        if (discount < 100) {
          const calculated = Math.round(net / (1 - discount / 100));
          setGrossValue(calculated);
          setGrossDisplay(formatCurrency(calculated));
        }
      } else if (field === 'gross' && net === undefined && gross !== undefined && discount !== undefined) {
        // Calculate Net from Gross and Discount
        const calculated = Math.round(gross * (1 - discount / 100));
        setNetValue(calculated);
        setNetDisplay(formatCurrency(calculated));
      } else if (field === 'net' && gross === undefined && net !== undefined && discount !== undefined) {
        // Calculate Gross from Net and Discount
        if (discount < 100) {
          const calculated = Math.round(net / (1 - discount / 100));
          setGrossValue(calculated);
          setGrossDisplay(formatCurrency(calculated));
        }
      } else if (field === 'discount' && net === undefined && gross !== undefined && discount !== undefined) {
        // Calculate Net from Gross and Discount
        const calculated = Math.round(gross * (1 - discount / 100));
        setNetValue(calculated);
        setNetDisplay(formatCurrency(calculated));
      }
    }
  }, []);

  // Handle blur to trigger calculation
  const handleBlur = (field: 'gross' | 'discount' | 'net') => {
    setFocusedField(null);
    calculateTriangular(field, grossValue, discountRate, netValue);
  };

  // Validation logic
  const validateData = (): boolean => {
    const filledCount = [grossValue, discountRate, netValue].filter(v => v !== undefined).length;
    
    if (filledCount === 0 || filledCount === 3) {
      setValidationError(null);
      return true;
    }
    
    setValidationError('Para definir valores padrão, o sistema precisa compor a equação completa (Bruto, Alíquota e Líquido). Preencha pelo menos dois campos para calcular o terceiro.');
    return false;
  };

  // Format CNPJ
  const formatCnpj = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  // Handle save
  const handleSave = () => {
    if (!item) return;
    
    // For stock compensation, validate required fields
    if (isStockCompensation) {
      if (!stockVestingConfig.companyName) {
        toast.error('Empresa obrigatória', {
          description: 'Informe o nome da empresa que oferece as ações.',
        });
        return;
      }
      if (!stockVestingConfig.grantDate) {
        toast.error('Data do grant obrigatória', {
          description: 'Informe a data da concessão das ações.',
        });
        return;
      }
      if (!stockVestingConfig.grantQuantity || stockVestingConfig.grantQuantity <= 0) {
        toast.error('Quantidade obrigatória', {
          description: 'Informe a quantidade de ações concedidas.',
        });
        return;
      }
      
      onUpdate(item.id, {
        stockVestingConfig: stockVestingConfig as StockVestingConfig,
      });
      
      toast.success('Configuração salva', {
        description: 'O vesting das ações foi configurado com sucesso.',
      });
      
      onOpenChange(false);
      return;
    }
    
    if (!validateData()) {
      toast.error('Dados incompletos', {
        description: 'Preencha todos os campos de valor ou deixe todos vazios.',
      });
      return;
    }

    // Validate alias for rental income
    if (isRentalIncome && alias && alias.length > 10) {
      toast.error('Nome do aluguel muito longo', {
        description: 'O nome do aluguel deve ter no máximo 10 caracteres.',
      });
      return;
    }

    // Validate CNPJ is required when there are multiple incomes
    if (isCnpjRequired && !payerCnpj) {
      toast.error('CNPJ obrigatório', {
        description: 'Quando há mais de uma receita, o CNPJ da empresa pagadora é obrigatório.',
      });
      return;
    }

    onUpdate(item.id, {
      grossValue,
      discountRate,
      netValue,
      dueDay,
      frequency: isFrequencyLocked ? autoFrequency : frequency,
      occurrenceMonths: frequency !== 'monthly' ? occurrenceMonths : undefined,
      payerCnpj: payerCnpj || undefined,
      payerCompanyName: payerCompanyName || undefined,
      alias: isRentalIncome ? alias || undefined : undefined,
    });
    
    toast.success('Valores salvos', {
      description: 'Os valores da receita foram atualizados com sucesso.',
    });
    
    onOpenChange(false);
  };

  // Handle input change with formatting
  const handleGrossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCurrencyWhileTyping(value);
    // Limit to 10 digits in integer part
    const integerPart = formatted.split(',')[0].replace(/\./g, '');
    if (integerPart.length <= 10) {
      setGrossDisplay(formatted);
      const parsed = parseCurrency(formatted);
      setGrossValue(parsed);
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPercentageWhileTyping(value);
    setDiscountDisplay(formatted);
    const parsed = parsePercentage(formatted);
    setDiscountRate(parsed);
  };

  const handleNetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCurrencyWhileTyping(value);
    // Limit to 10 digits in integer part
    const integerPart = formatted.split(',')[0].replace(/\./g, '');
    if (integerPart.length <= 10) {
      setNetDisplay(formatted);
      const parsed = parseCurrency(formatted);
      setNetValue(parsed);
    }
  };

  if (!item) return null;

  const projConfig = item.projectionConfig || {
    adjustmentType: 'none' as const,
    adjustmentValue: 0,
    calculationBase: 'avg_12_months' as CalculationBase,
    includeZeroMonths: false,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] flex flex-col overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-income flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">{item.name}</SheetTitle>
              <SheetDescription>Configurações avançadas de projeção</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Stock Compensation Form - Special layout for stock options/RSUs */}
          {isStockCompensation ? (
            <StockVestingForm
              config={stockVestingConfig}
              onChange={setStockVestingConfig}
              incomeItems={financialConfig.incomeItems}
            />
          ) : (
            <>
              {/* Critical Error Alert - Missing Responsible */}
              {isSharedAccount && !item.responsiblePersonId && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Responsável não definido</p>
                    <p className="text-xs text-destructive/80">
                      Em contas compartilhadas, é necessário definir um responsável.
                    </p>
                  </div>
                </div>
              )}

          {/* Value Definition Section */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-income/5 to-income/10 border border-income/20">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-income" />
              Definição de Valores
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Preencha 2 campos e o terceiro será calculado automaticamente
            </p>
            
            <div className="space-y-4">
              {/* Gross Value */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Valor Bruto (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    value={grossDisplay}
                    onChange={handleGrossChange}
                    onFocus={() => setFocusedField('gross')}
                    onBlur={() => handleBlur('gross')}
                    placeholder="0,00"
                    className={cn(
                      "pl-9 bg-background",
                      focusedField === 'gross' && "ring-2 ring-income"
                    )}
                  />
                </div>
              </div>

              {/* Discount Rate */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Alíquota Total de Descontos (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={discountDisplay}
                    onChange={handleDiscountChange}
                    onFocus={() => setFocusedField('discount')}
                    onBlur={() => handleBlur('discount')}
                    placeholder="0,00"
                    className={cn(
                      "pl-9 bg-background",
                      focusedField === 'discount' && "ring-2 ring-income"
                    )}
                  />
                </div>
              </div>

              {/* Net Value */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Valor Líquido (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    value={netDisplay}
                    onChange={handleNetChange}
                    onFocus={() => setFocusedField('net')}
                    onBlur={() => handleBlur('net')}
                    placeholder="0,00"
                    className={cn(
                      "pl-9 bg-background",
                      focusedField === 'net' && "ring-2 ring-income"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{validationError}</p>
              </div>
            )}
          </div>

          {/* Payment Schedule Section */}
          <div className="p-4 rounded-lg border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-income" />
              Configuração de Recebimento
            </h3>

            {/* Due Day */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dia de Recebimento</Label>
            <Select
                value={dueDay?.toString() || 'none'}
                onValueChange={(value) => setDueDay(value === 'none' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-60">
                  <SelectItem value="none">Não definido</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequência</Label>
              {isFrequencyLocked ? (
                <div className="px-3 py-2 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
                  {autoFrequency === 'annual' ? 'Anual' : 'Mensal'}
                  <span className="text-xs ml-2">(automático)</span>
                </div>
              ) : (
                <Select
                  value={frequency}
                  onValueChange={(value) => setFrequency(value as 'monthly' | 'annual' | 'custom')}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {frequencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Month Selection for non-monthly - also for 13º, Bônus, PLR */}
            {(frequency !== 'monthly' || isAnnualType) && (
              <>
                <MonthSelector
                  label={isAnnualType 
                    ? 'Mês(es) de Recebimento' 
                    : (frequency === 'annual' ? 'Mês de Recebimento' : 'Meses de Recebimento')
                  }
                  description={isAnnualType
                    ? 'Selecione o(s) mês(es) de recebimento. Se mais de um, o valor será parcelado.'
                    : (frequency === 'annual' 
                      ? 'Selecione o mês em que esta receita ocorre'
                      : 'Selecione os meses em que esta receita ocorre')
                  }
                  selectedMonths={occurrenceMonths}
                  onChange={setOccurrenceMonths}
                  maxSelection={!isAnnualType && frequency === 'annual' ? 1 : undefined}
                />

                {/* Show installment info when multiple months selected for annual types */}
                {isAnnualType && occurrenceMonths.length > 1 && (
                  <div className="p-2 rounded bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">
                      Pagamento parcelado em {occurrenceMonths.length} vezes: 
                      cada parcela será {(100 / occurrenceMonths.length).toFixed(1)}% do valor total, 
                      distribuído nos meses {occurrenceMonths.map(m => MONTH_LABELS[m - 1]).join(' e ')}.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payer Company Section */}
          <div className="p-4 rounded-lg border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-income" />
              Empresa Pagadora
              {isCnpjRequired && (
                <span className="text-xs text-destructive font-normal">(obrigatório)</span>
              )}
            </h3>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                CNPJ {isCnpjRequired && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={payerCnpj}
                onChange={(e) => setPayerCnpj(formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="bg-background"
                maxLength={18}
              />
              {isCnpjRequired && !payerCnpj && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  CNPJ obrigatório quando há múltiplas receitas
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome da Empresa</Label>
              <Input
                value={payerCompanyName}
                onChange={(e) => setPayerCompanyName(e.target.value)}
                placeholder="Nome da empresa"
                className="bg-background"
                maxLength={100}
              />
            </div>
          </div>

          {/* Rental Alias Section */}
          {isRentalIncome && (
            <div className="p-4 rounded-lg border border-border space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Identificador do Aluguel</h3>
              <p className="text-xs text-muted-foreground">
                Nome curto para identificar este aluguel (máx. 10 caracteres)
              </p>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value.slice(0, 10))}
                placeholder="Ex: Apto 101"
                className="bg-background"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                {alias.length}/10 caracteres
              </p>
            </div>
          )}

          {/* Responsible Person Section - Only for shared accounts */}
          {isSharedAccount && sharedWith.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Responsável</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Pessoa responsável por esta receita
              </p>
              <Select
                value={item.responsiblePersonId || 'none'}
                onValueChange={(value) => onUpdateResponsible?.(item.id, value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="bg-background">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione um responsável" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Não definido</span>
                  </SelectItem>
                  {sharedWith.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Projection Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Configurações de Projeção</h3>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Reajuste</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Como o valor será corrigido nas projeções futuras
              </p>
              <Select
                value={projConfig.adjustmentType}
                onValueChange={(value) =>
                  onUpdate(item.id, {
                    projectionConfig: {
                      ...projConfig,
                      adjustmentType: value as 'percentage' | 'fixed_value' | 'none',
                    },
                  })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {incomeAdjustmentTypes.map((adj) => (
                    <SelectItem key={adj.value} value={adj.value}>
                      {adj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Base de Cálculo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Define qual período será usado para calcular projeções
              </p>
              <Select
                value={projConfig.calculationBase || 'avg_12_months'}
                onValueChange={(value) =>
                  onUpdate(item.id, {
                    projectionConfig: { ...projConfig, calculationBase: value as CalculationBase },
                  })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {calculationBases.map((base) => (
                    <SelectItem key={base.value} value={base.value}>
                      {base.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Considerar Meses Zerados</Label>
                <p className="text-xs text-muted-foreground">
                  Inclui meses com valor R$ 0 no cálculo da média
                </p>
              </div>
              <Switch
                checked={projConfig.includeZeroMonths || false}
                onCheckedChange={(v) =>
                  onUpdate(item.id, {
                    projectionConfig: { ...projConfig, includeZeroMonths: v },
                  })
                }
              />
            </div>
          </div>
            </>
          )}
        </div>

        <SheetFooter className="pt-4 border-t border-border flex-col gap-3 sm:flex-row">
          {/* Delete button - only on mobile and for non-system items */}
          {isMobile && onDelete && !item.isSystemDefault && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Receita
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{item.name}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      onDelete(item, true);
                      onOpenChange(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gradient-income text-primary-foreground flex-1 sm:flex-none">
              Salvar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
