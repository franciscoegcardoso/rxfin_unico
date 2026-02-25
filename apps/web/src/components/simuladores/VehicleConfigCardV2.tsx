import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useUserKV } from '@/hooks/useUserKV';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Loader2,
  HelpCircle,
  ParkingCircle,
  Milestone,
  Droplets,
  MapPin,
  RotateCcw,
  Car,
  Bike,
  Truck,
  Star,
  Lock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { statesList } from '@/data/vehicleBenchmarks';
import { useFipe, VehicleType, formatFipeYearName, formatFipeAnoModelo } from '@/hooks/useFipe';
import { inferVehicleCategory } from '@/utils/insuranceEstimator';
import { useVehicleConsumption } from '@/hooks/useVehicleConsumption';
import { FuelParametersTable, FuelRowData } from './FuelParametersTable';
import { FavoriteVehicle } from '@/hooks/useFavoriteVehicles';
import { FavoriteSwapDialog } from './FavoriteSwapDialog';

// ============================================================================
// STORAGE KEY PREFIX for useUserKV persistence per vehicle
// ============================================================================
const STORAGE_KEY_PREFIX = 'car-ab-vehicle-';

// ============================================================================
// FORMATTERS
// ============================================================================
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatMoneyShort = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}Mn`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return formatMoney(value);
};

// ============================================================================
// VEHICLE CONFIG INTERFACE (Updated to match FipeOwnershipCostCard)
// ============================================================================
export interface VehicleConfigV2 {
  sourceType: 'manual' | 'fipe';
  customValue: number;
  vehicleState: string;
  vehicleAge: number;
  isZeroKm: boolean;
  userProfile: 'padrao' | 'jovem' | 'experiente';
  // Fuel data from FuelParametersTable
  totalMonthlyKm: number;
  fuelRows: FuelRowData[];
  calculatedFuelCost: number;
  // Additional costs
  monthlyParking: number;
  monthlyTolls: number;
  monthlyWashing: number;
  // Custom overrides (undefined = use suggested)
  customInsuranceAnnual?: number;
  customMaintenanceAnnual?: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================
export interface VehicleConfigCardV2Props {
  label: string;
  color: 'A' | 'B';
  fipe: ReturnType<typeof useFipe>;
  config: VehicleConfigV2;
  onConfigChange: (updates: Partial<VehicleConfigV2>) => void;
  consumptionHook: ReturnType<typeof useVehicleConsumption>;
  divergentFields?: Set<string>;
  onSyncField?: (field: string) => void;
  showSyncButtons?: boolean;
  /** Hide cost parameters (Estado, Fuel, Custos adicionais) - render them externally */
  hideCostParameters?: boolean;
  // Favorites
  favoriteVehicles?: FavoriteVehicle[];
  onSelectFavorite?: (favorite: FavoriteVehicle) => void;
  onAddFavorite?: () => void;
  onRemoveFavorite?: (favoriteId: string) => void;
  onSwapFavorite?: (removeId: string) => void;
  canAddFavorite?: boolean;
  isFavorited?: boolean;
  swapDialogOpen?: boolean;
  setSwapDialogOpen?: (open: boolean) => void;
  currentVehicleDisplayName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const VehicleConfigCardV2: React.FC<VehicleConfigCardV2Props> = ({
  label,
  color,
  fipe,
  config,
  onConfigChange,
  consumptionHook,
  divergentFields,
  onSyncField,
  showSyncButtons = false,
  hideCostParameters = false,
  favoriteVehicles = [],
  onSelectFavorite,
  onAddFavorite,
  onRemoveFavorite,
  onSwapFavorite,
  canAddFavorite = false,
  isFavorited = false,
  swapDialogOpen = false,
  setSwapDialogOpen,
  currentVehicleDisplayName = '',
}) => {
  // Helper to check if a field is divergent
  const isDivergent = (field: string) => divergentFields?.has(field) ?? false;
  
  // Sync button component
  const SyncButton: React.FC<{ field: string }> = ({ field }) => {
    if (!showSyncButtons || !onSyncField) return null;
    const direction = color === 'A' ? 'B→A' : 'A→B';
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSyncField(field);
    };
    
    return (
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="h-5 px-1.5 text-[10px] gap-0.5 border border-border rounded hover:bg-muted/50 shrink-0 inline-flex items-center font-medium bg-background"
              onClick={handleClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {direction}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Copiar valor do Carro {color === 'A' ? 'B' : 'A'}
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
    );
  };
  // Build options for SearchableSelect
  const brandOptions = fipe.brands.map(b => ({ value: b.codigo, label: b.nome }));
  const modelOptions = fipe.models.map(m => ({ value: String(m.codigo), label: m.nome }));
  const yearOptions = fipe.years.map(y => ({ value: y.codigo, label: formatFipeYearName(y.nome) }));

  // Computed vehicle value
  const vehicleValue = config.sourceType === 'fipe' && fipe.priceValue > 0 
    ? fipe.priceValue
    : config.customValue;

  // Get storage key for this vehicle
  const vehicleStorageKey = useMemo(() => {
    if (fipe.price) {
      const model = fipe.price.Modelo.toLowerCase().replace(/\s+/g, '-');
      const year = fipe.price.AnoModelo;
      return `${STORAGE_KEY_PREFIX}${color}-${model}-${year}`;
    }
    return `${STORAGE_KEY_PREFIX}${color}-manual`;
  }, [fipe.price, color]);

  // Load/persist data via useUserKV
  const kvKey = useMemo(() => {
    if (fipe.price) {
      const model = fipe.price.Modelo.toLowerCase().replace(/\s+/g, '-');
      const year = fipe.price.AnoModelo;
      return `car-ab-vehicle-${color}-${model}-${year}`;
    }
    return `car-ab-vehicle-${color}-manual`;
  }, [fipe.price, color]);

  const { value: persistedVehicleData, setValue: setPersistedVehicleData } = useUserKV<any>(kvKey, null);

  // Persist data when config changes
  useEffect(() => {
    const sanitizedFuelRows = (config.fuelRows || []).map(row => ({
      type: row.type,
      label: row.label,
      unit: row.unit,
      consumption: row.consumption,
      price: row.price,
      monthlyKm: row.monthlyKm,
      splitPercent: row.splitPercent,
      isCustomConsumption: row.isCustomConsumption,
      isCustomPrice: row.isCustomPrice,
      isCustomKm: row.isCustomKm,
      suggestedConsumption: row.suggestedConsumption,
      suggestedPrice: row.suggestedPrice,
      source: row.source,
      sourceLabel: row.sourceLabel,
    }));
    
    const dataToStore = {
      vehicleState: config.vehicleState,
      totalMonthlyKm: config.totalMonthlyKm,
      fuelRows: sanitizedFuelRows,
      monthlyParking: config.monthlyParking,
      monthlyTolls: config.monthlyTolls,
      monthlyWashing: config.monthlyWashing,
      customInsuranceAnnual: config.customInsuranceAnnual,
      customMaintenanceAnnual: config.customMaintenanceAnnual,
    };
    setPersistedVehicleData(dataToStore);
  }, [kvKey, config.vehicleState, config.totalMonthlyKm, config.fuelRows, config.monthlyParking, config.monthlyTolls, config.monthlyWashing, config.customInsuranceAnnual, config.customMaintenanceAnnual, setPersistedVehicleData]);

  // Calculate age from selected year
  const currentYear = new Date().getFullYear();
  const calculatedAge = useMemo(() => {
    if (fipe.price?.AnoModelo) {
      return Math.max(0, currentYear - fipe.price.AnoModelo);
    }
    return config.vehicleAge;
  }, [fipe.price?.AnoModelo, currentYear, config.vehicleAge]);

  // Update config when age changes
  useEffect(() => {
    if (fipe.price?.AnoModelo) {
      const newAge = Math.max(0, currentYear - fipe.price.AnoModelo);
      if (newAge !== config.vehicleAge) {
        onConfigChange({ 
          vehicleAge: newAge,
          isZeroKm: newAge === 0
        });
      }
    }
  }, [fipe.price?.AnoModelo, currentYear]);

  // Fetch consumption suggestion when vehicle changes
  useEffect(() => {
    if (fipe.price && config.sourceType === 'fipe') {
      const brand = fipe.price.Marca;
      const model = fipe.price.Modelo;
      const year = fipe.price.AnoModelo;
      consumptionHook.fetchConsumption(brand, model, year);
    }
  }, [fipe.price, config.sourceType]);

  // Handle FuelParametersTable changes
  const handleFuelChange = useCallback((totalKm: number, totalCost: number, fuelRows: FuelRowData[]) => {
    onConfigChange({
      totalMonthlyKm: totalKm,
      calculatedFuelCost: totalCost,
      fuelRows,
    });
  }, [onConfigChange]);

  // Get yearLabel for FuelParametersTable
  const yearLabel = useMemo(() => {
    if (fipe.price) {
      // Extract fuel type from year name (e.g., "2024 Flex", "2023 Diesel")
      const yearName = fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || '';
      return formatFipeYearName(yearName);
    }
    return '';
  }, [fipe.price, fipe.years, fipe.selectedYear]);

  // Check if there are custom overrides
  const hasCustomOverrides = config.customInsuranceAnnual !== undefined || 
                              config.customMaintenanceAnnual !== undefined;

  // Restore all estimates
  const handleRestoreEstimates = useCallback(() => {
    onConfigChange({
      customInsuranceAnnual: undefined,
      customMaintenanceAnnual: undefined,
    });
  }, [onConfigChange]);

  const colorClasses = color === 'A' 
    ? { border: 'border-blue-500/30', text: 'text-blue-600', bg: 'bg-blue-500/20', badgeBorder: 'border-blue-500/50' }
    : { border: 'border-amber-500/30', text: 'text-amber-600', bg: 'bg-amber-500/20', badgeBorder: 'border-amber-500/50' };

  return (
    <>
    <Card className={cn("border-2", colorClasses.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold", colorClasses.bg, colorClasses.text)}>
              {color}
            </div>
            Carro {label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {vehicleValue > 0 && (
              <Badge variant="outline" className={cn(colorClasses.badgeBorder, colorClasses.text)}>
                {formatMoneyShort(vehicleValue)}
              </Badge>
            )}
            {fipe.price && onAddFavorite && (
              <Button
                variant={isFavorited ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={onAddFavorite}
                disabled={isFavorited}
              >
                <Star className={cn(
                  "h-4 w-4",
                  isFavorited ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                )} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Favorites Quick Select */}
        {favoriteVehicles.length > 0 && onSelectFavorite && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              Favoritos
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {favoriteVehicles.map((fav) => (
                <div key={fav.id} className="flex items-center gap-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => onSelectFavorite(fav)}
                  >
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {fav.displayName}
                  </Button>
                  {onRemoveFavorite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveFavorite(fav.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Source Type Tabs */}
        <Tabs value={config.sourceType} onValueChange={(v) => onConfigChange({ sourceType: v as any })}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fipe" className="text-xs">FIPE</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="fipe" className="space-y-3 mt-3">
            {/* Vehicle Type - Card Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Veículo</Label>
              <div className="grid grid-cols-3 gap-1.5">
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
                        flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all duration-200
                        ${isSelected 
                          ? 'border-primary bg-primary/10 shadow-sm' 
                          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <IconComponent 
                        className={`h-5 w-5 transition-colors ${isSelected ? type.color : 'text-muted-foreground'}`} 
                      />
                      <span className={`text-[10px] font-medium transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <SearchableSelect
              options={brandOptions}
              value={fipe.selectedBrand}
              onValueChange={fipe.setSelectedBrand}
              placeholder={fipe.loading.brands ? "Carregando..." : "Marca"}
              disabled={fipe.loading.brands}
              emptyMessage="Nenhuma marca encontrada"
            />

            {fipe.selectedBrand && (
              <SearchableSelect
                options={modelOptions}
                value={fipe.selectedModel}
                onValueChange={fipe.setSelectedModel}
                placeholder={fipe.loading.models ? "Carregando..." : "Modelo"}
                disabled={fipe.loading.models}
                emptyMessage="Nenhum modelo encontrado"
              />
            )}

            {fipe.selectedModel && (
              <Select 
                value={fipe.selectedYear} 
                onValueChange={fipe.setSelectedYear}
                disabled={fipe.loading.years}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={fipe.loading.years ? "Carregando..." : "Ano"} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(fipe.loading.brands || fipe.loading.models || fipe.loading.years || fipe.loading.price) && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {fipe.price && (
              <div className={cn("p-4 rounded-xl text-center border", colorClasses.bg.replace('/20', '/5'), colorClasses.border)}>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Valor FIPE</p>
                  {(() => {
                    const ageBadge = calculatedAge <= 0 
                      ? { color: 'bg-emerald-500', label: '0 km' }
                      : calculatedAge <= 3 
                      ? { color: 'bg-emerald-500', label: `${calculatedAge} ${calculatedAge === 1 ? 'ano' : 'anos'}` }
                      : calculatedAge <= 5
                      ? { color: 'bg-amber-500', label: `${calculatedAge} anos` }
                      : calculatedAge <= 10
                      ? { color: 'bg-orange-500', label: `${calculatedAge} anos` }
                      : { color: 'bg-red-500', label: `${calculatedAge} anos` };
                    return (
                      <Badge className={ageBadge.color + ' text-white text-[10px] px-1.5 py-0'}>
                        {ageBadge.label}
                      </Badge>
                    );
                  })()}
                </div>
                <p className={cn("text-2xl font-bold mt-1", colorClasses.text)}>
                  {fipe.price.Valor}
                </p>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {fipe.price.Modelo}
                </p>
                
                {/* Details grid matching FIPE simulator */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground pt-3 mt-3 border-t border-border/50 text-left">
                  <p>Código: {fipe.price.CodigoFipe}</p>
                  <p className="text-right">Ref: {fipe.price.MesReferencia}</p>
                  <p>Combustível: {fipe.price.Combustivel}</p>
                  <p className="text-right">Ano Modelo: {formatFipeAnoModelo(fipe.price.AnoModelo)}</p>
                </div>

                {/* Faixa p/ Compra + Categoria */}
                {(() => {
                  const negotiationMin = fipe.priceValue * 0.95;
                  const mdlName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
                  const category = inferVehicleCategory(mdlName, fipe.vehicleType);
                  return (
                    <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-border/50">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Faixa p/ Compra</p>
                        <p className="text-xs font-semibold text-primary">{formatMoney(negotiationMin)}</p>
                        <p className="text-[9px] text-muted-foreground">até {fipe.price.Valor} (FIPE)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Categoria</p>
                        <p className="text-xs font-medium capitalize">{category.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label className="text-xs">Valor do veículo</Label>
              <CurrencyInput 
                value={config.customValue} 
                onChange={(v) => onConfigChange({ customValue: v })} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Idade do veículo (anos)</Label>
              <Input 
                type="number"
                min="0"
                max="30"
                value={config.vehicleAge}
                onChange={(e) => onConfigChange({ vehicleAge: Number(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Seções condicionais - aparecem apenas quando veículo selecionado */}
        {!hideCostParameters && (fipe.price || (config.sourceType === 'manual' && config.customValue > 0)) && (
          <>
            {/* Estado para IPVA */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border-t transition-colors",
              isDivergent('vehicleState') 
                ? "bg-amber-500/10 border-amber-500/30" 
                : "bg-muted/50"
            )}>
              <MapPin className={cn(
                "h-4 w-4 shrink-0",
                isDivergent('vehicleState') ? "text-amber-600" : "text-muted-foreground"
              )} />
              <div className="flex-1">
                <label className={cn(
                  "text-xs flex items-center gap-1.5 mb-1",
                  isDivergent('vehicleState') ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"
                )}>
                  Estado (IPVA)
                  {isDivergent('vehicleState') && (
                    <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">≠</span>
                  )}
                  <SyncButton field="vehicleState" />
                </label>
                <Select value={config.vehicleState} onValueChange={(v) => onConfigChange({ vehicleState: v })}>
                  <SelectTrigger className={cn(
                    "h-8 text-xs",
                    isDivergent('vehicleState') && "border-amber-500/50 ring-1 ring-amber-500/30"
                  )}>
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

            {/* FuelParametersTable - mesma lógica do FipeOwnershipCostCard */}
            <div className="border-t pt-4">
              <FuelParametersTable
                yearLabel={yearLabel || 'Flex'}
                consumptionSuggestion={consumptionHook.suggestion}
                consumptionLoading={consumptionHook.loading}
                initialMonthlyKm={config.totalMonthlyKm || 1000}
                onChange={handleFuelChange}
                persistedData={{
                  fuelRows: config.fuelRows,
                  totalMonthlyKm: config.totalMonthlyKm,
                }}
              />
            </div>

            {/* Custos extras - mesma lógica do FipeOwnershipCostCard */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Custos adicionais (opcionais)</p>
              <div className="grid grid-cols-3 gap-2">
                {/* Estacionamento */}
                <div className={cn(
                  "space-y-1 p-1.5 rounded-md transition-colors -m-1.5",
                  isDivergent('monthlyParking') && "bg-amber-500/10"
                )}>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Label className={cn(
                          "text-[10px] flex items-center gap-1 cursor-help flex-wrap",
                          isDivergent('monthlyParking') ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          <ParkingCircle className={cn("h-3 w-3", isDivergent('monthlyParking') && "text-amber-600")} />
                          Estacion./mês
                          {isDivergent('monthlyParking') && <span className="text-[8px] bg-amber-500/20 px-1 rounded">≠</span>}
                          <SyncButton field="monthlyParking" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        <p className="font-medium mb-1">Valores típicos:</p>
                        <p>• Shopping: R$ 15-30/hora</p>
                        <p>• Mensalista: R$ 200-600</p>
                        <p>• Rua rotativa: R$ 3-8/hora</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                  <CurrencyInput
                    value={config.monthlyParking}
                    onChange={(v) => onConfigChange({ monthlyParking: v || 0 })}
                    className={cn(
                      "h-8 text-xs",
                      isDivergent('monthlyParking') && "border-amber-500/50 ring-1 ring-amber-500/30"
                    )}
                    placeholder="0,00"
                  />
                </div>
                
                {/* Pedágio */}
                <div className={cn(
                  "space-y-1 p-1.5 rounded-md transition-colors -m-1.5",
                  isDivergent('monthlyTolls') && "bg-amber-500/10"
                )}>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Label className={cn(
                          "text-[10px] flex items-center gap-1 cursor-help flex-wrap",
                          isDivergent('monthlyTolls') ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          <Milestone className={cn("h-3 w-3", isDivergent('monthlyTolls') && "text-amber-600")} />
                          Pedágio/mês
                          {isDivergent('monthlyTolls') && <span className="text-[8px] bg-amber-500/20 px-1 rounded">≠</span>}
                          <SyncButton field="monthlyTolls" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        <p className="font-medium mb-1">Valores típicos:</p>
                        <p>• Sem Parar mensal: R$ 15-25</p>
                        <p>• Pedágio: R$ 5-30/trecho</p>
                        <p>• Rodovia diária: R$ 100-400</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                  <CurrencyInput
                    value={config.monthlyTolls}
                    onChange={(v) => onConfigChange({ monthlyTolls: v || 0 })}
                    className={cn(
                      "h-8 text-xs",
                      isDivergent('monthlyTolls') && "border-amber-500/50 ring-1 ring-amber-500/30"
                    )}
                    placeholder="0,00"
                  />
                </div>
                
                {/* Limpeza */}
                <div className={cn(
                  "space-y-1 p-1.5 rounded-md transition-colors -m-1.5",
                  isDivergent('monthlyWashing') && "bg-amber-500/10"
                )}>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Label className={cn(
                          "text-[10px] flex items-center gap-1 cursor-help flex-wrap",
                          isDivergent('monthlyWashing') ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          <Droplets className={cn("h-3 w-3", isDivergent('monthlyWashing') && "text-amber-600")} />
                          Limpeza/mês
                          {isDivergent('monthlyWashing') && <span className="text-[8px] bg-amber-500/20 px-1 rounded">≠</span>}
                          <SyncButton field="monthlyWashing" />
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        <p className="font-medium mb-1">Valores típicos:</p>
                        <p>• Lavagem simples: R$ 30-50</p>
                        <p>• Lavagem completa: R$ 60-120</p>
                        <p>• Higienização: R$ 150-300</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                  <CurrencyInput
                    value={config.monthlyWashing}
                    onChange={(v) => onConfigChange({ monthlyWashing: v || 0 })}
                    className={cn(
                      "h-8 text-xs",
                      isDivergent('monthlyWashing') && "border-amber-500/50 ring-1 ring-amber-500/30"
                    )}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Overrides com botão de restaurar */}
        {hasCustomOverrides && (
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1"
              onClick={handleRestoreEstimates}
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar estimativas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Favorite Swap Dialog */}
    {setSwapDialogOpen && onSwapFavorite && (
      <FavoriteSwapDialog
        open={swapDialogOpen}
        onOpenChange={setSwapDialogOpen}
        favorites={favoriteVehicles}
        newVehicleName={currentVehicleDisplayName}
        onSwap={onSwapFavorite}
      />
    )}
    </>
  );
};

// ============================================================================
// DEFAULT CONFIG FACTORY
// ============================================================================
export const createDefaultVehicleConfigV2 = (): VehicleConfigV2 => ({
  sourceType: 'fipe',
  customValue: 0,
  vehicleState: 'SP',
  vehicleAge: 0,
  isZeroKm: true,
  userProfile: 'padrao',
  totalMonthlyKm: 1000,
  fuelRows: [],
  calculatedFuelCost: 0,
  monthlyParking: 0,
  monthlyTolls: 0,
  monthlyWashing: 0,
});
