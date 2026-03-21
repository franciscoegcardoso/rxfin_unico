import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { BackLink } from '@/components/shared/BackLink';
import { useFipe, VehicleType, formatFipeYearName } from '@/hooks/useFipe';
import { useFipeFullHistory, mapVehicleTypeToV2 } from '@/hooks/useFipeFullHistory';
import { useDepreciationEngineV2 } from '@/hooks/useDepreciationEngineV2';
import { useOpportunityCostCalculation, ExpenseData, CreditData } from '@/hooks/useOpportunityCostCalculation';
import { useSimulatorContext } from '@/hooks/useSimulatorContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  DollarSign, 
  Calculator, 
  Wallet, 
  CheckCircle2,
  Zap,
  Landmark,
  Users,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleFipeSelector } from '@/components/simuladores/VehicleFipeSelector';
import { MobileSectionDrawer } from '@/components/simuladores/MobileSectionDrawer';
import { useFipeFavorites } from '@/hooks/useFipeFavorites';
import { FipeOwnershipCostCard } from '@/components/simuladores/FipeOwnershipCostCard';
import { FinancingDataCard, FinancingData, calculateFinancing } from '@/components/simuladores/FinancingDataCard';
import { ConsorcioDataCard, ConsorcioData, calculateConsorcio } from '@/components/simuladores/ConsorcioDataCard';
import { WealthPotentialHero } from '@/components/simuladores/WealthPotentialHero';
import { WealthCompositionCards } from '@/components/simuladores/WealthCompositionCards';
import { WealthComparisonChart } from '@/components/simuladores/WealthComparisonChart';
import { WealthEvolutionChart } from '@/components/simuladores/WealthEvolutionChart';
import { RealCostSummaryCard } from '@/components/simuladores/RealCostSummaryCard';
import { FipeHistoryAnalysisDialog } from '@/components/simuladores/FipeHistoryAnalysisDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// CDI anualizado atual (aproximado)
const CDI_ANUAL = 13.65; // % a.a.

type AnalysisMode = 'depreciation_only' | 'with_expenses';
type CreditType = 'financiamento' | 'consorcio';

const SimuladorCustoOportunidadeCarro: React.FC = () => {
  const { config } = useFinancial();
  const { load, isFresh, clear } = useSimulatorContext();
  const isMobile = useIsMobile();
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);
  
  React.useEffect(() => {
    const checkSize = () => setIsTabletOrMobile(window.innerWidth < 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
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

  // Veículos cadastrados
  const registeredVehicles = config.assets.filter(a => a.type === 'vehicle');

  // Estados do simulador
  const [selectedRegisteredVehicle, setSelectedRegisteredVehicle] = useState<string>('');
  const [isCarPaidOff, setIsCarPaidOff] = useState(true);
  const [selectedHorizon, setSelectedHorizon] = useState(3); // Anos (1-5)

  // Nova opção de modo de análise
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('depreciation_only');
  
  // Tipo de crédito (financiamento ou consórcio)
  const [creditType, setCreditType] = useState<CreditType>('financiamento');
  
  // Dados do financiamento
  const [financingData, setFinancingData] = useState<FinancingData>({
    entradaValue: 0,
    totalParcelas: 48,
    parcelasPagas: 0,
    valorParcela: 0,
  });
  
  // Dados do consórcio
  const [consorcioData, setConsorcioData] = useState<ConsorcioData>({
    valorCarta: 0,
    totalParcelas: 60,
    parcelasPagas: 0,
    valorParcela: 0,
    taxaAdmTotal: 15,
    fundoReserva: 2,
    contemplado: false,
    mesesAteContemplacao: 0,
    mesesAteContemplacaoEsperada: 30,
  });

  // Track if auto-fill was triggered
  const autoFillTriggeredRef = useRef<string | null>(null);
  
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

  // Valor do veículo
  const vehicleValue = fipe.priceValue || 0;

  // Nome do veículo
  const vehicleName = useMemo(() => {
    if (fipe.price) {
      return fipe.price.Modelo;
    }
    return 'Veículo';
  }, [fipe.price]);

  // Marca do veículo
  const brandName = useMemo(() => {
    if (fipe.brands.length > 0 && fipe.selectedBrand) {
      const brand = fipe.brands.find(b => b.codigo === fipe.selectedBrand);
      return brand?.nome || '';
    }
    return '';
  }, [fipe.brands, fipe.selectedBrand]);

  // Idade do veículo
  const vehicleAge = useMemo(() => {
    if (!fipe.price) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - fipe.price.AnoModelo;
  }, [fipe.price]);

  // Year label para FipeOwnershipCostCard
  const yearLabel = useMemo(() => {
    return fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || '';
  }, [fipe.years, fipe.selectedYear]);

  // Core Engine V2 - Enhanced depreciation calculation
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

  // Fetch historical data
  useEffect(() => {
    if (fipe.price?.CodigoFipe && fipe.selectedYear && fipe.price?.AnoModelo) {
      const vehicleTypeV2 = mapVehicleTypeToV2(fipe.vehicleType);
      const parsedModelYear = Number(String(fipe.selectedYear).split('-')[0]);
      const effectiveModelYear = Number.isFinite(parsedModelYear) ? parsedModelYear : fipe.price.AnoModelo;

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

  // Depreciação mensal do motor V2
  const depreciationMonthly = useMemo(() => {
    if (depreciationEngineV2.result && vehicleValue > 0) {
      const annualRate = depreciationEngineV2.result.metadata.annualRatePhaseA;
      return (vehicleValue * annualRate) / 12;
    }
    // Fallback: 15% a.a.
    return (vehicleValue * 0.15) / 12;
  }, [depreciationEngineV2.result, vehicleValue]);

  // Handle registered vehicle selection
  const handleSelectRegisteredVehicle = useCallback((vehicleId: string) => {
    if (selectedRegisteredVehicle === vehicleId) {
      setSelectedRegisteredVehicle('');
      autoFillTriggeredRef.current = null;
      fipe.reset();
      return;
    }
    
    setSelectedRegisteredVehicle(vehicleId);
    const vehicle = registeredVehicles.find(v => v.id === vehicleId);
    
    if (vehicle?.fipeVehicleType && vehicle?.fipeBrandCode && vehicle?.fipeModelCode && vehicle?.fipeYearCode) {
      if (autoFillTriggeredRef.current === vehicleId) return;
      autoFillTriggeredRef.current = vehicleId;
      
      fipe.initializeFromSaved({
        vehicleType: vehicle.fipeVehicleType,
        brandCode: vehicle.fipeBrandCode,
        modelCode: vehicle.fipeModelCode,
        yearCode: vehicle.fipeYearCode,
      });
    }
  }, [selectedRegisteredVehicle, registeredVehicles, fipe]);

  // Cálculos do financiamento
  const financingCalc = useMemo(() => {
    return calculateFinancing(vehicleValue, financingData);
  }, [vehicleValue, financingData]);
  
  // Cálculos do consórcio
  const consorcioCalc = useMemo(() => {
    return calculateConsorcio(vehicleValue, consorcioData);
  }, [vehicleValue, consorcioData]);

  // Preparar dados de crédito para o hook
  const creditDataForHook: CreditData | null = useMemo(() => {
    if (isCarPaidOff) return null;
    
    if (creditType === 'financiamento') {
      return {
        valorEntrada: financingData.entradaValue,
        parcelasPagas: financingData.parcelasPagas,
        parcelasRestantes: financingCalc.parcelasRestantes,
        valorParcela: financingData.valorParcela,
      };
    }
    
    return {
      parcelasPagas: consorcioData.parcelasPagas,
      parcelasRestantes: consorcioCalc.parcelasRestantes,
      valorParcela: consorcioData.valorParcela,
      contemplado: consorcioData.contemplado,
      mesesAteBem: consorcioCalc.mesesAteBem,
    };
  }, [isCarPaidOff, creditType, financingData, financingCalc, consorcioData, consorcioCalc]);

  // Preparar dados de despesas baseados na depreciação calculada
  const expenseDataForHook: ExpenseData | null = useMemo(() => {
    if (analysisMode !== 'with_expenses') return null;
    
    // Estimativas baseadas no valor do veículo
    const ipvaAnual = vehicleValue * 0.04; // ~4% do valor
    const seguroAnual = vehicleValue * 0.05; // ~5% do valor
    const manutencaoAnual = vehicleValue * 0.03; // ~3% do valor
    const combustivelMensal = 500; // Estimativa default
    
    return {
      ipvaAnual,
      seguroAnual,
      manutencaoAnual,
      combustivelMensal,
      licenciamentoAnual: 150,
      pneusAnual: 600,
      limpezaMensal: 100,
      estacionamentoMensal: 0,
      pedagioMensal: 0,
    };
  }, [analysisMode, vehicleValue]);

  // Usar o hook de cálculo de custo de oportunidade
  const opportunityCost = useOpportunityCostCalculation({
    vehicleValue,
    isCarPaidOff,
    creditType: isCarPaidOff ? null : creditType,
    creditData: creditDataForHook,
    expenses: expenseDataForHook,
    cdiAnual: CDI_ANUAL,
    includeExpenses: analysisMode === 'with_expenses',
  });

  // Projeção atual baseada no horizonte selecionado
  const currentProjection = useMemo(() => {
    const index = selectedHorizon - 1;
    return opportunityCost.projecoes[index] || opportunityCost.projecoes[0];
  }, [opportunityCost.projecoes, selectedHorizon]);

  const hasVehicleValue = vehicleValue > 0;

  return (
    
      <div className="space-y-6">
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Custo de Oportunidade do Carro
          </h1>
          <p className="text-muted-foreground mt-1">
            Quanto patrimônio você teria se investisse todo o dinheiro gasto com o carro?
          </p>
        </div>

        {/* Seleção de Veículo FIPE - Mesmo padrão do FipeSimulator */}
        <VehicleFipeSelector
          fipe={fipe}
          registeredVehicles={registeredVehicles}
          selectedRegisteredVehicle={selectedRegisteredVehicle}
          onSelectRegisteredVehicle={handleSelectRegisteredVehicle}
          {...fipeFavoritesProps}
        />

        {/* Seções de Análise - só aparecem quando há veículo selecionado */}
        {hasVehicleValue && (
          <div className="space-y-6">
            {/* Grid: Status do Pagamento + Análise Histórica lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status do Pagamento */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Status do Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Carro quitado?</Label>
                    <Switch checked={isCarPaidOff} onCheckedChange={setIsCarPaidOff} />
                  </div>

                  {isCarPaidOff && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Veículo quitado</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Capital total imobilizado: {formatMoney(vehicleValue)}
                      </p>
                    </div>
                  )}
                  
                  {!isCarPaidOff && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs">Tipo de crédito</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all text-center",
                            creditType === 'financiamento' 
                              ? "border-primary bg-primary/10" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setCreditType('financiamento')}
                        >
                          <Landmark className={cn(
                            "h-5 w-5 mx-auto mb-1",
                            creditType === 'financiamento' ? "text-primary" : "text-muted-foreground"
                          )} />
                          <p className={cn(
                            "text-xs font-medium",
                            creditType === 'financiamento' ? "text-primary" : "text-muted-foreground"
                          )}>
                            Financiamento
                          </p>
                        </div>
                        <div 
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all text-center",
                            creditType === 'consorcio' 
                              ? "border-primary bg-primary/10" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setCreditType('consorcio')}
                        >
                          <Users className={cn(
                            "h-5 w-5 mx-auto mb-1",
                            creditType === 'consorcio' ? "text-primary" : "text-muted-foreground"
                          )} />
                          <p className={cn(
                            "text-xs font-medium",
                            creditType === 'consorcio' ? "text-primary" : "text-muted-foreground"
                          )}>
                            Consórcio
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botão de Análise Histórica */}
              {fipe.price && (
                <Card className="flex flex-col justify-center">
                  <CardContent className="pt-6 flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      Análise detalhada do histórico de preços e depreciação
                    </p>
                    <FipeHistoryAnalysisDialog
                      priceHistory={fipeHistory.priceHistory}
                      currentPrice={vehicleValue}
                      modelName={vehicleName}
                      modelYear={fipe.price.AnoModelo}
                      loading={fipeHistory.loading}
                      progress={fipeHistory.progress}
                      cohortData={fipeHistory.cohortData}
                      engineV2Result={depreciationEngineV2.result}
                      consideredModels={depreciationEngineV2.consideredModels}
                      familyName={depreciationEngineV2.familyName}
                      historyProjectionMeta={fipeHistory.historyProjectionMeta}
                      fipeCode={fipe.price.CodigoFipe}
                      hasHistory={fipeHistory.hasHistory}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Dados do Financiamento ou Consórcio */}
            {!isCarPaidOff && creditType === 'financiamento' && (
              <FinancingDataCard
                vehicleValue={vehicleValue}
                financingData={financingData}
                onFinancingDataChange={setFinancingData}
              />
            )}
            
            {!isCarPaidOff && creditType === 'consorcio' && (
              <ConsorcioDataCard
                vehicleValue={vehicleValue}
                consorcioData={consorcioData}
                onConsorcioDataChange={setConsorcioData}
              />
            )}

            {/* Custos Detalhados */}
            {fipe.price && vehicleValue > 0 && (
              <MobileSectionDrawer
                title="Custos Detalhados"
                icon={<Calculator className="h-4 w-4 text-primary" />}
                isTabletOrMobile={isTabletOrMobile}
              >
                <FipeOwnershipCostCard
                  fipeValue={vehicleValue}
                  modelName={vehicleName}
                  brandName={brandName}
                  vehicleAge={vehicleAge}
                  vehicleType={fipe.vehicleType}
                  depreciationMonthly={depreciationMonthly}
                  yearLabel={yearLabel}
                />
              </MobileSectionDrawer>
            )}

            {/* Tipo de Análise */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Tipo de Análise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup 
                  value={analysisMode} 
                  onValueChange={(v) => setAnalysisMode(v as AnalysisMode)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      analysisMode === 'depreciation_only' 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setAnalysisMode('depreciation_only')}
                  >
                    <RadioGroupItem value="depreciation_only" id="mode-simple" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="mode-simple" className="font-medium cursor-pointer flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Análise Simplificada
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Capital investido + depreciação
                      </p>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      analysisMode === 'with_expenses' 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setAnalysisMode('with_expenses')}
                  >
                    <RadioGroupItem value="with_expenses" id="mode-complete" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="mode-complete" className="font-medium cursor-pointer flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-destructive" />
                        Análise Completa
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inclui custos operacionais
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Hero Section - Potencial Patrimônio */}
            {currentProjection && (
              <WealthPotentialHero
                selectedHorizon={selectedHorizon}
                onHorizonChange={setSelectedHorizon}
                montanteAcumulado={currentProjection.montanteTotal}
                valorResidualCarro={currentProjection.valorResidualCarro}
                gapRiqueza={currentProjection.gapRiqueza}
                custoMensalTotal={opportunityCost.custoMensalTotal}
                capitalInicial={opportunityCost.capitalInicial}
              />
            )}

            {/* Análise RXfin — seção colapsada */}
            {currentProjection && (
              <MobileSectionDrawer
                title="Análise RXfin"
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                isTabletOrMobile={isTabletOrMobile}
              >
                <div className="space-y-6">
                  {/* TCO - Custo Real Total */}
                  <RealCostSummaryCard
                    capitalInicial={currentProjection.capitalInicial}
                    parcelasAcumuladas={currentProjection.parcelasAcumuladas}
                    despesasAcumuladas={currentProjection.despesasAcumuladas}
                    depreciacaoTotal={vehicleValue - currentProjection.valorResidualCarro}
                    rendimentosPerdidos={currentProjection.rendimentos}
                    montantePotencial={currentProjection.montanteTotal}
                    valorResidualCarro={currentProjection.valorResidualCarro}
                    anos={selectedHorizon}
                  />

                  {/* Composição do Patrimônio (tabela verde) */}
                  <Card>
                    <CardContent className="pt-6">
                      <WealthCompositionCards
                        capitalInicial={currentProjection.capitalInicial}
                        parcelasAcumuladas={currentProjection.parcelasAcumuladas}
                        despesasAcumuladas={currentProjection.despesasAcumuladas}
                        rendimentosGanhos={currentProjection.rendimentos}
                        valorResidualCarro={currentProjection.valorResidualCarro}
                        montanteTotal={currentProjection.montanteTotal}
                        anos={selectedHorizon}
                        cdiAnual={CDI_ANUAL}
                      />
                    </CardContent>
                  </Card>

                  {/* Patrimônio vs Carro */}
                  <WealthComparisonChart
                    chartData={currentProjection.chartData}
                    selectedHorizon={selectedHorizon}
                  />

                  {/* Evolução do Patrimônio */}
                  <WealthEvolutionChart
                    compositionData={currentProjection.compositionData}
                    selectedHorizon={selectedHorizon}
                  />
                </div>
              </MobileSectionDrawer>
            )}
          </div>
        )}

        {/* Mensagem quando não há veículo selecionado */}
        {!hasVehicleValue && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Selecione um veículo para começar
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Use os campos acima para escolher um veículo cadastrado ou consultar a tabela FIPE.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    
  );
};

export default SimuladorCustoOportunidadeCarro;
