import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
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
  DialogDescription,
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
  MapPin,
  Fuel,
  Wrench,
  CircleParking,
  Milestone,
  RotateCcw,
  CircleDot,
  Droplets,
  TrendingUp,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  statesList, 
  calculateMonthlyIPVAWithBenefits,
  vehicleBenchmarks,
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
import { FuelParametersTable, FuelRowData } from './FuelParametersTable';
import { CostDistributionChart } from './CostDistributionChart';

// Chave de persistência por veículo (via useUserKV)
const STORAGE_KEY_PREFIX = 'fipe-ownership-costs-';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMoneyCompact = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

const formatNumber = (value: number, decimals = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// CDI benchmark for opportunity cost (85% of CDI = approx. net yield from a good fixed income with FGC guarantee)
const CDI_BENCHMARK_RATE = 0.85; // 85% of CDI
const CDI_ANNUAL_RATE = 0.1365; // Current CDI ~13.65% annually
const OPPORTUNITY_COST_RATE = CDI_BENCHMARK_RATE * CDI_ANNUAL_RATE; // ~11.6% net annual

// Default cost filters - all enabled by default
const DEFAULT_COST_FILTERS: Record<string, boolean> = {
  ipva: true,
  insurance: true,
  depreciation: true,
  licensing: true,
  fuel: true,
  maintenance: true,
  tires: true,
  cleaning: true,
  parking: true,
  toll: true,
  opportunityCost: true,
};

// 9 dígitos inteiros + 2 decimais (centavos) = 11 dígitos totais no CurrencyInput
const MAX_CURRENCY_DIGITS = 11;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface FipeOwnershipExportData {
  totalMonthly: number;
  totalAnnual: number;
  costItems: Array<{ key: string; label: string; monthlyValue: number; annualValue: number }>;
  opportunityCostNote: string;
}

interface FipeOwnershipCostCardProps {
  fipeValue: number;
  modelName: string;
  brandName?: string;
  vehicleAge: number;
  vehicleType?: 'carros' | 'motos' | 'caminhoes';
  depreciationMonthly: number;
  yearLabel?: string;
  theftRisk?: {
    isHighRisk: boolean;
    adjustment: number;
    reason: string;
  };
  /** Chamado quando os dados de custo estão disponíveis (para exportação em PDF). */
  onExportData?: (data: FipeOwnershipExportData) => void;
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
  isEmpty?: boolean; // Para campos que o usuário precisa preencher
  badge?: { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' };
  helpContent?: React.ReactNode;
}

// Componente HelpButton reutilizável
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

// Removido FUEL_TYPES - agora usa FuelParametersTable

export const FipeOwnershipCostCard: React.FC<FipeOwnershipCostCardProps> = ({
  fipeValue,
  modelName,
  brandName = '',
  vehicleAge,
  vehicleType = 'carros',
  depreciationMonthly,
  yearLabel = '',
  theftRisk,
  onExportData,
}) => {
  const isMobile = useIsMobile();
  
  // Estado para toggle do gráfico (anual ou mensal)
  const [chartView, setChartView] = useState<'annual' | 'monthly'>('annual');
  
  // Estado para filtros de custo no gráfico (todos habilitados por default)
  const [costFilters, setCostFilters] = useState<Record<string, boolean>>(DEFAULT_COST_FILTERS);
  
  // Gerar chave única por veículo (modelo+ano)
  const vehicleStorageKey = useMemo(() => {
    const year = 2025 - vehicleAge;
    const normalized = `${modelName.toLowerCase().replace(/\s+/g, '-')}-${year}`;
    return `${STORAGE_KEY_PREFIX}${normalized}`;
  }, [modelName, vehicleAge]);

  // Persisted data via useUserKV
  const kvKey = useMemo(() => {
    const year = 2025 - vehicleAge;
    const normalized = `${modelName.toLowerCase().replace(/\s+/g, '-')}-${year}`;
    return `fipe-ownership-costs-${normalized}`;
  }, [modelName, vehicleAge]);

  const { value: persistedData, setValue: setPersistedData } = useUserKV<any>(kvKey, null);

  const [selectedState, setSelectedState] = useState(persistedData?.selectedState || 'SP');
  
  // Estados para valores editáveis (mensal)
  const [customValues, setCustomValues] = useState<Record<string, { monthly: number; annual: number; isCustom: boolean }>>(
    persistedData?.customValues || {}
  );

  // Estados de combustível (agora gerenciados pelo FuelParametersTable)
  const [totalMonthlyKm, setTotalMonthlyKm] = useState<number>(persistedData?.totalMonthlyKm ?? 1000);
  const [calculatedFuelCost, setCalculatedFuelCost] = useState<number>(0);
  const [fuelRows, setFuelRows] = useState<FuelRowData[]>(persistedData?.fuelRows || []);
  
  // Determinar tipo de combustível principal para IPVA (primeiro da lista)
  const primaryFuelType = useMemo(() => {
    if (fuelRows.length > 0) {
      const firstType = fuelRows[0].type;
      if (firstType === 'electric') return 'eletrico';
      if (firstType === 'gasoline') return 'gasoline';
      if (firstType === 'ethanol') return 'ethanol';
      if (firstType === 'diesel') return 'diesel';
    }
    // Inferir do yearLabel se não houver fuelRows
    const label = yearLabel.toLowerCase();
    if (label.includes('elétrico') || label.includes('eletrico')) return 'eletrico';
    if (label.includes('híbrido') || label.includes('hibrido')) return 'hibrido';
    if (label.includes('diesel')) return 'diesel';
    return 'gasoline';
  }, [fuelRows, yearLabel]);
  
  // Hook para buscar sugestão de consumo
  const { loading: consumptionLoading, suggestion: consumptionSuggestion, fetchConsumption } = useVehicleConsumption();

  // Persistir dados via useUserKV quando houver alterações
  useEffect(() => {
    const dataToStore = {
      selectedState,
      customValues,
      totalMonthlyKm,
      fuelRows,
      calculatedFuelCost,
    };
    setPersistedData(dataToStore);
  }, [selectedState, customValues, totalMonthlyKm, fuelRows, calculatedFuelCost, setPersistedData]);

  // Categoria do veículo
  const vehicleCategory = useMemo(() => {
    return inferVehicleCategory(modelName, vehicleType);
  }, [modelName, vehicleType]);

  // Buscar sugestão de consumo quando modelo/marca mudar
  useEffect(() => {
    if (modelName && brandName) {
      fetchConsumption(brandName, modelName, 2025 - vehicleAge);
    }
  }, [modelName, brandName, vehicleAge, fetchConsumption]);

  // Callback quando FuelParametersTable atualizar
  const handleFuelChange = useCallback((newTotalKm: number, newTotalCost: number, newFuelRows: FuelRowData[]) => {
    setTotalMonthlyKm(newTotalKm);
    setCalculatedFuelCost(newTotalCost);
    setFuelRows(newFuelRows);
  }, []);

  // IPVA calculado
  const ipva = useMemo(() => {
    return calculateMonthlyIPVAWithBenefits(fipeValue, selectedState, primaryFuelType);
  }, [fipeValue, selectedState, primaryFuelType]);

  // Seguro estimado
  const insurance = useMemo(() => {
    return calculateInsuranceEstimate(fipeValue, modelName, undefined, 'padrao', vehicleType);
  }, [fipeValue, modelName, vehicleType]);

  // Licenciamento
  const licensing = useMemo(() => ({
    monthly: vehicleBenchmarks.annualLicensing / 12,
    annual: vehicleBenchmarks.annualLicensing,
  }), []);

  // Custo de pneus estimado (usa totalMonthlyKm do FuelParametersTable)
  const tireCost = useMemo(() => {
    const rim = estimateRimByCategory(vehicleCategory);
    const annualKm = totalMonthlyKm * 12;
    return calculateTireCostPerKm(rim, TREADWEAR_BY_CATEGORY.touring, undefined, annualKm);
  }, [vehicleCategory, totalMonthlyKm]);

  // Custo de manutenção estimado
  const maintenanceCost = useMemo(() => {
    const manufacturingYear = 2025 - vehicleAge;
    return calculateMaintenanceEstimate(fipeValue, modelName, manufacturingYear);
  }, [fipeValue, modelName, vehicleAge]);

  // Valores sugeridos para campos opcionais
  const suggestedValues = useMemo(() => ({
    fuel: { monthly: calculatedFuelCost, annual: calculatedFuelCost * 12 },
    maintenance: { monthly: maintenanceCost.custoMensal, annual: maintenanceCost.custoAnual },
    tires: { monthly: tireCost.custoMensal, annual: tireCost.custoAnual },
    cleaning: { monthly: 0, annual: 0 }, // Usuário deve informar
    parking: { monthly: 0, annual: 0 }, // Usuário deve informar
    toll: { monthly: 0, annual: 0 }, // Usuário deve informar
  }), [calculatedFuelCost, tireCost, maintenanceCost]);

  // Obter valor atual (customizado ou sugerido)
  const getValue = useCallback((key: string, suggestedMonthly: number, suggestedAnnual: number) => {
    if (customValues[key]?.isCustom) {
      return { monthly: customValues[key].monthly, annual: customValues[key].annual, isCustom: true };
    }
    return { monthly: suggestedMonthly, annual: suggestedAnnual, isCustom: false };
  }, [customValues]);

  // Atualizar valor mensal (calcula anual automaticamente)
  const handleMonthlyChange = useCallback((key: string, monthly: number) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: { monthly: round2(monthly), annual: round2(monthly * 12), isCustom: true }
    }));
  }, []);

  // Atualizar valor anual (calcula mensal automaticamente)
  const handleAnnualChange = useCallback((key: string, annual: number) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: { monthly: round2(annual / 12), annual: round2(annual), isCustom: true }
    }));
  }, []);

  // Restaurar valor sugerido
  const handleRestore = useCallback((key: string) => {
    setCustomValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  }, []);

  // Restaurar todos os valores
  const handleRestoreAll = useCallback(() => {
    setCustomValues({});
  }, []);

  // Verificar se há valores customizados
  const hasCustomValues = Object.keys(customValues).length > 0;

  // Montar lista de custos
  const costItems: CostItem[] = useMemo(() => {
    const ipvaValue = getValue('ipva', ipva.monthly, ipva.annual);
    const insuranceValue = getValue('insurance', insurance.valorMedio, insurance.valorMedio * 12);
    const depreciationValue = getValue('depreciation', depreciationMonthly, depreciationMonthly * 12);
    const licensingValue = getValue('licensing', licensing.monthly, licensing.annual);
    const fuelValue = getValue('fuel', suggestedValues.fuel.monthly, suggestedValues.fuel.annual);
    const maintenanceValue = getValue('maintenance', suggestedValues.maintenance.monthly, suggestedValues.maintenance.annual);
    const tiresValue = getValue('tires', suggestedValues.tires.monthly, suggestedValues.tires.annual);
    const cleaningValue = getValue('cleaning', suggestedValues.cleaning.monthly, suggestedValues.cleaning.annual);
    const parkingValue = getValue('parking', suggestedValues.parking.monthly, suggestedValues.parking.annual);
    const tollValue = getValue('toll', suggestedValues.toll.monthly, suggestedValues.toll.annual);

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
              <DialogDescription>Cálculo baseado na alíquota do estado selecionado</DialogDescription>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base de cálculo:</span>
                  <span className="font-medium">{formatMoney(fipeValue)}</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                IPVA = Valor FIPE × Alíquota Estado ÷ 12
              </div>
              {ipva.notes && <p className="text-xs text-muted-foreground border-t pt-2">{ipva.notes}</p>}
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
        badge: theftRisk ? { label: `Veículo Visado +${((theftRisk.adjustment - 1) * 100).toFixed(0)}%`, variant: 'destructive' as const } : insurance.ajusteIVR > 1 ? { label: `+${((insurance.ajusteIVR - 1) * 100).toFixed(0)}% IVR`, variant: 'warning' as const } : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Seguro Estimado
              </DialogTitle>
              <DialogDescription>Estimativa baseada na categoria e índice de roubo</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium capitalize">{vehicleCategory.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa base:</span>
                  <span className="font-medium">{(insurance.taxaBase * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faixa anual:</span>
                  <span className="font-medium">{formatMoney(insurance.valorMinimo * 12)} - {formatMoney(insurance.valorMaximo * 12)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">⚠️ Valor real depende de CEP, idade e perfil.</p>
              {theftRisk && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2 mt-2">
                  <p className="font-medium text-destructive flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4" />
                    Veículo Visado — +{((theftRisk.adjustment - 1) * 100).toFixed(0)}% no seguro
                  </p>
                  <p className="text-xs text-muted-foreground">{theftRisk.reason}</p>
                  <p className="text-xs text-muted-foreground italic">
                    Fonte: ISP-RJ, SUSEP, Sindicato das Seguradoras (2024)
                  </p>
                </div>
              )}
            </div>
          </>
        ),
      },
      {
        key: 'depreciation',
        icon: <TrendingDown className="h-4 w-4" />,
        label: 'Depreciação',
        suggestedMonthly: depreciationMonthly,
        suggestedAnnual: depreciationMonthly * 12,
        monthlyValue: depreciationValue.monthly,
        annualValue: depreciationValue.annual,
        isEditable: true,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Depreciação Estimada
              </DialogTitle>
              <DialogDescription>Perda de valor baseada na idade do veículo</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idade:</span>
                  <span className="font-medium">{vehicleAge} {vehicleAge === 1 ? 'ano' : 'anos'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor atual:</span>
                  <span className="font-medium">{formatMoney(fipeValue)}</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                Depreciação = FIPE × Taxa Idade ÷ 12
              </div>
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
              <DialogDescription>Taxas de DETRAN e CRLV (~R$ 150/ano)</DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Inclui taxa DETRAN (~R$ 100) e CRLV (~R$ 50). O DPVAT foi extinto em 2020.
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
        isEmpty: fuelValue.monthly === 0 && calculatedFuelCost === 0,
        badge: consumptionSuggestion?.source === 'inmetro' 
          ? { label: 'INMETRO', variant: 'success' as const }
          : consumptionSuggestion?.source === 'estimate'
          ? { label: 'Estimado', variant: 'default' as const }
          : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                Combustível - Cálculo Detalhado
              </DialogTitle>
              <DialogDescription>Baseado na tabela de parâmetros de combustível</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Km/mês:</span>
                  <span className="font-medium">{formatNumber(totalMonthlyKm, 0)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo mensal:</span>
                  <span className="font-medium">{formatMoney(calculatedFuelCost)}</span>
                </div>
                {consumptionSuggestion && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fonte consumo:</span>
                      <Badge variant={consumptionSuggestion.source === 'inmetro' ? 'default' : 'secondary'} className="text-xs">
                        {consumptionSuggestion.sourceLabel}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                Total Mês = Σ (Km/mês ÷ Consumo × Preço)
              </div>
              <p className="text-xs text-muted-foreground">
                O custo é calculado para cada tipo de combustível e somado. Configure os parâmetros na tabela acima.
              </p>
            </div>
          </>
        ),
      },
      {
        key: 'maintenance',
        icon: <Wrench className="h-4 w-4" />,
        label: 'Revisão/Manutenção',
        suggestedMonthly: maintenanceCost.custoMensal,
        suggestedAnnual: maintenanceCost.custoAnual,
        monthlyValue: maintenanceValue.monthly,
        annualValue: maintenanceValue.annual,
        isEditable: true,
        badge: maintenanceCost.custoAnual > 0 
          ? { 
              label: maintenanceCost.veredito === 'bomba_relogio' ? 'Alto Risco' 
                   : maintenanceCost.veredito === 'alto' ? 'Custo Alto'
                   : 'Estimado', 
              variant: maintenanceCost.veredito === 'bomba_relogio' ? 'destructive' as const
                     : maintenanceCost.veredito === 'alto' ? 'warning' as const
                     : 'default' as const 
            } 
          : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Revisão e Manutenção
              </DialogTitle>
              <DialogDescription>Estimativa baseada na idade e categoria do veículo</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>Inclui revisões programadas, troca de óleo, filtros, pastilhas de freio, etc.</p>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{maintenanceCost.vereditoLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idade do veículo:</span>
                  <span className="font-medium">{vehicleAge} {vehicleAge === 1 ? 'ano' : 'anos'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fator de idade:</span>
                  <span className="font-medium">{maintenanceCost.fatores.fatorIdade}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Índice de complexidade:</span>
                  <span className="font-medium">{maintenanceCost.fatores.indiceComplexidade}x</span>
                </div>
                {maintenanceCost.fatores.regraRestoRico && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
                    ⚠️ <strong>Regra "Resto de Rico":</strong> Veículo premium antigo mantém custo mínimo elevado de manutenção.
                  </div>
                )}
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                Custo = Base × Fator Idade × Índice Complexidade
              </div>
              {maintenanceCost.reservaEmergencia > 0 && (
                <p className="text-xs text-muted-foreground">
                  💡 Reserva de emergência sugerida: <strong>{formatMoney(maintenanceCost.reservaEmergencia)}</strong>
                </p>
              )}
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
        badge: tireCost.custoMensal > 0 ? { label: 'Estimado', variant: 'default' as const } : undefined,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-primary" />
                Custo de Pneus
              </DialogTitle>
              <DialogDescription>Estimativa baseada na quilometragem informada</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>Calcula o custo proporcional de desgaste e troca de pneus com base no uso mensal.</p>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aro estimado:</span>
                  <span className="font-medium">R{estimateRimByCategory(vehicleCategory)}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durabilidade média:</span>
                  <span className="font-medium">{formatNumber(tireCost.durabilidadeKm, 0)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo jogo (4 pneus):</span>
                  <span className="font-medium">{formatMoney(tireCost.custoJogo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montagem/Balanc.:</span>
                  <span className="font-medium">{formatMoney(tireCost.custoMontagem)}</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                Custo = (Jogo + Montagem) × (Km/mês ÷ Durabilidade) ÷ 12
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 Altere o valor se souber o custo real dos pneus do seu veículo.
              </p>
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
        isEmpty: cleaningValue.monthly === 0,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Limpeza do Veículo
              </DialogTitle>
              <DialogDescription>Gastos com lavagem e higienização</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>Inclui lavagens regulares, enceramento, higienização interna e outros cuidados.</p>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Referências:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Lavagem simples (2-4x/mês): R$ 60-160/mês</li>
                  <li>• Lavagem completa (1-2x/mês): R$ 80-200/mês</li>
                  <li>• Lavagem premium/detailing: R$ 200-500/mês</li>
                  <li>• Lava-rápido próprio: R$ 20-50/mês</li>
                </ul>
              </div>
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
        isEmpty: parkingValue.monthly === 0,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleParking className="h-5 w-5 text-primary" />
                Estacionamento
              </DialogTitle>
              <DialogDescription>Gastos fixos com estacionamento</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>Inclui mensalidade de garagem, estacionamento no trabalho ou rotativo.</p>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Referências:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Condomínio extra: R$ 100-300/mês</li>
                  <li>• Garagem comercial: R$ 300-800/mês</li>
                  <li>• Centro de capitais: R$ 500-1.500/mês</li>
                </ul>
              </div>
            </div>
          </>
        ),
      },
      {
        key: 'toll',
        icon: <Milestone className="h-4 w-4" />,
        label: 'Pedágio',
        suggestedMonthly: 0,
        suggestedAnnual: 0,
        monthlyValue: tollValue.monthly,
        annualValue: tollValue.annual,
        isEditable: true,
        isEmpty: tollValue.monthly === 0,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Milestone className="h-5 w-5 text-primary" />
                Pedágio
              </DialogTitle>
              <DialogDescription>Gastos com pedágio e TAGs</DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Informe se você utiliza rodovias pedagiadas regularmente. Inclui mensalidade de TAGs se aplicável.
            </div>
          </>
        ),
      },
      // Custo de Oportunidade (FIPE × 85% CDI)
      {
        key: 'opportunityCost',
        icon: <TrendingUp className="h-4 w-4" />,
        label: 'Custo de Oportunidade',
        suggestedMonthly: (fipeValue * OPPORTUNITY_COST_RATE) / 12,
        suggestedAnnual: fipeValue * OPPORTUNITY_COST_RATE,
        monthlyValue: (fipeValue * OPPORTUNITY_COST_RATE) / 12,
        annualValue: fipeValue * OPPORTUNITY_COST_RATE,
        isEditable: false,
        helpContent: (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Custo de Oportunidade
              </DialogTitle>
              <DialogDescription>Rendimento perdido por ter capital imobilizado</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>
                Se o valor do carro estivesse investido em renda fixa (CDB, LCI/LCA com 85% do CDI), 
                você estaria ganhando este rendimento anualmente.
              </p>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor FIPE:</span>
                  <span className="font-medium">{formatMoney(fipeValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CDI atual:</span>
                  <span className="font-medium">{(CDI_ANNUAL_RATE * 100).toFixed(2)}% a.a.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Benchmark (85% CDI):</span>
                  <span className="font-medium">{(OPPORTUNITY_COST_RATE * 100).toFixed(2)}% a.a.</span>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                Custo = FIPE × 85% × CDI
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 85% do CDI é um benchmark realista para renda fixa líquida com garantia do FGC.
              </p>
            </div>
          </>
        ),
      },
    ];
  }, [ipva, insurance, depreciationMonthly, licensing, suggestedValues, getValue, selectedState, vehicleCategory, vehicleAge, fipeValue, calculatedFuelCost, consumptionSuggestion, totalMonthlyKm, tireCost]);

  // Calcular totais
  const totals = useMemo(() => {
    const monthly = costItems.reduce((sum, item) => sum + item.monthlyValue, 0);
    const annual = costItems.reduce((sum, item) => sum + item.annualValue, 0);
    const filledItems = costItems.filter(item => !item.isEmpty || item.monthlyValue > 0).length;
    const totalItems = costItems.length;
    return { monthly, annual, filledItems, totalItems };
  }, [costItems]);
  
  // Toggle de filtro individual
  const toggleCostFilter = useCallback((key: string) => {
    setCostFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  
  // Selecionar/desmarcar todos
  const toggleAllFilters = useCallback((enabled: boolean) => {
    const newFilters: Record<string, boolean> = {};
    costItems.forEach(item => {
      newFilters[item.key] = enabled;
    });
    setCostFilters(newFilters);
  }, [costItems]);
  
  // Dados para o componente de distribuição de custos
  const chartCostItems = useMemo(() => {
    return costItems.map(item => ({
      key: item.key,
      label: item.label,
      monthlyValue: item.monthlyValue,
      annualValue: item.annualValue,
    }));
  }, [costItems]);
  
  // Nota sobre custo de oportunidade
  const opportunityCostNote = `O "Custo de Oportunidade" representa o rendimento que você deixa de ganhar por ter capital imobilizado no veículo. Calculado como Valor FIPE × 85% do CDI (${(CDI_ANNUAL_RATE * 100).toFixed(2)}% a.a.), benchmark realista para renda fixa líquida (CDB/LCI/LCA) com garantia do FGC.`;

  // Expor dados para exportação PDF (relatório FIPE)
  useEffect(() => {
    onExportData?.({
      totalMonthly: totals.monthly,
      totalAnnual: totals.annual,
      costItems: chartCostItems,
      opportunityCostNote,
    });
  }, [onExportData, totals.monthly, totals.annual, chartCostItems, opportunityCostNote]);

  const [showParametersDialog, setShowParametersDialog] = useState(false);

  return (
    <CardContent className="pt-0">
      {/* Total Summary - Compact */}
      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatMoney(totals.monthly)}</div>
              <div className="text-[10px] text-muted-foreground">/mês</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{formatMoney(totals.annual)}</div>
              <div className="text-[10px] text-muted-foreground">/ano</div>
            </div>
            {totals.filledItems < totals.totalItems && (
              <span className="text-[10px] text-amber-600">
                ({totals.totalItems - totals.filledItems} campos vazios)
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowParametersDialog(true)}
            className="gap-1.5 bg-background hover:bg-primary hover:text-primary-foreground transition-colors border-primary/30 text-primary font-medium"
          >
            <Wrench className="h-3.5 w-3.5" />
            Personalizar parâmetros
          </Button>
        </div>
      </div>

      {/* Chart - Directly visible */}
      {totals.monthly > 0 && (
        <CostDistributionChart
          costItems={chartCostItems}
          costFilters={costFilters}
          onToggleFilter={toggleCostFilter}
          onToggleAllFilters={toggleAllFilters}
          chartView={chartView}
          onChartViewChange={setChartView}
          opportunityCostNote={opportunityCostNote}
        />
      )}

      {/* Parameters Dialog */}
      <Dialog open={showParametersDialog} onOpenChange={setShowParametersDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Detalhamento e Parâmetros de Custo
            </DialogTitle>
            <DialogDescription>
              Personalize os valores estimados de acordo com a sua realidade
            </DialogDescription>
          </DialogHeader>

          {/* Seletor de Estado */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">
                Estado (para cálculo do IPVA)
              </label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statesList.map((state) => (
                    <SelectItem key={state.uf} value={state.uf}>
                      {state.uf} - {state.name} ({state.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parâmetros de Combustível */}
          <FuelParametersTable
            yearLabel={yearLabel || modelName}
            consumptionSuggestion={consumptionSuggestion}
            consumptionLoading={consumptionLoading}
            initialMonthlyKm={1000}
            onChange={handleFuelChange}
            persistedData={{
              fuelRows: persistedData?.fuelRows,
              totalMonthlyKm: persistedData?.totalMonthlyKm,
            }}
          />

          {/* Header da tabela - Desktop */}
          {!isMobile && (
            <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-4">Categoria</div>
              <div className="col-span-4 text-center">R$ / Mês</div>
              <div className="col-span-4 text-center">R$ / Ano</div>
            </div>
          )}

          {/* Linhas de custo editáveis */}
          <div className="space-y-3">
            {costItems.map((item, index) => {
              const isCustom = customValues[item.key]?.isCustom;
              const hasSuggestion = item.suggestedMonthly > 0;
              
              const headerColors = [
                'bg-blue-500/10 border-l-blue-500',
                'bg-emerald-500/10 border-l-emerald-500',
                'bg-violet-500/10 border-l-violet-500',
                'bg-amber-500/10 border-l-amber-500',
                'bg-rose-500/10 border-l-rose-500',
                'bg-cyan-500/10 border-l-cyan-500',
                'bg-orange-500/10 border-l-orange-500',
                'bg-pink-500/10 border-l-pink-500',
                'bg-teal-500/10 border-l-teal-500',
                'bg-indigo-500/10 border-l-indigo-500',
              ];
              
              const iconColors = [
                'text-blue-600 dark:text-blue-400',
                'text-emerald-600 dark:text-emerald-400',
                'text-violet-600 dark:text-violet-400',
                'text-amber-600 dark:text-amber-400',
                'text-rose-600 dark:text-rose-400',
                'text-cyan-600 dark:text-cyan-400',
                'text-orange-600 dark:text-orange-400',
                'text-pink-600 dark:text-pink-400',
                'text-teal-600 dark:text-teal-400',
                'text-indigo-600 dark:text-indigo-400',
              ];
              
              const colorIndex = index % headerColors.length;
              const headerColor = item.isEmpty ? 'bg-amber-500/15 border-l-amber-500' : headerColors[colorIndex];
              const iconColor = item.isEmpty ? 'text-amber-600 dark:text-amber-400' : iconColors[colorIndex];
              
              // Layout Mobile: Card com barra lateral colorida
              if (isMobile) {
                return (
                  <div 
                    key={item.key} 
                    className={`rounded-xl border border-border/40 overflow-hidden shadow-sm transition-all hover:shadow-md ${headerColor} border-l-4`}
                  >
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 ${iconColor}`}>{item.icon}</span>
                        <span className="text-sm font-semibold text-foreground">{item.label}</span>
                        {item.helpContent && <HelpButton>{item.helpContent}</HelpButton>}
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={item.badge.variant === 'success' ? 'default' : item.badge.variant}
                          className={`shrink-0 text-[10px] px-1.5 h-5 ${item.badge.variant === 'success' ? 'bg-emerald-500' : ''}`}
                        >
                          {item.badge.label}
                        </Badge>
                      )}
                    </div>
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/60 rounded-lg p-2">
                          <label className="text-[10px] text-muted-foreground block mb-1 font-medium uppercase tracking-wide">Mensal</label>
                          <CurrencyInput
                            value={item.monthlyValue}
                            onChange={(v) => handleMonthlyChange(item.key, v)}
                            placeholder={item.isEmpty ? 'Informar' : '0,00'}
                            compact
                            maxDigits={MAX_CURRENCY_DIGITS}
                            className={`h-10 text-sm text-center bg-background border-border/50 ${
                              isCustom ? 'border-primary ring-1 ring-primary/20' : ''
                            } ${item.isEmpty && item.monthlyValue === 0 ? 'border-amber-500/50 placeholder:text-amber-600' : ''}`}
                          />
                          {hasSuggestion && isCustom && (
                            <button 
                              onClick={() => handleRestore(item.key)}
                              className="text-[10px] text-primary mt-1 w-full text-center hover:underline font-medium"
                            >
                              Restaurar ({formatMoneyCompact(item.suggestedMonthly)})
                            </button>
                          )}
                        </div>
                        <div className="bg-background/60 rounded-lg p-2">
                          <label className="text-[10px] text-muted-foreground block mb-1 font-medium uppercase tracking-wide">Anual</label>
                          <CurrencyInput
                            value={item.annualValue}
                            onChange={(v) => handleAnnualChange(item.key, v)}
                            placeholder={item.isEmpty ? 'Informar' : '0,00'}
                            compact
                            maxDigits={MAX_CURRENCY_DIGITS}
                            className={`h-10 text-sm text-center bg-background border-border/50 ${
                              isCustom ? 'border-primary ring-1 ring-primary/20' : ''
                            } ${item.isEmpty && item.annualValue === 0 ? 'border-amber-500/50 placeholder:text-amber-600' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Layout Desktop
              return (
                <div 
                  key={item.key} 
                  className={`rounded-xl border border-border/40 overflow-hidden shadow-sm transition-all hover:shadow-md ${headerColor} border-l-4`}
                >
                  <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                    <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                      <span className={`shrink-0 ${iconColor}`}>{item.icon}</span>
                      <span className="text-sm font-semibold text-foreground truncate">{item.label}</span>
                      {item.badge && (
                        <Badge 
                          variant={item.badge.variant === 'success' ? 'default' : item.badge.variant}
                          className={`shrink-0 text-[10px] px-1 h-4 ${item.badge.variant === 'success' ? 'bg-emerald-500' : ''}`}
                        >
                          {item.badge.label}
                        </Badge>
                      )}
                      {item.helpContent && <HelpButton>{item.helpContent}</HelpButton>}
                    </div>
                    <div className="col-span-4">
                      <div className="bg-background/60 rounded-lg p-1.5">
                        <CurrencyInput
                          value={item.monthlyValue}
                          onChange={(v) => handleMonthlyChange(item.key, v)}
                          placeholder={item.isEmpty ? 'Informar' : '0,00'}
                          compact
                          maxDigits={MAX_CURRENCY_DIGITS}
                          className={`h-8 text-sm text-center bg-background border-border/50 ${
                            isCustom ? 'border-primary ring-1 ring-primary/20' : ''
                          } ${item.isEmpty && item.monthlyValue === 0 ? 'border-amber-500/50 placeholder:text-amber-600' : ''}`}
                        />
                      </div>
                      {hasSuggestion && isCustom && (
                        <div className="text-[10px] text-muted-foreground text-center mt-0.5 flex items-center justify-center gap-1">
                          <span>Sugerido: {formatMoney(item.suggestedMonthly)}</span>
                          <button 
                            onClick={() => handleRestore(item.key)}
                            className="text-primary hover:underline font-medium"
                          >
                            Restaurar
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-span-4">
                      <div className="bg-background/60 rounded-lg p-1.5">
                        <CurrencyInput
                          value={item.annualValue}
                          onChange={(v) => handleAnnualChange(item.key, v)}
                          placeholder={item.isEmpty ? 'Informar' : '0,00'}
                          compact
                          maxDigits={MAX_CURRENCY_DIGITS}
                          className={`h-8 text-sm text-center bg-background border-border/50 ${
                            isCustom ? 'border-primary ring-1 ring-primary/20' : ''
                          } ${item.isEmpty && item.annualValue === 0 ? 'border-amber-500/50 placeholder:text-amber-600' : ''}`}
                        />
                      </div>
                      {hasSuggestion && isCustom && (
                        <div className="text-[10px] text-muted-foreground text-center mt-0.5">
                          Sugerido: {formatMoney(item.suggestedAnnual)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão restaurar todos */}
          {hasCustomValues && (
            <div className="flex justify-end mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRestoreAll}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restaurar estimativas
              </Button>
            </div>
          )}

          {/* Total inside dialog */}
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">Custo Total</div>
                {totals.filledItems < totals.totalItems && (
                  <span className="text-[10px] text-amber-600">
                    ({totals.totalItems - totals.filledItems} campos vazios)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{formatMoney(totals.monthly)}</div>
                  <div className="text-xs text-muted-foreground">/mês</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{formatMoney(totals.annual)}</div>
                  <div className="text-xs text-muted-foreground">/ano</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CardContent>
  );
};
