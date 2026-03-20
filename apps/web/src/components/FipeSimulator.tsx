import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BrandSearchSelect } from '@/components/ui/brand-search-select';
import { Car, Loader2, AlertCircle, Calendar, X, Info, Bike, Truck, CheckCircle2, ChevronDown, TrendingDown, BarChart3, Sparkles, DollarSign, RefreshCw, HelpCircle, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFipe, VehicleType, formatFipeYearName, formatFipeAnoModelo } from '@/hooks/useFipe';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useFipeFullHistory, mapVehicleTypeToV2 } from '@/hooks/useFipeFullHistory';
import { useDepreciationEngineV2 } from '@/hooks/useDepreciationEngineV2';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSimulatorContext } from '@/hooks/useSimulatorContext';
import { useFipeFavorites } from '@/hooks/useFipeFavorites';
import { Asset } from '@/types/financial';
import { BarChart as RechartsBarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis } from '@/components/charts/premiumChartTheme';
import { useCohortMatrix } from '@/hooks/useCohortMatrix';
import { AnimatedChartContainer } from '@/components/charts/AnimatedChartContainer';
import { FipeOwnershipCostCard } from './FipeOwnershipCostCard';
import { inferVehicleCategory, highTheftVehicles } from '@/utils/insuranceEstimator';

import { Calculator } from 'lucide-react';
import { DepreciationCurveChart } from './DepreciationCurveChart';
import { ChartLoadingSpinner } from '@/components/shared/ChartLoadingSpinner';
import { cn } from '@/lib/utils';
import { FavoriteSwapDialog } from './FavoriteSwapDialog';
import { MobileSectionDrawer } from './MobileSectionDrawer';
// ============================================================================
// LAZY-LOADED HEAVY CHART COMPONENTS
// These components are loaded on-demand to improve initial page performance
// ============================================================================
import { SuspenseTimeSeriesChart, SuspenseCohortMatrix } from './LazyChartComponents';
import { 
  FipePriceResultSkeleton, 
  YearPricesChartSkeleton,
  DepreciationChartSkeleton 
} from './FipeSimulatorSkeleton';
import { 
  FieldWrapper, 
  getValidationState, 
  validationMessages 
} from './FipeInputValidation';
import { 
  calculateDepreciationCurve, 
  convertYearPricesToAgePoints,
  DepreciationCurveResult,
  AgePricePoint
} from '@/utils/depreciationRegression';

// ============================================================================
// HELPER: Check if device is tablet or larger (not strictly mobile)
// ============================================================================
const useIsTabletOrMobile = () => {
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  
  useEffect(() => {
    const checkSize = () => {
      setIsTabletOrMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return isTabletOrMobile;
};

interface FipeSimulatorProps {
  registeredVehicles: Asset[];
}

interface YearPriceData {
  year: string;
  yearLabel: string;
  displayYear: string;
  price: number;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value}`;
};

export const FipeSimulator: React.FC<FipeSimulatorProps> = ({ registeredVehicles }) => {
  const { load, isFresh, clear, save } = useSimulatorContext();
  
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
  const fipeHistory = useFipeFullHistory();
  const cohortMatrix = useCohortMatrix();
  const isMobile = useIsMobile();
  const isTabletOrMobile = useIsTabletOrMobile();
  const [selectedRegisteredVehicle, setSelectedRegisteredVehicle] = useState<string>('');
  const [yearPrices, setYearPrices] = useState<YearPriceData[]>([]);
  const [loadingYearPrices, setLoadingYearPrices] = useState(false);
  
  // Track if context was already loaded
  const contextLoadedRef = useRef(false);
  
  
  
  // Auto-fill from simulator context (when navigating from another simulator)
  // Use pendingContextRef that was checked synchronously before hooks
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

  // Fetch cohort data when fipe code changes
  // Use refs to track the current fipe code and avoid calling reset during cleanup
  const lastFipeCodeRef = useRef<string | null>(null);
  
  useEffect(() => {
    const currentFipeCode = fipe.price?.CodigoFipe;
    
    if (currentFipeCode && currentFipeCode !== lastFipeCodeRef.current) {
      lastFipeCodeRef.current = currentFipeCode;
      cohortMatrix.fetchCohortData(currentFipeCode);
    } else if (!currentFipeCode && lastFipeCodeRef.current) {
      // Only reset when fipe code is explicitly cleared (not on unmount)
      lastFipeCodeRef.current = null;
      cohortMatrix.reset();
    }
    // No cleanup return - avoid resetting during HMR/unmount which causes React queue corruption
  }, [fipe.price?.CodigoFipe, cohortMatrix]);

  // Extract 0km prices by model year from cohort matrix
  // 0km price = price in December of the year BEFORE the model year (Y-1)
  const zeroKmPriceData = useMemo(() => {
    if (!cohortMatrix.matrixData) return [];
    
    const { modelYears, cells } = cohortMatrix.matrixData;
    const data: { modelYear: number; price: number; launchYear: number; variation?: number }[] = [];
    
    // First pass: collect all prices
    const pricesMap = new Map<number, number>();
    for (const modelYear of modelYears) {
      if (modelYear >= 32000) continue;
      const launchYear = modelYear - 1;
      const cell = cells.find(c => c.modelYear === modelYear && c.calendarYear === launchYear);
      if (cell) pricesMap.set(modelYear, cell.price);
    }
    
    // Second pass: build data with variation
    for (const modelYear of modelYears) {
      if (modelYear >= 32000) continue;
      const launchYear = modelYear - 1;
      const cell = cells.find(c => c.modelYear === modelYear && c.calendarYear === launchYear);
      
      if (cell) {
        const prevPrice = pricesMap.get(modelYear - 1);
        const variation = prevPrice ? ((cell.price - prevPrice) / prevPrice) * 100 : undefined;
        data.push({
          modelYear,
          price: cell.price,
          launchYear,
          variation,
        });
      }
    }
    
    // Sort by model year ascending
    return data.sort((a, b) => a.modelYear - b.modelYear);
  }, [cohortMatrix.matrixData]);
  
  // Track if auto-fill was triggered to avoid duplicate calls
  const autoFillTriggeredRef = useRef<string | null>(null);

  // Calcula a idade do veículo selecionado
  const vehicleAge = useMemo(() => {
    if (!fipe.price) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - fipe.price.AnoModelo;
  }, [fipe.price]);

  // Core Engine V2 - Enhanced depreciation calculation with Waterfall strategy
  const engineV2Props = useMemo(() => ({
    fipeCode: fipe.price?.CodigoFipe || '',
    modelName: fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '',
    brandName: fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome || '',
    modelYear: fipe.price?.AnoModelo || 0,
    vehicleType: fipe.vehicleType,
    brandCode: fipe.selectedBrand,
  }), [fipe.price, fipe.models, fipe.brands, fipe.selectedModel, fipe.selectedBrand, fipe.vehicleType]);

  const depreciationEngineV2 = useDepreciationEngineV2(engineV2Props);

  // Trigger V2 calculation when vehicle is selected
  useEffect(() => {
    if (fipe.price?.CodigoFipe && fipe.price?.AnoModelo) {
      depreciationEngineV2.calculate();
    }
  }, [fipe.price?.CodigoFipe, fipe.price?.AnoModelo]);

  // Converte yearPrices para AgePricePoints e calcula a curva de depreciação dinâmica
  const depreciationData = useMemo<{ 
    curveResult: DepreciationCurveResult | null; 
    agePoints: AgePricePoint[] 
  }>(() => {
    if (yearPrices.length === 0) {
      return { curveResult: null, agePoints: [] };
    }

    const currentYear = new Date().getFullYear();
    const agePoints = convertYearPricesToAgePoints(yearPrices, currentYear);
    
    if (agePoints.length === 0) {
      return { curveResult: null, agePoints: [] };
    }

    const curveResult = calculateDepreciationCurve(agePoints, vehicleAge, 5);
    
    return { curveResult, agePoints };
  }, [yearPrices, vehicleAge]);

  const handleSelectRegisteredVehicle = (vehicleId: string) => {
    // Toggle selection - if same vehicle clicked, deselect
    if (selectedRegisteredVehicle === vehicleId) {
      setSelectedRegisteredVehicle('');
      autoFillTriggeredRef.current = null;
      fipe.reset();
      return;
    }
    
    setSelectedRegisteredVehicle(vehicleId);
    const vehicle = registeredVehicles.find(v => v.id === vehicleId);
    
    // Auto-fill FIPE fields if vehicle has stored codes - use initializeFromSaved for proper sequential loading
    if (vehicle?.fipeVehicleType && vehicle?.fipeBrandCode && vehicle?.fipeModelCode && vehicle?.fipeYearCode) {
      // Prevent duplicate calls for same vehicle
      if (autoFillTriggeredRef.current === vehicleId) return;
      autoFillTriggeredRef.current = vehicleId;
      
      // Use the hook's built-in initialization method
      fipe.initializeFromSaved({
        vehicleType: vehicle.fipeVehicleType,
        brandCode: vehicle.fipeBrandCode,
        modelCode: vehicle.fipeModelCode,
        yearCode: vehicle.fipeYearCode,
      });
    }
  };

  // Reset auto-fill ref when vehicle selection changes
  useEffect(() => {
    if (!selectedRegisteredVehicle) {
      autoFillTriggeredRef.current = null;
    }
  }, [selectedRegisteredVehicle]);

  // Busca histórico COMPLETO de preços quando um veículo é selecionado
  useEffect(() => {
    if (fipe.price?.CodigoFipe && fipe.selectedYear && fipe.price?.AnoModelo) {
      const vehicleTypeV2 = mapVehicleTypeToV2(fipe.vehicleType);

      // IMPORTANT: derive Ano/Modelo from the selectedYear code (e.g. "2023-5")
      // so we always request history for the exact Ano/Modelo chosen by the user.
      const parsedModelYear = Number(String(fipe.selectedYear).split('-')[0]);
      const effectiveModelYear = Number.isFinite(parsedModelYear)
        ? parsedModelYear
        : fipe.price.AnoModelo;

      fipeHistory.fetchFullHistory(
        vehicleTypeV2, 
        fipe.price.CodigoFipe, 
        fipe.selectedYear,
        effectiveModelYear
      );
    } else {
      fipeHistory.reset();
    }
  }, [fipe.price?.CodigoFipe, fipe.selectedYear, fipe.vehicleType, fipe.price?.AnoModelo]);

  // Simple cache for year prices
  const yearPricesCacheRef = useRef<Map<string, YearPriceData[]>>(new Map());

  // Fetch prices for all available years when model is selected
  // DB-FIRST: Query fipe_price_history, fallback to fipe-proxy only if DB has no data
  useEffect(() => {
    const abortController = new AbortController();
    let isCancelled = false;
    
    const fetchAllYearPrices = async () => {
      if (!fipe.selectedBrand || !fipe.selectedModel || fipe.years.length === 0) {
        setYearPrices([]);
        return;
      }

      const currentBrand = fipe.selectedBrand;
      const currentModel = fipe.selectedModel;
      const currentVehicleType = fipe.vehicleType;
      const currentYears = [...fipe.years];

      const cacheKey = `${currentVehicleType}-${currentBrand}-${currentModel}`;
      
      const cached = yearPricesCacheRef.current.get(cacheKey);
      if (cached) {
        setYearPrices(cached);
        return;
      }

      setLoadingYearPrices(true);
      const prices: YearPriceData[] = [];
      
      try {
        // ── DB-FIRST: Try to get all year prices from fipe_price_history ──
        // Get fipe_code from catalog for this brand/model combination
        const vtMap: Record<string, number> = { carros: 1, motos: 2, caminhoes: 3 };
        const vtNum = vtMap[currentVehicleType] || 1;
        const brandId = parseInt(currentBrand);
        const modelId = parseInt(currentModel);

        if (!isNaN(brandId) && !isNaN(modelId)) {
          // Get all catalog entries for this brand/model (all years)
          const { data: catalogEntries } = await supabase
            .from('fipe_catalog')
            .select('fipe_code, year, year_id, fuel_type')
            .eq('vehicle_type', vtNum)
            .eq('brand_id', brandId)
            .eq('model_id', modelId);

          if (catalogEntries && catalogEntries.length > 0) {
            // Get latest prices for all fipe_codes in one query
            const fipeCodes = [...new Set(catalogEntries.map(c => c.fipe_code))];
            const { data: priceData } = await supabase
              .from('fipe_price_history')
              .select('fipe_code, model_year, price, reference_code')
              .in('fipe_code', fipeCodes)
              .order('reference_code', { ascending: false });

            if (priceData && priceData.length > 0) {
              // Group by fipe_code+model_year, take latest price
              const latestPrices = new Map<string, number>();
              for (const p of priceData) {
                const key = `${p.fipe_code}_${p.model_year}`;
                if (!latestPrices.has(key)) {
                  latestPrices.set(key, p.price);
                }
              }

              for (const entry of catalogEntries) {
                const key = `${entry.fipe_code}_${entry.year}`;
                const price = latestPrices.get(key);
                if (price && price > 0) {
                  const rawYear = String(entry.year);
                  const displayYear = rawYear === '32000' ? '0km' : rawYear;
                  prices.push({
                    year: entry.year_id,
                    yearLabel: `${entry.year}`,
                    displayYear,
                    price,
                  });
                }
              }
            }
          }
        }

        // ── FALLBACK: If DB returned no prices, use fipe-proxy ──
        if (prices.length === 0 && !isCancelled) {
          const proxyBase = `${SUPABASE_URL}/functions/v1/fipe-proxy`;
          
          for (const year of currentYears) {
            if (isCancelled || abortController.signal.aborted) return;
            
            try {
              if (prices.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              if (isCancelled || abortController.signal.aborted) return;
              
              const path = `/${currentVehicleType}/marcas/${currentBrand}/modelos/${currentModel}/anos/${year.codigo}`;
              const response = await fetch(
                `${proxyBase}?path=${encodeURIComponent(path)}`,
                {
                  headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  signal: abortController.signal,
                }
              );
              
              if (!response.ok) {
                await response.text().catch(() => {});
                if (response.status === 429) break;
                continue;
              }
              
              const data = await response.json();
              if (data && typeof data === 'object' &&
                (("ok" in data && (data as any).ok === false) ||
                  ("error" in data && typeof (data as any).error === 'string'))) {
                continue;
              }
              
              const priceValue = data?.Valor
                ? parseFloat(data.Valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0
                : 0;
              
              const rawYear = year.nome.match(/^\d{4}/)?.[0] || year.nome;
              const displayYear = rawYear === '3200' ? '0km' : rawYear;
              
              if (priceValue > 0) {
                prices.push({
                  year: year.codigo,
                  yearLabel: year.nome,
                  displayYear,
                  price: priceValue,
                });
              }
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') return;
            }
          }
        }

        if (!isCancelled && !abortController.signal.aborted) {
          const validPrices = prices.sort((a, b) => {
            const yearA = parseInt(a.yearLabel) || 0;
            const yearB = parseInt(b.yearLabel) || 0;
            return yearA - yearB;
          });
          
          setYearPrices(validPrices);
          
          if (validPrices.length > 0) {
            yearPricesCacheRef.current.set(cacheKey, validPrices);
          }
        }
      } catch (error) {
        if (!isCancelled && !(error instanceof Error && error.name === 'AbortError')) {
          console.error('Error fetching year prices:', error);
          setYearPrices([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingYearPrices(false);
        }
      }
    };

    fetchAllYearPrices();
    
    // Cleanup: cancel pending requests when dependencies change
    return () => {
      isCancelled = true;
      // Use a simple string reason instead of Error to avoid unhandled promise rejections
      abortController.abort('Component cleanup');
    };
  }, [fipe.selectedBrand, fipe.selectedModel, fipe.years, fipe.vehicleType]);

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Quick Select from Registered Vehicles & Favorites */}
      {(registeredVehicles.length > 0 || fipeFavoritesProps.favoriteVehicles.length > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Meus Veículos
            </CardTitle>
            <CardDescription>
              Selecione um veículo cadastrado ou favorito para preencher automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {registeredVehicles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {registeredVehicles.map((vehicle) => {
                  const isSelected = selectedRegisteredVehicle === vehicle.id;
                  const isLoading = isSelected && fipe.isInitializing;
                  const hasFipeData = vehicle.fipeVehicleType && vehicle.fipeBrandCode && vehicle.fipeModelCode && vehicle.fipeYearCode;
                  
                  return (
                    <Button
                      key={vehicle.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectRegisteredVehicle(vehicle.id)}
                      className="gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isSelected ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Car className="h-3 w-3" />
                      )}
                      {vehicle.name}
                      {!hasFipeData && !isSelected && (
                        <span className="text-xs opacity-60">(manual)</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
            {fipeFavoritesProps.favoriteVehicles.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-amber-400">★</span> Favoritos
                </p>
                <div className="flex flex-wrap gap-2">
                  {fipeFavoritesProps.favoriteVehicles.map((fav) => {
                    const isActive = fipe.selectedBrand === fav.brandCode 
                      && fipe.selectedModel === fav.modelCode 
                      && fipe.selectedYear === fav.yearCode;
                    return (
                      <Button
                        key={fav.id}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedRegisteredVehicle('');
                          autoFillTriggeredRef.current = null;
                          fipeFavoritesProps.onSelectFavorite(fav);
                        }}
                        className="gap-2 group"
                      >
                        <Star className={cn(
                          "h-3 w-3",
                          isActive 
                            ? "fill-amber-300 text-amber-300" 
                            : "fill-amber-400 text-amber-400"
                        )} />
                        {fav.displayName}
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fipeFavoritesProps.onRemoveFavorite(fav.id);
                          }}
                          className={cn(
                            "ml-1 -mr-1 rounded-full p-0.5 transition-colors",
                            isActive
                              ? "hover:bg-primary-foreground/20 text-primary-foreground/60 hover:text-primary-foreground"
                              : "hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive"
                          )}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedRegisteredVehicle && (
              <p className="text-xs text-muted-foreground">
                Clique novamente para desmarcar
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Dados do veículo na FIPE
          </CardTitle>
          <CardDescription>
            Consulte o valor de veículos na tabela FIPE e simule diferentes percentuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Column - Selection */}
            <div className="space-y-4 flex flex-col">
              {/* Vehicle Type - Card Buttons */}
              <div className="space-y-2">
                <Label>Tipo de Veículo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'carros' as VehicleType, label: 'Carros', icon: Car, color: 'text-blue-600 dark:text-blue-400' },
                    { value: 'motos' as VehicleType, label: 'Motos', icon: Bike, color: 'text-orange-600 dark:text-orange-400' },
                    { value: 'caminhoes' as VehicleType, label: 'Caminhões', icon: Truck, color: 'text-emerald-600 dark:text-emerald-400' },
                  ].map((type) => {
                    const isSelected = fipe.vehicleType === type.value;
                    const IconComponent = type.icon;
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => fipe.setVehicleType(type.value)}
                        className={`
                          flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200
                          ${isSelected 
                            ? 'border-primary bg-primary/10 shadow-sm' 
                            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <IconComponent 
                          className={`h-6 w-6 transition-colors ${isSelected ? type.color : 'text-muted-foreground'}`} 
                        />
                        <span className={`text-xs font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand */}
              <FieldWrapper
                label="Marca"
                required
                state={getValidationState({
                  isLoading: fipe.loading.brands,
                  hasValue: !!fipe.selectedBrand,
                  hasError: !!fipe.error && !fipe.selectedBrand,
                })}
                message={
                  fipe.loading.brands 
                    ? validationMessages.brand.loading 
                    : fipe.selectedBrand 
                      ? validationMessages.brand.valid 
                      : undefined
                }
                hint={!fipe.selectedBrand && !fipe.loading.brands ? "Selecione a marca do veículo" : undefined}
              >
                <BrandSearchSelect
                  vehicleType={fipe.vehicleType}
                  fipeBrands={fipe.brands}
                  value={fipe.selectedBrand}
                  onValueChange={fipe.setSelectedBrand}
                  disabled={fipe.loading.brands}
                  loading={fipe.loading.brands}
                  placeholder="Selecione a marca"
                  searchPlaceholder="Buscar marca..."
                />
              </FieldWrapper>

              {/* Model */}
              <FieldWrapper
                label="Modelo"
                required
                state={getValidationState({
                  isLoading: fipe.loading.models,
                  hasValue: !!fipe.selectedModel,
                  isDisabled: !fipe.selectedBrand,
                  hasError: !!fipe.error && fipe.selectedBrand && !fipe.selectedModel,
                })}
                message={
                  fipe.loading.models 
                    ? validationMessages.model.loading 
                    : fipe.selectedModel 
                      ? validationMessages.model.valid 
                      : undefined
                }
                hint={
                  !fipe.selectedBrand 
                    ? validationMessages.model.disabled 
                    : !fipe.selectedModel && !fipe.loading.models 
                      ? "Escolha o modelo do veículo" 
                      : undefined
                }
              >
                <SearchableSelect
                  options={fipe.models.map((model) => ({
                    value: String(model.codigo),
                    label: model.nome,
                  }))}
                  value={fipe.selectedModel}
                  onValueChange={fipe.setSelectedModel}
                  disabled={!fipe.selectedBrand || fipe.loading.models}
                  loading={fipe.loading.models}
                  placeholder="Selecione o modelo"
                  searchPlaceholder="Buscar modelo..."
                  emptyMessage="Nenhum modelo encontrado."
                />
              </FieldWrapper>

              {/* Year */}
              <FieldWrapper
                label="Ano/Modelo"
                required
                state={getValidationState({
                  isLoading: fipe.loading.years,
                  hasValue: !!fipe.selectedYear,
                  isDisabled: !fipe.selectedModel,
                  hasError: !!fipe.error && fipe.selectedModel && !fipe.selectedYear,
                })}
                message={
                  fipe.loading.years 
                    ? validationMessages.year.loading 
                    : fipe.selectedYear 
                      ? validationMessages.year.valid 
                      : undefined
                }
                hint={
                  !fipe.selectedModel 
                    ? validationMessages.year.disabled 
                    : !fipe.selectedYear && !fipe.loading.years 
                      ? "Selecione o ano de fabricação" 
                      : undefined
                }
              >
                <SearchableSelect
                  options={fipe.years.map((year) => ({
                    value: year.codigo,
                    label: formatFipeYearName(year.nome),
                  }))}
                  value={fipe.selectedYear}
                  onValueChange={fipe.setSelectedYear}
                  disabled={!fipe.selectedModel || fipe.loading.years}
                  loading={fipe.loading.years}
                  placeholder="Selecione o ano"
                  searchPlaceholder="Buscar ano..."
                  emptyMessage="Nenhum ano encontrado."
                />
              </FieldWrapper>

              {/* Global Error Message */}
              <AnimatePresence>
                {fipe.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{fipe.error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Results */}
            <div className="flex flex-col">
              <AnimatePresence mode="wait">
                {fipe.loading.price && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1"
                  >
                    <FipePriceResultSkeleton />
                  </motion.div>
                )}

                {fipe.price && !fipe.loading.price && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                  >
                    {/* FIPE Result with Age Badge */}
                    <div className="p-6 lg:p-8 rounded-xl bg-income/10 border border-income/30 flex-1 flex flex-col justify-center relative overflow-hidden">
                      {/* Success indicator */}
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-income/20 text-income text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Consulta realizada</span>
                        </div>
                      </div>
                      
                      <div className="text-center space-y-3 pt-4">
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-muted-foreground">Valor FIPE</p>
                          {(() => {
                            const currentYear = new Date().getFullYear();
                            const vehicleAge = currentYear - fipe.price.AnoModelo;
                            const ageBadge = vehicleAge <= 0 
                              ? { color: 'bg-emerald-500', label: '0 km' }
                              : vehicleAge <= 3 
                              ? { color: 'bg-emerald-500', label: `${vehicleAge} ${vehicleAge === 1 ? 'ano' : 'anos'}` }
                              : vehicleAge <= 5
                              ? { color: 'bg-amber-500', label: `${vehicleAge} anos` }
                              : vehicleAge <= 10
                              ? { color: 'bg-orange-500', label: `${vehicleAge} anos` }
                              : { color: 'bg-red-500', label: `${vehicleAge} anos` };
                            return (
                              <Badge className={ageBadge.color + ' text-white text-xs px-2 py-0.5'}>
                                {ageBadge.label}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="font-sans font-bold tracking-tight leading-none tabular-nums text-income text-[40px] md:text-[48px]">{fipe.price.Valor}</p>
                        <p className="text-sm lg:text-base font-medium text-foreground/80">
                          {fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome} {fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome}
                        </p>
                      </div>
                      <div className="flex items-center justify-center pt-2">
                        <Button
                          variant={fipeFavoritesProps.isFavorited ? "secondary" : "outline"}
                          size="sm"
                          onClick={fipeFavoritesProps.onAddFavorite}
                          disabled={fipeFavoritesProps.isFavorited}
                          className="gap-1.5"
                        >
                          <span className={fipeFavoritesProps.isFavorited ? "text-amber-400" : ""}>★</span>
                          {fipeFavoritesProps.isFavorited ? 'Favoritado' : 'Favoritar'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs lg:text-sm text-muted-foreground pt-4 mt-4 border-t border-income/20">
                        <p>Código: {fipe.price.CodigoFipe}</p>
                        <p className="text-right">Ref: {fipe.price.MesReferencia}</p>
                        <p>Combustível: {fipe.price.Combustivel}</p>
                        <p className="text-right">Ano Modelo: {formatFipeAnoModelo(fipe.price.AnoModelo)}</p>
                      </div>
                      {/* Faixa para Compra + Categoria */}
                      {(() => {
                        const negotiationMin = fipe.priceValue * 0.95;
                        const mdlName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
                        const category = inferVehicleCategory(mdlName, fipe.vehicleType);
                        return (
                          <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-income/20">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faixa p/ Compra</p>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button type="button" className="p-0.5 hover:bg-muted rounded-full transition-colors" aria-label="Ajuda: Faixa para Compra">
                                      <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2 text-base">
                                        <HelpCircle className="h-4 w-4 text-primary" />
                                        Faixa para Compra
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="text-sm text-muted-foreground space-y-2">
                                      <p>
                                        A <strong>Tabela FIPE</strong> representa um valor de referência para veículos usados no Brasil, 
                                        calculado com base em preços praticados no mercado.
                                      </p>
                                      <p>
                                        Na prática, a maioria das negociações acontece entre <strong>95% e 100%</strong> do valor FIPE:
                                      </p>
                                      <ul className="list-disc list-inside space-y-1 mt-2">
                                        <li><strong>95%:</strong> Bom ponto de partida para negociação</li>
                                        <li><strong>100%:</strong> Valor máximo recomendado</li>
                                        <li><strong>&lt;90%:</strong> Pode indicar problemas ocultos ou oportunidade</li>
                                        <li><strong>&gt;100%:</strong> Prêmio por modelo/versão diferenciada</li>
                                      </ul>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <p className="text-sm font-semibold text-primary">{formatCurrency(negotiationMin)}</p>
                              <p className="text-[10px] text-muted-foreground">até {fipe.price.Valor} (FIPE)</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Categoria</p>
                              <p className="text-sm font-medium capitalize">{category.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {!fipe.price && !fipe.loading.price && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center p-8 rounded-xl bg-muted/50 text-center flex-1 border-2 border-dashed border-muted-foreground/20"
                  >
                    <Car className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm font-medium mb-1">
                      Consulte o valor do seu veículo
                    </p>
                    <p className="text-muted-foreground/70 text-xs max-w-[200px]">
                      Selecione marca, modelo e ano para ver o preço na tabela FIPE
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quanto custa ter esse carro? - Ownership Cost */}
      {fipe.price && !fipe.loading.price && fipe.priceValue > 0 && (() => {
        const depRate = depreciationEngineV2.result?.metadata.annualRatePhaseA ?? depreciationData.curveResult?.annualRate ?? (() => {
          if (vehicleAge <= 1) return 0.15;
          if (vehicleAge === 2) return 0.10;
          if (vehicleAge === 3) return 0.08;
          if (vehicleAge === 4) return 0.06;
          if (vehicleAge === 5) return 0.05;
          return 0.03;
        })();
        const depMonthly = (fipe.priceValue * depRate) / 12;
        const selectedModelName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
        
        // Theft risk detection
        const normalizedModel = selectedModelName.toLowerCase();
        const theftMatch = highTheftVehicles.find(v => v.keywords.some(k => normalizedModel.includes(k)));
        const theftRiskData = theftMatch ? {
          isHighRisk: true,
          adjustment: theftMatch.adjustmentFactor,
          reason: theftMatch.reason,
        } : undefined;

        return (
          <MobileSectionDrawer
            title="Quanto custa ter esse carro?"
            icon={<Calculator className="h-4 w-4 text-primary" />}
            badge={<Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-primary/10 text-primary border border-primary/20">Custos</Badge>}
            isTabletOrMobile={isTabletOrMobile}
          >
            <FipeOwnershipCostCard
              fipeValue={fipe.priceValue}
              modelName={selectedModelName}
              brandName={fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome}
              vehicleAge={vehicleAge}
              vehicleType={fipe.vehicleType}
              depreciationMonthly={depMonthly}
              yearLabel={fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || ''}
              theftRisk={theftRiskData}
            />
          </MobileSectionDrawer>
        );
      })()}

      {/* Time Series Depreciation Chart - LAZY LOADED for better initial performance */}
      {fipe.price && (fipeHistory.hasHistory || fipeHistory.loading) && (
        <MobileSectionDrawer
          title="Curva de Depreciação"
          icon={<TrendingDown className="h-4 w-4 text-primary" />}
          badge={(() => {
            const wls =
              fipe.price.AnoModelo !== 32000 ? fipeHistory.historyProjectionMeta : null;
            const pct = wls
              ? wls.projectionRateAnnual * 100
              : depreciationEngineV2.result?.metadata.annualRatePhaseA != null
                ? depreciationEngineV2.result.metadata.annualRatePhaseA * 100
                : null;
            return pct != null ? (
              <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                {pct.toFixed(1)}%/ano
              </Badge>
            ) : undefined;
          })()}
          isTabletOrMobile={isTabletOrMobile}
        >
          <SuspenseTimeSeriesChart
            priceHistory={fipeHistory.priceHistory}
            currentPrice={fipe.priceValue}
            modelName={fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || ''}
            modelYear={fipe.price.AnoModelo}
            loading={fipeHistory.loading}
            progress={fipeHistory.progress}
            cohortData={fipeHistory.cohortData}
            engineV2Result={depreciationEngineV2.result}
            consideredModels={depreciationEngineV2.consideredModels}
            familyName={depreciationEngineV2.familyName}
            historyProjectionMeta={fipeHistory.historyProjectionMeta}
          />
        </MobileSectionDrawer>
      )}

      {/* Cohort Matrix - LAZY LOADED for better initial performance */}
      {fipe.price && fipe.price.CodigoFipe && (
        <MobileSectionDrawer
          title="Matriz de Depreciação"
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          badge={<Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-primary/10 text-primary border border-primary/20">Avançado</Badge>}
          isTabletOrMobile={isTabletOrMobile}
        >
          <SuspenseCohortMatrix
            fipeCode={fipe.price.CodigoFipe}
            modelName={fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || ''}
          />
        </MobileSectionDrawer>
      )}

      {/* Error or no history available - fallback with retry button */}
      {fipe.price && !fipeHistory.hasHistory && !fipeHistory.loading && fipeHistory.error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Histórico temporal indisponível
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Exibindo análise cross-sectional como alternativa.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (fipe.price?.CodigoFipe && fipe.selectedYear && fipe.price?.AnoModelo) {
                    const vehicleTypeV2 = mapVehicleTypeToV2(fipe.vehicleType);
                    const parsedModelYear = Number(String(fipe.selectedYear).split('-')[0]);
                    const effectiveModelYear = Number.isFinite(parsedModelYear) ? parsedModelYear : fipe.price.AnoModelo;
                    fipeHistory.fetchFullHistory(vehicleTypeV2, fipe.price.CodigoFipe, fipe.selectedYear, effectiveModelYear);
                  }
                }}
                className="gap-2 shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback: Cross-sectional Depreciation Chart when history unavailable */}
      {fipe.price && !fipeHistory.hasHistory && !fipeHistory.loading && depreciationData.curveResult && depreciationData.agePoints.length > 0 && (
        <DepreciationCurveChart
          curveResult={depreciationData.curveResult}
          currentPrice={fipe.priceValue}
          currentAge={vehicleAge}
          modelName={fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || ''}
          rawDataPoints={depreciationData.agePoints}
        />
      )}

      {/* Price by Year Chart - Collapsible on tablet/mobile */}
      {(yearPrices.length > 0 || loadingYearPrices) && fipe.selectedModel && (
        <MobileSectionDrawer
          title="Preço por Ano/Modelo"
          icon={<Calendar className="h-4 w-4 text-primary" />}
          badge={yearPrices.length > 0 ? (
            <Badge variant="secondary" className="text-[10px]">
              {yearPrices.length} anos
            </Badge>
          ) : loadingYearPrices ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : undefined}
          isTabletOrMobile={isTabletOrMobile}
        >
          <AnimatedChartContainer delay={0.1}>
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span className="hidden sm:inline">Preço atual por ano/modelo de fabricação</span>
                  <span className="sm:hidden">Preço por Ano/Modelo</span>
                  {loadingYearPrices && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Valores FIPE atuais para cada ano de fabricação
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {loadingYearPrices ? (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground text-sm">
                      Carregando preços por ano...
                    </div>
                  </div>
                ) : yearPrices.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const cacheKey = `${fipe.vehicleType}-${fipe.selectedBrand}-${fipe.selectedModel}`;
                        yearPricesCacheRef.current.delete(cacheKey);
                        setLoadingYearPrices(true);
                        setTimeout(() => setLoadingYearPrices(false), 100);
                      }}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <div className="h-[280px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={yearPrices} margin={{ bottom: 5, left: 15, right: 15, top: 10 }}>
                        <CartesianGrid {...premiumGrid} />
                        <XAxis 
                          dataKey="displayYear" 
                          {...premiumXAxis}
                          tick={{ 
                            fontSize: 12, 
                            fill: 'hsl(var(--chart-axis))',
                            fontWeight: 500,
                            fontFamily: 'Inter, system-ui, sans-serif'
                          }}
                          interval={(() => {
                            if (yearPrices.length <= 6) return 0;
                            if (yearPrices.length <= 10) return 1;
                            return Math.ceil(yearPrices.length / 6) - 1;
                          })()}
                          height={30}
                        />
<YAxis
                          hide={isMobile}
                          tickFormatter={formatCurrencyShort}
                        />
                        <Tooltip content={<BarTooltip />} wrapperStyle={{ zIndex: 50 }} />
                        <Bar 
                          dataKey="price" 
                          name="Valor FIPE"
                          radius={[4, 4, 0, 0]}
                        >
                          {yearPrices.map((entry) => (
                            <Cell
                              key={entry.year}
                              fill={entry.year === fipe.selectedYear ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'}
                              stroke={entry.year === fipe.selectedYear ? 'hsl(var(--chart-2))' : 'none'}
                              strokeWidth={entry.year === fipe.selectedYear ? 2 : 0}
                            />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedChartContainer>
        </MobileSectionDrawer>
      )}

      {/* 0km Price History - Collapsible on tablet/mobile */}
      {zeroKmPriceData.length > 1 && (
        <MobileSectionDrawer
          title="Histórico Preço 0 km"
          icon={<TrendingDown className="h-4 w-4 text-primary" />}
          badge={
            <Badge variant="secondary" className="text-[10px]">
              {zeroKmPriceData.length} anos
            </Badge>
          }
          isTabletOrMobile={isTabletOrMobile}
        >
          <AnimatedChartContainer delay={0.2}>
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span className="hidden lg:inline">Histórico de preço deste modelo 0 km</span>
                  <span className="lg:hidden">Histórico Preço 0 km</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Valor do veículo 0 km no lançamento de cada ano/modelo
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-[280px] sm:h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={zeroKmPriceData} margin={{ top: 30, bottom: 5, right: 15, left: 15 }}>
                      <CartesianGrid {...premiumGrid} />
                      <XAxis 
                        dataKey="modelYear" 
                        {...premiumXAxis}
                        tick={{ 
                          fontSize: 12, 
                          fill: 'hsl(var(--chart-axis))',
                          fontWeight: 500,
                          fontFamily: 'Inter, system-ui, sans-serif'
                        }}
                        interval={(() => {
                          if (zeroKmPriceData.length <= 6) return 0;
                          if (zeroKmPriceData.length <= 10) return 1;
                          return Math.ceil(zeroKmPriceData.length / 6) - 1;
                        })()}
                        height={30}
                      />
<YAxis
                          hide={isMobile}
                          tickFormatter={formatCurrencyShort}
                      />
                      <Tooltip 
                        wrapperStyle={{ zIndex: 50 }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const data = payload[0].payload as { modelYear: number; price: number; launchYear: number; variation?: number };
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[160px] sm:min-w-[180px]">
                              <div className="text-xs text-muted-foreground mb-1">
                                Modelo {data.modelYear}
                              </div>
                              <div className="text-base sm:text-lg font-bold">{formatCurrency(data.price)}</div>
                              {data.variation !== undefined && (
                                <div className={`text-xs sm:text-sm font-medium mt-1 ${data.variation >= 0 ? 'text-income' : 'text-expense'}`}>
                                  {data.variation >= 0 ? '+' : ''}{data.variation.toFixed(1)}% vs. ano anterior
                                </div>
                              )}
                              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                Lançamento: Dez/{data.launchYear}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line 
                        type="monotone"
                        dataKey="price" 
                        name="Valor 0 km"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          const isSelected = fipe.price?.AnoModelo === payload.modelYear;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? 5 : 3}
                              fill={isSelected ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'}
                              stroke={isSelected ? 'hsl(var(--background))' : 'none'}
                              strokeWidth={isSelected ? 2 : 0}
                            />
                          );
                        }}
                        activeDot={{ r: 5, fill: 'hsl(var(--chart-2))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                        label={(props: any) => {
                          const { x, y, payload, index } = props;
                          if (!payload || payload.variation === undefined) return null;
                          const showLabel = zeroKmPriceData.length <= 4 || 
                            (zeroKmPriceData.length <= 8 && index % 2 === 1) ||
                            (zeroKmPriceData.length > 8 && index % 3 === 0);
                          if (!showLabel) return null;
                          
                          const isPositive = payload.variation >= 0;
                          const bgColor = isPositive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
                          const textColor = 'white';
                          const labelText = `${isPositive ? '+' : ''}${payload.variation.toFixed(1)}%`;
                          const labelWidth = labelText.length * 5 + 6;
                          
                          return (
                            <g>
                              <rect
                                x={x - labelWidth / 2}
                                y={y - 20}
                                width={labelWidth}
                                height={14}
                                rx={3}
                                fill={bgColor}
                              />
                              <text
                                x={x}
                                y={y - 10}
                                fill={textColor}
                                fontSize={8}
                                textAnchor="middle"
                                fontWeight="600"
                              >
                                {labelText}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 text-[10px] sm:text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 sm:p-2.5">
                  <span className="font-medium">Nota:</span> Cada ponto representa o preço FIPE do veículo 0 km em Dezembro 
                  do ano anterior ao ano/modelo.
                </div>
              </CardContent>
            </Card>
          </AnimatedChartContainer>
        </MobileSectionDrawer>
      )}

      {/* Favorite Swap Dialog */}
      <FavoriteSwapDialog
        open={fipeFavoritesProps.swapDialogOpen}
        onOpenChange={fipeFavoritesProps.setSwapDialogOpen}
        favorites={fipeFavoritesProps.favoriteVehicles}
        newVehicleName={fipeFavoritesProps.currentVehicleDisplayName}
        onSwap={fipeFavoritesProps.onSwapFavorite}
      />
    </div>
  );
};
