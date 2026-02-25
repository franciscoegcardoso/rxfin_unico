import React, { useMemo, useEffect } from 'react';
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
  Fuel,
  Shield,
  Wrench,
  Loader2,
  HelpCircle,
  ParkingCircle,
  Milestone,
  Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { statesList } from '@/data/vehicleBenchmarks';
import {
  calculateInsuranceEstimate,
  InsuranceEstimate,
  UserProfile,
} from '@/utils/insuranceEstimator';
import {
  calculateMaintenanceEstimate,
  MaintenanceEstimate,
} from '@/utils/maintenanceEstimator';
import { useFipe, VehicleType, formatFipeYearName } from '@/hooks/useFipe';
import { useVehicleConsumption, ConsumptionSource } from '@/hooks/useVehicleConsumption';
import { SimulationDefaults } from './SimulationParametersDialog';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatMoneyShort = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}Mn`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return formatMoney(value);
};

export interface VehicleConfig {
  sourceType: 'manual' | 'fipe';
  customValue: number;
  vehicleState: string;
  monthlyKm: number;
  fuelConsumption: number;
  fuelType: 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'hybrid_plugin' | 'electric';
  flexFuelChoice?: 'gasoline' | 'ethanol';
  hybridGasKmPercent?: number;
  electricConsumption?: number;
  vehicleAge: number;
  isZeroKm: boolean;
  consumptionSource?: ConsumptionSource;
  userProfile: UserProfile;
  monthlyParking: number;
  monthlyTolls: number;
  monthlyWashing: number;
  customFuelPrice?: number;
  customElectricPrice?: number;
  customInsuranceAnnual?: number;
  customMaintenanceAnnual?: number;
}

// Insurance Help Button with reference values by category
const InsuranceHelpButton: React.FC<{
  vehicleValue: number;
  modelName: string;
  userProfile: UserProfile;
  vehicleType?: VehicleType;
}> = ({ vehicleValue, modelName, userProfile, vehicleType }) => {
  const estimate = useMemo(() => {
    if (vehicleValue <= 0) return null;
    return calculateInsuranceEstimate(vehicleValue, modelName, undefined, userProfile, vehicleType);
  }, [vehicleValue, modelName, userProfile, vehicleType]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-0.5">
          <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Como Estimamos o Seguro
          </DialogTitle>
          <DialogDescription>
            Metodologia de cálculo do seguro anual
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {estimate && (
            <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Faixa estimada:</span>
                <span className="font-medium">
                  {formatMoney(estimate.valorMinimo * 12)} - {formatMoney(estimate.valorMaximo * 12)}/ano
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Taxa base aplicada:</span>
                <span className="font-medium">{(estimate.taxaBase * 100).toFixed(1)}% do FIPE</span>
              </div>
              {estimate.ajusteIVR > 1 && (
                <div className="flex justify-between items-center text-red-500">
                  <span>Ajuste IVR (furto/roubo):</span>
                  <span className="font-medium">+{((estimate.ajusteIVR - 1) * 100).toFixed(0)}%</span>
                </div>
              )}
              {estimate.justificativas.length > 0 && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {estimate.justificativas.map((j, i) => (
                    <p key={i}>• {j}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div>
            <h4 className="font-semibold mb-2 text-xs">Fórmula Aplicada</h4>
            <div className="p-2 bg-muted rounded-lg font-mono text-[10px]">
              Seguro Anual = Valor FIPE × Taxa Categoria × Ajuste IVR
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Esta é uma estimativa para comparação. O valor real depende de CEP, idade do condutor, 
            bônus da seguradora e perfil de uso.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Maintenance Help Button with reference values
const MaintenanceHelpButton: React.FC<{
  vehicleValue: number;
  modelName: string;
  vehicleAge: number;
  monthlyKm: number;
}> = ({ vehicleValue, modelName, vehicleAge, monthlyKm }) => {
  const estimate = useMemo(() => {
    if (vehicleValue <= 0) return null;
    const currentYear = new Date().getFullYear();
    const manufacturingYear = currentYear - vehicleAge;
    const estimatedKm = monthlyKm * 12 * vehicleAge;
    return calculateMaintenanceEstimate(vehicleValue, modelName, manufacturingYear, estimatedKm);
  }, [vehicleValue, modelName, vehicleAge, monthlyKm]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-0.5">
          <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Como Estimamos a Manutenção
          </DialogTitle>
          <DialogDescription>
            Metodologia de cálculo dos custos anuais
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {estimate && (
            <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custo estimado:</span>
                <span className="font-medium">{formatMoney(estimate.custoAnual)}/ano</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Veredito:</span>
                <Badge variant="outline" className="text-[10px]">{estimate.vereditoLabel}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Fator idade:</span>
                <span className="font-medium">{estimate.fatores.fatorIdade.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Índice complexidade:</span>
                <span className="font-medium">{estimate.fatores.indiceComplexidade.toFixed(1)}x</span>
              </div>
              {estimate.fatores.regraRestoRico && (
                <p className="text-xs text-red-500 pt-1">
                  ⚠️ Regra do "Resto de Rico" aplicada - veículo premium depreciado com custos altos de manutenção
                </p>
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                {estimate.vereditoDescricao}
              </p>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold mb-2 text-xs">Fórmula Aplicada</h4>
            <div className="p-2 bg-muted rounded-lg font-mono text-[10px]">
              Custo Anual = Base × Fator Idade × Índice Complexidade
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Inclui revisões programadas, manutenção preventiva e corretiva estimada. 
            Ajuste com base no seu histórico real.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Badge de origem do consumo
const ConsumptionSourceBadge: React.FC<{ source?: ConsumptionSource }> = ({ source }) => {
  if (!source) return null;
  
  const config = {
    inmetro: { label: 'INMETRO', className: 'bg-green-500/20 text-green-600 border-green-500/30' },
    estimate: { label: 'Estimativa', className: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
    manual: { label: 'Manual', className: 'bg-muted text-muted-foreground border-border' },
  };
  
  const { label, className } = config[source] || config.manual;
  
  return (
    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", className)}>
      {label}
    </Badge>
  );
};

// Get effective fuel price based on config and params
const getEffectiveFuelPrice = (config: VehicleConfig, params: SimulationDefaults): number => {
  if (config.fuelType === 'flex') {
    return config.flexFuelChoice === 'ethanol' ? params.fuelPrices.ethanol : params.fuelPrices.gasoline;
  }
  if (config.fuelType === 'hybrid_plugin') {
    return params.fuelPrices.gasoline;
  }
  switch (config.fuelType) {
    case 'gasoline': return params.fuelPrices.gasoline;
    case 'ethanol': return params.fuelPrices.ethanol;
    case 'diesel': return params.fuelPrices.diesel;
    default: return params.fuelPrices.gasoline;
  }
};

export interface VehicleConfigCardProps {
  label: string;
  color: string;
  fipe: ReturnType<typeof useFipe>;
  config: VehicleConfig;
  onConfigChange: (updates: Partial<VehicleConfig>) => void;
  consumptionHook: ReturnType<typeof useVehicleConsumption>;
  simulationParams: SimulationDefaults;
  estimatedInsurance?: number;
  estimatedMaintenance?: number;
}

export const VehicleConfigCard: React.FC<VehicleConfigCardProps> = ({ 
  label, 
  color, 
  fipe, 
  config, 
  onConfigChange, 
  consumptionHook, 
  simulationParams, 
  estimatedInsurance, 
  estimatedMaintenance 
}) => {
  const brandOptions = fipe.brands.map(b => ({ value: b.codigo, label: b.nome }));
  const modelOptions = fipe.models.map(m => ({ value: String(m.codigo), label: m.nome }));
  const yearOptions = fipe.years.map(y => ({ value: y.codigo, label: formatFipeYearName(y.nome) }));

  const vehicleValue = config.sourceType === 'fipe' && fipe.priceValue > 0 
    ? fipe.priceValue
    : config.customValue;

  // Calcular idade automaticamente a partir do ano do modelo
  const currentYear = new Date().getFullYear();
  const calculatedAge = useMemo(() => {
    if (fipe.price?.AnoModelo) {
      return Math.max(0, currentYear - fipe.price.AnoModelo);
    }
    return config.vehicleAge;
  }, [fipe.price?.AnoModelo, currentYear, config.vehicleAge]);

  // Atualizar config quando idade mudar
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

  // Buscar sugestão de consumo quando veículo FIPE for selecionado
  useEffect(() => {
    if (fipe.price && config.sourceType === 'fipe') {
      const brand = fipe.price.Marca;
      const model = fipe.price.Modelo;
      const year = fipe.price.AnoModelo;
      
      consumptionHook.fetchConsumption(brand, model, year).then((suggestion) => {
        if (suggestion) {
          onConfigChange({ 
            fuelConsumption: Math.round(suggestion.average * 10) / 10,
            consumptionSource: suggestion.source 
          });
        }
      });
    }
  }, [fipe.price, config.sourceType]);

  // Marcar como manual quando usuário editar
  const handleConsumptionChange = (value: number) => {
    onConfigChange({ 
      fuelConsumption: value,
      consumptionSource: 'manual' 
    });
  };

  return (
    <Card className={cn("border-2", color === 'A' ? "border-blue-500/30" : "border-amber-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold",
              color === 'A' ? "bg-blue-500/20 text-blue-600" : "bg-amber-500/20 text-amber-600"
            )}>
              {color}
            </div>
            Carro {label}
          </CardTitle>
          {vehicleValue > 0 && (
            <Badge variant="outline" className={cn(
              color === 'A' ? "border-blue-500/50 text-blue-600" : "border-amber-500/50 text-amber-600"
            )}>
              {formatMoneyShort(vehicleValue)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={config.sourceType} onValueChange={(v) => onConfigChange({ sourceType: v as any })}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fipe" className="text-xs">FIPE</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="fipe" className="space-y-3 mt-3">
            <Select 
              value={fipe.vehicleType} 
              onValueChange={(v) => fipe.setVehicleType(v as VehicleType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carros">Carros</SelectItem>
                <SelectItem value="motos">Motos</SelectItem>
                <SelectItem value="caminhoes">Caminhões</SelectItem>
              </SelectContent>
            </Select>

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
              <div className={cn(
                "p-4 rounded-xl text-center border",
                color === 'A' ? "bg-blue-500/5 border-blue-500/20" : "bg-amber-500/5 border-amber-500/20"
              )}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Valor FIPE</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  color === 'A' ? "text-blue-600" : "text-amber-600"
                )}>
                  {fipe.price.Valor}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {fipe.price.Modelo}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0.5",
                      color === 'A' ? "border-blue-500/30 text-blue-600" : "border-amber-500/30 text-amber-600"
                    )}
                  >
                    {fipe.price.AnoModelo}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    color === 'A' ? "text-blue-600" : "text-amber-600"
                  )}>
                    {calculatedAge === 0 ? '0 km' : `${calculatedAge} ${calculatedAge === 1 ? 'ano' : 'anos'}`}
                  </span>
                </div>
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
          </TabsContent>
        </Tabs>

        {/* Parâmetros de uso */}
        <div className="pt-2 border-t space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Parâmetros de uso</p>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Km/mês</Label>
              <Input 
                type="text"
                inputMode="numeric"
                value={config.monthlyKm ? new Intl.NumberFormat('pt-BR').format(config.monthlyKm) : ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                  onConfigChange({ monthlyKm: raw ? Number(raw) : 0 });
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Km/litro</Label>
                <ConsumptionSourceBadge source={config.consumptionSource} />
              </div>
              <div className="relative">
                <Input 
                  type="number" 
                  step="0.1"
                  value={config.fuelConsumption} 
                  onChange={(e) => handleConsumptionChange(Number(e.target.value))}
                  className="h-8 text-sm"
                />
                {consumptionHook.loading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={config.vehicleState} onValueChange={(v) => onConfigChange({ vehicleState: v })}>
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
            <div className="space-y-1">
              <Label className="text-xs">Combustível</Label>
              <Select 
                value={config.fuelType} 
                onValueChange={(v) => onConfigChange({ fuelType: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="ethanol">Etanol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid_plugin">Híbrido Plugin</SelectItem>
                  <SelectItem value="electric">Elétrico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custos extras - 2 colunas no mobile, 3 no tablet+ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Label className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <ParkingCircle className="h-3 w-3" />
                      <span className="hidden md:inline">Estacionamento/mês</span>
                      <span className="md:hidden">Estacion./mês</span>
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
                className="h-8 text-xs"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Label className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <Milestone className="h-3 w-3" />
                      Pedágio/mês
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
                className="h-8 text-xs"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Label className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <Droplets className="h-3 w-3" />
                      Limpeza/mês
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
                className="h-8 text-xs"
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {/* Custos personalizáveis */}
        <div className="pt-2 border-t space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Custos (validar/ajustar)
            </p>
            {(config.customFuelPrice !== undefined || config.customInsuranceAnnual !== undefined || config.customMaintenanceAnnual !== undefined || config.customElectricPrice !== undefined) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => onConfigChange({
                  customFuelPrice: undefined,
                  customElectricPrice: undefined,
                  electricConsumption: undefined,
                  customInsuranceAnnual: undefined,
                  customMaintenanceAnnual: undefined
                })}
              >
                Restaurar estimativas
              </Button>
            )}
          </div>

          {/* Seletor de combustível para Flex */}
          {config.fuelType === 'flex' && (
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                Qual combustível você usa?
              </Label>
              <Select 
                value={config.flexFuelChoice || 'gasoline'} 
                onValueChange={(v) => onConfigChange({ 
                  flexFuelChoice: v as 'gasoline' | 'ethanol',
                  customFuelPrice: undefined
                })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="ethanol">Etanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Configuração para Híbrido Plugin */}
          {config.fuelType === 'hybrid_plugin' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Fuel className="h-3 w-3" />
                  % dos km rodados com gasolina
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={config.hybridGasKmPercent ?? 50}
                    onChange={(e) => onConfigChange({ hybridGasKmPercent: Number(e.target.value) })}
                    className="h-8 text-sm w-20"
                  />
                  <span className="text-xs text-muted-foreground">% gasolina</span>
                  <span className="text-xs text-muted-foreground mx-1">|</span>
                  <span className="text-xs text-muted-foreground">{100 - (config.hybridGasKmPercent ?? 50)}% elétrico</span>
                </div>
              </div>

              {/* Consumo elétrico (km/kWh) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    Consumo elétrico (km/kWh)
                  </Label>
                  {config.electricConsumption === undefined && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Estimativa
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={config.electricConsumption ?? 6}
                  onChange={(e) => onConfigChange({ electricConsumption: Number(e.target.value) || undefined })}
                  className="h-8 text-sm"
                  placeholder="6"
                />
                {config.electricConsumption !== undefined && config.electricConsumption !== 6 && (
                  <p className="text-[10px] text-muted-foreground">
                    Sugerido: 6 km/kWh (média híbridos plugin)
                  </p>
                )}
              </div>
              
              {/* Preço do kWh */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    Preço eletricidade (R$/kWh)
                  </Label>
                  {config.customElectricPrice === undefined && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-500/10 text-green-600 border-green-500/30">
                      ANEEL
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={config.customElectricPrice ?? 0.85}
                  onChange={(e) => onConfigChange({ customElectricPrice: Number(e.target.value) || undefined })}
                  className="h-8 text-sm"
                  placeholder="0.85"
                />
                {config.customElectricPrice !== undefined && config.customElectricPrice !== 0.85 && (
                  <p className="text-[10px] text-muted-foreground">
                    Sugerido: R$ 0,85/kWh (média residencial)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Configuração para Elétrico 100% */}
          {config.fuelType === 'electric' && (
            <div className="space-y-3">
              {/* Consumo elétrico (km/kWh) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    Consumo elétrico (km/kWh)
                  </Label>
                  {config.electricConsumption === undefined && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Estimativa
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={config.electricConsumption ?? 6}
                  onChange={(e) => onConfigChange({ electricConsumption: Number(e.target.value) || undefined })}
                  className="h-8 text-sm"
                  placeholder="6"
                />
                {config.electricConsumption !== undefined && config.electricConsumption !== 6 && (
                  <p className="text-[10px] text-muted-foreground">
                    Sugerido: 6 km/kWh (média elétricos)
                  </p>
                )}
              </div>
              
              {/* Preço do kWh */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    Preço eletricidade (R$/kWh)
                  </Label>
                  {config.customElectricPrice === undefined && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-500/10 text-green-600 border-green-500/30">
                      ANEEL
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={config.customElectricPrice ?? 0.85}
                  onChange={(e) => onConfigChange({ customElectricPrice: Number(e.target.value) || undefined })}
                  className="h-8 text-sm"
                  placeholder="0.85"
                />
                {config.customElectricPrice !== undefined && config.customElectricPrice !== 0.85 && (
                  <p className="text-[10px] text-muted-foreground">
                    Sugerido: R$ 0,85/kWh (média residencial)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preço do combustível (oculto para elétricos) */}
          {config.fuelType !== 'electric' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Fuel className="h-3 w-3" />
                  {config.fuelType === 'hybrid_plugin' 
                    ? 'Preço gasolina (R$/L)' 
                    : config.fuelType === 'flex'
                      ? `Preço ${config.flexFuelChoice === 'ethanol' ? 'etanol' : 'gasolina'} (R$/L)`
                      : `Preço ${config.fuelType === 'gasoline' ? 'gasolina' : config.fuelType === 'ethanol' ? 'etanol' : 'diesel'} (R$/L)`
                  }
                </Label>
                {config.customFuelPrice === undefined && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-500/10 text-green-600 border-green-500/30">
                    ANP
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={config.customFuelPrice ?? getEffectiveFuelPrice(config, simulationParams)}
                  onChange={(e) => onConfigChange({ customFuelPrice: Number(e.target.value) || undefined })}
                  className="h-8 text-sm"
                  placeholder={getEffectiveFuelPrice(config, simulationParams).toFixed(2)}
                />
              </div>
              {config.customFuelPrice !== undefined && Math.abs(config.customFuelPrice - getEffectiveFuelPrice(config, simulationParams)) > 0.01 && (
                <p className="text-[10px] text-muted-foreground">
                  Sugerido: R$ {getEffectiveFuelPrice(config, simulationParams).toFixed(2)}/L (ANP)
                </p>
              )}
            </div>
          )}

          {/* Grid responsivo 2 colunas para Seguro e Manutenção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Seguro anual */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between gap-1">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Label className="text-xs font-medium flex items-center gap-1.5 text-foreground cursor-help">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Seguro anual</span>
                        <span className="sm:hidden">Seguro /ano</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-medium mb-1">Faixas típicas por categoria:</p>
                      <p>• Hatch Popular: 3-5% do FIPE</p>
                      <p>• Sedan Médio: 4-6% do FIPE</p>
                      <p>• SUV Compacto: 4-7% do FIPE</p>
                      <p>• Picape: 5-8% do FIPE</p>
                      <p>• Importado: 6-10% do FIPE</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                <InsuranceHelpButton 
                  vehicleValue={vehicleValue}
                  modelName={fipe.price?.Modelo || ''}
                  userProfile={config.userProfile}
                  vehicleType={fipe.vehicleType}
                />
                {config.customInsuranceAnnual === undefined && estimatedInsurance !== undefined && estimatedInsurance > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                    Estimado
                  </Badge>
                )}
              </div>
              <CurrencyInput
                value={config.customInsuranceAnnual ?? (estimatedInsurance ?? 0) * 12}
                onChange={(v) => onConfigChange({ customInsuranceAnnual: v || undefined })}
                className="h-9 text-sm bg-background"
              />
              {config.customInsuranceAnnual !== undefined && estimatedInsurance !== undefined && Math.abs(config.customInsuranceAnnual - (estimatedInsurance * 12)) > 10 && (
                <p className="text-[10px] text-muted-foreground">
                  Sugerido: {formatMoney(estimatedInsurance * 12)}/ano
                </p>
              )}
            </div>

            {/* Manutenção/Revisão anual */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between gap-1">
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Label className="text-xs font-medium flex items-center gap-1.5 text-foreground cursor-help">
                        <Wrench className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Manutenção + Revisão /ano</span>
                        <span className="sm:hidden">Manut. /ano</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-medium mb-1">Faixas típicas por categoria:</p>
                      <p>• Popular Nacional: R$ 1.500-3.000</p>
                      <p>• Sedan Médio: R$ 2.500-5.000</p>
                      <p>• SUV Compacto: R$ 3.000-6.000</p>
                      <p>• Picape Média: R$ 4.000-8.000</p>
                      <p>• Importado Premium: R$ 8.000-20.000</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
                <MaintenanceHelpButton 
                  vehicleValue={vehicleValue}
                  modelName={fipe.price?.Modelo || ''}
                  vehicleAge={config.vehicleAge}
                  monthlyKm={config.monthlyKm}
                />
                {config.customMaintenanceAnnual === undefined && estimatedMaintenance !== undefined && estimatedMaintenance > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                    Estimado
                  </Badge>
                )}
              </div>
              <CurrencyInput
                value={config.customMaintenanceAnnual ?? ((estimatedMaintenance ?? 0) * 12 + simulationParams.revisionCostSemester * 2)}
                onChange={(v) => onConfigChange({ customMaintenanceAnnual: v || undefined })}
                className="h-9 text-sm bg-background"
              />
              {config.customMaintenanceAnnual !== undefined && estimatedMaintenance !== undefined && (
                (() => {
                  const suggested = (estimatedMaintenance * 12) + (simulationParams.revisionCostSemester * 2);
                  if (Math.abs(config.customMaintenanceAnnual - suggested) > 50) {
                    return (
                      <p className="text-[10px] text-muted-foreground">
                        Sugerido: {formatMoney(suggested)}/ano
                      </p>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleConfigCard;
