import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { 
  Fuel, 
  Zap, 
  RotateCcw, 
  HelpCircle,
  Droplet,
  Gauge,
  BatteryCharging,
  TrendingDown,
  TrendingUp,
  Info,
  Scale,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { fuelPrices } from '@/data/vehicleBenchmarks';
import { ConsumptionSuggestion } from '@/hooks/useVehicleConsumption';

// Fator de conversão etanol para gasolina (fonte: PBE INMETRO)
const ETHANOL_CONVERSION_FACTOR = 0.70;

// Ponto de equilíbrio para comparação Etanol vs Gasolina
// Se (preço_etanol / preço_gasolina) < 0.70, etanol é mais vantajoso
// Fonte: PBE Veicular INMETRO - considerando rendimento energético
const ETHANOL_EQUILIBRIUM_RATIO = 0.70;

// Split padrão para híbridos plugin (60% gasolina, 40% elétrico)
const DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT = 60;

// Tipos de combustível suportados
export type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'electric';

// Tipo de veículo para determinar comportamento
export type VehiclePowertrainType = 'gasoline' | 'flex' | 'diesel' | 'electric' | 'hybrid' | 'hybrid_plugin';

export interface FuelRowData {
  type: FuelType;
  label: string;
  icon: React.ReactNode;
  unit: string; // L ou kWh
  consumption: number; // km/L ou km/kWh
  price: number; // R$/L ou R$/kWh
  monthlyKm: number; // Km rodados com este combustível
  splitPercent?: number; // Para híbridos plugin: % do total
  isCustomConsumption: boolean;
  isCustomPrice: boolean;
  isCustomKm: boolean;
  suggestedConsumption: number;
  suggestedPrice: number;
  source: 'inmetro' | 'estimate' | 'manual';
  sourceLabel: string;
}

interface FuelParametersTableProps {
  yearLabel: string; // Ex: "2024 Flex", "2023 Diesel"
  consumptionSuggestion: ConsumptionSuggestion | null;
  consumptionLoading: boolean;
  initialMonthlyKm?: number;
  onChange: (totalMonthlyKm: number, totalMonthlyCost: number, fuelRows: FuelRowData[]) => void;
  persistedData?: {
    fuelRows?: FuelRowData[];
    totalMonthlyKm?: number;
  };
}

// Helpers de formatação
const formatNumber = (value: number, decimals = 1): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Extrair tipos de combustível e tipo de powertrain do yearLabel
const extractPowertrainInfo = (yearLabel: string): { fuelTypes: FuelType[]; powertrainType: VehiclePowertrainType } => {
  const label = yearLabel.toLowerCase();
  
  if (label.includes('elétrico') || label.includes('eletrico')) {
    return { fuelTypes: ['electric'], powertrainType: 'electric' };
  }
  if (label.includes('híbrido plugin') || label.includes('hibrido plugin') || label.includes('plug-in')) {
    return { fuelTypes: ['gasoline', 'electric'], powertrainType: 'hybrid_plugin' };
  }
  if (label.includes('híbrido') || label.includes('hibrido')) {
    return { fuelTypes: ['gasoline', 'electric'], powertrainType: 'hybrid' };
  }
  if (label.includes('flex')) {
    return { fuelTypes: ['gasoline', 'ethanol'], powertrainType: 'flex' };
  }
  if (label.includes('diesel')) {
    return { fuelTypes: ['diesel'], powertrainType: 'diesel' };
  }
  if (label.includes('gasolina')) {
    return { fuelTypes: ['gasoline'], powertrainType: 'gasoline' };
  }
  if (label.includes('etanol') || label.includes('álcool') || label.includes('alcool')) {
    return { fuelTypes: ['ethanol'], powertrainType: 'gasoline' };
  }
  
  // Default para Flex (mais comum no Brasil)
  return { fuelTypes: ['gasoline', 'ethanol'], powertrainType: 'flex' };
};

// Obter label e ícone por tipo
const getFuelTypeInfo = (type: FuelType): { label: string; icon: React.ReactNode; unit: string } => {
  switch (type) {
    case 'gasoline':
      return { label: 'Gasolina', icon: <Fuel className="h-4 w-4 text-amber-500" />, unit: 'L' };
    case 'ethanol':
      return { label: 'Etanol', icon: <Droplet className="h-4 w-4 text-green-500" />, unit: 'L' };
    case 'diesel':
      return { label: 'Diesel', icon: <Fuel className="h-4 w-4 text-slate-500" />, unit: 'L' };
    case 'electric':
      return { label: 'Elétrico', icon: <Zap className="h-4 w-4 text-blue-500" />, unit: 'kWh' };
  }
};

// Obter preço sugerido por tipo
const getSuggestedPrice = (type: FuelType): number => {
  switch (type) {
    case 'gasoline': return fuelPrices.gasoline;
    case 'ethanol': return fuelPrices.ethanol;
    case 'diesel': return fuelPrices.diesel;
    case 'electric': return fuelPrices.eletrico;
  }
};

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

export const FuelParametersTable: React.FC<FuelParametersTableProps> = ({
  yearLabel,
  consumptionSuggestion,
  consumptionLoading,
  initialMonthlyKm = 1000,
  onChange,
  persistedData,
}) => {
  const isMobile = useIsMobile();
  
  // Determinar tipos de combustível e powertrain
  const { fuelTypes: availableFuelTypes, powertrainType } = useMemo(() => 
    extractPowertrainInfo(yearLabel), [yearLabel]
  );
  const hasMultipleFuels = availableFuelTypes.length > 1;
  const isHybridPlugin = powertrainType === 'hybrid_plugin';
  
  // Estado do split para híbridos plugin (% gasolina)
  const [hybridSplit, setHybridSplit] = useState<number>(() => {
    if (persistedData?.fuelRows && persistedData.fuelRows.length > 0) {
      const gasRow = persistedData.fuelRows.find(r => r.type === 'gasoline');
      if (gasRow?.splitPercent !== undefined) {
        return gasRow.splitPercent;
      }
    }
    return DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT;
  });
  
  // Estado do total de Km/mês (usado para calcular split)
  const [totalMonthlyKm, setTotalMonthlyKm] = useState<number>(() => {
    return persistedData?.totalMonthlyKm ?? initialMonthlyKm;
  });
  
  // Inicializar dados das linhas
  const initializeFuelRows = useCallback((): FuelRowData[] => {
    // Se há dados persistidos válidos, usa-os
    if (persistedData?.fuelRows && persistedData.fuelRows.length > 0) {
      const persistedTypes = persistedData.fuelRows.map(r => r.type);
      if (availableFuelTypes.every(t => persistedTypes.includes(t))) {
        return persistedData.fuelRows;
      }
    }
    
    // Criar dados iniciais
    return availableFuelTypes.map((type, index) => {
      const info = getFuelTypeInfo(type);
      let suggestedConsumption = 12;
      let source: 'inmetro' | 'estimate' | 'manual' = 'estimate';
      let sourceLabel = 'Estimado';
      
      if (consumptionSuggestion) {
        if (type === 'gasoline' || type === 'diesel') {
          suggestedConsumption = consumptionSuggestion.average;
          source = consumptionSuggestion.source as 'inmetro' | 'estimate' | 'manual';
          sourceLabel = consumptionSuggestion.sourceLabel;
        } else if (type === 'ethanol') {
          suggestedConsumption = consumptionSuggestion.average * ETHANOL_CONVERSION_FACTOR;
          source = consumptionSuggestion.source as 'inmetro' | 'estimate' | 'manual';
          sourceLabel = `${consumptionSuggestion.sourceLabel} (×0.70)`;
        } else if (type === 'electric') {
          suggestedConsumption = 5;
          source = 'estimate';
          sourceLabel = 'Estimado';
        }
      } else if (type === 'electric') {
        suggestedConsumption = 5;
      }
      
      // Para híbridos plugin: calcular km com base no split
      let monthlyKm: number;
      let splitPercent: number | undefined;
      
      if (isHybridPlugin) {
        if (type === 'gasoline') {
          splitPercent = hybridSplit;
          monthlyKm = Math.round(initialMonthlyKm * (hybridSplit / 100));
        } else if (type === 'electric') {
          splitPercent = 100 - hybridSplit;
          monthlyKm = Math.round(initialMonthlyKm * ((100 - hybridSplit) / 100));
        } else {
          monthlyKm = index === 0 ? initialMonthlyKm : 0;
        }
      } else {
        // Para não-híbridos plugin: primeiro recebe 100%
        monthlyKm = index === 0 ? initialMonthlyKm : 0;
      }
      
      return {
        type,
        label: info.label,
        icon: info.icon,
        unit: info.unit,
        consumption: suggestedConsumption,
        price: getSuggestedPrice(type),
        monthlyKm,
        splitPercent,
        isCustomConsumption: false,
        isCustomPrice: false,
        isCustomKm: !isHybridPlugin && index !== 0,
        suggestedConsumption,
        suggestedPrice: getSuggestedPrice(type),
        source,
        sourceLabel,
      };
    });
  }, [availableFuelTypes, consumptionSuggestion, initialMonthlyKm, persistedData, isHybridPlugin, hybridSplit]);
  
  const [fuelRows, setFuelRows] = useState<FuelRowData[]>(initializeFuelRows);
  
  // Recalcular quando consumptionSuggestion mudar
  useEffect(() => {
    if (consumptionSuggestion) {
      setFuelRows(prev => prev.map(row => {
        if (row.isCustomConsumption) return row;
        
        let suggestedConsumption = row.suggestedConsumption;
        let source = row.source;
        let sourceLabel = row.sourceLabel;
        
        if (row.type === 'gasoline' || row.type === 'diesel') {
          suggestedConsumption = consumptionSuggestion.average;
          source = consumptionSuggestion.source as 'inmetro' | 'estimate' | 'manual';
          sourceLabel = consumptionSuggestion.sourceLabel;
        } else if (row.type === 'ethanol') {
          suggestedConsumption = consumptionSuggestion.average * ETHANOL_CONVERSION_FACTOR;
          source = consumptionSuggestion.source as 'inmetro' | 'estimate' | 'manual';
          sourceLabel = `${consumptionSuggestion.sourceLabel} (×0.70)`;
        }
        
        return {
          ...row,
          consumption: suggestedConsumption,
          suggestedConsumption,
          source,
          sourceLabel,
        };
      }));
    }
  }, [consumptionSuggestion]);
  
  // Atualizar Km quando o split ou total Km mudar (para híbridos plugin)
  useEffect(() => {
    if (isHybridPlugin) {
      setFuelRows(prev => prev.map(row => {
        if (row.type === 'gasoline') {
          const newKm = Math.round(totalMonthlyKm * (hybridSplit / 100));
          return { ...row, monthlyKm: newKm, splitPercent: hybridSplit };
        } else if (row.type === 'electric') {
          const electricSplit = 100 - hybridSplit;
          const newKm = Math.round(totalMonthlyKm * (electricSplit / 100));
          return { ...row, monthlyKm: newKm, splitPercent: electricSplit };
        }
        return row;
      }));
    }
  }, [hybridSplit, totalMonthlyKm, isHybridPlugin]);
  
  // Calcular custo mensal de cada linha
  const calculateRowCost = useCallback((row: FuelRowData): number => {
    if (row.consumption <= 0 || row.monthlyKm <= 0) return 0;
    return (row.monthlyKm / row.consumption) * row.price;
  }, []);
  
  // Totais
  const totals = useMemo(() => {
    const totalKm = fuelRows.reduce((sum, row) => sum + row.monthlyKm, 0);
    const totalCost = fuelRows.reduce((sum, row) => sum + calculateRowCost(row), 0);
    return { km: totalKm, cost: totalCost };
  }, [fuelRows, calculateRowCost]);
  
  // Comparação Gasolina vs Etanol (apenas para veículos Flex)
  const fuelComparison = useMemo(() => {
    const gasRow = fuelRows.find(r => r.type === 'gasoline');
    const ethRow = fuelRows.find(r => r.type === 'ethanol');
    
    if (!gasRow || !ethRow || powertrainType !== 'flex') {
      return null;
    }
    
    const priceRatio = ethRow.price / gasRow.price;
    const isEthanolAdvantage = priceRatio < ETHANOL_EQUILIBRIUM_RATIO;
    const advantagePercent = Math.abs((priceRatio / ETHANOL_EQUILIBRIUM_RATIO - 1) * 100);
    const equilibriumEthanolPrice = gasRow.price * ETHANOL_EQUILIBRIUM_RATIO;
    
    // Calcular custo por km de cada combustível
    const gasCostPerKm = gasRow.consumption > 0 ? gasRow.price / gasRow.consumption : 0;
    const ethCostPerKm = ethRow.consumption > 0 ? ethRow.price / ethRow.consumption : 0;
    const costDifferencePerKm = Math.abs(gasCostPerKm - ethCostPerKm);
    
    // Economia mensal potencial se usar 100% do combustível vantajoso
    const totalKm = gasRow.monthlyKm + ethRow.monthlyKm;
    const currentCost = calculateRowCost(gasRow) + calculateRowCost(ethRow);
    const allGasCost = totalKm > 0 && gasRow.consumption > 0 ? (totalKm / gasRow.consumption) * gasRow.price : 0;
    const allEthCost = totalKm > 0 && ethRow.consumption > 0 ? (totalKm / ethRow.consumption) * ethRow.price : 0;
    const optimalCost = isEthanolAdvantage ? allEthCost : allGasCost;
    const potentialSavings = currentCost - optimalCost;
    
    return {
      priceRatio,
      isEthanolAdvantage,
      advantagePercent,
      equilibriumEthanolPrice,
      gasCostPerKm,
      ethCostPerKm,
      costDifferencePerKm,
      potentialSavings,
      winner: isEthanolAdvantage ? 'ethanol' as const : 'gasoline' as const,
    };
  }, [fuelRows, powertrainType, calculateRowCost]);
  
  // Notificar mudanças ao componente pai
  useEffect(() => {
    onChange(totals.km, totals.cost, fuelRows);
  }, [totals.km, totals.cost, fuelRows, onChange]);
  
  // Handlers de mudança
  const handleConsumptionChange = useCallback((type: FuelType, value: number) => {
    setFuelRows(prev => prev.map(row => 
      row.type === type 
        ? { ...row, consumption: value, isCustomConsumption: value !== row.suggestedConsumption }
        : row
    ));
  }, []);
  
  const handlePriceChange = useCallback((type: FuelType, value: number) => {
    setFuelRows(prev => prev.map(row => 
      row.type === type 
        ? { ...row, price: value, isCustomPrice: true }
        : row
    ));
  }, []);
  
  const handleKmChange = useCallback((type: FuelType, value: string) => {
    const parsed = parseInt(value.replace(/\D/g, '')) || 0;
    setFuelRows(prev => prev.map(row => 
      row.type === type 
        ? { ...row, monthlyKm: Math.min(parsed, 99999), isCustomKm: true }
        : row
    ));
  }, []);
  
  // Handler para mudança de total Km (híbridos plugin)
  const handleTotalKmChange = useCallback((value: string) => {
    const parsed = parseInt(value.replace(/\D/g, '')) || 0;
    setTotalMonthlyKm(Math.min(parsed, 99999));
  }, []);
  
  // Handler para mudança do slider de split
  const handleSplitChange = useCallback((value: number[]) => {
    setHybridSplit(value[0]);
  }, []);
  
  // Restaurar sugestões
  const handleRestoreAll = useCallback(() => {
    if (isHybridPlugin) {
      setHybridSplit(DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT);
      setTotalMonthlyKm(initialMonthlyKm);
      setFuelRows(prev => prev.map((row) => {
        const gasPercent = DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT;
        const elecPercent = 100 - DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT;
        
        if (row.type === 'gasoline') {
          return {
            ...row,
            consumption: row.suggestedConsumption,
            price: row.suggestedPrice,
            monthlyKm: Math.round(initialMonthlyKm * (gasPercent / 100)),
            splitPercent: gasPercent,
            isCustomConsumption: false,
            isCustomPrice: false,
            isCustomKm: false,
          };
        } else if (row.type === 'electric') {
          return {
            ...row,
            consumption: row.suggestedConsumption,
            price: row.suggestedPrice,
            monthlyKm: Math.round(initialMonthlyKm * (elecPercent / 100)),
            splitPercent: elecPercent,
            isCustomConsumption: false,
            isCustomPrice: false,
            isCustomKm: false,
          };
        }
        return row;
      }));
    } else {
      setFuelRows(prev => prev.map((row, index) => ({
        ...row,
        consumption: row.suggestedConsumption,
        price: row.suggestedPrice,
        monthlyKm: index === 0 ? initialMonthlyKm : 0,
        isCustomConsumption: false,
        isCustomPrice: false,
        isCustomKm: index !== 0,
      })));
    }
  }, [initialMonthlyKm, isHybridPlugin]);
  
  const hasCustomValues = fuelRows.some(r => r.isCustomConsumption || r.isCustomPrice || r.isCustomKm) ||
    (isHybridPlugin && (hybridSplit !== DEFAULT_HYBRID_PLUGIN_GASOLINE_SPLIT || totalMonthlyKm !== initialMonthlyKm));
  
  // Renderização Mobile: Cards empilhados
  if (isMobile) {
    return (
      <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Parâmetros de Combustível</span>
            <HelpButton>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-primary" />
                  Como Funciona
                </DialogTitle>
                <DialogDescription>Cálculo do custo mensal de combustível</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>O custo mensal é calculado para cada tipo de combustível:</p>
                <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                  Total Mês = (Km/mês ÷ Consumo) × Preço
                </div>
                <p className="text-muted-foreground">
                  {hasMultipleFuels 
                    ? 'Distribua a quilometragem conforme seu uso real de cada combustível.'
                    : 'Informe sua quilometragem média mensal.'}
                </p>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Fonte do consumo:</strong> Dados do PBE Veicular INMETRO quando disponíveis, 
                    ou estimativa baseada na categoria do veículo.
                  </p>
                </div>
              </div>
            </HelpButton>
          </div>
          {hasCustomValues && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestoreAll}
              className="text-xs h-6 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurar
            </Button>
          )}
        </div>

        {/* Seção de Split para Híbridos Plugin */}
        {isHybridPlugin && (
          <div className="mb-3 p-3 bg-gradient-to-r from-amber-500/10 to-blue-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <BatteryCharging className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Distribuição de Uso</span>
              <HelpButton>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BatteryCharging className="h-5 w-5 text-blue-500" />
                    Híbrido Plugin
                  </DialogTitle>
                  <DialogDescription>Como funciona o split de uso</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>
                    Veículos híbridos plugin permitem carregar a bateria na tomada e rodar 
                    parte do trajeto 100% elétrico.
                  </p>
                  <p className="text-muted-foreground">
                    Ajuste o slider para refletir seu padrão real de uso:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li><strong>Mais gasolina:</strong> viagens longas, sem acesso a tomada</li>
                    <li><strong>Mais elétrico:</strong> trajetos curtos urbanos, carrega em casa/trabalho</li>
                  </ul>
                  <div className="p-2 bg-muted rounded-lg text-xs">
                    <strong>Exemplo:</strong> Com 60% gasolina e 40% elétrico em 1.000 km/mês, 
                    você roda 600 km com gasolina e 400 km no modo elétrico.
                  </div>
                </div>
              </HelpButton>
            </div>
            
            {/* Total Km/mês input */}
            <div className="mb-3">
              <label className="text-[10px] text-muted-foreground block mb-1">
                Total Km/mês
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={totalMonthlyKm.toLocaleString('pt-BR')}
                onChange={(e) => handleTotalKmChange(e.target.value)}
                className="h-8 text-xs text-center max-w-[120px]"
              />
            </div>
            
            {/* Slider de split */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Fuel className="h-3 w-3 text-amber-500" />
                  <span>Gasolina</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Elétrico</span>
                  <Zap className="h-3 w-3 text-blue-500" />
                </div>
              </div>
              <Slider
                value={[hybridSplit]}
                onValueChange={handleSplitChange}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-600">{hybridSplit}%</span>
                <span className="text-blue-600">{100 - hybridSplit}%</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatNumber(Math.round(totalMonthlyKm * hybridSplit / 100), 0)} km</span>
                <span>{formatNumber(Math.round(totalMonthlyKm * (100 - hybridSplit) / 100), 0)} km</span>
              </div>
            </div>
          </div>
        )}

        {/* Cards por tipo de combustível */}
        <div className="space-y-3">
          {fuelRows.map((row) => {
            const rowCost = calculateRowCost(row);
            
            return (
              <div 
                key={row.type} 
                className="p-3 bg-background/50 rounded-lg border"
              >
                {/* Header do card */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {row.icon}
                    <span className="text-sm font-medium">{row.label}</span>
                    {isHybridPlugin && row.splitPercent !== undefined && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {row.splitPercent}%
                      </Badge>
                    )}
                  </div>
                  {row.source === 'inmetro' && !row.isCustomConsumption && (
                    <Badge variant="default" className="text-[9px] h-4 px-1 bg-emerald-500">
                      INMETRO
                    </Badge>
                  )}
                  {row.source === 'estimate' && !row.isCustomConsumption && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                      Estimado
                    </Badge>
                  )}
                </div>
                
                {/* Grid de inputs */}
                <div className={`grid ${isHybridPlugin ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                  {/* Consumo */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      km/{row.unit}
                    </label>
                    <div className="relative">
                      <DecimalInput
                        value={row.consumption}
                        onChange={(v) => handleConsumptionChange(row.type, v)}
                        max={99.9}
                        maxIntegerDigits={2}
                        decimalPlaces={1}
                        className={`h-8 text-xs ${row.isCustomConsumption ? 'border-primary' : ''}`}
                      />
                      {consumptionLoading && row.type !== 'electric' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="h-3 w-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {row.isCustomConsumption && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                        Sug: {formatNumber(row.suggestedConsumption, 1)}
                      </p>
                    )}
                  </div>
                  
                  {/* Preço */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">
                      R$/{row.unit}
                    </label>
                    <CurrencyInput
                      value={row.price}
                      onChange={(v) => handlePriceChange(row.type, v)}
                      compact
                      maxDigits={5}
                      className={`h-8 text-xs text-center ${row.isCustomPrice ? 'border-primary' : ''}`}
                    />
                    {row.isCustomPrice && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                        Sug: {formatNumber(row.suggestedPrice, 2)}
                      </p>
                    )}
                  </div>
                  
                  {/* Km/mês - oculto para híbridos plugin (controlado pelo slider) */}
                  {!isHybridPlugin && (
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        Km/mês
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={row.monthlyKm.toLocaleString('pt-BR')}
                        onChange={(e) => handleKmChange(row.type, e.target.value)}
                        className={`h-8 text-xs text-center ${row.isCustomKm ? 'border-primary' : ''}`}
                      />
                    </div>
                  )}
                </div>
                
                {/* Km/mês para híbridos plugin (read-only, mostra o valor calculado) */}
                {isHybridPlugin && (
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    {formatNumber(row.monthlyKm, 0)} km/mês ({row.splitPercent}% de {formatNumber(totalMonthlyKm, 0)} km)
                  </div>
                )}
                
                {/* Total do card */}
                <div className="mt-2 pt-2 border-t text-right">
                  <span className="text-xs text-muted-foreground">Total: </span>
                  <span className="text-sm font-semibold text-foreground">{formatMoney(rowCost)}/mês</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Rodapé com total geral */}
        {hasMultipleFuels && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Total Combustível</span>
                <p className="text-[10px] text-muted-foreground">
                  {formatNumber(totals.km, 0)} km/mês (para cálculo de pneus)
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{formatMoney(totals.cost)}</div>
                <div className="text-[10px] text-muted-foreground">/mês</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Comparador Gasolina vs Etanol (Mobile) */}
        {fuelComparison && (
          <div className={`mt-3 px-3 py-2.5 rounded-lg border flex items-center justify-between ${
            fuelComparison.isEthanolAdvantage 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            {/* Cabeçalho com título e veredito */}
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">Comparador Flex</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Indicador de vantagem compacto */}
              {fuelComparison.isEthanolAdvantage ? (
                <div className="flex items-center gap-1.5">
                  <Droplet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Etanol mais vantajoso</span>
                  <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Gasolina mais vantajosa</span>
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                </div>
              )}
              
              {/* Botão de ajuda com métricas detalhadas */}
              <HelpButton>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Comparador Flex
                  </DialogTitle>
                  <DialogDescription>Análise comparativa Gasolina vs Etanol</DialogDescription>
                </DialogHeader>
                
                {/* Destaque: Resultado atual - mesmas informações da caixa anterior */}
                <div className={`p-3 rounded-lg border mb-4 ${
                  fuelComparison.isEthanolAdvantage 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {fuelComparison.isEthanolAdvantage ? (
                      <>
                        <Droplet className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">Etanol mais vantajoso</span>
                        <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                      </>
                    ) : (
                      <>
                        <Fuel className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">Gasolina mais vantajosa</span>
                        <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                      </>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/60 rounded p-2">
                      <span className="text-muted-foreground block text-[10px] mb-0.5">Razão atual:</span>
                      <span className={`font-semibold ${
                        fuelComparison.isEthanolAdvantage ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {formatNumber(fuelComparison.priceRatio * 100, 0)}%
                      </span>
                      <span className="text-muted-foreground text-[10px]"> (equilíbrio: 70%)</span>
                    </div>
                    <div className="bg-background/60 rounded p-2">
                      <span className="text-muted-foreground block text-[10px] mb-0.5">Equilíbrio etanol:</span>
                      <span className="font-medium">R$ {formatNumber(fuelComparison.equilibriumEthanolPrice, 2)}</span>
                    </div>
                  </div>
                  
                  {fuelComparison.potentialSavings > 5 && (
                    <div className="mt-2 text-xs text-center py-1.5 bg-background/60 rounded">
                      💡 Usando 100% {fuelComparison.winner === 'ethanol' ? 'etanol' : 'gasolina'}: 
                      economia de <span className="font-semibold text-green-600">{formatMoney(fuelComparison.potentialSavings)}/mês</span>
                    </div>
                  )}
                </div>
                
                {/* Metodologia */}
                <div className="space-y-3 text-sm">
                  <p className="font-medium">Regra dos 70%</p>
                  <p className="text-muted-foreground text-xs">
                    A "Regra dos 70%" é baseada na diferença de rendimento energético entre gasolina e etanol.
                  </p>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="font-medium text-xs">Como funciona:</p>
                    <p className="text-muted-foreground text-xs">
                      O etanol possui cerca de 70% do poder calorífico da gasolina. 
                      Portanto, para percorrer a mesma distância, você precisa de ~30% mais etanol.
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="font-mono text-xs text-center">
                      Se <strong>Preço Etanol ÷ Preço Gasolina &lt; 0,70</strong>
                    </p>
                    <p className="text-center text-xs text-muted-foreground mt-1">
                      → Etanol é mais vantajoso
                    </p>
                  </div>
                  <div className="pt-2 border-t space-y-1 text-xs">
                    <p><strong>Fonte:</strong> PBE Veicular - INMETRO/CONPET</p>
                    <p className="text-muted-foreground">
                      Programa Brasileiro de Etiquetagem Veicular, que certifica 
                      o consumo energético dos veículos vendidos no Brasil.
                    </p>
                  </div>
                </div>
              </HelpButton>
            </div>
          </div>
        )}
        
        {!hasMultipleFuels && (
          <div className="mt-3 pt-2 border-t text-center text-xs text-muted-foreground">
            Custo calculado: <span className="font-medium text-foreground">{formatMoney(totals.cost)}/mês</span>
            <span className="ml-2">({formatNumber(fuelRows[0]?.monthlyKm / (fuelRows[0]?.consumption || 1), 0)} {fuelRows[0]?.unit}/mês)</span>
          </div>
        )}
      </div>
    );
  }
  
  // Renderização Desktop: Tabela
  return (
    <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Parâmetros de Combustível</span>
        </div>
        {hasCustomValues && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestoreAll}
            className="text-xs h-6 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restaurar sugestões
          </Button>
        )}
      </div>

      {/* Seção de Split para Híbridos Plugin (Desktop) */}
      {isHybridPlugin && (
        <div className="mb-3 p-4 bg-gradient-to-r from-amber-500/10 to-blue-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <BatteryCharging className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Distribuição de Uso - Híbrido Plugin</span>
            <HelpButton>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BatteryCharging className="h-5 w-5 text-blue-500" />
                  Híbrido Plugin
                </DialogTitle>
                <DialogDescription>Como funciona o split de uso</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  Veículos híbridos plugin permitem carregar a bateria na tomada e rodar 
                  parte do trajeto 100% elétrico.
                </p>
                <p className="text-muted-foreground">
                  Ajuste o slider para refletir seu padrão real de uso:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                  <li><strong>Mais gasolina:</strong> viagens longas, sem acesso a tomada</li>
                  <li><strong>Mais elétrico:</strong> trajetos curtos urbanos, carrega em casa/trabalho</li>
                </ul>
                <div className="p-2 bg-muted rounded-lg text-xs">
                  <strong>Exemplo:</strong> Com 60% gasolina e 40% elétrico em 1.000 km/mês, 
                  você roda 600 km com gasolina e 400 km no modo elétrico.
                </div>
              </div>
            </HelpButton>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Total Km/mês input */}
            <div className="flex-shrink-0">
              <label className="text-xs text-muted-foreground block mb-1">
                Total Km/mês
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={totalMonthlyKm.toLocaleString('pt-BR')}
                onChange={(e) => handleTotalKmChange(e.target.value)}
                className="h-8 text-xs text-center w-24"
              />
            </div>
            
            {/* Slider de split */}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Fuel className="h-3 w-3 text-amber-500" />
                  <span>Gasolina</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Elétrico</span>
                  <Zap className="h-3 w-3 text-blue-500" />
                </div>
              </div>
              <Slider
                value={[hybridSplit]}
                onValueChange={handleSplitChange}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between">
                <div className="text-left">
                  <span className="text-sm font-semibold text-amber-600">{hybridSplit}%</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formatNumber(Math.round(totalMonthlyKm * hybridSplit / 100), 0)} km)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-blue-600">{100 - hybridSplit}%</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formatNumber(Math.round(totalMonthlyKm * (100 - hybridSplit) / 100), 0)} km)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Desktop */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[140px]">Tipo</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span>Consumo (km/L)</span>
                  <Badge variant="default" className="text-[8px] h-3.5 px-1 bg-emerald-500">
                    INMETRO
                  </Badge>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span>Preço (R$/L)</span>
                  <HelpButton>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-primary" />
                        Como Funciona
                      </DialogTitle>
                      <DialogDescription>Cálculo do custo mensal de combustível</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <p>O custo mensal é calculado para cada tipo de combustível:</p>
                      <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                        Total Mês = (Km/mês ÷ Consumo) × Preço
                      </div>
                      <p className="text-muted-foreground">
                        {hasMultipleFuels 
                          ? 'Distribua a quilometragem conforme seu uso real de cada combustível.'
                          : 'Informe sua quilometragem média mensal.'}
                      </p>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gasolina (ANP):</span>
                          <span className="font-medium">R$ {formatNumber(fuelPrices.gasoline, 2)}/L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Etanol (ANP):</span>
                          <span className="font-medium">R$ {formatNumber(fuelPrices.ethanol, 2)}/L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Diesel (ANP):</span>
                          <span className="font-medium">R$ {formatNumber(fuelPrices.diesel, 2)}/L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Eletricidade (ANEEL):</span>
                          <span className="font-medium">R$ {formatNumber(fuelPrices.eletrico, 2)}/kWh</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          <strong>Consumo Etanol:</strong> Para veículos Flex, o consumo de etanol é estimado 
                          em 70% do consumo de gasolina (fator PBE INMETRO).
                        </p>
                      </div>
                    </div>
                  </HelpButton>
                </div>
              </TableHead>
              {!isHybridPlugin && <TableHead className="text-center">Km/mês</TableHead>}
              {isHybridPlugin && <TableHead className="text-center">Km/mês (split)</TableHead>}
              <TableHead className="text-right">Total/Mês</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuelRows.map((row) => {
              const rowCost = calculateRowCost(row);
              
              return (
                <TableRow key={row.type}>
                  {/* Tipo */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <span className="font-medium">{row.label}</span>
                      {isHybridPlugin && row.splitPercent !== undefined && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-semibold">
                          {row.splitPercent}%
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Consumo */}
                  <TableCell>
                    <div className="relative max-w-[80px] mx-auto">
                      <DecimalInput
                        value={row.consumption}
                        onChange={(v) => handleConsumptionChange(row.type, v)}
                        max={99.9}
                        maxIntegerDigits={2}
                        decimalPlaces={1}
                        className={`h-8 text-xs ${row.isCustomConsumption ? 'border-primary' : ''}`}
                      />
                      {consumptionLoading && row.type !== 'electric' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="h-3 w-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {row.isCustomConsumption && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                        Sugerido: {formatNumber(row.suggestedConsumption, 1)}
                      </p>
                    )}
                  </TableCell>
                  
                  {/* Preço */}
                  <TableCell>
                    <div className="max-w-[80px] mx-auto">
                      <CurrencyInput
                        value={row.price}
                        onChange={(v) => handlePriceChange(row.type, v)}
                        compact
                        maxDigits={5}
                        className={`h-8 text-xs text-center ${row.isCustomPrice ? 'border-primary' : ''}`}
                      />
                    </div>
                    {row.isCustomPrice && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                        Sugerido: R$ {formatNumber(row.suggestedPrice, 2)}
                      </p>
                    )}
                  </TableCell>
                  
                  {/* Km/mês */}
                  <TableCell>
                    {isHybridPlugin ? (
                      // Para híbridos plugin: valor calculado (read-only visual)
                      <div className="text-center">
                        <span className="text-xs font-medium">{formatNumber(row.monthlyKm, 0)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">km</span>
                      </div>
                    ) : (
                      // Para outros: input editável
                      <div className="max-w-[90px] mx-auto">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={row.monthlyKm.toLocaleString('pt-BR')}
                          onChange={(e) => handleKmChange(row.type, e.target.value)}
                          className={`h-8 text-xs text-center ${row.isCustomKm && row.monthlyKm > 0 ? 'border-primary' : ''}`}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </TableCell>
                  
                  {/* Total/Mês */}
                  <TableCell className="text-right">
                    <span className={`font-semibold ${rowCost > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {formatMoney(rowCost)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          
          {/* Footer com total */}
          {hasMultipleFuels && (
            <TableFooter>
              <TableRow className="bg-primary/10">
                <TableCell colSpan={3}>
                  <span className="font-medium">Total</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({formatNumber(totals.km, 0)} km/mês para cálculo de pneus)
                  </span>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {formatNumber(totals.km, 0)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-primary">{formatMoney(totals.cost)}</span>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      
      {/* Comparador Gasolina vs Etanol (Desktop) - Layout compacto */}
      {fuelComparison && (
        <div className={`mt-3 px-3 py-2.5 rounded-lg border flex items-center justify-between ${
          fuelComparison.isEthanolAdvantage 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Comparador Flex</span>
            </div>
            
            {/* Indicador de vantagem */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/50">
              {fuelComparison.isEthanolAdvantage ? (
                <>
                  <Droplet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Etanol mais vantajoso</span>
                  <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                </>
              ) : (
                <>
                  <Fuel className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Gasolina mais vantajosa</span>
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                </>
              )}
            </div>
          </div>
          
          {/* Botão de ajuda com métricas detalhadas */}
          <HelpButton>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Comparador Flex
              </DialogTitle>
              <DialogDescription>Análise comparativa Gasolina vs Etanol</DialogDescription>
            </DialogHeader>
            
            {/* Destaque: Resultado atual */}
            <div className={`p-3 rounded-lg border mb-4 ${
              fuelComparison.isEthanolAdvantage 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {fuelComparison.isEthanolAdvantage ? (
                  <>
                    <Droplet className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Etanol mais vantajoso</span>
                    <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                  </>
                ) : (
                  <>
                    <Fuel className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">Gasolina mais vantajosa</span>
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/60 rounded p-2">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">Razão atual:</span>
                  <span className={`font-semibold ${
                    fuelComparison.isEthanolAdvantage ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {formatNumber(fuelComparison.priceRatio * 100, 0)}%
                  </span>
                  <span className="text-muted-foreground text-[10px]"> (equilíbrio: 70%)</span>
                </div>
                <div className="bg-background/60 rounded p-2">
                  <span className="text-muted-foreground block text-[10px] mb-0.5">Equilíbrio etanol:</span>
                  <span className="font-medium">R$ {formatNumber(fuelComparison.equilibriumEthanolPrice, 2)}</span>
                </div>
              </div>
              
              {fuelComparison.potentialSavings > 5 && (
                <div className="mt-2 text-xs text-center py-1.5 bg-background/60 rounded">
                  💡 Usando 100% {fuelComparison.winner === 'ethanol' ? 'etanol' : 'gasolina'}: 
                  economia de <span className="font-semibold text-green-600">{formatMoney(fuelComparison.potentialSavings)}/mês</span>
                </div>
              )}
            </div>
            
            {/* Metodologia */}
            <div className="space-y-3 text-sm">
              <p className="font-medium">Regra dos 70%</p>
              <p className="text-muted-foreground text-xs">
                A "Regra dos 70%" é baseada na diferença de rendimento energético entre gasolina e etanol.
              </p>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="font-medium text-xs">Como funciona:</p>
                <p className="text-muted-foreground text-xs">
                  O etanol possui cerca de 70% do poder calorífico da gasolina. 
                  Portanto, para percorrer a mesma distância, você precisa de ~30% mais etanol.
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-mono text-xs text-center">
                  Se <strong>Preço Etanol ÷ Preço Gasolina &lt; 0,70</strong>
                </p>
                <p className="text-center text-xs text-muted-foreground mt-1">
                  → Etanol é mais vantajoso
                </p>
              </div>
              <div className="pt-2 border-t space-y-1 text-xs">
                <p><strong>Fonte:</strong> PBE Veicular - INMETRO/CONPET</p>
                <p className="text-muted-foreground">
                  Programa Brasileiro de Etiquetagem Veicular, que certifica 
                  o consumo energético dos veículos vendidos no Brasil.
                </p>
              </div>
            </div>
          </HelpButton>
        </div>
      )}
      
      {/* Rodapé simples para veículo com único combustível */}
      {!hasMultipleFuels && (
        <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Custo calculado: <span className="font-medium text-foreground">{formatMoney(totals.cost)}/mês</span>
          </span>
          <span className="text-muted-foreground">
            ({formatNumber(fuelRows[0]?.monthlyKm / (fuelRows[0]?.consumption || 1), 0)} {fuelRows[0]?.unit}/mês)
          </span>
        </div>
      )}
    </div>
  );
};
