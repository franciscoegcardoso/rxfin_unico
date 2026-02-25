import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { AppLayout } from '@/components/layout/AppLayout';
import { useFinancial } from '@/contexts/FinancialContext';
import { BackLink } from '@/components/shared/BackLink';
import { useFipe, VehicleType } from '@/hooks/useFipe';
import { useDepreciationEngineV2 } from '@/hooks/useDepreciationEngineV2';
import { useSimulatorContext } from '@/hooks/useSimulatorContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Car as CarIcon, 
  Scale,
  Settings2,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowRightLeft,
} from 'lucide-react';
import { VehicleFipeSelector } from '@/components/simuladores/VehicleFipeSelector';
import { useFipeFavorites } from '@/hooks/useFipeFavorites';
import { AlternativesConfigSection } from '@/components/simuladores/AlternativesConfigSection';
import { ComparisonResultsSection } from '@/components/simuladores/ComparisonResultsSection';
import { CarOwnershipCostDialog } from '@/components/simuladores/CarOwnershipCostDialog';

// Storage keys
const STORAGE_KEY = 'comparativo-carro-alternativas';
const OWNERSHIP_STORAGE_PREFIX = 'fipe-ownership-costs-';

// Default depreciation rate fallback
const DEFAULT_DEPRECIATION_RATE = 0.08; // 8% a.a.

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const SimuladorComparativoCarro: React.FC = () => {
  const { config } = useFinancial();
  const { load, isFresh, clear } = useSimulatorContext();
  
  // Check for pending context BEFORE instantiating fipe hooks
  const pendingContextRef = useRef<ReturnType<typeof load> | null>(null);
  const contextCheckedRef = useRef(false);
  
  // Only check once on mount (synchronous, before hooks run)
  if (!contextCheckedRef.current) {
    contextCheckedRef.current = true;
    if (isFresh()) {
      const ctx = load();
      if (ctx?.brandCode && ctx?.modelCode && ctx?.yearCode) {
        pendingContextRef.current = ctx;
        clear();
      }
    }
  }
  
  const fipe = useFipe();
  const fipeFavoritesProps = useFipeFavorites(fipe);
  const registeredVehicles = config.assets.filter(a => a.type === 'vehicle');

  // Track if context was already loaded
  const contextLoadedRef = useRef(false);

  // Persisted data via useUserKV
  const { value: persistedData, setValue: setPersistedData } = useUserKV<any>('comparativo-carro-alternativas', null);
  
  // Auto-fill from simulator context (when navigating from another simulator)
  useEffect(() => {
    if (contextLoadedRef.current) return;
    if (fipe.priceValue > 0) return;
    
    const context = pendingContextRef.current;
    if (context?.brandCode && context?.modelCode && context?.yearCode) {
      contextLoadedRef.current = true;
      pendingContextRef.current = null;
      
      fipe.initializeFromSaved({
        vehicleType: context.vehicleType,
        brandCode: context.brandCode,
        modelCode: context.modelCode,
        yearCode: context.yearCode,
      });
    }
  }, [fipe.priceValue]);

  // Vehicle selection state
  const [selectedRegisteredVehicle, setSelectedRegisteredVehicle] = useState('');
  
  // Alternatives state
  const [appMonthly, setAppMonthly] = useState(persistedData?.appMonthly ?? 0);
  const [rentalType, setRentalType] = useState<'monthly' | 'daily' | 'none'>(persistedData?.rentalType ?? 'none');
  const [rentalMonthlyPrice, setRentalMonthlyPrice] = useState(persistedData?.rentalMonthlyPrice ?? 2500);
  const [rentalDailyPrice, setRentalDailyPrice] = useState(persistedData?.rentalDailyPrice ?? 150);
  const [rentalDaysPerMonth, setRentalDaysPerMonth] = useState(persistedData?.rentalDaysPerMonth ?? 4);
  
  // Projection
  const [projectionYears, setProjectionYears] = useState(persistedData?.projectionYears ?? 5);

  // Persist data on change
  useEffect(() => {
    const dataToStore = {
      appMonthly,
      rentalType,
      rentalMonthlyPrice,
      rentalDailyPrice,
      rentalDaysPerMonth,
      projectionYears,
    };
    setPersistedData(dataToStore);
  }, [appMonthly, rentalType, rentalMonthlyPrice, rentalDailyPrice, rentalDaysPerMonth, projectionYears, setPersistedData]);

  // Handle registered vehicle selection
  const handleSelectRegisteredVehicle = useCallback((vehicleId: string) => {
    if (selectedRegisteredVehicle === vehicleId) {
      setSelectedRegisteredVehicle('');
      fipe.reset();
      return;
    }
    
    setSelectedRegisteredVehicle(vehicleId);
    const vehicle = registeredVehicles.find(v => v.id === vehicleId);
    
    if (vehicle?.fipeVehicleType && vehicle?.fipeBrandCode && vehicle?.fipeModelCode && vehicle?.fipeYearCode) {
      fipe.initializeFromSaved({
        vehicleType: vehicle.fipeVehicleType,
        brandCode: vehicle.fipeBrandCode,
        modelCode: vehicle.fipeModelCode,
        yearCode: vehicle.fipeYearCode,
      });
    }
  }, [selectedRegisteredVehicle, registeredVehicles, fipe]);

  // Vehicle info
  const vehicleValue = fipe.priceValue || 0;
  const vehicleYear = fipe.price?.AnoModelo || new Date().getFullYear();
  const vehicleAge = new Date().getFullYear() - vehicleYear;
  
  const modelName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
  const brandName = fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome || '';
  const yearLabel = fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || '';

  // Depreciation Engine V2
  const engineV2Props = useMemo(() => ({
    fipeCode: fipe.price?.CodigoFipe || '',
    modelName,
    brandName,
    modelYear: vehicleYear,
    vehicleType: fipe.vehicleType,
    brandCode: fipe.selectedBrand,
  }), [fipe.price, modelName, brandName, vehicleYear, fipe.vehicleType, fipe.selectedBrand]);

  const depreciationEngine = useDepreciationEngineV2(engineV2Props);

  // Trigger V2 calculation when vehicle is selected
  useEffect(() => {
    if (fipe.price?.CodigoFipe && fipe.price?.AnoModelo) {
      depreciationEngine.calculate();
    }
  }, [fipe.price?.CodigoFipe, fipe.price?.AnoModelo]);

  // Depreciation calculation
  const depreciationRate = depreciationEngine.result?.metadata.annualRatePhaseA ?? DEFAULT_DEPRECIATION_RATE;
  const depreciationMonthly = (vehicleValue * depreciationRate) / 12;

  // Read ownership costs from useUserKV (synced with FipeOwnershipCostCard)
  const ownershipKvKey = useMemo(() => {
    if (!modelName || vehicleAge === undefined) return '';
    const year = new Date().getFullYear() - vehicleAge;
    const normalized = `${modelName.toLowerCase().replace(/\s+/g, '-')}-${year}`;
    return `fipe-ownership-costs-${normalized}`;
  }, [modelName, vehicleAge]);

  const { value: ownershipCostsData } = useUserKV<any>(ownershipKvKey || '_unused_', null);

  // Car ownership cost - uses FipeOwnershipCostCard's persisted values when available
  const carOwnershipEstimate = useMemo(() => {
    if (vehicleValue <= 0) return { monthly: 0, annual: 0 };
    
    // Use persisted values from FipeOwnershipCostCard (via useUserKV)
    const persistedOwnership = ownershipCostsData;
    
    // Base estimates
    const ipvaEstimate = vehicleValue * 0.04 / 12; // ~4% a.a.
    const insuranceEstimate = vehicleValue * 0.05 / 12; // ~5% a.a.
    const licensingEstimate = 150 / 12;
    const maintenanceEstimate = vehicleValue * 0.03 / 12; // ~3% a.a.
    const opportunityCostEstimate = (vehicleValue * 0.1165) / 12; // 85% CDI ~ 11.65% a.a.
    
    // Use persisted fuel/custom values if available
    const fuelEstimate = persistedOwnership?.calculatedFuelCost ?? 500;
    
    // Sum custom values if any
    let customTotal = 0;
    if (persistedOwnership?.customValues) {
      Object.values(persistedOwnership.customValues).forEach((cv: any) => {
        if (cv?.isCustom && cv?.monthly) {
          customTotal += cv.monthly;
        }
      });
    }
    
    const monthly = ipvaEstimate + insuranceEstimate + licensingEstimate + 
                    maintenanceEstimate + fuelEstimate + depreciationMonthly +
                    opportunityCostEstimate;
    
    return { monthly, annual: monthly * 12 };
  }, [vehicleValue, depreciationMonthly, ownershipCostsData]);

  // Alternative costs
  const rentalMonthly = rentalType === 'monthly' 
    ? rentalMonthlyPrice 
    : rentalType === 'daily' 
      ? rentalDailyPrice * rentalDaysPerMonth
      : 0;
  
  const alternativeMonthly = appMonthly + rentalMonthly;
  const alternativeAnnual = alternativeMonthly * 12;

  const hasVehicle = vehicleValue > 0;
  const hasAlternatives = alternativeMonthly > 0;
  const canShowResults = hasVehicle && hasAlternatives;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Comparativo: Carro Próprio x Alternativas
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare o custo de ter carro próprio com alternativas como apps e aluguel
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <Scale className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>

        {/* Main Content - Progressive Disclosure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Vehicle Selection (Always visible) */}
          <div className="space-y-4">
            {/* Step 1: Vehicle Selection */}
            <VehicleFipeSelector
              fipe={fipe}
              registeredVehicles={registeredVehicles}
              selectedRegisteredVehicle={selectedRegisteredVehicle}
              onSelectRegisteredVehicle={handleSelectRegisteredVehicle}
              showVehicleTypeSelector={true}
              compact={false}
              {...fipeFavoritesProps}
            />

            {/* Step 2: Car Ownership Config - Only shows after vehicle selected */}
            {hasVehicle && (
              <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <CarIcon className="h-4 w-4 text-primary" />
                        Custo mensal do carro próprio
                      </p>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {formatMoney(carOwnershipEstimate.monthly)}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </p>
                      {depreciationEngine.result && (
                        <Badge className="mt-2 bg-emerald-500/20 text-emerald-700 border-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Depreciação: {(depreciationRate * 100).toFixed(1)}%/ano (IA)
                        </Badge>
                      )}
                    </div>
                    <CarOwnershipCostDialog
                      fipeValue={vehicleValue}
                      modelName={modelName}
                      brandName={brandName}
                      vehicleAge={vehicleAge}
                      vehicleType={fipe.vehicleType}
                      depreciationMonthly={depreciationMonthly}
                      yearLabel={yearLabel}
                      totalMonthly={carOwnershipEstimate.monthly}
                      trigger={
                        <Button variant="outline" className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Detalhar custos
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Projection Period - Only shows after vehicle selected */}
            {hasVehicle && (
              <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Período de Projeção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={String(projectionYears)} 
                    onValueChange={(v) => setProjectionYears(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 ano</SelectItem>
                      <SelectItem value="2">2 anos</SelectItem>
                      <SelectItem value="3">3 anos</SelectItem>
                      <SelectItem value="5">5 anos</SelectItem>
                      <SelectItem value="10">10 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Alternatives (Only shows after vehicle selected) */}
          {hasVehicle ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
              <AlternativesConfigSection
                appMonthly={appMonthly}
                onAppMonthlyChange={setAppMonthly}
                rentalType={rentalType}
                onRentalTypeChange={setRentalType}
                rentalMonthlyPrice={rentalMonthlyPrice}
                onRentalMonthlyPriceChange={setRentalMonthlyPrice}
                rentalDailyPrice={rentalDailyPrice}
                onRentalDailyPriceChange={setRentalDailyPrice}
                rentalDaysPerMonth={rentalDaysPerMonth}
                onRentalDaysPerMonthChange={setRentalDaysPerMonth}
              />
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-xl min-h-[200px]">
              <div className="text-center text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Configure as alternativas</p>
                <p className="text-xs mt-1">Selecione um veículo primeiro</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section - Only shows after both vehicle AND alternatives configured */}
        {canShowResults && (
          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Resultado da Comparação
            </h2>
            <ComparisonResultsSection
              carOwnerMonthly={carOwnershipEstimate.monthly}
              carOwnerAnnual={carOwnershipEstimate.annual}
              alternativeMonthly={alternativeMonthly}
              alternativeAnnual={alternativeAnnual}
              appMonthly={appMonthly}
              rentalMonthly={rentalMonthly}
              projectionYears={projectionYears}
              vehicleName={`${brandName} ${modelName}`}
            />
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default SimuladorComparativoCarro;
