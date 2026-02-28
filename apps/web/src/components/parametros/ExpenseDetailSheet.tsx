import React, { useState, useEffect } from 'react';
import { ExpenseItem, CalculationBase, AdjustmentType, PaymentMethod, SharedPerson, ExpenseNature, RecurrenceType } from '@/types/financial';
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
import { Wallet, Barcode, QrCode, CreditCard, Banknote, Building, User, RefreshCcw, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MonthSelector } from './MonthSelector';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const calculationBases: { value: CalculationBase; label: string }[] = [
  { value: 'last_month', label: 'Último mês' },
  { value: 'avg_3_months', label: 'Média últimos 3 meses' },
  { value: 'avg_6_months', label: 'Média últimos 6 meses' },
  { value: 'avg_12_months', label: 'Média últimos 12 meses' },
];

const adjustmentTypes: { value: AdjustmentType; label: string }[] = [
  { value: 'none', label: 'Sem reajuste' },
  { value: 'ipca', label: 'IPCA' },
  { value: 'igpm', label: 'IGPM' },
  { value: 'ibovespa', label: 'Ibovespa' },
  { value: 'fixed', label: 'Pré-fixado' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Meses específicos' },
];

const expenseNatureOptions: { value: ExpenseNature; label: string; description: string }[] = [
  { value: 'fixed', label: 'Fixa', description: 'Valor exato todo mês (aluguel, assinaturas)' },
  { value: 'semi_variable', label: 'Semi-variável', description: 'Varia pouco, previsível (luz, água, gás)' },
  { value: 'variable', label: 'Variável', description: 'Imprevisível (supermercado, lazer)' },
];

const recurrenceTypeOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

const paymentMethodOptions: { value: PaymentMethod; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'boleto', label: 'Boleto', description: 'Compensação em até 3 dias úteis', icon: Barcode },
  { value: 'pix', label: 'Pix', description: 'Pagamento instantâneo', icon: QrCode },
  { value: 'credit_card', label: 'Cartão de Crédito', description: 'Fatura no próximo mês', icon: CreditCard },
  { value: 'debit_card', label: 'Cartão de Débito', description: 'Débito imediato na conta', icon: CreditCard },
  { value: 'auto_debit', label: 'Débito Automático', description: 'Débito automático programado', icon: RefreshCcw },
  { value: 'cash', label: 'Dinheiro em Espécie', description: 'Pagamento em espécie', icon: Banknote },
];

const getPaymentIcon = (method: PaymentMethod): React.ElementType => {
  const option = paymentMethodOptions.find(o => o.value === method);
  return option?.icon || CreditCard;
};

interface ExpenseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ExpenseItem | null;
  onUpdate: (id: string, updates: Partial<ExpenseItem>) => void;
  onUpdatePaymentMethod?: (id: string, method: PaymentMethod) => void;
  onUpdateResponsible?: (id: string, personId: string | undefined) => void;
  onDelete?: (item: ExpenseItem, skipDialog?: boolean) => void;
  sharedWith?: SharedPerson[];
  isSharedAccount?: boolean;
  isMobile?: boolean;
}

export const ExpenseDetailSheet: React.FC<ExpenseDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  onUpdate,
  onUpdatePaymentMethod,
  onUpdateResponsible,
  onDelete,
  sharedWith = [],
  isSharedAccount = false,
  isMobile = false,
}) => {
  // Local state for editable fields
  const [dueDay, setDueDay] = useState<number | undefined>();
  const [frequency, setFrequency] = useState<'monthly' | 'annual' | 'custom'>('monthly');
  const [occurrenceMonths, setOccurrenceMonths] = useState<number[]>([]);
  const [alias, setAlias] = useState('');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('variable');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('monthly');

  // Check expense types for auto-frequency
  const nameLower = item?.name.toLowerCase() || '';
  const isIPTU = nameLower.includes('iptu');
  const isIPVA = nameLower.includes('ipva');
  const isSeguroVeiculo = nameLower.includes('seguro') && (nameLower.includes('veículo') || nameLower.includes('veiculo') || nameLower.includes('carro'));
  const isMatricula = nameLower.includes('matrícula') || nameLower.includes('matricula');
  const isRentalExpense = nameLower.includes('aluguel');
  
  // Determine if frequency should be locked
  const isAnnualType = isIPTU || isIPVA || isSeguroVeiculo || isMatricula;
  const isFrequencyLocked = isAnnualType;
  const autoFrequency: 'monthly' | 'annual' | 'custom' = isAnnualType ? 'annual' : 'monthly';

  // Sync local state with item prop
  useEffect(() => {
    if (item) {
      setDueDay(item.dueDay);
      setFrequency(isFrequencyLocked ? autoFrequency : (item.frequency || 'monthly'));
      setOccurrenceMonths(item.annualMonths || []);
      setAlias(item.alias || '');
      setExpenseNature(item.expenseNature || 'variable');
      setRecurrenceType(item.recurrenceType || 'monthly');
    }
  }, [item, open, isFrequencyLocked, autoFrequency]);

  // Handle save
  const handleSave = () => {
    if (!item) return;

    // Validate alias for rental expenses
    if (isRentalExpense && alias && alias.length > 10) {
      toast.error('Nome do aluguel muito longo', {
        description: 'O nome do aluguel deve ter no máximo 10 caracteres.',
      });
      return;
    }

    onUpdate(item.id, {
      dueDay,
      frequency: isFrequencyLocked ? autoFrequency : frequency,
      annualMonths: frequency !== 'monthly' ? occurrenceMonths : undefined,
      alias: isRentalExpense ? alias || undefined : undefined,
      expenseNature,
      recurrenceType,
    });
    
    toast.success('Configurações salvas', {
      description: 'As configurações da despesa foram atualizadas.',
    });
    
    onOpenChange(false);
  };

  if (!item) return null;

  const isAluguel = item.name.toLowerCase().includes('aluguel');
  const projConfig = item.projectionConfig || {
    adjustmentType: isAluguel ? 'igpm' : ('ipca' as AdjustmentType),
    additionalPercentage: 0,
    calculationBase: isAluguel ? 'avg_12_months' : ('avg_6_months' as CalculationBase),
    includeZeroMonths: false,
  };

  const PaymentIcon = getPaymentIcon(item.paymentMethod);
  const responsiblePerson = sharedWith.find(p => p.id === item.responsiblePersonId);
  const effectiveFrequency = isFrequencyLocked ? autoFrequency : frequency;

  // Check if responsible is missing (for shared accounts)
  const isMissingResponsible = isSharedAccount && !item.responsiblePersonId;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto flex flex-col">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-expense flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">{item.name}</SheetTitle>
              <SheetDescription>
                {item.category} • Configurações avançadas
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Critical Error Alert - Missing Responsible */}
          {isMissingResponsible && (
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

          {/* Expense Classification Section */}
          <div className="p-4 rounded-lg border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-expense" />
              Classificação da Despesa
            </h3>

            {/* Nature: Fixed or Variable */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Natureza</Label>
              <div className="grid grid-cols-2 gap-2">
                {expenseNatureOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExpenseNature(option.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      expenseNature === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recurrence Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recorrência</Label>
              <Select
                value={recurrenceType}
                onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {recurrenceTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Schedule Section */}
          <div className="p-4 rounded-lg border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-expense" />
              Configuração de Pagamento
            </h3>

            {/* Due Day */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dia de Vencimento</Label>
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

            {/* Month Selection for non-monthly */}
            {(effectiveFrequency !== 'monthly' || isAnnualType) && (
              <>
                <MonthSelector
                  label={isAnnualType 
                    ? 'Mês(es) de Pagamento' 
                    : (effectiveFrequency === 'annual' ? 'Mês de Pagamento' : 'Meses de Pagamento')
                  }
                  description={isAnnualType
                    ? 'Selecione o(s) mês(es) de pagamento. Se mais de um, o valor será parcelado.'
                    : (effectiveFrequency === 'annual' 
                      ? 'Selecione o mês em que esta despesa ocorre'
                      : 'Selecione os meses em que esta despesa ocorre')
                  }
                  selectedMonths={occurrenceMonths}
                  onChange={setOccurrenceMonths}
                  maxSelection={!isAnnualType && effectiveFrequency === 'annual' ? 1 : undefined}
                />

                {/* Show installment info when multiple months selected */}
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

          {/* Rental Alias Section */}
          {isRentalExpense && (
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

          {/* Payment Method Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Forma de pagamento padrão</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Método utilizado para pagar esta despesa
            </p>
            <Select
              value={item.paymentMethod}
              onValueChange={(value) => onUpdatePaymentMethod?.(item.id, value as PaymentMethod)}
            >
              <SelectTrigger className="bg-background">
                <div className="flex items-center gap-2">
                  <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {paymentMethodOptions.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span>{method.label}</span>
                          <span className="text-xs text-muted-foreground">{method.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Responsible Person Section - Only for shared accounts */}
          {isSharedAccount && sharedWith.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                Responsável
                {isMissingResponsible && (
                  <span className="text-xs text-destructive font-normal">(obrigatório)</span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Pessoa responsável por esta despesa
              </p>
              <Select
                value={item.responsiblePersonId || 'none'}
                onValueChange={(value) => onUpdateResponsible?.(item.id, value === 'none' ? undefined : value)}
              >
                <SelectTrigger className={`bg-background ${isMissingResponsible ? 'border-destructive' : ''}`}>
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
                Índice usado para corrigir o valor nas projeções futuras
              </p>
              <Select
                value={projConfig.adjustmentType}
                onValueChange={(value) =>
                  onUpdate(item.id, {
                    projectionConfig: {
                      ...projConfig,
                      adjustmentType: value as AdjustmentType,
                    },
                  })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {adjustmentTypes.map((adj) => (
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
                value={projConfig.calculationBase || 'avg_6_months'}
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
                  Excluir Despesa
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
            <Button onClick={handleSave} className="gradient-expense text-primary-foreground flex-1 sm:flex-none">
              Salvar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
};
