import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PaymentMethod, AssetLinkedExpense } from '@/types/financial';
import { 
  calculateMonthlyIPVA, 
  calculateMonthlyFuel, 
  calculateMonthlyInsurance, 
  calculateMonthlyMaintenance,
  calculateMonthlyLicensing,
  vehicleBenchmarks
} from '@/data/vehicleBenchmarks';
import { 
  Car, 
  Shield, 
  Fuel, 
  Wrench, 
  ParkingCircle, 
  CreditCard, 
  Receipt, 
  FileText,
  CircleDollarSign,
  Banknote,
  Wallet,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const months = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

const paymentMethodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'pix', label: 'PIX', icon: <Wallet className="h-4 w-4" /> },
  { value: 'boleto', label: 'Boleto', icon: <Receipt className="h-4 w-4" /> },
  { value: 'credit_card', label: 'Cartão', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'debit_card', label: 'Débito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'cash', label: 'Espécie', icon: <Banknote className="h-4 w-4" /> },
];

type PaymentType = 'cash' | 'installments';

interface VehicleCostConfig {
  enabled: boolean;
  paymentType: PaymentType;
  selectedMonths: number[];
  monthlyValue: number;
  annualValue: number;
  paymentMethod: PaymentMethod;
}

interface VehicleCostReviewStepProps {
  vehicleValue: number;
  vehicleState: string;
  monthlyKm: number;
  fuelConsumption: number;
  fuelType: string;
  fuelPrice: number;
  onConfigChange: (configs: AssetLinkedExpense[]) => void;
  existingConfigs?: AssetLinkedExpense[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const VehicleCostReviewStep: React.FC<VehicleCostReviewStepProps> = ({
  vehicleValue,
  vehicleState,
  monthlyKm,
  fuelConsumption,
  fuelType,
  fuelPrice,
  onConfigChange,
  existingConfigs,
}) => {
  // Calculate benchmark values
  const benchmarks = useMemo(() => {
    const ipvaMonthly = calculateMonthlyIPVA(vehicleValue, vehicleState);
    const fuelMonthly = calculateMonthlyFuel(monthlyKm, fuelConsumption, fuelType);
    const insuranceMonthly = calculateMonthlyInsurance(vehicleValue);
    const maintenanceMonthly = calculateMonthlyMaintenance(vehicleValue);
    const licensingMonthly = calculateMonthlyLicensing();
    const parkingMonthly = vehicleBenchmarks.averageParking;
    const semPararMonthly = 150; // Valor médio de pedágio/tag mensal

    return {
      ipva: { monthly: ipvaMonthly, annual: ipvaMonthly * 12 },
      seguro_auto: { monthly: insuranceMonthly, annual: insuranceMonthly * 12 },
      combustivel: { monthly: fuelMonthly, annual: fuelMonthly * 12 },
      manutencao_veiculo: { monthly: maintenanceMonthly, annual: maintenanceMonthly * 12 },
      licenciamento: { monthly: licensingMonthly, annual: licensingMonthly * 12 },
      estacionamento: { monthly: parkingMonthly, annual: parkingMonthly * 12 },
      sem_parar: { monthly: semPararMonthly, annual: semPararMonthly * 12 },
    };
  }, [vehicleValue, vehicleState, monthlyKm, fuelConsumption, fuelType]);

  // Initialize configs
  // Default payment methods per cost type
  const getDefaultPaymentMethod = (expenseType: string): PaymentMethod => {
    switch (expenseType) {
      case 'ipva':
      case 'licenciamento':
        return 'boleto';
      case 'seguro_auto':
      case 'combustivel':
        return 'credit_card';
      case 'estacionamento':
        return 'pix';
      case 'sem_parar':
        return 'debit_card';
      case 'manutencao_veiculo':
        return 'credit_card';
      default:
        return 'boleto';
    }
  };

  const getInitialConfig = (
    expenseType: AssetLinkedExpense['expenseType'],
    isAnnual: boolean,
    defaultMonths: number[]
  ): VehicleCostConfig => {
    const existing = existingConfigs?.find(c => c.expenseType === expenseType);
    const benchmark = benchmarks[expenseType as keyof typeof benchmarks];
    const defaultPaymentMethod = getDefaultPaymentMethod(expenseType);
    
    if (existing) {
      return {
        enabled: true,
        paymentType: existing.frequency === 'annual' ? 'installments' : 'cash',
        selectedMonths: existing.annualMonths || defaultMonths,
        monthlyValue: existing.monthlyValue,
        annualValue: existing.frequency === 'annual' 
          ? existing.monthlyValue * (existing.annualMonths?.length || 1)
          : existing.monthlyValue * 12,
        paymentMethod: existing.paymentMethod || defaultPaymentMethod,
      };
    }
    
    return {
      enabled: true,
      paymentType: isAnnual ? 'installments' : 'cash',
      selectedMonths: defaultMonths,
      monthlyValue: benchmark?.monthly || 0,
      annualValue: benchmark?.annual || 0,
      paymentMethod: defaultPaymentMethod,
    };
  };

  const [configs, setConfigs] = useState<Record<string, VehicleCostConfig>>(() => ({
    ipva: getInitialConfig('ipva', true, [1, 2, 3]),
    seguro_auto: getInitialConfig('seguro_auto', true, [1]),
    combustivel: getInitialConfig('combustivel', false, []),
    manutencao_veiculo: getInitialConfig('manutencao_veiculo', false, []),
    estacionamento: getInitialConfig('estacionamento', false, []),
    sem_parar: getInitialConfig('sem_parar', false, []),
    licenciamento: getInitialConfig('licenciamento', true, [1]),
  }));

  // Update parent when configs change
  useEffect(() => {
    const linkedExpenses: AssetLinkedExpense[] = [];
    
    Object.entries(configs).forEach(([key, config]) => {
      if (config.enabled) {
        const expenseType = key as AssetLinkedExpense['expenseType'];
        const isAnnual = ['ipva', 'seguro_auto', 'licenciamento'].includes(key) && config.paymentType === 'installments';
        
        linkedExpenses.push({
          expenseId: '', // Will be filled when synced
          expenseType,
          monthlyValue: isAnnual 
            ? config.annualValue / (config.selectedMonths.length || 1)
            : config.monthlyValue,
          isAutoCalculated: false,
          frequency: isAnnual ? 'annual' : 'monthly',
          annualMonths: isAnnual ? config.selectedMonths : undefined,
          paymentMethod: config.paymentMethod,
        });
      }
    });
    
    onConfigChange(linkedExpenses);
  }, [configs, onConfigChange]);

  const updateConfig = (key: string, updates: Partial<VehicleCostConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  const toggleMonth = (key: string, month: number, isCashPayment: boolean = false) => {
    setConfigs(prev => {
      // For cash payment ("à vista"), only allow single month selection
      if (isCashPayment) {
        return {
          ...prev,
          [key]: { ...prev[key], selectedMonths: [month] },
        };
      }
      
      const current = prev[key].selectedMonths;
      const newMonths = current.includes(month)
        ? current.filter(m => m !== month)
        : [...current, month].sort((a, b) => a - b);
      return {
        ...prev,
        [key]: { ...prev[key], selectedMonths: newMonths },
      };
    });
  };

  const renderAnnualCostItem = (
    key: string,
    label: string,
    icon: React.ReactNode,
    benchmark: { monthly: number; annual: number }
  ) => {
    const config = configs[key];
    
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                Benchmark: {formatCurrency(benchmark.annual)}/ano
              </p>
            </div>
          </div>
          <Checkbox
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig(key, { enabled: !!checked })}
          />
        </div>

        {config.enabled && (
          <div className="space-y-3 pt-2">
            {/* Payment Type */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateConfig(key, { paymentType: 'cash', selectedMonths: [1] })}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-sm transition-colors",
                  config.paymentType === 'cash'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                À vista
              </button>
              <button
                type="button"
                onClick={() => updateConfig(key, { paymentType: 'installments' })}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-sm transition-colors",
                  config.paymentType === 'installments'
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                Parcelado
              </button>
            </div>

            {/* Value */}
            <div className="space-y-1">
              <Label className="text-xs">Valor Anual</Label>
              <CurrencyInput
                value={config.annualValue}
                onChange={(v) => updateConfig(key, { annualValue: v })}
              />
            </div>

            {/* Payment Months */}
            <div className="space-y-1">
              <Label className="text-xs">
                {config.paymentType === 'cash' ? 'Mês de Pagamento' : 'Meses de Pagamento'}
              </Label>
              <div className="grid grid-cols-6 gap-1">
                {months.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    onClick={() => toggleMonth(key, month.value, config.paymentType === 'cash')}
                    className={cn(
                      "py-1.5 px-2 text-xs rounded border transition-colors",
                      config.selectedMonths.includes(month.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
              {config.selectedMonths.length > 0 && config.paymentType === 'installments' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {config.selectedMonths.length}x de {formatCurrency(config.annualValue / config.selectedMonths.length)}
                </p>
              )}
              {config.selectedMonths.length === 1 && config.paymentType === 'cash' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamento único de {formatCurrency(config.annualValue)} em {months.find(m => m.value === config.selectedMonths[0])?.label}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select
                value={config.paymentMethod}
                onValueChange={(v: PaymentMethod) => updateConfig(key, { paymentMethod: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {paymentMethodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyCostItem = (
    key: string,
    label: string,
    icon: React.ReactNode,
    benchmark: { monthly: number }
  ) => {
    const config = configs[key];
    
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                Benchmark: {formatCurrency(benchmark.monthly)}/mês
              </p>
            </div>
          </div>
          <Checkbox
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig(key, { enabled: !!checked })}
          />
        </div>

        {config.enabled && (
          <div className="space-y-3 pt-2">
            {/* Monthly Value */}
            <div className="space-y-1">
              <Label className="text-xs">Valor Mensal</Label>
              <CurrencyInput
                value={config.monthlyValue}
                onChange={(v) => updateConfig(key, { monthlyValue: v })}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select
                value={config.paymentMethod}
                onValueChange={(v: PaymentMethod) => updateConfig(key, { paymentMethod: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {paymentMethodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate total monthly cost
  const totalMonthlyCost = useMemo(() => {
    let total = 0;
    Object.entries(configs).forEach(([key, config]) => {
      if (config.enabled) {
        const isAnnual = ['ipva', 'seguro_auto', 'licenciamento'].includes(key) && config.paymentType === 'installments';
        if (isAnnual) {
          total += config.annualValue / 12;
        } else {
          total += config.monthlyValue;
        }
      }
    });
    return total;
  }, [configs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <p className="text-sm text-foreground">
          Valide os valores estimados e configure as formas de pagamento. Estes custos serão vinculados ao seu planejamento mensal.
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-4 rounded-lg bg-expense/10 border border-expense/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-expense" />
            <span className="font-medium">Custo Total Estimado</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-expense">{formatCurrency(totalMonthlyCost)}/mês</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalMonthlyCost * 12)}/ano</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Annual Costs */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Custos Anuais/Parcelados</h4>
        {renderAnnualCostItem('ipva', 'IPVA', <Car className="h-4 w-4" />, benchmarks.ipva)}
        {renderAnnualCostItem('seguro_auto', 'Seguro Auto', <Shield className="h-4 w-4" />, benchmarks.seguro_auto)}
        {renderAnnualCostItem('licenciamento', 'Licenciamento/DPVAT', <FileText className="h-4 w-4" />, benchmarks.licenciamento)}
      </div>

      <Separator />

      {/* Monthly Costs */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Custos Mensais</h4>
        {renderMonthlyCostItem('combustivel', 'Combustível', <Fuel className="h-4 w-4" />, benchmarks.combustivel)}
        {renderMonthlyCostItem('manutencao_veiculo', 'Manutenção', <Wrench className="h-4 w-4" />, benchmarks.manutencao_veiculo)}
        {renderMonthlyCostItem('estacionamento', 'Estacionamento', <ParkingCircle className="h-4 w-4" />, benchmarks.estacionamento)}
        {renderMonthlyCostItem('sem_parar', 'Sem Parar / Pedágio', <Receipt className="h-4 w-4" />, benchmarks.sem_parar)}
      </div>
    </div>
  );
};
