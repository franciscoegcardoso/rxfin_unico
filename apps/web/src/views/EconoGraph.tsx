import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  ChevronDown,
  ChevronUp,
  Calendar,
  Lightbulb,
  Settings2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { BackLink } from '@/components/shared/BackLink';
import { cn } from '@/lib/utils';
import { useUserKV } from '@/hooks/useUserKV';

// EconoGraph components
import { ASSETS_CONFIG } from '@/components/econograph/types';
import { getHistoricalData } from '@/components/econograph/dataGenerator';
import { 
  calculateCumulativeData, 
  calculatePortfolioResults,
  calculatePortfolioChartData,
} from '@/components/econograph/calculations';
import { EconoChart } from '@/components/econograph/EconoChart';
import { HelpDialog } from '@/components/econograph/HelpDialog';
import { IndicatorsSidebar } from '@/components/econograph/IndicatorsSidebar';
import { StatCard } from '@/components/econograph/StatCard';
import { OnboardingCard } from '@/components/econograph/OnboardingCard';
import { ChartGuide } from '@/components/econograph/ChartGuide';
import { IndicatorsTable } from '@/components/econograph/IndicatorsTable';

// Get raw data
const RAW_DATA = getHistoricalData();

// Default weights and benchmarks from config
const getDefaultWeights = () => 
  Object.fromEntries(Object.entries(ASSETS_CONFIG).map(([k, v]) => [k, v.defaultWeight]));

const getDefaultBenchmarks = () => 
  Object.fromEntries(Object.entries(ASSETS_CONFIG).map(([k, v]) => [k, v.defaultBenchmark]));

const EconoGraph: React.FC = () => {
  const isMobile = useIsMobile();
  
  // State
  const [tab, setTab] = useState<'overview' | 'portfolio'>('overview');
  const [startIndex, setStartIndex] = useState(() => {
    const defaultDate = '2021-01';
    const idx = RAW_DATA.findIndex(d => d.date === defaultDate);
    return idx >= 0 ? idx : Math.max(0, RAW_DATA.length - 48);
  });
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['ipca', 'cdi', 'ibov']);
  const [weights, setWeights] = useState<Record<string, number>>(getDefaultWeights);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<Record<string, boolean>>(getDefaultBenchmarks);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['config', 'chart']));
  const { value: onboardingComplete, setValue: setOnboardingComplete } = useUserKV<boolean>('econograph-onboarding-complete', false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Sync showOnboarding with KV value
  React.useEffect(() => {
    if (onboardingComplete) {
      setShowOnboarding(false);
    }
  }, [onboardingComplete]);
  
  // Mobile section toggle
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  const isSectionExpanded = (sectionId: string) => !isMobile || expandedSections.has(sectionId);
  
  // Derived data
  const filteredData = useMemo(() => RAW_DATA.slice(startIndex), [startIndex]);
  const totalWeight = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);
  
  // Bitcoin validation: only comparable from 2018 onwards
  const startYear = useMemo(() => {
    const dateStr = RAW_DATA[startIndex]?.date;
    return dateStr ? parseInt(dateStr.split('-')[0], 10) : 2021;
  }, [startIndex]);
  const hasBitcoinWithInvalidPeriod = weights.btc > 0 && startYear < 2018;
  const isWeightValid = totalWeight === 100;
  
  // Calculations
  const portfolioResults = useMemo(
    () => calculatePortfolioResults(filteredData, weights),
    [filteredData, weights]
  );
  
  const cumulativeChartData = useMemo(
    () => calculateCumulativeData(filteredData, activeIndicators),
    [filteredData, activeIndicators]
  );
  
  const portfolioChartData = useMemo(
    () => calculatePortfolioChartData(filteredData, portfolioResults, selectedBenchmarks, showBenchmarks),
    [filteredData, portfolioResults, selectedBenchmarks, showBenchmarks]
  );
  
  // Handlers
  const handleToggleIndicator = (id: string) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleBulkIndicator = (type: 'all' | 'none' | 'main') => {
    if (type === 'all') setActiveIndicators(Object.keys(ASSETS_CONFIG));
    else if (type === 'none') setActiveIndicators([]);
    else setActiveIndicators(['ipca', 'cdi', 'ibov', 'poupanca']);
  };
  
  const handleWeightChange = (id: string, value: number) => {
    setWeights(prev => ({ ...prev, [id]: value }));
  };
  
  const handleResetWeights = () => {
    setWeights(getDefaultWeights());
  };
  
  const handleToggleBenchmark = (id: string) => {
    setSelectedBenchmarks(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const handleBulkBenchmark = (type: 'all' | 'none' | 'main' | 'global') => {
    const newState = { ...selectedBenchmarks };
    Object.keys(newState).forEach(k => {
      if (type === 'all') newState[k] = true;
      else if (type === 'none') newState[k] = false;
      else if (type === 'main') newState[k] = ['ipca', 'cdi', 'ibov', 'poupanca'].includes(k);
      else newState[k] = ASSETS_CONFIG[k].group === 'Global';
    });
    setSelectedBenchmarks(newState);
  };
  
  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setShowOnboarding(false);
  };
  
  return (
    
      <div className="space-y-6">
        {/* Header - Same style as SimuladorFipe */}
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-3xl font-bold text-foreground">EconoGraph</h1>
          <p className="text-muted-foreground mt-1">
            Compare indicadores econômicos e simule carteiras de investimento
          </p>
        </div>

        {/* Onboarding Card */}
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingCard onComplete={handleOnboardingComplete} />
          )}
        </AnimatePresence>

        {/* Tab Selection */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'overview' | 'portfolio')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="overview">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Simulador de Carteira</span>
              <span className="sm:hidden">Carteira</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Content - Desktop: Sidebar Left + Chart Right */}
        <div className={cn(
          "grid gap-6",
          !isMobile && "grid-cols-[320px_1fr]"
        )}>
          {/* Left Sidebar - Configuration */}
          <div className="space-y-4">
            {/* Period Selection */}
            <Card>
              <CardHeader 
                className={cn("pb-3", isMobile && "cursor-pointer")}
                onClick={() => isMobile && toggleSection('period')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Período</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {filteredData.length} meses
                    </Badge>
                    {isMobile && (
                      isSectionExpanded('period') ? 
                        <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isSectionExpanded('period') && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Data inicial da análise
                    </Label>
                    <Select
                      value={startIndex.toString()}
                      onValueChange={(value) => setStartIndex(parseInt(value))}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {RAW_DATA.slice(0, RAW_DATA.length - 12).map((d, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {d.date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Indicators/Portfolio Config */}
            <Card>
              <CardHeader 
                className={cn("pb-3", isMobile && "cursor-pointer")}
                onClick={() => isMobile && toggleSection('config')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">
                      {tab === 'overview' ? 'Indicadores' : 'Alocação'}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {tab === 'overview' ? (
                      <Badge variant="outline" className="text-xs">
                        {activeIndicators.length} selecionados
                      </Badge>
                    ) : (
                      <Badge 
                        variant={isWeightValid ? "outline" : "destructive"} 
                        className="text-xs"
                      >
                        {totalWeight}%
                      </Badge>
                    )}
                    {isMobile && (
                      isSectionExpanded('config') ? 
                        <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isSectionExpanded('config') && (
                <CardContent className="pt-0">
                  <IndicatorsSidebar
                    tab={tab}
                    activeIndicators={activeIndicators}
                    weights={weights}
                    selectedBenchmarks={selectedBenchmarks}
                    totalWeight={totalWeight}
                    isWeightValid={isWeightValid}
                    startYear={startYear}
                    onToggleIndicator={handleToggleIndicator}
                    onBulkIndicator={handleBulkIndicator}
                    onWeightChange={handleWeightChange}
                    onResetWeights={handleResetWeights}
                    onToggleBenchmark={handleToggleBenchmark}
                    onBulkBenchmark={handleBulkBenchmark}
                  />
                </CardContent>
              )}
            </Card>

            {/* Help Button - Desktop only in sidebar */}
            {!isMobile && (
              <Button 
                variant="outline" 
                onClick={() => setIsHelpOpen(true)}
                className="w-full gap-2"
                size="sm"
              >
                <Lightbulb className="h-4 w-4" />
                Aprenda sobre os indicadores
              </Button>
            )}
          </div>

          {/* Right Content - Chart Area */}
          <div className="space-y-4">
            {/* Chart Guide */}
            <ChartGuide tab={tab} />

            {/* Main Chart */}
            <Card>
              <CardHeader 
                className={cn("pb-3", isMobile && "cursor-pointer")}
                onClick={() => isMobile && toggleSection('chart')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {tab === 'overview' ? 'Performance Acumulada' : 'Evolução da Carteira'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {tab === 'overview' 
                        ? 'Base 100 = valor inicial no período selecionado'
                        : 'Compare sua carteira com benchmarks de mercado'
                      }
                    </CardDescription>
                  </div>
                  {isMobile && (
                    isSectionExpanded('chart') ? 
                      <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {isSectionExpanded('chart') && (
                <CardContent>
                  <EconoChart
                    data={tab === 'overview' ? cumulativeChartData : portfolioChartData}
                    title=""
                    tab={tab}
                    isWeightValid={isWeightValid}
                    totalWeight={totalWeight}
                    showBenchmarks={showBenchmarks}
                    onToggleBenchmarks={() => setShowBenchmarks(!showBenchmarks)}
                    onResetWeights={handleResetWeights}
                  />
                </CardContent>
              )}
            </Card>

            {/* Bitcoin Period Warning */}
            <AnimatePresence>
              {tab === 'portfolio' && hasBitcoinWithInvalidPeriod && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5 text-destructive" />
                        </div>
                        <p className="text-sm text-destructive font-medium">
                          O bitcoin só é comparável para períodos posteriores a partir de 2018.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Cards (Portfolio only) */}
            <AnimatePresence>
              {tab === 'portfolio' && isWeightValid && !hasBitcoinWithInvalidPeriod && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <StatCard
                    Icon={TrendingUp}
                    colorClass={portfolioResults.totalReturn >= 0 ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}
                    label="Retorno Total"
                    value={`${portfolioResults.totalReturn >= 0 ? '+' : ''}${portfolioResults.totalReturn.toFixed(1)}%`}
                    delay={0.1}
                    trend={portfolioResults.totalReturn >= 0 ? 'up' : 'down'}
                  />
                  <StatCard
                    Icon={Activity}
                    colorClass="bg-primary/10 text-primary"
                    label="Volatilidade"
                    value={`${portfolioResults.volatility.toFixed(2)}%`}
                    delay={0.2}
                  />
                  <StatCard
                    Icon={Award}
                    colorClass="bg-warning/10 text-warning"
                    label="Melhor Mês"
                    value={`+${portfolioResults.bestMonth.toFixed(1)}%`}
                    delay={0.3}
                    trend="up"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Indicators Table (Overview only) */}
            {tab === 'overview' && activeIndicators.length > 0 && (
              <IndicatorsTable 
                data={filteredData} 
                activeIndicators={activeIndicators} 
              />
            )}

            {/* Empty State */}
            {tab === 'overview' && activeIndicators.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Selecione indicadores
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Escolha os indicadores no painel à esquerda para começar a comparar.
                  </p>
                  <Button onClick={() => handleBulkIndicator('main')} size="sm">
                    Carregar Principais BR
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Help Button - Mobile only at bottom */}
        {isMobile && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setIsHelpOpen(true)}
              className="gap-2"
              size="sm"
            >
              <Lightbulb className="h-4 w-4" />
              Aprenda sobre os indicadores
            </Button>
          </div>
        )}

        {/* Help Dialog */}
        <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    
  );
};

export default EconoGraph;
