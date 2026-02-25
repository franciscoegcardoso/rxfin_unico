import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  HelpCircle, 
  TrendingDown, 
  Shield, 
  FileText, 
  Car,
  Fuel,
  Wrench,
  CircleParking,
  RotateCcw,
  CircleDot,
  Droplets,
  Navigation,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  statesList, 
  calculateMonthlyIPVAWithBenefits,
  vehicleBenchmarks,
  fuelPrices,
  calculateMonthlyFuel,
} from '@/data/vehicleBenchmarks';
import { 
  calculateInsuranceEstimate,
  inferVehicleCategory,
} from '@/utils/insuranceEstimator';
import { useVehicleConsumption } from '@/hooks/useVehicleConsumption';
import { 
  calculateTireCostPerKm, 
  estimateRimByCategory, 
  TREADWEAR_BY_CATEGORY 
} from '@/utils/tireEstimator';
import { calculateMaintenanceEstimate } from '@/utils/maintenanceEstimator';

const STORAGE_KEY_PREFIX = 'opp-cost-expenses-';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number, decimals = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Componente HelpButton
const HelpButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Dialog>
    <DialogTrigger asChild>
      <button 
        type="button" 
        className="p-0.5 hover:bg-muted rounded-full transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      {children}
    </DialogContent>
  </Dialog>
);

const FUEL_TYPES = [
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'ethanol', label: 'Etanol' },
  { value: 'flex', label: 'Flex' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'eletrico', label: 'Elétrico' },
];

interface OpportunityCostExpensesProps {
  vehicleValue: number;
  vehicleName: string;
  brandName?: string;
  vehicleAge?: number;
  vehicleType?: 'carros' | 'motos' | 'caminhoes';
  selectedState: string;
  onStateChange: (state: string) => void;
  onExpensesChange: (expenses: { 
    monthly: number; 
    annual: number;
    depreciationMonthly: number;
    depreciationAnnual: number;
  }) => void;
}

interface CostItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  suggestedMonthly: number;
  suggestedAnnual: number;
  monthlyValue: number;
  annualValue: number;
  isEditable: boolean;
  badge?: { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' };
  helpContent?: React.ReactNode;
}

export const OpportunityCostExpenses: React.FC<OpportunityCostExpensesProps> = ({
  vehicleValue,
  vehicleName,
  brandName = '',
  vehicleAge = 3,
  vehicleType = 'carros',
  selectedState,
  onStateChange,
  onExpensesChange,
}) => {

  const vehicleStorageKey = useMemo(() => {
    const normalized = `${vehicleName.toLowerCase().replace(/\s+/g, '-')}-${vehicleValue}`;
    return `${STORAGE_KEY_PREFIX}${normalized}`;
  }, [vehicleName, vehicleValue]);

  // Persisted data via useUserKV
  const kvKey = useMemo(() => `opp-cost-expenses-${vehicleName.toLowerCase().replace(/\s+/g, '-')}-${vehicleValue}`, [vehicleName, vehicleValue]);
  const { value: persistedData, setValue: setPersistedData, isLoading: kvLoading } = useUserKV<any>(kvKey, null);

  const [customValues, setCustomValues] = useState<Record<string, { monthly: number; annual: number; isCustom: boolean }>>(
    persistedData?.customValues || {}
  );

  const [fuelType, setFuelType] = useState(persistedData?.fuelType || 'gasoline');
  const [monthlyKm, setMonthlyKm] = useState<number>(persistedData?.monthlyKm ?? 1000);
  const [consumption, setConsumption] = useState<number>(persistedData?.consumption ?? 12);
  const [fuelPrice, setFuelPrice] = useState<number>(persistedData?.fuelPrice ?? fuelPrices.gasoline);
  const [consumptionCustom, setConsumptionCustom] = useState(persistedData?.consumptionCustom || false);
  const [fuelPriceCustom, setFuelPriceCustom] = useState(persistedData?.fuelPriceCustom || false);
  
  const { suggestion: consumptionSuggestion, fetchConsumption } = useVehicleConsumption();

  // Persist data via useUserKV
  useEffect(() => {
    const dataToStore = {
      customValues,
      fuelType,
      monthlyKm,
      consumption,
      fuelPrice,
      consumptionCustom,
      fuelPriceCustom,
    };
    setPersistedData(dataToStore);
  }, [customValues, fuelType, monthlyKm, consumption, fuelPrice, consumptionCustom, fuelPriceCustom, setPersistedData]);

  const vehicleCategory = useMemo(() => {
    return inferVehicleCategory(vehicleName, vehicleType);
  }, [vehicleName, vehicleType]);

  useEffect(() => {
    if (vehicleName && brandName) {
      fetchConsumption(brandName, vehicleName, 2025 - vehicleAge);
    }
  }, [vehicleName, brandName, vehicleAge, fetchConsumption]);

  useEffect(() => {
    if (consumptionSuggestion && !consumptionCustom) {
      setConsumption(consumptionSuggestion.average);
    }
  }, [consumptionSuggestion, consumptionCustom]);

  useEffect(() => {
    if (!fuelPriceCustom) {
      setFuelPrice(fuelPrices[fuelType] || fuelPrices.gasoline);
    }
  }, [fuelType, fuelPriceCustom]);

  // Calculated values
  const calculatedFuelCost = useMemo(() => {
    if (fuelType === 'eletrico') {
      const kwhNeeded = monthlyKm / (consumption || 5);
      return kwhNeeded * fuelPrice;
    }
    return calculateMonthlyFuel(monthlyKm, consumption, fuelType);
  }, [monthlyKm, consumption, fuelPrice, fuelType]);

  const ipva = useMemo(() => {
    return calculateMonthlyIPVAWithBenefits(vehicleValue, selectedState, fuelType);
  }, [vehicleValue, selectedState, fuelType]);

  const insurance = useMemo(() => {
    return calculateInsuranceEstimate(vehicleValue, vehicleName, undefined, 'padrao', vehicleType);
  }, [vehicleValue, vehicleName, vehicleType]);

  const licensing = useMemo(() => ({
    monthly: vehicleBenchmarks.annualLicensing / 12,
    annual: vehicleBenchmarks.annualLicensing,
  }), []);

  const tireCost = useMemo(() => {
    const rim = estimateRimByCategory(vehicleCategory);
    const annualKm = monthlyKm * 12;
    return calculateTireCostPerKm(rim, TREADWEAR_BY_CATEGORY.touring, undefined, annualKm);
  }, [vehicleCategory, monthlyKm]);

  const maintenanceCost = useMemo(() => {
    const manufacturingYear = 2025 - vehicleAge;
    return calculateMaintenanceEstimate(vehicleValue, vehicleName, manufacturingYear);
  }, [vehicleValue, vehicleName, vehicleAge]);

  // Depreciation (15% per year for used cars)
  const depreciation = useMemo(() => {
    const annualDepreciation = vehicleValue * 0.15;
    return {
      monthly: annualDepreciation / 12,
      annual: annualDepreciation
    };
  }, [vehicleValue]);

  // Value getters
  const getValue = useCallback((key: string, suggestedMonthly: number, suggestedAnnual: number) => {
    if (customValues[key]?.isCustom) {
      return { monthly: customValues[key].monthly, annual: customValues[key].annual, isCustom: true };
    }
    return { monthly: suggestedMonthly, annual: suggestedAnnual, isCustom: false };
  }, [customValues]);

  const handleMonthlyChange = useCallback((key: string, monthly: number) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: { monthly: round2(monthly), annual: round2(monthly * 12), isCustom: true }
    }));
  }, []);

  const handleAnnualChange = useCallback((key: string, annual: number) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: { monthly: round2(annual / 12), annual: round2(annual), isCustom: true }
    }));
  }, []);

  const handleRestore = useCallback((key: string) => {
    setCustomValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  }, []);

  const handleRestoreAll = useCallback(() => {
    setCustomValues({});
    setConsumptionCustom(false);
    setFuelPriceCustom(false);
  }, []);

  // Cost items list
  const costItems: CostItem[] = useMemo(() => {
    const ipvaValue = getValue('ipva', ipva.monthly, ipva.annual);
    const insuranceValue = getValue('insurance', insurance.valorMedio, insurance.valorMedio * 12);
    const licensingValue = getValue('licensing', licensing.monthly, licensing.annual);
    const fuelValue = getValue('fuel', calculatedFuelCost, calculatedFuelCost * 12);
    const maintenanceValue = getValue('maintenance', maintenanceCost.custoMensal, maintenanceCost.custoAnual);
    const tiresValue = getValue('tires', tireCost.custoMensal, tireCost.custoAnual);
    const cleaningValue = getValue('cleaning', 0, 0);
    const parkingValue = getValue('parking', 0, 0);
    const tollValue = getValue('toll', 0, 0);

    return [
      {
        key: 'ipva',
        icon: <FileText className="h-4 w-4" />,
        label: 'IPVA',
        suggestedMonthly: ipva.monthly,
        suggestedAnnual: ipva.annual,
        monthlyValue: ipvaValue.monthly,
        annualValue: ipvaValue.annual,
        isEditable: true,
        badge: ipva.hasExemption ? { label: 'ISENTO', variant: 'success' as const } : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                IPVA - Imposto sobre Veículos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-medium">{selectedState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alíquota:</span>
                  <span className="font-medium">{ipva.rate}%</span>
                </div>
              </div>
            </div>
          </>
        ),
      },
      {
        key: 'insurance',
        icon: <Shield className="h-4 w-4" />,
        label: 'Seguro',
        suggestedMonthly: insurance.valorMedio,
        suggestedAnnual: insurance.valorMedio * 12,
        monthlyValue: insuranceValue.monthly,
        annualValue: insuranceValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Seguro Estimado
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Estimativa baseada na categoria do veículo e índice de roubo.
            </div>
          </>
        ),
      },
      {
        key: 'licensing',
        icon: <Car className="h-4 w-4" />,
        label: 'Licenciamento',
        suggestedMonthly: licensing.monthly,
        suggestedAnnual: licensing.annual,
        monthlyValue: licensingValue.monthly,
        annualValue: licensingValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Licenciamento Anual
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Inclui taxa DETRAN (~R$ 100) e CRLV (~R$ 50).
            </div>
          </>
        ),
      },
      {
        key: 'fuel',
        icon: <Fuel className="h-4 w-4" />,
        label: 'Combustível',
        suggestedMonthly: calculatedFuelCost,
        suggestedAnnual: calculatedFuelCost * 12,
        monthlyValue: fuelValue.monthly,
        annualValue: fuelValue.annual,
        isEditable: true,
        badge: consumptionSuggestion?.source === 'inmetro' 
          ? { label: 'INMETRO', variant: 'success' as const }
          : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                Combustível
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Km/mês:</span>
                  <span className="font-medium">{formatNumber(monthlyKm, 0)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo:</span>
                  <span className="font-medium">{formatNumber(consumption, 1)} km/L</span>
                </div>
              </div>
            </div>
          </>
        ),
      },
      {
        key: 'maintenance',
        icon: <Wrench className="h-4 w-4" />,
        label: 'Manutenção',
        suggestedMonthly: maintenanceCost.custoMensal,
        suggestedAnnual: maintenanceCost.custoAnual,
        monthlyValue: maintenanceValue.monthly,
        annualValue: maintenanceValue.annual,
        isEditable: true,
        badge: maintenanceCost.veredito === 'bomba_relogio' 
          ? { label: 'Alto Risco', variant: 'destructive' as const }
          : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Revisão e Manutenção
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Inclui revisões, troca de óleo, filtros e itens de desgaste.
            </div>
          </>
        ),
      },
      {
        key: 'tires',
        icon: <CircleDot className="h-4 w-4" />,
        label: 'Pneus',
        suggestedMonthly: tireCost.custoMensal,
        suggestedAnnual: tireCost.custoAnual,
        monthlyValue: tiresValue.monthly,
        annualValue: tiresValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-primary" />
                Custo de Pneus
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Custo proporcional de desgaste baseado na quilometragem.
            </div>
          </>
        ),
      },
      {
        key: 'cleaning',
        icon: <Droplets className="h-4 w-4" />,
        label: 'Limpeza',
        suggestedMonthly: 0,
        suggestedAnnual: 0,
        monthlyValue: cleaningValue.monthly,
        annualValue: cleaningValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Limpeza
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Lavagens, limpeza interna, polimento, etc.
            </div>
          </>
        ),
      },
      {
        key: 'parking',
        icon: <CircleParking className="h-4 w-4" />,
        label: 'Estacionamento',
        suggestedMonthly: 0,
        suggestedAnnual: 0,
        monthlyValue: parkingValue.monthly,
        annualValue: parkingValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleParking className="h-5 w-5 text-primary" />
                Estacionamento
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Estacionamento rotativo, mensalidades, etc.
            </div>
          </>
        ),
      },
      {
        key: 'toll',
        icon: <Navigation className="h-4 w-4" />,
        label: 'Pedágio',
        suggestedMonthly: 0,
        suggestedAnnual: 0,
        monthlyValue: tollValue.monthly,
        annualValue: tollValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Pedágio
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Custos com pedágios e tags (Sem Parar, etc).
            </div>
          </>
        ),
      },
    ];
  }, [ipva, insurance, licensing, calculatedFuelCost, maintenanceCost, tireCost, 
      customValues, getValue, selectedState, consumptionSuggestion, monthlyKm, consumption]);

  // Total expenses
  const totals = useMemo(() => {
    const monthly = costItems.reduce((sum, item) => sum + item.monthlyValue, 0);
    const annual = costItems.reduce((sum, item) => sum + item.annualValue, 0);
    return { monthly, annual };
  }, [costItems]);

  // Notify parent of changes
  useEffect(() => {
    onExpensesChange({
      monthly: totals.monthly,
      annual: totals.annual,
      depreciationMonthly: depreciation.monthly,
      depreciationAnnual: depreciation.annual,
    });
  }, [totals, depreciation, onExpensesChange]);

  const hasCustomValues = Object.keys(customValues).length > 0;

  return (
    <div className="space-y-5">
      {/* Configuration Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border">
        {/* State */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Estado (IPVA)</Label>
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg">
              {statesList.map(s => (
                <SelectItem key={s.uf} value={s.uf} className="text-sm">
                  {s.uf} ({s.rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fuel Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Combustível</Label>
          <Select value={fuelType} onValueChange={setFuelType}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg">
              {FUEL_TYPES.map(f => (
                <SelectItem key={f.value} value={f.value} className="text-sm">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Km */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Km/mês</Label>
          <Input
            type="number"
            value={monthlyKm}
            onChange={(e) => setMonthlyKm(Number(e.target.value))}
            className="h-9 text-sm bg-background"
          />
        </div>

        {/* Consumption */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {fuelType === 'eletrico' ? 'km/kWh' : 'km/L'}
          </Label>
          <Input
            type="number"
            step="0.1"
            value={consumption}
            onChange={(e) => {
              setConsumption(Number(e.target.value));
              setConsumptionCustom(true);
            }}
            className="h-9 text-sm bg-background"
          />
        </div>
      </div>

      {/* Cost Items Table */}
      <div className="rounded-xl border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 border-b">
          <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Despesa
          </div>
          <div className="col-span-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mensal
          </div>
          <div className="col-span-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Anual
          </div>
          <div className="col-span-2"></div>
        </div>

        {/* Cost Items */}
        <div className="divide-y divide-border/50">
          {costItems.map((item) => (
            <div 
              key={item.key}
              className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              {/* Label */}
              <div className="col-span-4 flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-medium truncate">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                      item.badge.variant === 'success' && "bg-green-500/10 text-green-600 border-green-500/30",
                      item.badge.variant === 'warning' && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                      item.badge.variant === 'destructive' && "bg-red-500/10 text-red-600 border-red-500/30"
                    )}
                  >
                    {item.badge.label}
                  </Badge>
                )}
              </div>

              {/* Monthly Input */}
              <div className="col-span-3">
                <CurrencyInput
                  value={item.monthlyValue}
                  onChange={(v) => handleMonthlyChange(item.key, v)}
                  className="h-8 text-sm text-center"
                />
              </div>

              {/* Annual Input */}
              <div className="col-span-3">
                <CurrencyInput
                  value={item.annualValue}
                  onChange={(v) => handleAnnualChange(item.key, v)}
                  className="h-8 text-sm text-center"
                />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-1">
                {customValues[item.key]?.isCustom && (
                  <button
                    onClick={() => handleRestore(item.key)}
                    className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                    title="Restaurar sugestão"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <HelpButton>{item.helpContent}</HelpButton>
              </div>
            </div>
          ))}
        </div>

        {/* Depreciation Row */}
        <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-red-50/50 dark:bg-red-950/20 border-t border-red-200/50 dark:border-red-900/30">
          <div className="col-span-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-expense" />
            <span className="text-sm font-semibold text-expense">Depreciação</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-expense/30 text-expense bg-expense/5">
              15%/ano
            </Badge>
          </div>
          <div className="col-span-3 text-center">
            <span className="font-bold text-expense">{formatMoney(depreciation.monthly)}</span>
          </div>
          <div className="col-span-3 text-center">
            <span className="font-bold text-expense">{formatMoney(depreciation.annual)}</span>
          </div>
          <div className="col-span-2"></div>
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-12 gap-2 items-center px-4 py-4 bg-primary/5 border-t-2 border-primary/20">
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">TOTAL DESPESAS</span>
            {hasCustomValues && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreAll}
                className="text-[10px] h-5 px-1.5 gap-0.5 text-muted-foreground hover:text-primary"
              >
                <RotateCcw className="h-3 w-3" />
                Restaurar
              </Button>
            )}
          </div>
          <div className="col-span-3 text-center">
            <span className="text-lg font-bold tabular-nums">{formatMoney(totals.monthly)}</span>
          </div>
          <div className="col-span-3 text-center">
            <span className="text-lg font-bold text-primary tabular-nums">{formatMoney(totals.annual)}</span>
          </div>
          <div className="col-span-2"></div>
        </div>
      </div>

      {/* Total with Depreciation Summary */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Custo Total (com depreciação)</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-foreground">
            {formatMoney(totals.annual + depreciation.annual)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">/ano</span>
          <span className="text-sm text-muted-foreground ml-3">
            ({formatMoney((totals.annual + depreciation.annual) / 12)}/mês)
          </span>
        </div>
      </div>
    </div>
  );
};
