import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BackLink } from '@/components/shared/BackLink';
import { useFipe, VehicleType, formatFipeYearName } from '@/hooks/useFipe';
import { useFipeFullHistory, mapVehicleTypeToV2 } from '@/hooks/useFipeFullHistory';
import { FipeHistoryComparisonChart } from '@/components/simuladores/FipeHistoryComparisonChart';
import { useVehicleConsumption } from '@/hooks/useVehicleConsumption';
import { useDepreciationEngineV2 } from '@/hooks/useDepreciationEngineV2';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSectionDrawer } from '@/components/simuladores/MobileSectionDrawer';
import { useSimulatorContext } from '@/hooks/useSimulatorContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Car, 
  TrendingDown,
  TrendingUp,
  Calculator, 
  Trophy,
  Fuel,
  Shield,
  Wrench,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
  Minus,
  HelpCircle,
  AlertTriangle,
  Circle,
  BarChart3,
  Table2,
  ParkingCircle,
  Milestone,
  Droplets,
  Scale,
  ExternalLink,
  Pencil,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Copy,
  ArrowRightLeft,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  calculateTireCostPerKm,
  estimateRimByCategory,
  TireCostEstimate,
  TIRE_PRICE_ESTIMATES,
} from '@/utils/tireEstimator';
import { cn } from '@/lib/utils';
import { 
  statesList, 
  ipvaRates,
  calculateMonthlyIPVAWithBenefits,
  electricIPVABenefits,
} from '@/data/vehicleBenchmarks';
import {
  calculateInsuranceEstimate,
  InsuranceEstimate,
  UserProfile,
} from '@/utils/insuranceEstimator';
import {
  calculateMaintenanceEstimate,
  MaintenanceEstimate,
} from '@/utils/maintenanceEstimator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  SimulationParametersDialog, 
  SimulationDefaults, 
  SYSTEM_DEFAULTS 
} from '@/components/simuladores/SimulationParametersDialog';
import { VehicleConfigCardV2, VehicleConfigV2, createDefaultVehicleConfigV2 } from '@/components/simuladores/VehicleConfigCardV2';
import { FuelParametersTable, FuelRowData } from '@/components/simuladores/FuelParametersTable';
import { ParameterSyncManager, getSyncableParams, syncFuelPrices, getDivergentFields } from '@/components/simuladores/ParameterSyncManager';
import { DepreciationComparisonSection } from '@/components/simuladores/DepreciationComparisonSection';
import { CarComparisonHelpDialogs, VehicleCostsData, VehicleConfigData, CostOverrides } from '@/components/simuladores/CarComparisonHelpDialogs';
import { CarComparisonVerdict } from '@/components/simuladores/CarComparisonVerdict';
import { ComparisonCardGenerator } from '@/components/simuladores/ComparisonCardGenerator';
import { CarABOwnershipCostSection } from '@/components/simuladores/CarABOwnershipCostSection';
import { Scale as ScaleIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { buildVehicleFipeComparisonSeries } from '@/utils/buildFipeHistoryComparisonSeries';
import { useFipeFavorites } from '@/hooks/useFipeFavorites';
import { useUserKV } from '@/hooks/useUserKV';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatMoneyShort = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}Mn`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return formatMoney(value);
};

// Format number without R$ prefix (for tables with R$ in header)
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const formatNumberShort = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}Mn`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return formatNumber(value);
};

// ============================================================================
// CDI BENCHMARK FOR OPPORTUNITY COST
// 85% of CDI = approx. net yield from a good fixed income with FGC guarantee
// ============================================================================
const CDI_BENCHMARK_RATE = 0.85; // 85% of CDI
const CDI_ANNUAL_RATE = 0.1365; // Current CDI ~13.65% annually
const OPPORTUNITY_COST_RATE = CDI_BENCHMARK_RATE * CDI_ANNUAL_RATE; // ~11.6% net annual

// Convert simulation params to depreciation rates lookup
const getDepreciationRate = (age: number, params: SimulationDefaults): number => {
  if (age <= 1) return params.depreciationRates.year1;
  if (age === 2) return params.depreciationRates.year2;
  if (age === 3) return params.depreciationRates.year3;
  if (age === 4) return params.depreciationRates.year4;
  if (age === 5) return params.depreciationRates.year5;
  return params.depreciationRates.year6plus;
};

// Get fuel price from params
const getFuelPrice = (fuelType: string, params: SimulationDefaults): number => {
  switch (fuelType) {
    case 'gasoline': return params.fuelPrices.gasoline;
    case 'ethanol': return params.fuelPrices.ethanol;
    case 'diesel': return params.fuelPrices.diesel;
    case 'flex': return params.fuelPrices.flex;
    default: return params.fuelPrices.gasoline;
  }
};

// Calculate monthly fuel cost with custom params
const calculateMonthlyFuelWithParams = (
  monthlyKm: number,
  consumption: number,
  fuelType: string,
  params: SimulationDefaults
): number => {
  if (!monthlyKm || !consumption || consumption === 0) return 0;
  const pricePerLiter = getFuelPrice(fuelType, params);
  const litersNeeded = monthlyKm / consumption;
  return litersNeeded * pricePerLiter;
};

// Calculate licensing with custom params
const calculateMonthlyLicensingWithParams = (params: SimulationDefaults): number => {
  return params.licensingAnnual / 12;
};

// Forward declarations for VehicleConfig (actual interface below)
type VehicleConfigForFuel = {
  fuelType: 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'hybrid_plugin' | 'electric';
  flexFuelChoice?: 'gasoline' | 'ethanol';
};

// Get effective fuel price considering flex choice
const getEffectiveFuelPrice = (config: VehicleConfigForFuel, params: SimulationDefaults): number => {
  if (config.fuelType === 'flex') {
    const choice = config.flexFuelChoice || 'gasoline';
    return choice === 'ethanol' ? params.fuelPrices.ethanol : params.fuelPrices.gasoline;
  }
  if (config.fuelType === 'hybrid_plugin') {
    return params.fuelPrices.gasoline;
  }
  if (config.fuelType === 'electric') {
    return 0; // Elétrico não usa combustível líquido
  }
  switch (config.fuelType) {
    case 'gasoline': return params.fuelPrices.gasoline;
    case 'ethanol': return params.fuelPrices.ethanol;
    case 'diesel': return params.fuelPrices.diesel;
    default: return params.fuelPrices.gasoline;
  }
};

interface VehicleCosts {
  ipva: number;
  insurance: number;
  insuranceEstimate: InsuranceEstimate;
  fuel: number;
  maintenance: number;
  maintenanceEstimate: MaintenanceEstimate;
  licensing: number;
  tires: number;
  tireEstimate: TireCostEstimate;
  rimSize: number; // Tamanho do aro efetivo (detectado ou ajustado)
  estimatedRimSize: number; // Tamanho detectado pela categoria
  revision: number;
  parking: number;
  tolls: number;
  washing: number;
  opportunityCost: number; // NEW: Custo de Oportunidade (CDI benchmark)
  totalMonthly: number;
  totalAnnual: number;
}

interface DepreciationProjection {
  year: number;
  valueA: number;
  valueB: number;
  depreciationA: number;
  depreciationB: number;
}

const SimuladorCarroAB: React.FC = () => {
  const { load, isFresh, clear } = useSimulatorContext();
  
  // Check for pending context BEFORE instantiating fipe hooks
  // This allows us to pass initialization data immediately
  const pendingContextRef = useRef<ReturnType<typeof load> | null>(null);
  const contextCheckedRef = useRef(false);
  
  // Only check once on mount
  if (!contextCheckedRef.current) {
    contextCheckedRef.current = true;
    if (isFresh()) {
      const ctx = load();
      if (ctx?.brandCode && ctx?.modelCode && ctx?.yearCode) {
        pendingContextRef.current = ctx;
        // Clear immediately to prevent re-reads
        clear();
      }
    }
  }
  
  const fipeA = useFipe();
  const fipeB = useFipe();
  const fipeFavoritesA = useFipeFavorites(fipeA);
  const fipeFavoritesB = useFipeFavorites(fipeB);
  const consumptionHookA = useVehicleConsumption();
  const consumptionHookB = useVehicleConsumption();
  const fipeHistoryA = useFipeFullHistory();
  const fipeHistoryB = useFipeFullHistory();

  // Track if context was already loaded for Car A
  const contextLoadedRef = useRef(false);

  // Simulation parameters state - persisted via useUserKV
  const { value: savedParams, setValue: persistParams } = useUserKV<SimulationDefaults>('car-simulator-params', SYSTEM_DEFAULTS);
  const isSyncingFromKV = useRef(false);
  const [simulationParams, setSimulationParams] = useState<SimulationDefaults>(
    () => ({ ...SYSTEM_DEFAULTS, ...savedParams })
  );

  // Sync from KV on load
  useEffect(() => {
    if (savedParams) {
      isSyncingFromKV.current = true;
      setSimulationParams(prev => ({ ...SYSTEM_DEFAULTS, ...savedParams }));
    }
  }, [savedParams]);

  // Persist simulation params to KV when they change
  useEffect(() => {
    if (isSyncingFromKV.current) {
      isSyncingFromKV.current = false;
      return;
    }
    persistParams(simulationParams);
  }, [simulationParams, persistParams]);

  const [configA, setConfigA] = useState<VehicleConfigV2>(() => ({
    ...createDefaultVehicleConfigV2(),
  }));

  const [configB, setConfigB] = useState<VehicleConfigV2>(() => ({
    ...createDefaultVehicleConfigV2(),
    vehicleAge: 3,
    isZeroKm: false,
  }));

  // Track if Car B should be enabled (after Car A has a vehicle selected)
  const [isCarBUnlocked, setIsCarBUnlocked] = useState(false);
  
  // Track if initial sync from A to B has been done
  const [hasInitialSync, setHasInitialSync] = useState(false);

  const [costProjectionPeriod, setCostProjectionPeriod] = useState<'annual' | 'monthly'>('annual');
  const [mobileViewMode, setMobileViewMode] = useState<'chart' | 'table'>('chart');
  const isMobile = useIsMobile();
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  const [showParamsDialog, setShowParamsDialog] = useState(false);
  
  useEffect(() => {
    const checkSize = () => setIsTabletOrMobile(window.innerWidth < 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  // Auto-fill Car A from simulator context (when navigating from another simulator)
  // Use pendingContextRef that was checked synchronously before hooks
  useEffect(() => {
    if (contextLoadedRef.current) return;
    if (fipeA.priceValue > 0) return;
    
    const context = pendingContextRef.current;
    if (context?.brandCode && context?.modelCode && context?.yearCode) {
      contextLoadedRef.current = true;
      pendingContextRef.current = null;
      fipeA.initializeFromSaved({
        vehicleType: context.vehicleType,
        brandCode: context.brandCode,
        modelCode: context.modelCode,
        yearCode: context.yearCode,
      });
    }
  }, [fipeA.priceValue]);

  // ============================================================================
  // MOTOR DE DEPRECIAÇÃO V6 - Integrado para cálculo inteligente de depreciação
  // ============================================================================
  const currentYear = new Date().getFullYear();
  
  // Extrair informações FIPE para o motor de depreciação
  const fipeInfoA = useMemo(() => {
    const modelYear = fipeA.price?.AnoModelo || (configA.isZeroKm ? currentYear : currentYear - configA.vehicleAge);
    return {
      fipeCode: fipeA.price?.CodigoFipe || '',
      modelName: fipeA.price?.Modelo || '',
      brandName: fipeA.price?.Marca || '',
      modelYear,
      vehicleType: (fipeA.vehicleType || 'carros') as 'carros' | 'motos' | 'caminhoes',
    };
  }, [fipeA.price, fipeA.vehicleType, configA.isZeroKm, configA.vehicleAge, currentYear]);
  
  const fipeInfoB = useMemo(() => {
    const modelYear = fipeB.price?.AnoModelo || (configB.isZeroKm ? currentYear : currentYear - configB.vehicleAge);
    return {
      fipeCode: fipeB.price?.CodigoFipe || '',
      modelName: fipeB.price?.Modelo || '',
      brandName: fipeB.price?.Marca || '',
      modelYear,
      vehicleType: (fipeB.vehicleType || 'carros') as 'carros' | 'motos' | 'caminhoes',
    };
  }, [fipeB.price, fipeB.vehicleType, configB.isZeroKm, configB.vehicleAge, currentYear]);
  
  // Hook do motor de depreciação para cada veículo
  const depreciationEngineA = useDepreciationEngineV2(fipeInfoA);
  const depreciationEngineB = useDepreciationEngineV2(fipeInfoB);
  
  // Calcular depreciação quando dados FIPE estiverem disponíveis
  useEffect(() => {
    if (fipeInfoA.fipeCode && fipeInfoA.modelName && fipeA.priceValue > 0) {
      depreciationEngineA.calculate();
    }
  }, [fipeInfoA.fipeCode, fipeInfoA.modelName, fipeA.priceValue]);
  
  useEffect(() => {
    if (fipeInfoB.fipeCode && fipeInfoB.modelName && fipeB.priceValue > 0) {
      depreciationEngineB.calculate();
    }
  }, [fipeInfoB.fipeCode, fipeInfoB.modelName, fipeB.priceValue]);

  // ============================================================================
  // HISTÓRICO FIPE - Fetch full price history for each vehicle
  // ============================================================================
  useEffect(() => {
    if (configA.isZeroKm) {
      fipeHistoryA.reset();
      return;
    }
    if (fipeA.price?.CodigoFipe && fipeA.selectedYear && fipeA.price?.AnoModelo) {
      const vehicleTypeV2 = mapVehicleTypeToV2(fipeA.vehicleType);
      const parsedModelYear = Number(String(fipeA.selectedYear).split('-')[0]);
      const effectiveModelYear = Number.isFinite(parsedModelYear) ? parsedModelYear : fipeA.price.AnoModelo;
      fipeHistoryA.fetchFullHistory(vehicleTypeV2, fipeA.price.CodigoFipe, fipeA.selectedYear, effectiveModelYear);
    } else {
      fipeHistoryA.reset();
    }
  }, [configA.isZeroKm, fipeA.price?.CodigoFipe, fipeA.selectedYear, fipeA.vehicleType, fipeA.price?.AnoModelo]);

  useEffect(() => {
    if (configB.isZeroKm) {
      fipeHistoryB.reset();
      return;
    }
    if (fipeB.price?.CodigoFipe && fipeB.selectedYear && fipeB.price?.AnoModelo) {
      const vehicleTypeV2 = mapVehicleTypeToV2(fipeB.vehicleType);
      const parsedModelYear = Number(String(fipeB.selectedYear).split('-')[0]);
      const effectiveModelYear = Number.isFinite(parsedModelYear) ? parsedModelYear : fipeB.price.AnoModelo;
      fipeHistoryB.fetchFullHistory(vehicleTypeV2, fipeB.price.CodigoFipe, fipeB.selectedYear, effectiveModelYear);
    } else {
      fipeHistoryB.reset();
    }
  }, [configB.isZeroKm, fipeB.price?.CodigoFipe, fipeB.selectedYear, fipeB.vehicleType, fipeB.price?.AnoModelo]);

  const hasZeroKmVehicle = configA.isZeroKm || configB.isZeroKm;
  const [showProjectionAB, setShowProjectionAB] = useState(
    () => configA.isZeroKm || configB.isZeroKm
  );
  useEffect(() => {
    if (hasZeroKmVehicle) setShowProjectionAB(true);
    else setShowProjectionAB(false);
  }, [hasZeroKmVehicle]);

  // COST OVERRIDES - permite usuário editar custos estimados na tabela comparativa
  // ============================================================================
  type CostKey = 'ipva' | 'insurance' | 'fuel' | 'maintenance' | 'licensing' | 'tires' | 'depreciation' | 'opportunityCost';
  interface CostOverrides {
    [key: string]: number | undefined; // valor anual
  }
  const [costOverridesA, setCostOverridesA] = useState<CostOverrides>({});
  const [costOverridesB, setCostOverridesB] = useState<CostOverrides>({});

  // ============================================================================
  // TIRE OVERRIDES - permite usuário ajustar tamanho do aro e preço do pneu
  // ============================================================================
  const [rimSizeOverrideA, setRimSizeOverrideA] = useState<number | undefined>(undefined);
  const [rimSizeOverrideB, setRimSizeOverrideB] = useState<number | undefined>(undefined);
  const [tirePriceOverrideA, setTirePriceOverrideA] = useState<number | undefined>(undefined);
  const [tirePriceOverrideB, setTirePriceOverrideB] = useState<number | undefined>(undefined);

  const handleTireOverride = useCallback((key: 'rimSizeA' | 'rimSizeB' | 'tirePriceA' | 'tirePriceB', value: number | undefined) => {
    if (key === 'rimSizeA') {
      setRimSizeOverrideA(value);
    } else if (key === 'rimSizeB') {
      setRimSizeOverrideB(value);
    } else if (key === 'tirePriceA') {
      setTirePriceOverrideA(value);
    } else if (key === 'tirePriceB') {
      setTirePriceOverrideB(value);
    }
  }, []);

  // Handlers para editar/restaurar overrides
  const handleCostOverrideA = useCallback((key: CostKey, annualValue: number | undefined) => {
    setCostOverridesA(prev => {
      if (annualValue === undefined) {
        const newOverrides = { ...prev };
        delete newOverrides[key];
        return newOverrides;
      }
      return { ...prev, [key]: annualValue };
    });
  }, []);

  const handleCostOverrideB = useCallback((key: CostKey, annualValue: number | undefined) => {
    setCostOverridesB(prev => {
      if (annualValue === undefined) {
        const newOverrides = { ...prev };
        delete newOverrides[key];
        return newOverrides;
      }
      return { ...prev, [key]: annualValue };
    });
  }, []);

  // Check if there are any overrides
  const hasOverridesA = Object.keys(costOverridesA).length > 0;
  const hasOverridesB = Object.keys(costOverridesB).length > 0;

  const handleRestoreAllOverrides = useCallback(() => {
    setCostOverridesA({});
    setCostOverridesB({});
  }, []);

  // Só usa customValue quando sourceType é 'manual', caso contrário precisa de FIPE selecionado
  const valueA = configA.sourceType === 'manual' ? configA.customValue : fipeA.priceValue;
  const valueB = configB.sourceType === 'manual' ? configB.customValue : fipeB.priceValue;

  const fullSeriesA = useMemo(
    () =>
      buildVehicleFipeComparisonSeries({
        priceHistory: configA.isZeroKm ? [] : fipeHistoryA.priceHistory,
        currentPrice: valueA,
        isZeroKm: configA.isZeroKm,
        modelYear: fipeInfoA.modelYear,
        engineV2Result: depreciationEngineA.result,
        cohortData: fipeHistoryA.cohortData,
      }),
    [
      configA.isZeroKm,
      fipeHistoryA.priceHistory,
      fipeHistoryA.cohortData,
      valueA,
      fipeInfoA.modelYear,
      depreciationEngineA.result,
    ]
  );
  const fullSeriesB = useMemo(
    () =>
      buildVehicleFipeComparisonSeries({
        priceHistory: configB.isZeroKm ? [] : fipeHistoryB.priceHistory,
        currentPrice: valueB,
        isZeroKm: configB.isZeroKm,
        modelYear: fipeInfoB.modelYear,
        engineV2Result: depreciationEngineB.result,
        cohortData: fipeHistoryB.cohortData,
      }),
    [
      configB.isZeroKm,
      fipeHistoryB.priceHistory,
      fipeHistoryB.cohortData,
      valueB,
      fipeInfoB.modelYear,
      depreciationEngineB.result,
    ]
  );
  const chartDataA = useMemo(
    () => (showProjectionAB ? fullSeriesA : fullSeriesA.filter((d) => !d.isProjection)),
    [fullSeriesA, showProjectionAB]
  );
  const chartDataB = useMemo(
    () => (showProjectionAB ? fullSeriesB : fullSeriesB.filter((d) => !d.isProjection)),
    [fullSeriesB, showProjectionAB]
  );

  // Unlock Car B when Car A has a valid value
  useEffect(() => {
    if (valueA > 0 && !isCarBUnlocked) {
      setIsCarBUnlocked(true);
    }
  }, [valueA, isCarBUnlocked]);

  // Auto-sync parameters from A to B when B is first unlocked (one-time)
  useEffect(() => {
    if (isCarBUnlocked && !hasInitialSync && valueA > 0) {
      const syncParams = getSyncableParams(configA);
      const syncedFuelRows = configB.fuelRows.length > 0 
        ? syncFuelPrices(configB.fuelRows, configA.fuelRows)
        : configA.fuelRows.map(row => ({ ...row })); // Copy fuel rows if B has none
      
      setConfigB(prev => ({
        ...prev,
        ...syncParams,
        fuelRows: syncedFuelRows,
      }));
      setHasInitialSync(true);
    }
  }, [isCarBUnlocked, hasInitialSync, valueA, configA]);

  // Auto-sync fuel prices between A and B when they share the same fuel type
  const prevFuelPricesARef = useRef<Record<string, number>>({});
  const prevFuelPricesBRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isCarBUnlocked || !hasInitialSync) return;
    
    const currentPricesA: Record<string, number> = {};
    configA.fuelRows.forEach(r => { currentPricesA[r.type] = r.price; });
    
    const prevPricesA = prevFuelPricesARef.current;
    const changedTypes: string[] = [];
    
    for (const type of Object.keys(currentPricesA)) {
      if (prevPricesA[type] !== undefined && prevPricesA[type] !== currentPricesA[type]) {
        changedTypes.push(type);
      }
    }
    
    prevFuelPricesARef.current = currentPricesA;
    
    if (changedTypes.length > 0) {
      setConfigB(prev => ({
        ...prev,
        fuelRows: prev.fuelRows.map(row => {
          if (changedTypes.includes(row.type) && currentPricesA[row.type] !== undefined) {
            return { ...row, price: currentPricesA[row.type], isCustomPrice: true };
          }
          return row;
        }),
      }));
    }
  }, [configA.fuelRows, isCarBUnlocked, hasInitialSync]);

  useEffect(() => {
    if (!isCarBUnlocked || !hasInitialSync) return;
    
    const currentPricesB: Record<string, number> = {};
    configB.fuelRows.forEach(r => { currentPricesB[r.type] = r.price; });
    
    const prevPricesB = prevFuelPricesBRef.current;
    const changedTypes: string[] = [];
    
    for (const type of Object.keys(currentPricesB)) {
      if (prevPricesB[type] !== undefined && prevPricesB[type] !== currentPricesB[type]) {
        changedTypes.push(type);
      }
    }
    
    prevFuelPricesBRef.current = currentPricesB;
    
    if (changedTypes.length > 0) {
      setConfigA(prev => ({
        ...prev,
        fuelRows: prev.fuelRows.map(row => {
          if (changedTypes.includes(row.type) && currentPricesB[row.type] !== undefined) {
            return { ...row, price: currentPricesB[row.type], isCustomPrice: true };
          }
          return row;
        }),
      }));
    }
  }, [configB.fuelRows, isCarBUnlocked, hasInitialSync]);

  // Sync handlers
  const handleSyncAtoB = () => {
    const syncParams = getSyncableParams(configA);
    const syncedFuelRows = configB.fuelRows.length > 0 
      ? syncFuelPrices(configB.fuelRows, configA.fuelRows)
      : configA.fuelRows.map(row => ({ ...row }));
    
    setConfigB(prev => ({
      ...prev,
      ...syncParams,
      fuelRows: syncedFuelRows,
    }));
  };

  const handleSyncBtoA = () => {
    const syncParams = getSyncableParams(configB);
    const syncedFuelRows = configA.fuelRows.length > 0 
      ? syncFuelPrices(configA.fuelRows, configB.fuelRows)
      : configB.fuelRows.map(row => ({ ...row }));
    
    setConfigA(prev => ({
      ...prev,
      ...syncParams,
      fuelRows: syncedFuelRows,
    }));
  };

  // Individual field sync handlers (for inline buttons)
  const handleSyncFieldToA = (field: string) => {
    switch (field) {
      case 'vehicleState':
        setConfigA(prev => ({ ...prev, vehicleState: configB.vehicleState }));
        break;
      case 'monthlyParking':
        setConfigA(prev => ({ ...prev, monthlyParking: configB.monthlyParking }));
        break;
      case 'monthlyTolls':
        setConfigA(prev => ({ ...prev, monthlyTolls: configB.monthlyTolls }));
        break;
      case 'monthlyWashing':
        setConfigA(prev => ({ ...prev, monthlyWashing: configB.monthlyWashing }));
        break;
      case 'totalMonthlyKm':
        setConfigA(prev => ({ ...prev, totalMonthlyKm: configB.totalMonthlyKm }));
        break;
      case 'fuelPrice':
        const syncedToA = syncFuelPrices(configA.fuelRows, configB.fuelRows);
        setConfigA(prev => ({ ...prev, fuelRows: syncedToA }));
        break;
    }
  };

  const handleSyncFieldToB = (field: string) => {
    switch (field) {
      case 'vehicleState':
        setConfigB(prev => ({ ...prev, vehicleState: configA.vehicleState }));
        break;
      case 'monthlyParking':
        setConfigB(prev => ({ ...prev, monthlyParking: configA.monthlyParking }));
        break;
      case 'monthlyTolls':
        setConfigB(prev => ({ ...prev, monthlyTolls: configA.monthlyTolls }));
        break;
      case 'monthlyWashing':
        setConfigB(prev => ({ ...prev, monthlyWashing: configA.monthlyWashing }));
        break;
      case 'totalMonthlyKm':
        setConfigB(prev => ({ ...prev, totalMonthlyKm: configA.totalMonthlyKm }));
        break;
      case 'fuelPrice':
        const syncedToB = syncFuelPrices(configB.fuelRows, configA.fuelRows);
        setConfigB(prev => ({ ...prev, fuelRows: syncedToB }));
        break;
    }
  };

  // Inferir tipo de combustível principal do fuelRows para IPVA
  const getPrimaryFuelType = (fuelRows: FuelRowData[]): string => {
    if (fuelRows.length > 0) {
      const firstType = fuelRows[0]?.type;
      if (firstType === 'electric') return 'eletrico';
      if (firstType === 'gasoline') return 'gasoline';
      if (firstType === 'ethanol') return 'ethanol';
      if (firstType === 'diesel') return 'diesel';
    }
    return 'gasoline';
  };

  // Calcular custos de cada veículo
  const calculateCosts = (
    value: number, 
    config: VehicleConfigV2, 
    modelName: string,
    vehicleType?: string,
    rimSizeOverride?: number,
    tirePriceOverride?: number
  ): VehicleCosts => {
    const emptyInsuranceEstimate: InsuranceEstimate = {
      valorMinimo: 0,
      valorMedio: 0,
      valorMaximo: 0,
      taxaBase: 0,
      ajusteIVR: 1,
      ajustePerfil: 1,
      justificativas: [],
      metodologia: ''
    };
    
    const emptyMaintenanceEstimate: MaintenanceEstimate = {
      custoAnual: 0,
      custoMensal: 0,
      reservaEmergencia: 0,
      veredito: 'baixo_custo',
      vereditoLabel: '',
      vereditoDescricao: '',
      fatores: { base: 0, fatorIdade: 1, indiceComplexidade: 1, regraRestoRico: false },
      detalhamento: [],
    };
    
    const emptyTireEstimate: TireCostEstimate = {
      precoUnitarioEstimado: 0,
      custoJogo: 0,
      custoMontagem: 0,
      custoTotal: 0,
      durabilidadeKm: 0,
      custoPorKm: 0,
      custoPor100Km: 0,
      custoAnual: 0,
      custoMensal: 0,
    };
    
    if (value === 0) {
      return { 
        ipva: 0, 
        insurance: 0, 
        insuranceEstimate: emptyInsuranceEstimate,
        fuel: 0, 
        maintenance: 0, 
        maintenanceEstimate: emptyMaintenanceEstimate,
        licensing: 0, 
        tires: 0, 
        tireEstimate: emptyTireEstimate,
        rimSize: 16,
        estimatedRimSize: 16,
        revision: 0,
        parking: 0,
        tolls: 0,
        washing: 0,
        opportunityCost: 0,
        totalMonthly: 0, 
        totalAnnual: 0 
      };
    }

    // Determinar tipo de combustível para IPVA a partir do fuelRows
    const primaryFuelType = getPrimaryFuelType(config.fuelRows);
    const ipvaResult = calculateMonthlyIPVAWithBenefits(value, config.vehicleState, primaryFuelType);
    const ipva = ipvaResult.monthly;
    
    // Usar novo estimador de seguro (ou valor custom anual se fornecido)
    // Mapear userProfile para o tipo esperado pelo estimador
    const insuranceProfile = 'padrao' as const; // Default para estimativa de seguro
    const insuranceEstimate = calculateInsuranceEstimate(
      value, 
      modelName, 
      undefined, 
      insuranceProfile,
      vehicleType
    );
    // Se tem custom anual, divide por 12 para mensal; senão usa estimativa mensal
    const insurance = config.customInsuranceAnnual !== undefined 
      ? config.customInsuranceAnnual / 12 
      : insuranceEstimate.valorMedio;
    
    // Combustível já calculado pelo FuelParametersTable
    const fuel = config.calculatedFuelCost;
    
    // Usar novo estimador de manutenção
    const currentYear = new Date().getFullYear();
    const manufacturingYear = config.isZeroKm ? currentYear : currentYear - config.vehicleAge;
    const estimatedKm = config.totalMonthlyKm * 12 * config.vehicleAge;
    
    const maintenanceEstimate = calculateMaintenanceEstimate(
      value,
      modelName,
      manufacturingYear,
      estimatedKm
    );
    
    // Se tem custom annual, divide em maintenance + revision proporcionalmente
    let maintenance: number;
    let revision: number;
    if (config.customMaintenanceAnnual !== undefined) {
      // Valor total anual personalizado - divide por 12 para mensal
      const totalMensalCustom = config.customMaintenanceAnnual / 12;
      maintenance = totalMensalCustom * 0.7; // ~70% manutenção
      revision = totalMensalCustom * 0.3; // ~30% revisões
    } else {
      maintenance = maintenanceEstimate.custoMensal;
      revision = (simulationParams.revisionCostSemester * 2) / 12;
    }
    
    const licensing = calculateMonthlyLicensingWithParams(simulationParams);
    
    // Custo de pneus usando novo estimador
    // Usa rimSizeOverride se disponível, senão estima pela categoria
    // Usa tirePriceOverride se disponível, senão usa estimativa por aro
    const estimatedRimSize = estimateRimByCategory(modelName);
    const effectiveRimSize = rimSizeOverride ?? estimatedRimSize;
    const tireEstimate = calculateTireCostPerKm(effectiveRimSize, 400, tirePriceOverride, config.totalMonthlyKm * 12);
    const tires = tireEstimate.custoMensal;

    // Custos adicionais do usuário
    const parking = config.monthlyParking || 0;
    const tolls = config.monthlyTolls || 0;
    const washing = config.monthlyWashing || 0;

    // Custo de Oportunidade: rendimento perdido por ter capital imobilizado no veículo
    // Calculado como Valor FIPE × 85% CDI (benchmark realista para renda fixa com FGC)
    const opportunityCostAnnual = value * OPPORTUNITY_COST_RATE;
    const opportunityCost = opportunityCostAnnual / 12;

    const totalMonthly = ipva + insurance + fuel + maintenance + licensing + tires + revision + parking + tolls + washing + opportunityCost;
    const totalAnnual = totalMonthly * 12;

    return { 
      ipva, insurance, insuranceEstimate, fuel, maintenance, maintenanceEstimate, 
      licensing, tires, tireEstimate, revision, parking, tolls, washing, 
      opportunityCost, totalMonthly, totalAnnual,
      rimSize: effectiveRimSize,
      estimatedRimSize,
    };
  };

  // Obter nome do modelo para estimativa de seguro
  const modelNameA = fipeA.price?.Modelo || '';
  const modelNameB = fipeB.price?.Modelo || '';
  const brandNameA = fipeA.price?.Marca || '';
  const brandNameB = fipeB.price?.Marca || '';
  const yearLabelA = formatFipeYearName(fipeA.years.find(y => y.codigo === fipeA.selectedYear)?.nome || '');
  const yearLabelB = formatFipeYearName(fipeB.years.find(y => y.codigo === fipeB.selectedYear)?.nome || '');

  const costsA = useMemo(() => calculateCosts(valueA, configA, modelNameA, fipeA.vehicleType, rimSizeOverrideA, tirePriceOverrideA), [valueA, configA, modelNameA, fipeA.vehicleType, simulationParams, rimSizeOverrideA, tirePriceOverrideA]);
  const costsB = useMemo(() => calculateCosts(valueB, configB, modelNameB, fipeB.vehicleType, rimSizeOverrideB, tirePriceOverrideB), [valueB, configB, modelNameB, fipeB.vehicleType, simulationParams, rimSizeOverrideB, tirePriceOverrideB]);

  // ============================================================================
  // CÁLCULO DE DEPRECIAÇÃO - Motor V6 com fallback para tabela estática
  // O Motor V6 usa regressão exponencial sobre dados históricos FIPE reais
  // Fallback: tabela estática baseada apenas na idade do veículo
  // ============================================================================
  
  // Verificar se motor V6 tem resultado válido para cada veículo
  const hasV6ResultA = depreciationEngineA.isReady && depreciationEngineA.result?.metadata?.annualRatePhaseA != null;
  const hasV6ResultB = depreciationEngineB.isReady && depreciationEngineB.result?.metadata?.annualRatePhaseA != null;
  
  // Taxa de depreciação efetiva (V6 ou fallback)
  const depreciationRateA = useMemo(() => {
    if (hasV6ResultA && depreciationEngineA.result?.metadata?.annualRatePhaseA) {
      return depreciationEngineA.result.metadata.annualRatePhaseA;
    }
    // Fallback: tabela estática
    return getDepreciationRate(configA.vehicleAge + 1, simulationParams);
  }, [hasV6ResultA, depreciationEngineA.result, configA.vehicleAge, simulationParams]);
  
  const depreciationRateB = useMemo(() => {
    if (hasV6ResultB && depreciationEngineB.result?.metadata?.annualRatePhaseA) {
      return depreciationEngineB.result.metadata.annualRatePhaseA;
    }
    // Fallback: tabela estática
    return getDepreciationRate(configB.vehicleAge + 1, simulationParams);
  }, [hasV6ResultB, depreciationEngineB.result, configB.vehicleAge, simulationParams]);
  
  // Calcular depreciação anual para exibição usando CURVA V6 (pontos de projeção)
  // Isso garante consistência com o simulador "Custo do seu carro"
  const depreciationAnnualA = useMemo(() => {
    if (valueA === 0) return 0;
    
    // Usar pontos da curva V6 quando disponível (igual ao TimeSeriesDepreciationChart)
    if (hasV6ResultA && depreciationEngineA.result?.curve) {
      const curve = depreciationEngineA.result.curve;
      const currentAge = depreciationEngineA.result.currentAge ?? 0;
      
      // Encontrar ponto atual e próximo ano na curva
      const currentPoint = curve.find(p => p.age === currentAge);
      const nextYearPoint = curve.find(p => p.age === currentAge + 1);
      
      if (currentPoint && nextYearPoint) {
        // Depreciação = diferença entre valor atual e valor projetado para próximo ano
        return currentPoint.price - nextYearPoint.price;
      }
      
      // Se não encontrar ponto atual, usar valueA como referência
      if (nextYearPoint) {
        return valueA - nextYearPoint.price;
      }
    }
    
    // Fallback: taxa estática
    return valueA * depreciationRateA;
  }, [valueA, hasV6ResultA, depreciationEngineA.result, depreciationRateA]);
  
  const depreciationMonthlyA = useMemo(() => {
    return depreciationAnnualA / 12;
  }, [depreciationAnnualA]);

  const depreciationAnnualB = useMemo(() => {
    if (valueB === 0) return 0;
    
    // Usar pontos da curva V6 quando disponível
    if (hasV6ResultB && depreciationEngineB.result?.curve) {
      const curve = depreciationEngineB.result.curve;
      const currentAge = depreciationEngineB.result.currentAge ?? 0;
      
      const currentPoint = curve.find(p => p.age === currentAge);
      const nextYearPoint = curve.find(p => p.age === currentAge + 1);
      
      if (currentPoint && nextYearPoint) {
        return currentPoint.price - nextYearPoint.price;
      }
      
      if (nextYearPoint) {
        return valueB - nextYearPoint.price;
      }
    }
    
    // Fallback: taxa estática
    return valueB * depreciationRateB;
  }, [valueB, hasV6ResultB, depreciationEngineB.result, depreciationRateB]);

  const depreciationMonthlyB = useMemo(() => {
    return depreciationAnnualB / 12;
  }, [depreciationAnnualB]);

  // Aplicar overrides aos custos (valores anuais / 12 para mensal)
  const getEffectiveCost = useCallback((baseCost: number, overrideAnnual: number | undefined): number => {
    if (overrideAnnual !== undefined) {
      return overrideAnnual / 12;
    }
    return baseCost;
  }, []);

  // Custos efetivos considerando overrides
  const effectiveCostsA = useMemo(() => ({
    ipva: getEffectiveCost(costsA.ipva, costOverridesA.ipva),
    insurance: getEffectiveCost(costsA.insurance, costOverridesA.insurance),
    fuel: costsA.fuel, // Combustível já é configurável no VehicleConfigCard
    maintenance: costOverridesA.maintenance !== undefined 
      ? costOverridesA.maintenance / 12 
      : (costsA.maintenance + costsA.revision),
    licensing: getEffectiveCost(costsA.licensing, costOverridesA.licensing),
    tires: getEffectiveCost(costsA.tires, costOverridesA.tires),
    depreciation: getEffectiveCost(depreciationMonthlyA, costOverridesA.depreciation),
    opportunityCost: getEffectiveCost(costsA.opportunityCost, costOverridesA.opportunityCost),
  }), [costsA, costOverridesA, depreciationMonthlyA, getEffectiveCost]);

  const effectiveCostsB = useMemo(() => ({
    ipva: getEffectiveCost(costsB.ipva, costOverridesB.ipva),
    insurance: getEffectiveCost(costsB.insurance, costOverridesB.insurance),
    fuel: costsB.fuel,
    maintenance: costOverridesB.maintenance !== undefined 
      ? costOverridesB.maintenance / 12 
      : (costsB.maintenance + costsB.revision),
    licensing: getEffectiveCost(costsB.licensing, costOverridesB.licensing),
    tires: getEffectiveCost(costsB.tires, costOverridesB.tires),
    depreciation: getEffectiveCost(depreciationMonthlyB, costOverridesB.depreciation),
    opportunityCost: getEffectiveCost(costsB.opportunityCost, costOverridesB.opportunityCost),
  }), [costsB, costOverridesB, depreciationMonthlyB, getEffectiveCost]);

  // Projeção de depreciação - Usa CURVA V6 (pontos de projeção) quando disponível
  // Isso garante consistência total com o simulador "Custo do seu carro"
  const depreciationData = useMemo((): DepreciationProjection[] => {
    if (valueA === 0 || valueB === 0) return [];

    const projections: DepreciationProjection[] = [];
    const years = [1, 2, 3, 5, 10];
    
    // Função auxiliar para obter valor projetado da curva V6 ou calcular via taxa
    const getProjectedValue = (
      initialValue: number,
      vehicleAge: number,
      targetYear: number,
      hasV6: boolean,
      engineResult: typeof depreciationEngineA.result,
      rate: number
    ): { value: number; totalDep: number } => {
      // Tentar usar pontos da curva V6
      if (hasV6 && engineResult?.curve) {
        const curve = engineResult.curve;
        const currentAge = engineResult.currentAge ?? 0;
        const targetAge = currentAge + targetYear;
        
        const targetPoint = curve.find(p => p.age === targetAge);
        if (targetPoint) {
          const totalDep = initialValue - targetPoint.price;
          return { value: targetPoint.price, totalDep: Math.max(0, totalDep) };
        }
        
        // Se ponto não encontrado na curva, extrapolar a partir do último ponto disponível
        const lastProjectedPoint = [...curve]
          .filter(p => p.age > currentAge)
          .sort((a, b) => b.age - a.age)[0];
        
        if (lastProjectedPoint) {
          // Calcular anos restantes após o último ponto da curva
          const yearsAfterLast = targetAge - lastProjectedPoint.age;
          if (yearsAfterLast > 0) {
            // Usar taxa reduzida para anos após a curva (veículos mais velhos depreciam menos)
            const latePhaseRate = rate * 0.6;
            let projectedValue = lastProjectedPoint.price;
            for (let i = 0; i < yearsAfterLast; i++) {
              projectedValue *= (1 - latePhaseRate);
            }
            const totalDep = initialValue - projectedValue;
            return { value: projectedValue, totalDep: Math.max(0, totalDep) };
          }
        }
      }
      
      // Fallback: cálculo via taxa estática
      let currentValue = initialValue;
      let totalDep = 0;
      
      for (let year = 1; year <= targetYear; year++) {
        const ageAtYear = vehicleAge + year;
        const yearRate = year <= 5 ? rate : rate * 0.6;
        const dep = currentValue * yearRate;
        currentValue -= dep;
        totalDep += dep;
      }
      
      return { value: currentValue, totalDep };
    };
    
    for (const year of years) {
      const projA = getProjectedValue(
        valueA, 
        configA.vehicleAge, 
        year, 
        hasV6ResultA, 
        depreciationEngineA.result, 
        depreciationRateA
      );
      
      const projB = getProjectedValue(
        valueB, 
        configB.vehicleAge, 
        year, 
        hasV6ResultB, 
        depreciationEngineB.result, 
        depreciationRateB
      );
      
      projections.push({
        year,
        valueA: projA.value,
        valueB: projB.value,
        depreciationA: projA.totalDep,
        depreciationB: projB.totalDep,
      });
    }

    return projections;
  }, [valueA, valueB, configA.vehicleAge, configB.vehicleAge, depreciationRateA, depreciationRateB, hasV6ResultA, hasV6ResultB, depreciationEngineA.result, depreciationEngineB.result]);

  // Custo total de propriedade (TCO)
  const calculateTCO = (value: number, costs: VehicleCosts, depreciation: number, years: number): number => {
    return (costs.totalAnnual * years) + depreciation;
  };

  // TCO para múltiplos horizontes de tempo
  const tcoHorizons = useMemo(() => {
    const horizons = [1, 2, 3, 5, 10];
    return horizons.map(years => {
      const dataA = depreciationData.find(d => d.year === years);
      const dataB = depreciationData.find(d => d.year === years);
      
      const tcoA = dataA ? calculateTCO(valueA, costsA, dataA.depreciationA, years) : 0;
      const tcoB = dataB ? calculateTCO(valueB, costsB, dataB.depreciationB, years) : 0;
      
      const depA = dataA?.depreciationA || 0;
      const depB = dataB?.depreciationB || 0;
      
      const winner = tcoA < tcoB ? 'A' : tcoB < tcoA ? 'B' : null;
      const savings = Math.abs(tcoA - tcoB);
      
      return {
        years,
        tcoA,
        tcoB,
        depreciationA: depA,
        depreciationB: depB,
        winner,
        savings,
        savingsMonthly: savings / (years * 12),
      };
    });
  }, [depreciationData, valueA, valueB, costsA, costsB]);

  const tco5YearsA = depreciationData.find(d => d.year === 5);
  const tco5YearsB = depreciationData.find(d => d.year === 5);
  
  const totalTcoA = tco5YearsA ? calculateTCO(valueA, costsA, tco5YearsA.depreciationA, 5) : 0;
  const totalTcoB = tco5YearsB ? calculateTCO(valueB, costsB, tco5YearsB.depreciationB, 5) : 0;

  const winner = totalTcoA < totalTcoB ? 'A' : totalTcoB < totalTcoA ? 'B' : null;
  const savingsAmount = Math.abs(totalTcoA - totalTcoB);
  const savingsMonthly = savingsAmount / 60;

  // Selected horizon for detailed view
  const [selectedTcoHorizon, setSelectedTcoHorizon] = useState<number>(5);

  // Chart data - synchronized with costProjectionPeriod
  const costComparisonData = useMemo(() => {
    const multiplier = costProjectionPeriod === 'annual' ? 12 : 1;
    return [
      { name: 'IPVA', carroA: costsA.ipva * multiplier, carroB: costsB.ipva * multiplier },
      { name: 'Seguro', carroA: costsA.insurance * multiplier, carroB: costsB.insurance * multiplier },
      { name: 'Combustível', carroA: costsA.fuel * multiplier, carroB: costsB.fuel * multiplier },
      { name: 'Rev./Manut.', carroA: (costsA.maintenance + costsA.revision) * multiplier, carroB: (costsB.maintenance + costsB.revision) * multiplier },
      { name: 'Licenciamento', carroA: costsA.licensing * multiplier, carroB: costsB.licensing * multiplier },
      { name: 'Pneus', carroA: costsA.tires * multiplier, carroB: costsB.tires * multiplier },
      { name: 'Estacionamento', carroA: configA.monthlyParking * multiplier, carroB: configB.monthlyParking * multiplier },
      { name: 'Pedágio', carroA: configA.monthlyTolls * multiplier, carroB: configB.monthlyTolls * multiplier },
      { name: 'Limpeza', carroA: configA.monthlyWashing * multiplier, carroB: configB.monthlyWashing * multiplier },
      { name: 'Depreciação', carroA: depreciationMonthlyA * multiplier, carroB: depreciationMonthlyB * multiplier },
      { name: 'Custo Oportunidade', carroA: costsA.opportunityCost * multiplier, carroB: costsB.opportunityCost * multiplier },
    ];
  }, [costsA, costsB, costProjectionPeriod, depreciationMonthlyA, depreciationMonthlyB, configA.monthlyParking, configA.monthlyTolls, configA.monthlyWashing, configB.monthlyParking, configB.monthlyTolls, configB.monthlyWashing]);

  const depreciationChartData = depreciationData.map(d => ({
    name: `${d.year}A`,
    carroA: d.valueA,
    carroB: d.valueB,
  }));

  // ============================================================================
  // HELP DIALOG STATE - Controlled dialogs para funcionar em grid layouts
  // ============================================================================
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const openHelpDialog = useCallback((key: string) => {
    setOpenDialog(key);
  }, []);

  // Componente HelpButton reutilizável (igual ao FipeOwnershipCostCard)
  const HelpButton: React.FC<{ dialogKey: string }> = ({ dialogKey }) => (
    <button 
      type="button" 
      className="relative z-10 pointer-events-auto inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted transition-colors ml-1"
      onPointerDown={(e) => {
        // Abrimos de forma assíncrona para evitar que o mesmo gesto seja interpretado
        // como "pointerDownOutside" (isso causa o piscar abre/fecha).
        // Além disso, em alguns grids o onClick pode ser cancelado.
        e.preventDefault();
        e.stopPropagation();

        window.setTimeout(() => openHelpDialog(dialogKey), 0);
      }}
      onClick={(e) => {
        // Evita duplo disparo (pointerdown + click)
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Evita scroll da página ao apertar espaço
          e.preventDefault();
          e.stopPropagation();
          openHelpDialog(dialogKey);
        }
      }}
      aria-label="Ajuda"
    >
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
    </button>
  );

  // Helper to get primary fuel type for IPVA calculations (for CarComparisonHelpDialogs)
  const getPrimaryFuelTypeForDialogs = useCallback((fuelRows: Array<{ fuelType: string; percentage: number }>): string => {
    const sorted = [...fuelRows].sort((a, b) => b.percentage - a.percentage);
    return sorted[0]?.fuelType || 'gasoline';
  }, []);

  // CostRow para mobile - com suporte a edição
  const CostRow: React.FC<{
    label: string; 
    icon: React.ReactNode;
    valueA: number; 
    valueB: number;
    helpButton?: React.ReactNode;
    costKey?: string;
    suggestedA?: number;
    suggestedB?: number;
    onOverrideA?: (v: number | undefined) => void;
    onOverrideB?: (v: number | undefined) => void;
    isOverriddenA?: boolean;
    isOverriddenB?: boolean;
  }> = ({ label, icon, valueA, valueB, helpButton, costKey, suggestedA, suggestedB, onOverrideA, onOverrideB, isOverriddenA, isOverriddenB }) => {
    const diff = valueA - valueB;
    const betterA = diff < 0;
    const betterB = diff > 0;
    
    return (
      <div className="flex items-center justify-between py-1.5 border-b last:border-0">
        <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
          {icon}
          <span className="truncate">{label}</span>
          {helpButton}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn(
            "font-medium w-[70px] text-right tabular-nums",
            betterA && "text-green-600",
            isOverriddenA && "underline decoration-dotted decoration-primary"
          )}>
            {formatNumber(valueA)}
          </span>
          <span className={cn(
            "font-medium w-[70px] text-right tabular-nums",
            betterB && "text-green-600",
            isOverriddenB && "underline decoration-dotted decoration-primary"
          )}>
            {formatNumber(valueB)}
          </span>
        </div>
      </div>
    );
  };

  // Nova versão com gráfico inline - com suporte a edição
  const CostRowWithChart: React.FC<{
    label: React.ReactNode;
    icon: React.ReactNode;
    valueA: number; 
    valueB: number;
    maxValue: number;
    helpButton?: React.ReactNode;
    costKey?: string;
    suggestedA?: number;
    suggestedB?: number;
    onOverrideA?: (v: number | undefined) => void;
    onOverrideB?: (v: number | undefined) => void;
    isOverriddenA?: boolean;
    isOverriddenB?: boolean;
  }> = ({ label, icon, valueA, valueB, maxValue, helpButton, costKey, suggestedA, suggestedB, onOverrideA, onOverrideB, isOverriddenA, isOverriddenB }) => {
    const betterA = valueA < valueB;
    const betterB = valueB < valueA;
    const widthA = maxValue > 0 ? (valueA / maxValue) * 100 : 0;
    const widthB = maxValue > 0 ? (valueB / maxValue) * 100 : 0;
    
    return (
      <div className="grid grid-cols-[1fr,100px,100px,1fr] gap-2 py-2 border-b last:border-0 items-center px-4 sm:px-0">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {icon}
          <span className="truncate">{label}</span>
          {helpButton}
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className={cn(
            "font-medium text-sm",
            betterA && "text-green-600",
            isOverriddenA && "underline decoration-dotted decoration-primary"
          )}>
            {formatMoney(valueA)}
          </span>
          {isOverriddenA && onOverrideA && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onOverrideA(undefined)}
                    className="p-0.5 hover:bg-muted rounded transition-colors text-primary"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Restaurar estimativa ({formatMoney(suggestedA || 0)})
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className={cn(
            "font-medium text-sm",
            betterB && "text-green-600",
            isOverriddenB && "underline decoration-dotted decoration-primary"
          )}>
            {formatMoney(valueB)}
          </span>
          {isOverriddenB && onOverrideB && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onOverrideB(undefined)}
                    className="p-0.5 hover:bg-muted rounded transition-colors text-primary"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Restaurar estimativa ({formatMoney(suggestedB || 0)})
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div 
            className="h-3 bg-blue-500 rounded-r transition-all duration-300"
            style={{ width: `${Math.max(widthA, 2)}%` }}
          />
          <div 
            className="h-3 bg-amber-500 rounded-r transition-all duration-300"
            style={{ width: `${Math.max(widthB, 2)}%` }}
          />
        </div>
      </div>
    );
  };

  // Calcular valor máximo para escala do gráfico inline
  const maxCostValue = useMemo(() => {
    const multiplier = costProjectionPeriod === 'annual' ? 12 : 1;
    const values = [
      costsA.ipva * multiplier,
      costsB.ipva * multiplier,
      costsA.insurance * multiplier,
      costsB.insurance * multiplier,
      costsA.fuel * multiplier,
      costsB.fuel * multiplier,
      (costsA.maintenance + costsA.revision) * multiplier,
      (costsB.maintenance + costsB.revision) * multiplier,
      costsA.licensing * multiplier,
      costsB.licensing * multiplier,
      costsA.tires * multiplier,
      costsB.tires * multiplier,
      configA.monthlyParking * multiplier,
      configB.monthlyParking * multiplier,
      configA.monthlyTolls * multiplier,
      configB.monthlyTolls * multiplier,
      depreciationMonthlyA * multiplier,
      depreciationMonthlyB * multiplier,
      costsA.opportunityCost * multiplier,
      costsB.opportunityCost * multiplier,
    ];
    return Math.max(...values);
  }, [costsA, costsB, costProjectionPeriod, depreciationMonthlyA, depreciationMonthlyB, configA.monthlyParking, configA.monthlyTolls, configB.monthlyParking, configB.monthlyTolls]);

  const hasBothValues = valueA > 0 && valueB > 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Comparativo: Carro A x Carro B
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Compare dois veículos e descubra qual é financeiramente mais vantajoso
          </p>
        </div>

        {/* Resumo Executivo removed - now appears after "Decisão financeira em 5 anos" */}

        {/* Configuração dos veículos */}
        <div className="space-y-4">
          {/* Car A - always visible */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 text-[10px]">
                  PASSO 1
                </Badge>
                <span>Configure o primeiro veículo</span>
              </div>
              <VehicleConfigCardV2
                label="A"
                color="A"
                fipe={fipeA}
                config={configA}
                onConfigChange={(updates) => setConfigA(prev => ({ ...prev, ...updates }))}
                consumptionHook={consumptionHookA}
                divergentFields={isCarBUnlocked && valueB > 0 ? getDivergentFields(configA, configB).fields : undefined}
                showSyncButtons={isCarBUnlocked && valueB > 0}
                onSyncField={handleSyncFieldToA}
                hideCostParameters
                {...fipeFavoritesA}
              />
            </div>
            
            {/* Car B - locked until A has value */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px]",
                    isCarBUnlocked 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  PASSO 2
                </Badge>
                <span>{isCarBUnlocked ? 'Configure o segundo veículo' : 'Selecione o Carro A primeiro'}</span>
              </div>
              <div className={cn(
                "transition-all duration-300",
                !isCarBUnlocked && "opacity-50 pointer-events-none"
              )}>
                <VehicleConfigCardV2
                  label="B"
                  color="B"
                  fipe={fipeB}
                  config={configB}
                  onConfigChange={(updates) => setConfigB(prev => ({ ...prev, ...updates }))}
                  consumptionHook={consumptionHookB}
                  divergentFields={isCarBUnlocked && valueB > 0 ? getDivergentFields(configA, configB).fields : undefined}
                  showSyncButtons={isCarBUnlocked && valueB > 0}
                  onSyncField={handleSyncFieldToB}
                  hideCostParameters
                  {...fipeFavoritesB}
                />
              </div>
            </div>
          </div>
          
        </div>

        {/* Histórico FIPE - Combined chart */}
        {(fipeA.price || fipeB.price) &&
          ((!configA.isZeroKm && (fipeHistoryA.hasHistory || fipeHistoryA.loading)) ||
            (!configB.isZeroKm && (fipeHistoryB.hasHistory || fipeHistoryB.loading)) ||
            (configA.isZeroKm && valueA > 0 && !!fipeA.price) ||
            (configB.isZeroKm && valueB > 0 && !!fipeB.price)) && (
          <MobileSectionDrawer
            title="Histórico FIPE"
            icon={<BarChart3 className="h-4 w-4 text-primary" />}
            isTabletOrMobile={isTabletOrMobile}
          >
            <div className="space-y-3">
              <FipeHistoryComparisonChart
                historyA={chartDataA}
                historyB={chartDataB}
                loadingA={!configA.isZeroKm && !!fipeA.price?.CodigoFipe && fipeHistoryA.loading}
                loadingB={!configB.isZeroKm && !!fipeB.price?.CodigoFipe && fipeHistoryB.loading}
                nameA={fipeA.price ? `${fipeA.price.Marca} ${fipeA.price.Modelo}` : 'Carro A'}
                nameB={fipeB.price ? `${fipeB.price.Marca} ${fipeB.price.Modelo}` : 'Carro B'}
                hasHistoryA={chartDataA.length > 0}
                hasHistoryB={chartDataB.length > 0}
                showProjection={showProjectionAB}
                hasZeroKmVehicle={hasZeroKmVehicle}
                projectionControl={
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Switch
                      id="show-projection-ab"
                      checked={showProjectionAB}
                      onCheckedChange={(val) => {
                        if (!hasZeroKmVehicle) setShowProjectionAB(val);
                      }}
                      disabled={hasZeroKmVehicle}
                    />
                    <label
                      htmlFor="show-projection-ab"
                      className={cn('cursor-pointer', hasZeroKmVehicle && 'text-muted-foreground')}
                    >
                      Mostrar projeção
                    </label>
                    {hasZeroKmVehicle && (
                      <span className="text-xs text-muted-foreground">
                        (obrigatório quando há veículo 0 km)
                      </span>
                    )}
                  </div>
                }
              />
            </div>
          </MobileSectionDrawer>
        )}

        {hasBothValues && (
          <>
            {/* Projeção de Depreciação */}
            <MobileSectionDrawer
              title="Projeção de Depreciação"
              icon={<TrendingDown className="h-4 w-4 text-primary" />}
              isTabletOrMobile={isTabletOrMobile}
            >
              <DepreciationComparisonSection
                valueA={valueA}
                valueB={valueB}
                depreciationData={depreciationData}
                hasV6ResultA={hasV6ResultA}
                hasV6ResultB={hasV6ResultB}
              />
            </MobileSectionDrawer>

            {/* Comparativo de custos detalhados */}
            <MobileSectionDrawer
              title="Custos Detalhados"
              icon={<Calculator className="h-4 w-4 text-primary" />}
              isTabletOrMobile={isTabletOrMobile}
            >
              {/* Summary + Personalizar parâmetros button */}
              <div className="space-y-3 mb-6">
                {/* Compact summary */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Estado (IPVA)
                    </span>
                    <span className="font-medium">{configA.vehicleState} ({statesList.find(s => s.uf === configA.vehicleState)?.rate}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Fuel className="h-3 w-3" /> Combustível
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
                        <strong>{formatMoney(configA.calculatedFuelCost || 0)}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
                        <strong>{formatMoney(configB.calculatedFuelCost || 0)}</strong>
                      </span>
                    </div>
                  </div>
                  {(configA.monthlyParking > 0 || configB.monthlyParking > 0 || configA.monthlyTolls > 0 || configB.monthlyTolls > 0 || configA.monthlyWashing > 0 || configB.monthlyWashing > 0) && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ParkingCircle className="h-3 w-3" /> Custos adicionais
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
                          <strong>{formatMoney((configA.monthlyParking || 0) + (configA.monthlyTolls || 0) + (configA.monthlyWashing || 0))}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
                          <strong>{formatMoney((configB.monthlyParking || 0) + (configB.monthlyTolls || 0) + (configB.monthlyWashing || 0))}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Km mismatch alert - compact */}
                  {configA.totalMonthlyKm !== configB.totalMonthlyKm && (
                    <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/30">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      <p className="text-[10px] text-destructive">
                        Km divergente: A={configA.totalMonthlyKm.toLocaleString('pt-BR')} ≠ B={configB.totalMonthlyKm.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowParamsDialog(true)}
                  className="w-full gap-2 text-xs bg-background hover:bg-primary hover:text-primary-foreground transition-colors border-primary/30 text-primary font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Personalizar parâmetros
                </Button>
              </div>

              {/* Parameters Dialog */}
              <Dialog open={showParamsDialog} onOpenChange={setShowParamsDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Pencil className="h-5 w-5 text-primary" />
                      Personalizar Parâmetros
                    </DialogTitle>
                    <DialogDescription>
                      Ajuste estado, combustível e custos adicionais para cada veículo
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 pt-2">
                    {/* Estado (IPVA) */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                          Estado (IPVA)
                          <Badge variant="outline" className="text-[10px] px-1 py-0">A→B</Badge>
                        </label>
                        <Select value={configA.vehicleState} onValueChange={(v) => {
                          setConfigA(prev => ({ ...prev, vehicleState: v }));
                          setConfigB(prev => ({ ...prev, vehicleState: v }));
                        }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statesList.map(s => (
                              <SelectItem key={s.uf} value={s.uf} className="text-xs">
                                {s.uf} ({s.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Parâmetros de Combustível */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Parâmetros de Combustível</span>
                      </div>

                      {/* Km mismatch alert */}
                      {configA.totalMonthlyKm !== configB.totalMonthlyKm && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-medium text-destructive">Quilometragem divergente</p>
                            <p className="text-muted-foreground mt-0.5">
                              Carro A: <strong>{configA.totalMonthlyKm.toLocaleString('pt-BR')} km/mês</strong> ≠ Carro B: <strong>{configB.totalMonthlyKm.toLocaleString('pt-BR')} km/mês</strong>.
                              Para uma comparação justa, a quilometragem mensal deve ser igual.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 text-[10px]">A</Badge>
                          Combustível - Carro A
                        </div>
                        <FuelParametersTable
                          yearLabel={formatFipeYearName(fipeA.years.find(y => y.codigo === fipeA.selectedYear)?.nome || 'Flex')}
                          consumptionSuggestion={consumptionHookA.suggestion}
                          consumptionLoading={consumptionHookA.loading}
                          initialMonthlyKm={configA.totalMonthlyKm || 1000}
                          onChange={(totalKm, totalCost, fuelRows) => {
                            setConfigA(prev => ({ ...prev, totalMonthlyKm: totalKm, calculatedFuelCost: totalCost, fuelRows }));
                          }}
                          persistedData={{
                            fuelRows: configA.fuelRows,
                            totalMonthlyKm: configA.totalMonthlyKm,
                          }}
                        />
                      </div>
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 text-[10px]">B</Badge>
                          Combustível - Carro B
                        </div>
                        <FuelParametersTable
                          yearLabel={formatFipeYearName(fipeB.years.find(y => y.codigo === fipeB.selectedYear)?.nome || 'Flex')}
                          consumptionSuggestion={consumptionHookB.suggestion}
                          consumptionLoading={consumptionHookB.loading}
                          initialMonthlyKm={configB.totalMonthlyKm || 1000}
                          onChange={(totalKm, totalCost, fuelRows) => {
                            setConfigB(prev => ({ ...prev, totalMonthlyKm: totalKm, calculatedFuelCost: totalCost, fuelRows }));
                          }}
                          persistedData={{
                            fuelRows: configB.fuelRows,
                            totalMonthlyKm: configB.totalMonthlyKm,
                          }}
                        />
                      </div>
                    </div>

                    {/* Custos adicionais (opcionais) */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <ParkingCircle className="h-4 w-4 text-primary" />
                        Custos adicionais (opcionais)
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <ParkingCircle className="h-3 w-3" />
                            Estacion./mês
                          </Label>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
                              <CurrencyInput value={configA.monthlyParking} onChange={(v) => setConfigA(prev => ({ ...prev, monthlyParking: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
                              <CurrencyInput value={configB.monthlyParking} onChange={(v) => setConfigB(prev => ({ ...prev, monthlyParking: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <Milestone className="h-3 w-3" />
                            Pedágio/mês
                          </Label>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
                              <CurrencyInput value={configA.monthlyTolls} onChange={(v) => setConfigA(prev => ({ ...prev, monthlyTolls: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
                              <CurrencyInput value={configB.monthlyTolls} onChange={(v) => setConfigB(prev => ({ ...prev, monthlyTolls: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <Droplets className="h-3 w-3" />
                            Limpeza/mês
                          </Label>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
                              <CurrencyInput value={configA.monthlyWashing} onChange={(v) => setConfigA(prev => ({ ...prev, monthlyWashing: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
                              <CurrencyInput value={configB.monthlyWashing} onChange={(v) => setConfigB(prev => ({ ...prev, monthlyWashing: v || 0 }))} className="h-7 text-xs" placeholder="0,00" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sync buttons */}
                      <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1.5 text-xs border-blue-500/30 hover:bg-blue-500/10"
                                onClick={handleSyncBtoA}
                              >
                                <Copy className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Copiar parâmetros</span> A → B
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copiar Estado, km, combustível, pedágio, estac. e limpeza de A para B</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                        
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1.5 text-xs border-amber-500/30 hover:bg-amber-500/10"
                                onClick={handleSyncAtoB}
                              >
                                B → A <span className="hidden sm:inline">Copiar parâmetros</span>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copiar Estado, km, combustível, pedágio, estac. e limpeza de B para A</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Comparativo de custos */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardDescription className="text-xs">
                      Comparativo de despesas recorrentes
                    </CardDescription>
                  <div className="flex items-center gap-2">
                    {/* Toggle Tabela/Gráfico - só no mobile */}
                    <div className="flex sm:hidden items-center gap-1 bg-muted rounded-full p-1">
                      <Button
                        variant={mobileViewMode === 'chart' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full"
                        onClick={() => setMobileViewMode('chart')}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={mobileViewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full"
                        onClick={() => setMobileViewMode('table')}
                      >
                        <Table2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                      <Button
                        variant={costProjectionPeriod === 'annual' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 px-3 rounded-full text-xs"
                        onClick={() => setCostProjectionPeriod('annual')}
                      >
                        Anual
                      </Button>
                      <Button
                        variant={costProjectionPeriod === 'monthly' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 px-3 rounded-full text-xs"
                        onClick={() => setCostProjectionPeriod('monthly')}
                      >
                        Mensal
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {/* Versão Desktop: Tabela + Gráfico integrado */}
                <div className="hidden sm:block">
                  {/* Header da tabela */}
                    <div className="grid grid-cols-[1fr,100px,100px,1fr] gap-2 px-4 sm:px-0 mb-2">
                    <div />
                    <div className="text-center">
                      <div className="text-xs font-medium text-blue-600">Carro A</div>
                      {modelNameA && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={`${modelNameA} ${yearLabelA}`}>
                          {modelNameA}
                        </div>
                      )}
                      {yearLabelA && (
                        <div className="text-[9px] text-muted-foreground/70">{yearLabelA}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-amber-600">Carro B</div>
                      {modelNameB && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={`${modelNameB} ${yearLabelB}`}>
                          {modelNameB}
                        </div>
                      )}
                      {yearLabelB && (
                        <div className="text-[9px] text-muted-foreground/70">{yearLabelB}</div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground text-center">Comparativo Visual</div>
                  </div>

                  {/* Linhas de custo com gráfico inline */}
                  <div className="space-y-0">
                    <CostRowWithChart 
                      label={
                        <span className="flex items-center gap-1.5">
                          IPVA
                          {(() => {
                            const fuelTypeA = getPrimaryFuelType(configA.fuelRows);
                            const fuelTypeB = getPrimaryFuelType(configB.fuelRows);
                            const ipvaA = calculateMonthlyIPVAWithBenefits(valueA, configA.vehicleState, fuelTypeA);
                            const ipvaB = calculateMonthlyIPVAWithBenefits(valueB, configB.vehicleState, fuelTypeB);
                            if (ipvaA.hasExemption || ipvaB.hasExemption || ipvaA.discount > 0 || ipvaB.discount > 0) {
                              return (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[9px] px-1 py-0">
                                  {ipvaA.hasExemption || ipvaB.hasExemption ? 'ISENÇÃO' : 'DESCONTO'}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </span>
                      }
                      icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? costsA.ipva * 12 : costsA.ipva} 
                      valueB={costProjectionPeriod === 'annual' ? costsB.ipva * 12 : costsB.ipva}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="ipva" />}
                    />
                    <CostRowWithChart 
                      label="Seguro" 
                      icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? effectiveCostsA.insurance * 12 : effectiveCostsA.insurance} 
                      valueB={costProjectionPeriod === 'annual' ? effectiveCostsB.insurance * 12 : effectiveCostsB.insurance}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="insurance" />}
                      isOverriddenA={costOverridesA.insurance !== undefined}
                      isOverriddenB={costOverridesB.insurance !== undefined}
                      suggestedA={costsA.insurance * 12}
                      suggestedB={costsB.insurance * 12}
                      onOverrideA={(v) => handleCostOverrideA('insurance', v)}
                      onOverrideB={(v) => handleCostOverrideB('insurance', v)}
                    />
                    <CostRowWithChart 
                      label="Combustível" 
                      icon={<Fuel className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? costsA.fuel * 12 : costsA.fuel} 
                      valueB={costProjectionPeriod === 'annual' ? costsB.fuel * 12 : costsB.fuel}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="fuel" />}
                    />
                    <CostRowWithChart 
                      label="Revisão/Manutenção" 
                      icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? effectiveCostsA.maintenance * 12 : effectiveCostsA.maintenance} 
                      valueB={costProjectionPeriod === 'annual' ? effectiveCostsB.maintenance * 12 : effectiveCostsB.maintenance}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="maintenance" />}
                      isOverriddenA={costOverridesA.maintenance !== undefined}
                      isOverriddenB={costOverridesB.maintenance !== undefined}
                      suggestedA={(costsA.maintenance + costsA.revision) * 12}
                      suggestedB={(costsB.maintenance + costsB.revision) * 12}
                      onOverrideA={(v) => handleCostOverrideA('maintenance', v)}
                      onOverrideB={(v) => handleCostOverrideB('maintenance', v)}
                    />
                    <CostRowWithChart 
                      label="Licenciamento" 
                      icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? costsA.licensing * 12 : costsA.licensing} 
                      valueB={costProjectionPeriod === 'annual' ? costsB.licensing * 12 : costsB.licensing}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="licensing" />}
                    />
                    <CostRowWithChart 
                      label="Pneus" 
                      icon={<Circle className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? costsA.tires * 12 : costsA.tires} 
                      valueB={costProjectionPeriod === 'annual' ? costsB.tires * 12 : costsB.tires}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="tires" />}
                    />
                    <CostRowWithChart 
                      label="Estacionamento" 
                      icon={<ParkingCircle className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? configA.monthlyParking * 12 : configA.monthlyParking} 
                      valueB={costProjectionPeriod === 'annual' ? configB.monthlyParking * 12 : configB.monthlyParking}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="parking" />}
                    />
                    <CostRowWithChart 
                      label="Pedágio/Sem Parar" 
                      icon={<Milestone className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? configA.monthlyTolls * 12 : configA.monthlyTolls} 
                      valueB={costProjectionPeriod === 'annual' ? configB.monthlyTolls * 12 : configB.monthlyTolls}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="tolls" />}
                    />
                    <CostRowWithChart 
                      label="Limpeza" 
                      icon={<Droplets className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? configA.monthlyWashing * 12 : configA.monthlyWashing} 
                      valueB={costProjectionPeriod === 'annual' ? configB.monthlyWashing * 12 : configB.monthlyWashing}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="cleaning" />}
                    />
                    <CostRowWithChart 
                      label={
                        <span className="flex items-center gap-1.5">
                          Depreciação
                          {(hasV6ResultA || hasV6ResultB) && (
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="h-4 px-1 text-[9px] bg-primary/20 text-primary border-0 cursor-help">
                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                    IA
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  Calculado com regressão sobre histórico FIPE real do modelo
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          )}
                        </span>
                      }
                      icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                      valueA={costProjectionPeriod === 'annual' ? effectiveCostsA.depreciation * 12 : effectiveCostsA.depreciation} 
                      valueB={costProjectionPeriod === 'annual' ? effectiveCostsB.depreciation * 12 : effectiveCostsB.depreciation}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="depreciation" />}
                      isOverriddenA={costOverridesA.depreciation !== undefined}
                      isOverriddenB={costOverridesB.depreciation !== undefined}
                      suggestedA={depreciationMonthlyA * 12}
                      suggestedB={depreciationMonthlyB * 12}
                      onOverrideA={(v) => handleCostOverrideA('depreciation', v)}
                      onOverrideB={(v) => handleCostOverrideB('depreciation', v)}
                    />
                    <CostRowWithChart 
                      label="Custo Oportunidade" 
                      icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                      valueA={costProjectionPeriod === 'annual' ? costsA.opportunityCost * 12 : costsA.opportunityCost} 
                      valueB={costProjectionPeriod === 'annual' ? costsB.opportunityCost * 12 : costsB.opportunityCost}
                      maxValue={maxCostValue}
                      helpButton={<HelpButton dialogKey="opportunityCost" />}
                    />
                  </div>
                  
                  {/* Total */}
                  <div className="grid grid-cols-[1fr,100px,100px,1fr] gap-2 px-4 sm:px-0 pt-3 mt-2 border-t-2 items-center">
                    <span className="font-semibold text-sm">Total {costProjectionPeriod === 'annual' ? 'Anual' : 'Mensal'}</span>
                    <span className={cn(
                      "font-bold text-sm text-center",
                      costsA.totalMonthly < costsB.totalMonthly ? "text-green-600" : ""
                    )}>
                      {formatMoney(costProjectionPeriod === 'annual' ? costsA.totalMonthly * 12 : costsA.totalMonthly)}
                    </span>
                    <span className={cn(
                      "font-bold text-sm text-center",
                      costsB.totalMonthly < costsA.totalMonthly ? "text-green-600" : ""
                    )}>
                      {formatMoney(costProjectionPeriod === 'annual' ? costsB.totalMonthly * 12 : costsB.totalMonthly)}
                    </span>
                    <div className="flex items-center gap-2 pl-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-sm bg-blue-500" /> Carro A
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-sm bg-amber-500" /> Carro B
                      </div>
                    </div>
                  </div>
                </div>

                {/* Versão Mobile: Gráfico OU Tabela */}
                <div className="sm:hidden">
                  {mobileViewMode === 'chart' ? (
                    <>
                      {/* Header com totais */}
                      <div className="flex items-center justify-around px-4 py-3 border-b bg-muted/30">
                        <div className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-3 h-3 rounded-sm bg-blue-500" />
                            <span className="text-xs text-muted-foreground">Carro A</span>
                          </div>
                          {modelNameA && <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{modelNameA}</div>}
                          {yearLabelA && <div className="text-[9px] text-muted-foreground/70">{yearLabelA}</div>}
                          <p className={cn(
                            "font-bold text-lg",
                            costsA.totalMonthly < costsB.totalMonthly ? "text-green-600" : ""
                          )}>
                            {formatMoney(costProjectionPeriod === 'annual' ? costsA.totalMonthly * 12 : costsA.totalMonthly)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-3 h-3 rounded-sm bg-amber-500" />
                            <span className="text-xs text-muted-foreground">Carro B</span>
                          </div>
                          {modelNameB && <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{modelNameB}</div>}
                          {yearLabelB && <div className="text-[9px] text-muted-foreground/70">{yearLabelB}</div>}
                          <p className={cn(
                            "font-bold text-lg",
                            costsB.totalMonthly < costsA.totalMonthly ? "text-green-600" : ""
                          )}>
                            {formatMoney(costProjectionPeriod === 'annual' ? costsB.totalMonthly * 12 : costsB.totalMonthly)}
                          </p>
                        </div>
                      </div>
                      {/* Gráfico de barras horizontal */}
                      <div className="h-[350px] px-2 py-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={costComparisonData} layout="vertical">
                            <CartesianGrid {...premiumGrid} horizontal={true} />
                            <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} {...premiumXAxis} />
                            <YAxis hide={isMobile} type="category" dataKey="name" {...premiumYAxis} width={60} />
                            <Tooltip 
                              formatter={(value: number) => formatMoney(value)}
                              contentStyle={premiumTooltipStyle.contentStyle}
                              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Bar dataKey="carroA" name="Carro A" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="carroB" name="Carro B" fill="hsl(43, 96%, 56%)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Tabela mobile */}
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2 mb-2 text-[10px] font-medium text-muted-foreground">
                          <div className="text-blue-600 w-[70px] text-right">
                            <div>R$ Carro A</div>
                            {modelNameA && <div className="text-[9px] font-normal truncate">{modelNameA}</div>}
                          </div>
                          <div className="text-amber-600 w-[70px] text-right">
                            <div>R$ Carro B</div>
                            {modelNameB && <div className="text-[9px] font-normal truncate">{modelNameB}</div>}
                          </div>
                        </div>
                        <CostRow 
                          label="IPVA" 
                          icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? costsA.ipva * 12 : costsA.ipva} 
                          valueB={costProjectionPeriod === 'annual' ? costsB.ipva * 12 : costsB.ipva}
                          helpButton={<HelpButton dialogKey="ipva" />}
                        />
                        <CostRow 
                          label="Seguro" 
                          icon={<Shield className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? costsA.insurance * 12 : costsA.insurance} 
                          valueB={costProjectionPeriod === 'annual' ? costsB.insurance * 12 : costsB.insurance}
                          helpButton={<HelpButton dialogKey="insurance" />}
                        />
                        <CostRow 
                          label="Combustível" 
                          icon={<Fuel className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? costsA.fuel * 12 : costsA.fuel} 
                          valueB={costProjectionPeriod === 'annual' ? costsB.fuel * 12 : costsB.fuel}
                          helpButton={<HelpButton dialogKey="fuel" />}
                        />
                        <CostRow 
                          label="Rev./Manut." 
                          icon={<Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? (costsA.maintenance + costsA.revision) * 12 : costsA.maintenance + costsA.revision} 
                          valueB={costProjectionPeriod === 'annual' ? (costsB.maintenance + costsB.revision) * 12 : costsB.maintenance + costsB.revision}
                          helpButton={<HelpButton dialogKey="maintenance" />}
                        />
                        <CostRow 
                          label="Licenciamento" 
                          icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? costsA.licensing * 12 : costsA.licensing} 
                          valueB={costProjectionPeriod === 'annual' ? costsB.licensing * 12 : costsB.licensing}
                          helpButton={<HelpButton dialogKey="licensing" />}
                        />
                        <CostRow 
                          label="Pneus" 
                          icon={<Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? costsA.tires * 12 : costsA.tires} 
                          valueB={costProjectionPeriod === 'annual' ? costsB.tires * 12 : costsB.tires}
                          helpButton={<HelpButton dialogKey="tires" />}
                        />
                        <CostRow 
                          label="Estacion." 
                          icon={<ParkingCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? configA.monthlyParking * 12 : configA.monthlyParking} 
                          valueB={costProjectionPeriod === 'annual' ? configB.monthlyParking * 12 : configB.monthlyParking}
                        />
                        <CostRow 
                          label="Pedágio" 
                          icon={<Milestone className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? configA.monthlyTolls * 12 : configA.monthlyTolls} 
                          valueB={costProjectionPeriod === 'annual' ? configB.monthlyTolls * 12 : configB.monthlyTolls}
                        />
                        <CostRow 
                          label="Limpeza" 
                          icon={<Droplets className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? configA.monthlyWashing * 12 : configA.monthlyWashing} 
                          valueB={costProjectionPeriod === 'annual' ? configB.monthlyWashing * 12 : configB.monthlyWashing}
                        />
                        <CostRow 
                          label="Depreciação" 
                          icon={<TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          valueA={costProjectionPeriod === 'annual' ? depreciationMonthlyA * 12 : depreciationMonthlyA} 
                          valueB={costProjectionPeriod === 'annual' ? depreciationMonthlyB * 12 : depreciationMonthlyB}
                          helpButton={<HelpButton dialogKey="depreciation" />}
                        />
                        
                        <div className="flex items-center justify-between pt-2 mt-2 border-t-2">
                          <span className="font-semibold text-xs">Total {costProjectionPeriod === 'annual' ? 'Anual' : 'Mensal'}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold text-xs w-[70px] text-right tabular-nums",
                              costsA.totalMonthly < costsB.totalMonthly ? "text-green-600" : ""
                            )}>
                              {formatNumber(costProjectionPeriod === 'annual' ? costsA.totalMonthly * 12 : costsA.totalMonthly)}
                            </span>
                            <span className={cn(
                              "font-bold text-xs w-[70px] text-right tabular-nums",
                              costsB.totalMonthly < costsA.totalMonthly ? "text-green-600" : ""
                            )}>
                              {formatNumber(costProjectionPeriod === 'annual' ? costsB.totalMonthly * 12 : costsB.totalMonthly)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            </MobileSectionDrawer>

            {/* Quanto custa ter estes carros? */}
            <MobileSectionDrawer
              title="Quanto custa ter estes carros?"
              icon={<Calculator className="h-4 w-4 text-primary" />}
              badge={<Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-primary/10 text-primary border border-primary/20">Custos</Badge>}
              isTabletOrMobile={isTabletOrMobile}
            >
              <CarABOwnershipCostSection
                carA={{
                  fipeValue: valueA,
                  modelName: modelNameA,
                  brandName: brandNameA,
                  vehicleAge: configA.vehicleAge,
                  vehicleType: (fipeA.vehicleType || 'carros') as 'carros' | 'motos' | 'caminhoes',
                  depreciationMonthly: depreciationMonthlyA,
                  yearLabel: yearLabelA,
                  totalMonthly: costsA.totalMonthly + depreciationMonthlyA,
                  totalAnnual: (costsA.totalMonthly + depreciationMonthlyA) * 12,
                }}
                carB={{
                  fipeValue: valueB,
                  modelName: modelNameB,
                  brandName: brandNameB,
                  vehicleAge: configB.vehicleAge,
                  vehicleType: (fipeB.vehicleType || 'carros') as 'carros' | 'motos' | 'caminhoes',
                  depreciationMonthly: depreciationMonthlyB,
                  yearLabel: yearLabelB,
                  totalMonthly: costsB.totalMonthly + depreciationMonthlyB,
                  totalAnnual: (costsB.totalMonthly + depreciationMonthlyB) * 12,
                }}
                vehicleState={configA.vehicleState}
                onVehicleStateChange={(v) => {
                  setConfigA(prev => ({ ...prev, vehicleState: v }));
                  setConfigB(prev => ({ ...prev, vehicleState: v }));
                }}
                configA={{
                  totalMonthlyKm: configA.totalMonthlyKm,
                  calculatedFuelCost: configA.calculatedFuelCost,
                  fuelRows: configA.fuelRows,
                  monthlyParking: configA.monthlyParking,
                  monthlyTolls: configA.monthlyTolls,
                  monthlyWashing: configA.monthlyWashing,
                }}
                onConfigAChange={(updates) => setConfigA(prev => ({ ...prev, ...updates }))}
                configB={{
                  totalMonthlyKm: configB.totalMonthlyKm,
                  calculatedFuelCost: configB.calculatedFuelCost,
                  fuelRows: configB.fuelRows,
                  monthlyParking: configB.monthlyParking,
                  monthlyTolls: configB.monthlyTolls,
                  monthlyWashing: configB.monthlyWashing,
                }}
                onConfigBChange={(updates) => setConfigB(prev => ({ ...prev, ...updates }))}
                consumptionHookA={{ suggestion: consumptionHookA.suggestion, loading: consumptionHookA.loading }}
                consumptionHookB={{ suggestion: consumptionHookB.suggestion, loading: consumptionHookB.loading }}
                yearLabelA={yearLabelA}
                yearLabelB={yearLabelB}
              />
            </MobileSectionDrawer>

            <MobileSectionDrawer
              title="TCO (Custo Total de Propriedade)"
              icon={<Calculator className="h-4 w-4 text-primary" />}
              isTabletOrMobile={isTabletOrMobile}
            >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="leading-tight">TCO (Custo Total de Propriedade)</span>
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Metodologia de Cálculo do TCO</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <p>
                          O <strong>TCO (Total Cost of Ownership)</strong> representa o custo real de possuir 
                          um veículo durante um período, incluindo não apenas o preço de compra, mas todos os 
                          custos operacionais e a perda de valor.
                        </p>
                        <div className="bg-muted p-4 rounded-lg font-mono text-center">
                          <p className="text-xs text-muted-foreground mb-2">Fórmula:</p>
                          <p className="font-bold">TCO = (Custos Anuais × Anos) + Depreciação</p>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Custos Anuais incluem:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>IPVA e Licenciamento</li>
                            <li>Seguro automotivo</li>
                            <li>Combustível (baseado em km/mês)</li>
                            <li>Manutenção e revisões</li>
                            <li>Pneus (custo por km)</li>
                            <li>Estacionamento, pedágios e lavagens</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Depreciação:</p>
                          <p className="text-muted-foreground">
                            É a perda de valor de mercado do veículo ao longo do tempo. Calculamos 
                            usando curvas de depreciação baseadas em dados da FIPE, considerando 
                            que veículos novos perdem mais valor nos primeiros anos.
                          </p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            💡 <strong>Dica:</strong> Compare horizontes diferentes! Um carro pode ser 
                            mais vantajoso em 2 anos mas perder a vantagem em 5 anos devido à depreciação.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Mobile: Layout compacto */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <span>Custos</span>
                    <span className="font-bold">+</span>
                    <span>Depreciação</span>
                    <span className="font-bold">=</span>
                    <span className="text-primary font-semibold">TCO</span>
                  </div>
                  
                  {/* Horizon Selector - Compacto */}
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 5, 10].map(years => (
                      <Button
                        key={years}
                        variant={selectedTcoHorizon === years ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTcoHorizon(years)}
                        className="text-xs px-1 h-8"
                      >
                        {years}a
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Desktop: Layout original */}
                <div className="hidden sm:block">
                  <p className="text-sm text-muted-foreground mb-4">
                    O TCO soma todos os <strong>custos operacionais</strong> (IPVA, seguro, combustível, manutenção, etc.) 
                    com a <strong>depreciação</strong> do veículo no período. É a forma mais precisa de comparar o custo real entre dois carros.
                  </p>
                  
                  {/* Horizon Selector */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[1, 2, 3, 5, 10].map(years => (
                      <Button
                        key={years}
                        variant={selectedTcoHorizon === years ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTcoHorizon(years)}
                        className="min-w-[60px]"
                      >
                        {years} {years === 1 ? 'ano' : 'anos'}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* TCO Comparison - Mobile: Card único do horizonte selecionado com swipe */}
                <div 
                  className="sm:hidden"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.currentTarget.dataset.touchStartX = touch.clientX.toString();
                  }}
                  onTouchEnd={(e) => {
                    const touchStartX = parseFloat(e.currentTarget.dataset.touchStartX || '0');
                    const touchEndX = e.changedTouches[0].clientX;
                    const diff = touchStartX - touchEndX;
                    const horizonOptions = [1, 2, 3, 5, 10];
                    const currentIndex = horizonOptions.indexOf(selectedTcoHorizon);
                    
                    if (Math.abs(diff) > 50) { // Minimum swipe distance
                      if (diff > 0 && currentIndex < horizonOptions.length - 1) {
                        // Swipe left - next horizon
                        setSelectedTcoHorizon(horizonOptions[currentIndex + 1]);
                      } else if (diff < 0 && currentIndex > 0) {
                        // Swipe right - previous horizon
                        setSelectedTcoHorizon(horizonOptions[currentIndex - 1]);
                      }
                    }
                  }}
                >
                  {(() => {
                    const horizon = tcoHorizons.find(h => h.years === selectedTcoHorizon);
                    const horizonOptions = [1, 2, 3, 5, 10];
                    const currentIndex = horizonOptions.indexOf(selectedTcoHorizon);
                    if (!horizon) return null;
                    
                    return (
                      <div className="p-3 rounded-lg border border-primary bg-primary/5 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {horizon.years} {horizon.years === 1 ? 'ano' : 'anos'}
                            </span>
                            {/* Swipe indicator dots */}
                            <div className="flex items-center gap-1">
                              {horizonOptions.map((_, idx) => (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors",
                                    idx === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          {horizon.winner ? (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                horizon.winner === 'A' 
                                  ? "bg-blue-500/10 text-blue-700 border-blue-500/30" 
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                              )}
                            >
                              <Trophy className="h-3 w-3 mr-1" />
                              Carro {horizon.winner} vence
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Empate</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between p-2.5 bg-blue-500/10 rounded-lg">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <span className="text-muted-foreground text-xs">Carro A</span>
                            </div>
                            <span className={cn(
                              "font-bold tabular-nums",
                              horizon.winner === 'A' ? "text-green-600" : ""
                            )}>
                              {formatMoneyShort(horizon.tcoA)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 bg-amber-500/10 rounded-lg">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              <span className="text-muted-foreground text-xs">Carro B</span>
                            </div>
                            <span className={cn(
                              "font-bold tabular-nums",
                              horizon.winner === 'B' ? "text-green-600" : ""
                            )}>
                              {formatMoneyShort(horizon.tcoB)}
                            </span>
                          </div>
                        </div>
                        
                        {horizon.savings > 0 && (
                          <div className="mt-3 pt-3 border-t border-dashed flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Diferença:</span>
                            <span className="text-green-600 font-bold">
                              {formatMoneyShort(horizon.savings)}
                              <span className="text-xs font-normal ml-1">
                                ({formatMoney(horizon.savingsMonthly)}/mês)
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {/* Swipe hint */}
                        <div className="mt-2 text-center">
                          <span className="text-[10px] text-muted-foreground/60">
                            ← deslize para mudar o período →
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* TCO Comparison Table - Desktop */}
                <div className="hidden sm:block border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Horizonte</th>
                          <th className="text-right p-3 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              TCO Carro A
                            </span>
                          </th>
                          <th className="text-right p-3 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                              TCO Carro B
                            </span>
                          </th>
                          <th className="text-center p-3 font-medium">Mais Vantajoso</th>
                          <th className="text-right p-3 font-medium">Diferença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tcoHorizons.map((horizon, idx) => (
                          <tr 
                            key={horizon.years} 
                            className={cn(
                              "border-t transition-colors cursor-pointer",
                              selectedTcoHorizon === horizon.years ? "bg-primary/5" : "",
                              idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                            )}
                            onClick={() => setSelectedTcoHorizon(horizon.years)}
                          >
                            <td className="p-3 font-medium">
                              {horizon.years} {horizon.years === 1 ? 'ano' : 'anos'}
                            </td>
                            <td className={cn(
                              "p-3 text-right tabular-nums font-medium",
                              horizon.winner === 'A' ? "text-green-600" : ""
                            )}>
                              {formatMoneyShort(horizon.tcoA)}
                            </td>
                            <td className={cn(
                              "p-3 text-right tabular-nums font-medium",
                              horizon.winner === 'B' ? "text-green-600" : ""
                            )}>
                              {formatMoneyShort(horizon.tcoB)}
                            </td>
                            <td className="p-3 text-center">
                              {horizon.winner ? (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "font-medium",
                                    horizon.winner === 'A' 
                                      ? "bg-blue-500/10 text-blue-700 border-blue-500/30" 
                                      : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                  )}
                                >
                                  Carro {horizon.winner}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Empate</span>
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              <span className="text-green-600 font-medium">{formatMoneyShort(horizon.savings)}</span>
                              <span className="text-xs text-muted-foreground block">
                                ({formatMoney(horizon.savingsMonthly)}/mês)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Veredicto - Decisão financeira (baseado no horizonte selecionado) */}
            {(() => {
              const selectedHorizon = tcoHorizons.find(h => h.years === selectedTcoHorizon);
              const horizonWinner = selectedHorizon?.winner;
              const horizonSavings = selectedHorizon?.savings || 0;
              const horizonSavingsMonthly = selectedHorizon?.savingsMonthly || 0;
              const horizonTcoA = selectedHorizon?.tcoA || 0;
              const horizonTcoB = selectedHorizon?.tcoB || 0;
              
              return (
                <Card className={cn(
                  "border-2",
                  horizonWinner === 'A' ? "border-blue-500/50 bg-blue-500/5" : 
                  horizonWinner === 'B' ? "border-amber-500/50 bg-amber-500/5" : 
                  "border-muted"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-16 w-16 rounded-xl flex items-center justify-center",
                          horizonWinner === 'A' ? "bg-blue-500/20" : 
                          horizonWinner === 'B' ? "bg-amber-500/20" : 
                          "bg-muted"
                        )}>
                          <Trophy className={cn(
                            "h-8 w-8",
                            horizonWinner === 'A' ? "text-blue-600" : 
                            horizonWinner === 'B' ? "text-amber-600" : 
                            "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Decisão financeira em {selectedTcoHorizon} {selectedTcoHorizon === 1 ? 'ano' : 'anos'}
                          </p>
                          <p className="text-2xl font-bold">
                            {horizonWinner ? (
                              <>Carro {horizonWinner} é mais vantajoso</>
                            ) : (
                              <>Empate técnico</>
                            )}
                          </p>
                          {horizonWinner && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Economia de <span className="font-medium text-foreground">{formatMoney(horizonSavings)}</span> no período
                              {' '}({formatMoney(horizonSavingsMonthly)}/mês)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">TCO Carro A ({selectedTcoHorizon} {selectedTcoHorizon === 1 ? 'ano' : 'anos'})</p>
                          <p className={cn(
                            "text-xl font-bold",
                            horizonWinner === 'A' ? "text-green-600" : ""
                          )}>
                            {formatMoneyShort(horizonTcoA)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">TCO Carro B ({selectedTcoHorizon} {selectedTcoHorizon === 1 ? 'ano' : 'anos'})</p>
                          <p className={cn(
                            "text-xl font-bold",
                            horizonWinner === 'B' ? "text-green-600" : ""
                          )}>
                            {formatMoneyShort(horizonTcoB)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Resumo Executivo - mobile vertical, desktop horizontal */}
            {(() => {
              const selectedHorizon = tcoHorizons.find(h => h.years === selectedTcoHorizon);
              const depA = selectedHorizon?.depreciationA || 0;
              const depB = selectedHorizon?.depreciationB || 0;
              const tcoA = selectedHorizon?.tcoA || 0;
              const tcoB = selectedHorizon?.tcoB || 0;
              
              return (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-3 md:p-4 shadow-lg">
                  {/* Desktop: grid horizontal */}
                  <div className="hidden md:grid md:grid-cols-4 gap-4 text-white">
                    <div className="text-center">
                      <div className="text-xs opacity-80 mb-1">VALOR FIPE</div>
                      <div className="text-sm font-bold">A: {formatMoney(valueA)}</div>
                      <div className="text-sm font-bold">B: {formatMoney(valueB)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs opacity-80 mb-1">CUSTO MENSAL TOTAL</div>
                      <div className="text-sm font-bold">A: {formatMoney(costsA.totalMonthly + depreciationMonthlyA + configA.monthlyParking + configA.monthlyTolls)}</div>
                      <div className="text-sm font-bold">B: {formatMoney(costsB.totalMonthly + depreciationMonthlyB + configB.monthlyParking + configB.monthlyTolls)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs opacity-80 mb-1">PERDA {selectedTcoHorizon} {selectedTcoHorizon === 1 ? 'ANO' : 'ANOS'}</div>
                      <div className="text-sm font-bold">A: -{formatMoneyShort(depA)}</div>
                      <div className="text-sm font-bold">B: -{formatMoneyShort(depB)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs opacity-80 mb-1">TCO {selectedTcoHorizon} {selectedTcoHorizon === 1 ? 'ANO' : 'ANOS'}</div>
                      <div className="text-sm font-bold">A: {formatMoneyShort(tcoA)}</div>
                      <div className="text-sm font-bold">B: {formatMoneyShort(tcoB)}</div>
                    </div>
                  </div>
                  
                  {/* Mobile: layout vertical compacto */}
                  <div className="md:hidden text-white space-y-2">
                    {[
                      { label: 'Valor FIPE', valueA: formatMoneyShort(valueA), valueB: formatMoneyShort(valueB) },
                      { label: 'Custo Mensal', valueA: formatMoneyShort(costsA.totalMonthly + depreciationMonthlyA + configA.monthlyParking + configA.monthlyTolls), valueB: formatMoneyShort(costsB.totalMonthly + depreciationMonthlyB + configB.monthlyParking + configB.monthlyTolls) },
                      { label: `Perda ${selectedTcoHorizon} ${selectedTcoHorizon === 1 ? 'Ano' : 'Anos'}`, valueA: `-${formatMoneyShort(depA)}`, valueB: `-${formatMoneyShort(depB)}` },
                      { label: `TCO ${selectedTcoHorizon} ${selectedTcoHorizon === 1 ? 'Ano' : 'Anos'}`, valueA: formatMoneyShort(tcoA), valueB: formatMoneyShort(tcoB) },
                    ].map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/20 last:border-b-0">
                        <span className="text-xs opacity-80 uppercase tracking-wider">{row.label}</span>
                        <div className="flex gap-3 text-xs font-bold">
                          <span className="bg-blue-500/30 px-2 py-0.5 rounded">A: {row.valueA}</span>
                          <span className="bg-amber-500/30 px-2 py-0.5 rounded">B: {row.valueB}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Análise Inteligente / Veredito IA */}
            {(() => {
              const selectedHorizon = tcoHorizons.find(h => h.years === selectedTcoHorizon);
              const depA = selectedHorizon?.depreciationA || 0;
              const depB = selectedHorizon?.depreciationB || 0;
              const tcoA = selectedHorizon?.tcoA || 0;
              const tcoB = selectedHorizon?.tcoB || 0;
              const winner = selectedHorizon?.winner || null;
              const savings = selectedHorizon?.savings || 0;
              const savingsMonthly = selectedHorizon?.savingsMonthly || 0;
              
              const totalMonthlyA = costsA.totalMonthly + depreciationMonthlyA + configA.monthlyParking + configA.monthlyTolls + configA.monthlyWashing;
              const totalMonthlyB = costsB.totalMonthly + depreciationMonthlyB + configB.monthlyParking + configB.monthlyTolls + configB.monthlyWashing;
              
              return (
                <CarComparisonVerdict
                  carroA={{
                    nome: fipeA.price?.Modelo || 'Carro A',
                    valorFipe: valueA,
                    custoMensalTotal: totalMonthlyA,
                    perda5Anos: depA,
                    tco5Anos: tcoA,
                    depreciacao: depreciationAnnualA,
                    ipva: effectiveCostsA.ipva * 12,
                    seguro: effectiveCostsA.insurance * 12,
                    manutencao: effectiveCostsA.maintenance * 12,
                    combustivel: costsA.fuel * 12,
                    custoOportunidade: effectiveCostsA.opportunityCost * 12,
                  }}
                  carroB={{
                    nome: fipeB.price?.Modelo || 'Carro B',
                    valorFipe: valueB,
                    custoMensalTotal: totalMonthlyB,
                    perda5Anos: depB,
                    tco5Anos: tcoB,
                    depreciacao: depreciationAnnualB,
                    ipva: effectiveCostsB.ipva * 12,
                    seguro: effectiveCostsB.insurance * 12,
                    manutencao: effectiveCostsB.maintenance * 12,
                    combustivel: costsB.fuel * 12,
                    custoOportunidade: effectiveCostsB.opportunityCost * 12,
                  }}
                  horizonte={selectedTcoHorizon}
                  economia={savings}
                  economiaMensal={savingsMonthly}
                  vencedor={winner as 'A' | 'B' | null}
                />
              );
            })()}

            {/* Botão para gerar card de compartilhamento */}
            {(() => {
              const selectedHorizon = tcoHorizons.find(h => h.years === selectedTcoHorizon);
              const winner = selectedHorizon?.winner || null;
              const savingsMonthly = selectedHorizon?.savingsMonthly || 0;
              
              const totalMonthlyA = costsA.totalMonthly + depreciationMonthlyA + configA.monthlyParking + configA.monthlyTolls + configA.monthlyWashing;
              const totalMonthlyB = costsB.totalMonthly + depreciationMonthlyB + configB.monthlyParking + configB.monthlyTolls + configB.monthlyWashing;
              
              if (!valueA || !valueB || !winner) return null;
              
              // Build depreciation projection data for the card chart
              const depreciationData = [
                { year: 0, valueA: valueA, valueB: valueB, label: 'Hoje' },
                { year: 1, valueA: valueA * (1 - depreciationRateA), valueB: valueB * (1 - depreciationRateB), label: '1A' },
                { year: 2, valueA: valueA * Math.pow(1 - depreciationRateA, 2), valueB: valueB * Math.pow(1 - depreciationRateB, 2), label: '2A' },
                { year: 3, valueA: valueA * Math.pow(1 - depreciationRateA, 3), valueB: valueB * Math.pow(1 - depreciationRateB, 3), label: '3A' },
                { year: 5, valueA: valueA * Math.pow(1 - depreciationRateA, 5), valueB: valueB * Math.pow(1 - depreciationRateB, 5), label: '5A' },
              ];
              
              return (
                <div className="flex justify-center">
                  <ComparisonCardGenerator
                    carroA={{
                      nome: fipeA.price?.Modelo || 'Carro A',
                      valorFipe: valueA,
                      custoMensalTotal: totalMonthlyA,
                      tco5Anos: selectedHorizon?.tcoA || 0,
                      custos: {
                        ipva: costsA.ipva * 12,
                        seguro: costsA.insurance * 12,
                        combustivel: costsA.fuel * 12,
                        manutencao: (costsA.maintenance + costsA.revision) * 12,
                        depreciacao: depreciationMonthlyA * 12,
                        custoOportunidade: costsA.opportunityCost * 12,
                      },
                    }}
                    carroB={{
                      nome: fipeB.price?.Modelo || 'Carro B',
                      valorFipe: valueB,
                      custoMensalTotal: totalMonthlyB,
                      tco5Anos: selectedHorizon?.tcoB || 0,
                      custos: {
                        ipva: costsB.ipva * 12,
                        seguro: costsB.insurance * 12,
                        combustivel: costsB.fuel * 12,
                        manutencao: (costsB.maintenance + costsB.revision) * 12,
                        depreciacao: depreciationMonthlyB * 12,
                        custoOportunidade: costsB.opportunityCost * 12,
                      },
                    }}
                    horizonte={selectedTcoHorizon}
                    economiaMensal={savingsMonthly}
                    vencedor={winner as 'A' | 'B'}
                    depreciationData={depreciationData}
                  />
                </div>
              );
            })()}


            {/* Nota sobre Custo de Oportunidade */}
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="p-4">
                {/* Mobile: Layout ultra compacto */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-amber-700 dark:text-amber-400">
                        Custo de Oportunidade
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Este TCO não considera rendimentos do capital investido
                      </p>
                    </div>
                  </div>
                  
                  {Math.abs(valueA - valueB) > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg text-xs">
                      <span className="text-muted-foreground">Diferença investida renderia:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        +{formatMoney(Math.abs(valueA - valueB) * 0.1365 / 12)}/mês
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs h-9"
                    onClick={() => window.location.href = '/simulador-custo-oportunidade-carro'}
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    Simular Custo de Oportunidade
                  </Button>
                </div>
                
                {/* Desktop: Layout expandido */}
                <div className="hidden sm:block space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                    <TrendingUp className="h-4 w-4" />
                    <span>Sobre o Custo de Oportunidade</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Este comparativo calcula o TCO baseado em custos operacionais e depreciação. 
                    Ele <strong className="text-amber-700 dark:text-amber-400">não considera o custo de oportunidade</strong> do capital imobilizado.
                  </p>
                  
                  {Math.abs(valueA - valueB) > 0 && (
                    <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm">
                        <strong>Na sua comparação:</strong> A diferença de{' '}
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {formatMoney(Math.abs(valueA - valueB))}
                        </span>
                        , investida a 13,65% a.a. (CDI), renderia{' '}
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatMoney(Math.abs(valueA - valueB) * 0.1365 / 12)}/mês
                        </span>.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => window.location.href = '/simulador-custo-oportunidade-carro'}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Simular Custo de Oportunidade
                    <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            </MobileSectionDrawer>
          </>
        )}

        {!hasBothValues && (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Scale className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Configure os dois veículos</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md">
                  Selecione os veículos pela tabela FIPE ou informe os valores manualmente para ver o comparativo financeiro completo.
                </p>
                <div className="flex gap-3">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm",
                    valueA > 0 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  )}>
                    {valueA > 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>Carro A {valueA > 0 ? "configurado" : "pendente"}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm",
                    valueB > 0 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  )}>
                    {valueB > 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>Carro B {valueB > 0 ? "configurado" : "pendente"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Render controlled help dialogs */}
      <CarComparisonHelpDialogs
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        valueA={valueA}
        valueB={valueB}
        costsA={{
          insurance: costsA.insurance,
          insuranceEstimate: costsA.insuranceEstimate,
          maintenance: costsA.maintenance,
          maintenanceEstimate: costsA.maintenanceEstimate,
          revision: costsA.revision,
          ipva: costsA.ipva,
          fuel: costsA.fuel,
          tires: costsA.tires,
          tireEstimate: costsA.tireEstimate,
          rimSize: costsA.rimSize,
          licensing: costsA.licensing,
          parking: costsA.parking,
          tolls: costsA.tolls,
          cleaning: costsA.washing,
          opportunityCost: costsA.opportunityCost,
          totalMonthly: costsA.totalMonthly,
        }}
        costsB={{
          insurance: costsB.insurance,
          insuranceEstimate: costsB.insuranceEstimate,
          maintenance: costsB.maintenance,
          maintenanceEstimate: costsB.maintenanceEstimate,
          revision: costsB.revision,
          ipva: costsB.ipva,
          fuel: costsB.fuel,
          tires: costsB.tires,
          tireEstimate: costsB.tireEstimate,
          rimSize: costsB.rimSize,
          licensing: costsB.licensing,
          parking: costsB.parking,
          tolls: costsB.tolls,
          cleaning: costsB.washing,
          opportunityCost: costsB.opportunityCost,
          totalMonthly: costsB.totalMonthly,
        }}
        configA={{
          vehicleState: configA.vehicleState,
          vehicleAge: configA.vehicleAge,
          monthlyKm: configA.totalMonthlyKm,
          fuelRows: configA.fuelRows.map(r => ({
            fuelType: r.type,
            price: r.price,
            percentage: 100, // FuelRowData doesn't have percentage, default to 100
            consumption: r.consumption,
          })),
          calculatedFuelCost: configA.calculatedFuelCost,
        }}
        configB={{
          vehicleState: configB.vehicleState,
          vehicleAge: configB.vehicleAge,
          monthlyKm: configB.totalMonthlyKm,
          fuelRows: configB.fuelRows.map(r => ({
            fuelType: r.type,
            price: r.price,
            percentage: 100, // FuelRowData doesn't have percentage, default to 100
            consumption: r.consumption,
          })),
          calculatedFuelCost: configB.calculatedFuelCost,
        }}
        modelNameA={modelNameA}
        modelNameB={modelNameB}
        depreciationRateA={depreciationRateA}
        depreciationRateB={depreciationRateB}
        depreciationMonthlyA={depreciationMonthlyA}
        depreciationMonthlyB={depreciationMonthlyB}
        hasV6ResultA={hasV6ResultA}
        hasV6ResultB={hasV6ResultB}
        costOverridesA={costOverridesA}
        costOverridesB={costOverridesB}
        handleCostOverrideA={handleCostOverrideA}
        handleCostOverrideB={handleCostOverrideB}
        tireOverrides={{ rimSizeA: rimSizeOverrideA, rimSizeB: rimSizeOverrideB, tirePriceA: tirePriceOverrideA, tirePriceB: tirePriceOverrideB }}
        handleTireOverride={handleTireOverride}
        opportunityCostRate={OPPORTUNITY_COST_RATE}
        getPrimaryFuelType={getPrimaryFuelTypeForDialogs}
      />

    </AppLayout>
  );
};

export default SimuladorCarroAB;
