import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Copy, 
  ArrowRightLeft,
  CheckCircle2,
  MapPin,
  Milestone,
  Fuel,
  Gauge,
  ParkingCircle,
  Droplets 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleConfigV2 } from './VehicleConfigCardV2';
import { FuelRowData } from './FuelParametersTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================
interface ParameterDifference {
  key: string;
  label: string;
  icon: React.ReactNode;
  valueA: string | number;
  valueB: string | number;
  strength: 'very-strong' | 'strong';
}

interface ParameterSyncManagerProps {
  configA: VehicleConfigV2;
  configB: VehicleConfigV2;
  onSyncAtoB: () => void;
  onSyncBtoA: () => void;
  isCarBEnabled: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getFuelPricesFromRows = (rows: FuelRowData[]): Record<string, number> => {
  const prices: Record<string, number> = {};
  rows.forEach(row => {
    prices[row.type] = row.price;
  });
  return prices;
};

const findMatchingFuelPriceDiff = (rowsA: FuelRowData[], rowsB: FuelRowData[]): string | null => {
  const pricesA = getFuelPricesFromRows(rowsA);
  const pricesB = getFuelPricesFromRows(rowsB);
  
  // Check common fuel types
  for (const type of Object.keys(pricesA)) {
    if (pricesB[type] && pricesA[type] !== pricesB[type]) {
      return type;
    }
  }
  return null;
};

// ============================================================================
// COMPONENT
// ============================================================================
export const ParameterSyncManager: React.FC<ParameterSyncManagerProps> = ({
  configA,
  configB,
  onSyncAtoB,
  onSyncBtoA,
  isCarBEnabled,
}) => {
  // Calculate differences between configs
  const differences = React.useMemo((): ParameterDifference[] => {
    const diffs: ParameterDifference[] = [];
    
    // Very strong rules
    if (configA.vehicleState !== configB.vehicleState) {
      diffs.push({
        key: 'vehicleState',
        label: 'Estado',
        icon: <MapPin className="h-3.5 w-3.5" />,
        valueA: configA.vehicleState,
        valueB: configB.vehicleState,
        strength: 'very-strong',
      });
    }
    
    if (configA.monthlyTolls !== configB.monthlyTolls) {
      diffs.push({
        key: 'monthlyTolls',
        label: 'Pedágio',
        icon: <Milestone className="h-3.5 w-3.5" />,
        valueA: formatMoney(configA.monthlyTolls),
        valueB: formatMoney(configB.monthlyTolls),
        strength: 'very-strong',
      });
    }
    
    if (configA.totalMonthlyKm !== configB.totalMonthlyKm) {
      diffs.push({
        key: 'totalMonthlyKm',
        label: 'Total km/mês',
        icon: <Gauge className="h-3.5 w-3.5" />,
        valueA: `${configA.totalMonthlyKm.toLocaleString('pt-BR')} km`,
        valueB: `${configB.totalMonthlyKm.toLocaleString('pt-BR')} km`,
        strength: 'very-strong',
      });
    }
    
    // Check fuel prices for matching types
    const fuelDiffType = findMatchingFuelPriceDiff(configA.fuelRows, configB.fuelRows);
    if (fuelDiffType) {
      const pricesA = getFuelPricesFromRows(configA.fuelRows);
      const pricesB = getFuelPricesFromRows(configB.fuelRows);
      diffs.push({
        key: 'fuelPrice',
        label: 'Preço combustível',
        icon: <Fuel className="h-3.5 w-3.5" />,
        valueA: `R$ ${pricesA[fuelDiffType]?.toFixed(2) || '-'}`,
        valueB: `R$ ${pricesB[fuelDiffType]?.toFixed(2) || '-'}`,
        strength: 'very-strong',
      });
    }
    
    // Strong rules
    if (configA.monthlyParking !== configB.monthlyParking) {
      diffs.push({
        key: 'monthlyParking',
        label: 'Estacionamento',
        icon: <ParkingCircle className="h-3.5 w-3.5" />,
        valueA: formatMoney(configA.monthlyParking),
        valueB: formatMoney(configB.monthlyParking),
        strength: 'strong',
      });
    }
    
    if (configA.monthlyWashing !== configB.monthlyWashing) {
      diffs.push({
        key: 'monthlyWashing',
        label: 'Limpeza',
        icon: <Droplets className="h-3.5 w-3.5" />,
        valueA: formatMoney(configA.monthlyWashing),
        valueB: formatMoney(configB.monthlyWashing),
        strength: 'strong',
      });
    }
    
    return diffs;
  }, [configA, configB]);

  const veryStrongDiffs = differences.filter(d => d.strength === 'very-strong');
  const strongDiffs = differences.filter(d => d.strength === 'strong');
  const hasDifferences = differences.length > 0;
  const hasVeryStrongDiffs = veryStrongDiffs.length > 0;

  if (!isCarBEnabled) return null;

  return (
    <div className="space-y-3">
      {/* Sync buttons */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 text-xs border-blue-500/30 hover:bg-blue-500/10"
                onClick={onSyncBtoA}
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiar parâmetros</span> A → B
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copiar Estado, km, combustível, pedágio, estac. e limpeza de A para B</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground hidden sm:block" />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 text-xs border-amber-500/30 hover:bg-amber-500/10"
                onClick={onSyncAtoB}
              >
                B → A <span className="hidden sm:inline">Copiar parâmetros</span>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copiar Estado, km, combustível, pedágio, estac. e limpeza de B para A</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Difference alerts */}
      {hasDifferences && (
        <div className={cn(
          "rounded-lg border p-3 space-y-2",
          hasVeryStrongDiffs 
            ? "bg-amber-500/5 border-amber-500/30" 
            : "bg-muted/50 border-border"
        )}>
          <div className="flex items-center gap-2 flex-wrap">
            {hasVeryStrongDiffs ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <p className="text-xs font-medium">
              {hasVeryStrongDiffs 
                ? 'Parâmetros divergentes que afetam a comparação:' 
                : 'Diferenças secundárias detectadas:'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {/* Very strong differences first */}
            {veryStrongDiffs.map((diff) => (
              <Badge 
                key={diff.key}
                variant="outline"
                className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] gap-1 py-0.5"
              >
                {diff.icon}
                <span>{diff.label}:</span>
                <span className="font-semibold text-blue-600">{diff.valueA}</span>
                <span className="text-muted-foreground">≠</span>
                <span className="font-semibold text-amber-600">{diff.valueB}</span>
              </Badge>
            ))}
            
            {/* Strong differences */}
            {strongDiffs.map((diff) => (
              <Badge 
                key={diff.key}
                variant="outline"
                className="bg-muted/50 border-border text-muted-foreground text-[10px] gap-1 py-0.5"
              >
                {diff.icon}
                <span>{diff.label}:</span>
                <span className="font-medium text-foreground">{diff.valueA}</span>
                <span>≠</span>
                <span className="font-medium text-foreground">{diff.valueB}</span>
              </Badge>
            ))}
          </div>
          
          {hasVeryStrongDiffs && (
            <p className="text-[10px] text-muted-foreground">
              💡 Para uma comparação justa, sincronize os parâmetros usando os botões acima.
            </p>
          )}
        </div>
      )}
      
      {/* All synced message */}
      {!hasDifferences && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <p className="text-xs text-green-700 dark:text-green-400">
            Parâmetros sincronizados - comparação justa
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SYNC PARAMETERS HELPER
// ============================================================================
export const getSyncableParams = (source: VehicleConfigV2): Partial<VehicleConfigV2> => {
  return {
    vehicleState: source.vehicleState,
    totalMonthlyKm: source.totalMonthlyKm,
    monthlyParking: source.monthlyParking,
    monthlyTolls: source.monthlyTolls,
    monthlyWashing: source.monthlyWashing,
    // Note: fuelRows prices are synced separately via fuelRows update
  };
};

export const syncFuelPrices = (
  targetRows: FuelRowData[], 
  sourceRows: FuelRowData[]
): FuelRowData[] => {
  const sourcePrices = getFuelPricesFromRows(sourceRows);
  
  return targetRows.map(row => {
    if (sourcePrices[row.type] !== undefined) {
      return { ...row, price: sourcePrices[row.type] };
    }
    return row;
  });
};

// ============================================================================
// DIVERGENT FIELDS HELPER
// ============================================================================
export type DivergentFieldKey = 
  | 'vehicleState' 
  | 'monthlyTolls' 
  | 'totalMonthlyKm' 
  | 'fuelPrice' 
  | 'monthlyParking' 
  | 'monthlyWashing';

export interface DivergentFields {
  fields: Set<DivergentFieldKey>;
  strength: Record<DivergentFieldKey, 'very-strong' | 'strong' | undefined>;
}

export const getDivergentFields = (
  configA: VehicleConfigV2,
  configB: VehicleConfigV2
): DivergentFields => {
  const fields = new Set<DivergentFieldKey>();
  const strength: Record<DivergentFieldKey, 'very-strong' | 'strong' | undefined> = {
    vehicleState: undefined,
    monthlyTolls: undefined,
    totalMonthlyKm: undefined,
    fuelPrice: undefined,
    monthlyParking: undefined,
    monthlyWashing: undefined,
  };

  // Very strong rules
  if (configA.vehicleState !== configB.vehicleState) {
    fields.add('vehicleState');
    strength.vehicleState = 'very-strong';
  }
  
  if (configA.monthlyTolls !== configB.monthlyTolls) {
    fields.add('monthlyTolls');
    strength.monthlyTolls = 'very-strong';
  }
  
  if (configA.totalMonthlyKm !== configB.totalMonthlyKm) {
    fields.add('totalMonthlyKm');
    strength.totalMonthlyKm = 'very-strong';
  }
  
  // Check fuel prices for matching types
  const fuelDiffType = findMatchingFuelPriceDiff(configA.fuelRows, configB.fuelRows);
  if (fuelDiffType) {
    fields.add('fuelPrice');
    strength.fuelPrice = 'very-strong';
  }
  
  // Strong rules
  if (configA.monthlyParking !== configB.monthlyParking) {
    fields.add('monthlyParking');
    strength.monthlyParking = 'strong';
  }
  
  if (configA.monthlyWashing !== configB.monthlyWashing) {
    fields.add('monthlyWashing');
    strength.monthlyWashing = 'strong';
  }
  
  return { fields, strength };
};
