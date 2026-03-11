import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BrandSearchSelect } from '@/components/ui/brand-search-select';
import { Car, Loader2, AlertCircle, Calendar, X, Info, Bike, Truck, CheckCircle2, ChevronDown, TrendingDown, TrendingUp, BarChart3, Sparkles, DollarSign, RefreshCw, Star, FileDown } from 'lucide-react';
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
import { EmptyFipe } from '@/design-system/components/empty-states';
import { ErrorCard } from '@/design-system/components/ErrorCard';

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
  calculateDepreciationCurve, 
  convertYearPricesToAgePoints,
  DepreciationCurveResult,
  AgePricePoint
} from '@/utils/depreciationRegression';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  FipePdfReportContent,
  type FipePdfReportData,
  type OwnershipExportItem,
} from './FipePdfReportContent';
import { exportFipeReportToPdf } from './fipePdfExport';
import type { FipeOwnershipExportData } from './FipeOwnershipCostCard';

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

  // Exportação PDF: dados de custo (preenchidos por FipeOwnershipCostCard) e refs do relatório
  const ownershipExportDataRef = useRef<FipeOwnershipExportData | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [pdfReportData, setPdfReportData] = useState<FipePdfReportData | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

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

  // Monta dados do relatório para exportação PDF
  const buildPdfReportData = useCallback((): FipePdfReportData | null => {
    if (!fipe.price || fipe.priceValue <= 0) return null;
    const hist = fipeHistory.priceHistory;
    const firstPrice = hist.length > 0 ? hist[0].price : fipe.priceValue;
    const lastPrice = hist.length > 0 ? hist[hist.length - 1].price : fipe.priceValue;
    const totalPct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    const monthsCount = hist.length;
    const annualizedRate =
      monthsCount > 1 ? (totalPct / (monthsCount - 1)) * 12 : totalPct;
    const ownership = ownershipExportDataRef.current;
    const cohort = cohortMatrix.matrixData;
    const modelName = fipe.models.find((m) => String(m.codigo) === fipe.selectedModel)?.nome ?? '';
    const brandName = fipe.brands.find((b) => b.codigo === fipe.selectedBrand)?.nome ?? '';
    const category = inferVehicleCategory(modelName, fipe.vehicleType).replace(/_/g, ' ');
    let monthlyVariation: number | undefined;
    if (hist.length >= 2) {
      const prev = hist[hist.length - 2].price;
      const last = hist[hist.length - 1].price;
      monthlyVariation = prev > 0 ? ((last - prev) / prev) * 100 : undefined;
    }
    const historyChartData = hist.map((p) => ({
      date: p.date.toISOString(),
      monthLabel: p.monthLabel,
      price: p.price,
    }));
    const historyPeriodLabel =
      hist.length >= 2
        ? `${hist[0].monthLabel} - ${hist[hist.length - 1].monthLabel}`
        : undefined;
    return {
      analysisDate: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      fipeValue: fipe.price.Valor,
      vehicleName: `${brandName} ${modelName}`,
      referenceMonth: fipe.price.MesReferencia,
      monthlyVariation,
      category,
      codigoFipe: fipe.price.CodigoFipe,
      anoModelo: fipe.price.AnoModelo === 32000 ? '0 km' : String(fipe.price.AnoModelo),
      combustivel: fipe.price.Combustivel,
      ownershipTotalMonthly: ownership?.totalMonthly ?? 0,
      ownershipTotalAnnual: ownership?.totalAnnual ?? 0,
      ownershipItems: (ownership?.costItems ?? []).map(
        (i): OwnershipExportItem => ({
          key: i.key,
          label: i.label,
          monthlyValue: i.monthlyValue,
          annualValue: i.annualValue,
        })
      ),
      opportunityCostNote: ownership?.opportunityCostNote,
      historyValor0km: firstPrice,
      historyValorAtual: lastPrice,
      historyTotalDepreciacaoPct: totalPct,
      historyPctDepreciacao: annualizedRate,
      historyChartData,
      historyPeriodLabel,
      cohortModelYears: cohort?.modelYears ?? [],
      cohortCalendarYears: cohort?.calendarYears ?? [],
      cohortCells: (cohort?.cells ?? []).map((c) => ({
        modelYear: c.modelYear,
        calendarYear: c.calendarYear,
        price: c.price,
      })),
      cohortModelName: modelName || undefined,
      cohortFipeCode: fipe.price.CodigoFipe,
      yearPrices: yearPrices.map((yp) => ({
        year: yp.year,
        yearLabel: yp.yearLabel,
        displayYear: yp.displayYear,
        price: yp.price,
      })),
      selectedYear: fipe.selectedYear ?? undefined,
      zeroKmData: zeroKmPriceData.map((d) => ({
        modelYear: d.modelYear,
        price: d.price,
        variation: d.variation,
      })),
    };
  }, [
    fipe.price,
    fipe.priceValue,
    fipe.selectedBrand,
    fipe.selectedModel,
    fipe.selectedYear,
    fipe.models,
    fipe.brands,
    fipe.vehicleType,
    fipeHistory.priceHistory,
    cohortMatrix.matrixData,
    yearPrices,
    zeroKmPriceData,
  ]);

  const handleExportPdf = useCallback(() => {
    if (!fipe.price || fipe.priceValue <= 0) {
      toast.error('Consulte um veículo na FIPE antes de exportar o PDF.');
      return;
    }
    const data = buildPdfReportData();
    if (!data) return;
    setPdfExporting(true);
    setPdfReportData(data);
    // Aguarda o relatório ser montado e os gráficos pintarem antes de capturar
    setTimeout(() => {
      exportFipeReportToPdf({
        containerRef: pdfContainerRef,
        fileName: `analise-fipe-${data.vehicleName.replace(/\s+/g, '-').slice(0, 40)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      })
        .then(() => {
          toast.success('PDF gerado com sucesso.');
        })
        .catch((err) => {
          console.error('FipePdfExport:', err);
          toast.error('Erro ao gerar o PDF. Tente novamente.');
        })
        .finally(() => {
          setPdfReportData(null);
          setPdfExporting(false);
        });
    }, 1600);
  }, [fipe.price, fipe.priceValue, buildPdfReportData]);

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
                  <Star className="h-3 w-3 text-primary" />
                  Favoritos
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

      {/* Main Simulator — layout conforme modelo: esquerda (seleção) + direita (resultado) */}
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                <Car className="h-5 w-5 text-primary shrink-0" />
                Dados do veículo na FIPE
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Consulte o valor de veículos na tabela FIPE e simule diferentes percentuais.
              </CardDescription>
            </div>
            {fipe.price && !fipe.loading.price && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={pdfExporting}
                className="gap-2 shrink-0"
              >
                {pdfExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Exportar PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left box — mesma altura e alinhamento que a caixa da direita */}
            <div className="flex flex-col min-w-0 min-h-0 rounded-xl border border-border bg-card p-6 flex-1">
              <div className="space-y-4 flex flex-col flex-1">
              {/* Vehicle Type */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Tipo de Veículo</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'carros' as VehicleType, label: 'Carros', icon: Car },
                    { value: 'motos' as VehicleType, label: 'Motos', icon: Bike },
                    { value: 'caminhoes' as VehicleType, label: 'Caminhões', icon: Truck },
                  ].map((type) => {
                    const isSelected = fipe.vehicleType === type.value;
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => fipe.setVehicleType(type.value)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <IconComponent className="h-6 w-6" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">MARCA *</span>
                  {fipe.selectedBrand && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Marca selecionada
                    </span>
                  )}
                </div>
                {fipe.loading.brands ? (
                  <Skeleton className="h-12 rounded-xl bg-muted animate-pulse" />
                ) : (
                  <div className="[&_button]:h-12 [&_button]:rounded-xl [&_button]:bg-card [&_button]:border [&_button]:border-border [&_button]:text-foreground">
                    <BrandSearchSelect
                      fipeBrands={fipe.brands}
                      value={fipe.selectedBrand}
                      onValueChange={fipe.setSelectedBrand}
                      disabled={fipe.loading.brands}
                      loading={fipe.loading.brands}
                      placeholder="Selecione a marca"
                      searchPlaceholder="Buscar marca..."
                    />
                  </div>
                )}
              </div>

              {/* Modelo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">MODELO *</span>
                  {fipe.selectedModel && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Modelo selecionado
                    </span>
                  )}
                </div>
                {fipe.loading.models ? (
                  <Skeleton className="h-12 rounded-xl bg-muted animate-pulse" />
                ) : (
                  <div className="[&_button]:h-12 [&_button]:rounded-xl [&_button]:bg-card [&_button]:border [&_button]:border-border [&_button]:text-foreground">
                    <SearchableSelect
                      options={fipe.models.map((m) => ({ value: String(m.codigo), label: m.nome }))}
                      value={fipe.selectedModel}
                      onValueChange={fipe.setSelectedModel}
                      disabled={!fipe.selectedBrand || fipe.loading.models}
                      loading={fipe.loading.models}
                      placeholder="Selecione o modelo"
                      searchPlaceholder="Buscar modelo..."
                      emptyMessage="Nenhum modelo encontrado."
                    />
                  </div>
                )}
              </div>

              {/* Ano/Modelo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">ANO/MODELO *</span>
                  {fipe.selectedYear && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Ano selecionado
                    </span>
                  )}
                </div>
                {fipe.loading.years ? (
                  <Skeleton className="h-12 rounded-xl bg-muted animate-pulse" />
                ) : (
                  <div className="[&_button]:h-12 [&_button]:rounded-xl [&_button]:bg-card [&_button]:border [&_button]:border-border [&_button]:text-foreground">
                    <SearchableSelect
                      options={fipe.years.map((y) => ({ value: y.codigo, label: formatFipeYearName(y.nome) }))}
                      value={fipe.selectedYear}
                      onValueChange={fipe.setSelectedYear}
                      disabled={!fipe.selectedModel || fipe.loading.years}
                      loading={fipe.loading.years}
                      placeholder="Selecione o ano"
                      searchPlaceholder="Buscar ano..."
                      emptyMessage="Nenhum ano encontrado."
                    />
                  </div>
                )}
              </div>

              {/* Consulta automática ao selecionar marca, modelo e ano — sem botão Consultar */}
              {fipe.loading.price && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Consultando valor FIPE...
                </div>
              )}

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
            </div>

            {/* Right box — mesma altura e alinhamento que a caixa da esquerda */}
            <div className="flex flex-col min-h-0 min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {fipe.loading.price && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-h-[280px]"
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
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* FIPEResultCard — caixa alinhada à esquerda (mesmo border, padding, altura) */}
                    <div className="relative p-6 rounded-xl bg-card border border-border flex-1 flex flex-col min-h-0 min-w-0">
                      {/* Indicador "Consulta realizada" no canto superior direito */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Consulta realizada
                      </div>

                      <div className="flex flex-col gap-3 pr-32">
                        <p className="text-sm text-muted-foreground font-medium">Valor FIPE</p>
                        <p className="font-syne font-extrabold text-3xl sm:text-4xl text-foreground leading-tight">
                          {fipe.price.Valor}
                        </p>
                        <p className="font-syne font-bold text-lg sm:text-xl text-foreground">
                          {fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome} {fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome}
                        </p>
                        <p className="text-sm text-muted-foreground">Mês de referência: {fipe.price.MesReferencia}</p>
                        {/* Variação mensal (últimos 2 pontos do histórico) — mantida conforme solicitado */}
                        {(() => {
                          const hist = fipeHistory.priceHistory;
                          if (hist.length >= 2) {
                            const prev = hist[hist.length - 2].price;
                            const last = hist[hist.length - 1].price;
                            const pct = prev > 0 ? ((last - prev) / prev) * 100 : 0;
                            const positive = pct >= 0;
                            return (
                              <div className={cn("flex items-center gap-1.5 text-sm font-medium", positive ? "text-income" : "text-expense")}>
                                {positive ? <TrendingUp className="h-4 w-4 shrink-0" /> : <TrendingDown className="h-4 w-4 shrink-0" />}
                                <span>{positive ? '+' : ''}{pct.toFixed(2)}% variação mensal</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {/* Tag categoria (ex.: Sedan Médio) */}
                        {(() => {
                          const mdlName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
                          const category = inferVehicleCategory(mdlName, fipe.vehicleType);
                          return (
                            <span className="inline-flex w-fit bg-primary/10 text-primary text-xs font-medium rounded-full px-2.5 py-1 capitalize">
                              {category.replace(/_/g, ' ')}
                            </span>
                          );
                        })()}
                        <div className="flex items-center pt-1">
                          <Button
                            variant={fipeFavoritesProps.isFavorited ? "secondary" : "outline"}
                            size="sm"
                            onClick={fipeFavoritesProps.onAddFavorite}
                            disabled={fipeFavoritesProps.isFavorited}
                            className="gap-1.5 border-border bg-card text-foreground hover:bg-accent"
                          >
                            <Star className={cn("h-4 w-4 shrink-0", fipeFavoritesProps.isFavorited && "fill-primary text-primary")} />
                            {fipeFavoritesProps.isFavorited ? 'Favoritado' : 'Favoritar'}
                          </Button>
                        </div>
                      </div>

                      <div className="pt-4 mt-auto border-t border-border space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Detalhes do veículo</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <p><span className="font-medium text-foreground">Código FIPE:</span> {fipe.price.CodigoFipe}</p>
                          <p><span className="font-medium text-foreground">Ano/Modelo:</span> {fipe.price.AnoModelo === 32000 ? '0 km' : fipe.price.AnoModelo}</p>
                          <p><span className="font-medium text-foreground">Combustível:</span> {fipe.price.Combustivel}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!fipe.price && !fipe.loading.price && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center"
                  >
                    <EmptyFipe />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quanto custa ter esse carro? - Ownership Cost (layout análogo à seção Histórico FIPE) */}
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
            <Card className="border border-border rounded-xl bg-card shadow-sm">
              <CardHeader className="pb-2 px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="hidden sm:inline">Quanto custa ter esse carro?</span>
                      <span className="sm:hidden">Quanto custa ter esse carro?</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs mt-1">
                      Distribuição de custos mensais e anuais, custo de oportunidade e personalização de parâmetros.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pt-0">
                <FipeOwnershipCostCard
                  fipeValue={fipe.priceValue}
                  modelName={selectedModelName}
                  brandName={fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome}
                  vehicleAge={vehicleAge}
                  vehicleType={fipe.vehicleType}
                  depreciationMonthly={depMonthly}
                  yearLabel={fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || ''}
                  theftRisk={theftRiskData}
                  onExportData={(data) => { ownershipExportDataRef.current = data; }}
                />
              </CardContent>
            </Card>
          </MobileSectionDrawer>
        );
      })()}

      {/* Time Series Depreciation Chart - LAZY LOADED for better initial performance */}
      {fipe.price && (fipeHistory.hasHistory || fipeHistory.loading) && (
        <MobileSectionDrawer
          title="Curva de Depreciação"
          icon={<TrendingDown className="h-4 w-4 text-primary" />}
          badge={depreciationEngineV2.result ? (
            <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
              {(depreciationEngineV2.result.metadata.annualRatePhaseA * 100).toFixed(1)}%/ano
            </Badge>
          ) : undefined}
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
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-warning">
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
                          hide
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
                        hide
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

      {/* Container do relatório para PDF: no viewport com opacity 0 para ser pintado (evita PDF em branco), uma página A4 */}
      {pdfReportData && (
        <div
          className="fixed left-0 top-0 z-[9999] overflow-hidden pointer-events-none"
          style={{
            width: 794,
            minHeight: 1123,
            opacity: 0,
            visibility: 'visible',
          }}
          aria-hidden
        >
          <FipePdfReportContent ref={pdfContainerRef} data={pdfReportData} />
        </div>
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
