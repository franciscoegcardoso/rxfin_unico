import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PaymentMethod } from '@/types/financial';
import { Calendar, CreditCard, Banknote, Wallet, Receipt } from 'lucide-react';

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const paymentMethodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'pix', label: 'PIX', icon: <Wallet className="h-4 w-4" /> },
  { value: 'boleto', label: 'Boleto', icon: <Receipt className="h-4 w-4" /> },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'debit_card', label: 'Cartão de Débito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'cash', label: 'Dinheiro em Espécie', icon: <Banknote className="h-4 w-4" /> },
];

export type PaymentFrequency = 'monthly' | 'annual' | 'custom';

export interface VehicleCostConfig {
  frequency: PaymentFrequency;
  paymentMethod: PaymentMethod;
  annualValue: number;
  monthlyValue: number;
  selectedMonths: number[]; // For annual/custom - which months
  installments: number; // For credit card
  startMonth: number; // Month to start payment
}

interface VehicleCostConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costId: string;
  costName: string;
  benchmarkValue: number;
  assetName: string;
  onSave: (config: VehicleCostConfig) => void;
  defaultConfig?: Partial<VehicleCostConfig>;
}

const getDefaultMonths = (costId: string): number[] => {
  switch (costId) {
    case 'ipva':
      return [1, 2, 3]; // Jan, Feb, Mar
    case 'licenciamento':
      return [1, 2, 3, 4]; // First months of year
    case 'seguro_auto':
      return []; // User chooses
    default:
      return [];
  }
};

const getDefaultFrequency = (costId: string): PaymentFrequency => {
  switch (costId) {
    case 'ipva':
    case 'licenciamento':
    case 'seguro_auto':
      return 'annual';
    default:
      return 'monthly';
  }
};

export const VehicleCostConfigDialog: React.FC<VehicleCostConfigDialogProps> = ({
  open,
  onOpenChange,
  costId,
  costName,
  benchmarkValue,
  assetName,
  onSave,
  defaultConfig,
}) => {
  const annualBenchmark = costId === 'combustivel' || costId === 'manutencao_veiculo' || costId === 'estacionamento'
    ? benchmarkValue * 12
    : benchmarkValue * 12;

  const [config, setConfig] = useState<VehicleCostConfig>({
    frequency: defaultConfig?.frequency || getDefaultFrequency(costId),
    paymentMethod: defaultConfig?.paymentMethod || 'boleto',
    annualValue: defaultConfig?.annualValue || Math.round(annualBenchmark),
    monthlyValue: defaultConfig?.monthlyValue || Math.round(benchmarkValue),
    selectedMonths: defaultConfig?.selectedMonths || getDefaultMonths(costId),
    installments: defaultConfig?.installments || 1,
    startMonth: defaultConfig?.startMonth || 1,
  });

  // Reset config when dialog opens or defaultConfig changes
  useEffect(() => {
    if (open) {
      setConfig({
        frequency: defaultConfig?.frequency || getDefaultFrequency(costId),
        paymentMethod: defaultConfig?.paymentMethod || 'boleto',
        annualValue: defaultConfig?.annualValue || Math.round(annualBenchmark),
        monthlyValue: defaultConfig?.monthlyValue || Math.round(benchmarkValue),
        selectedMonths: defaultConfig?.selectedMonths || getDefaultMonths(costId),
        installments: defaultConfig?.installments || 1,
        startMonth: defaultConfig?.startMonth || 1,
      });
    }
  }, [open, defaultConfig, costId, annualBenchmark, benchmarkValue]);

  const handleFrequencyChange = (frequency: PaymentFrequency) => {
    setConfig(prev => ({
      ...prev,
      frequency,
      selectedMonths: frequency === 'monthly' ? [] : getDefaultMonths(costId),
    }));
  };

  const toggleMonth = (month: number) => {
    setConfig(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month].sort((a, b) => a - b),
    }));
  };

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getMonthlyEquivalent = () => {
    if (config.frequency === 'monthly') return config.monthlyValue;
    if (config.selectedMonths.length === 0) return config.annualValue / 12;
    return config.annualValue / config.selectedMonths.length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Configurar {costName}
          </DialogTitle>
          <DialogDescription>
            Configure quando e como pagar {costName.toLowerCase()} do veículo "{assetName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Frequência */}
          <div className="space-y-2">
            <Label>Frequência de Pagamento</Label>
            <Select
              value={config.frequency}
              onValueChange={(v: PaymentFrequency) => handleFrequencyChange(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="monthly">Mensal (todo mês)</SelectItem>
                <SelectItem value="annual">Anual (meses específicos)</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          {config.frequency === 'monthly' ? (
            <div className="space-y-2">
              <Label>Valor Mensal</Label>
              <CurrencyInput
                value={config.monthlyValue}
                onChange={(v) => setConfig(prev => ({ ...prev, monthlyValue: v }))}
              />
              <p className="text-xs text-muted-foreground">
                Benchmark: {formatCurrency(benchmarkValue)}/mês
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Valor Anual Total</Label>
              <CurrencyInput
                value={config.annualValue}
                onChange={(v) => setConfig(prev => ({ ...prev, annualValue: v }))}
              />
              <p className="text-xs text-muted-foreground">
                Benchmark anual: {formatCurrency(annualBenchmark)}
              </p>
            </div>
          )}

          {/* Meses de pagamento para anual/custom */}
          {config.frequency !== 'monthly' && (
            <div className="space-y-2">
              <Label>Meses de Pagamento</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os meses em que o pagamento será realizado
              </p>
              <div className="grid grid-cols-4 gap-2">
                {months.map((month) => (
                  <label
                    key={month.value}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={config.selectedMonths.includes(month.value)}
                      onCheckedChange={() => toggleMonth(month.value)}
                    />
                    <span className="text-xs">{month.label.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
              {config.selectedMonths.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {config.selectedMonths.length} parcela(s) de{' '}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(config.annualValue / config.selectedMonths.length)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select
              value={config.paymentMethod}
              onValueChange={(v: PaymentMethod) => setConfig(prev => ({ ...prev, paymentMethod: v }))}
            >
              <SelectTrigger>
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

          {/* Parcelas (se cartão de crédito e anual) */}
          {config.paymentMethod === 'credit_card' && config.frequency !== 'monthly' && (
            <div className="space-y-2">
              <Label>Parcelar em</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={config.installments}
                  onChange={(e) => setConfig(prev => ({ ...prev, installments: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">vezes</span>
              </div>
              {config.installments > 1 && (
                <p className="text-xs text-muted-foreground">
                  {config.installments}x de {formatCurrency(config.annualValue / config.installments)}
                </p>
              )}
            </div>
          )}

          {/* Resumo */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-1">Resumo</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {config.frequency === 'monthly' ? (
                <p>Pagamento mensal de {formatCurrency(config.monthlyValue)}</p>
              ) : (
                <>
                  <p>Valor anual: {formatCurrency(config.annualValue)}</p>
                  {config.selectedMonths.length > 0 && (
                    <p>
                      Pago em: {config.selectedMonths.map(m => months.find(mo => mo.value === m)?.label.slice(0, 3)).join(', ')}
                    </p>
                  )}
                </>
              )}
              <p>Forma: {paymentMethodOptions.find(p => p.value === config.paymentMethod)?.label}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar e Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
