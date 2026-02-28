import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings2, 
  RotateCcw, 
  Info, 
  Fuel, 
  Shield, 
  Wrench, 
  TrendingDown,
  FileText,
  Circle,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Default values with methodology explanations
export interface SimulationDefaults {
  // Fuel prices (R$/L)
  fuelPrices: {
    gasoline: number;
    ethanol: number;
    diesel: number;
    flex: number;
  };
  // Insurance rates by category (annual % of FIPE)
  insuranceRates: {
    hatch_compacto: number;
    sedan_compacto: number;
    sedan_medio: number;
    suv_compacto: number;
    suv_medio: number;
    suv_grande: number;
    pickup_compacta: number;
    pickup_media: number;
    pickup_grande: number;
  };
  // Maintenance base costs (R$/year)
  maintenanceBaseCosts: {
    popular_nacional: number;
    sedan_medio: number;
    suv_compacto: number;
    suv_medio: number;
    pickup: number;
    premium_nacional: number;
    importado_padrao: number;
    importado_premium: number;
  };
  // Depreciation rates by year (annual %)
  depreciationRates: {
    year1: number;
    year2: number;
    year3: number;
    year4: number;
    year5: number;
    year6plus: number;
  };
  // Other costs
  licensingAnnual: number;
  tireMounting: number;
  treadwearMultiplier: number;
  revisionCostSemester: number;
}

export const SYSTEM_DEFAULTS: SimulationDefaults = {
  fuelPrices: {
    gasoline: 5.79,
    ethanol: 3.99,
    diesel: 5.89,
    flex: 5.79,
  },
  insuranceRates: {
    hatch_compacto: 0.040,
    sedan_compacto: 0.038,
    sedan_medio: 0.035,
    suv_compacto: 0.042,
    suv_medio: 0.045,
    suv_grande: 0.055,
    pickup_compacta: 0.048,
    pickup_media: 0.058,
    pickup_grande: 0.070,
  },
  maintenanceBaseCosts: {
    popular_nacional: 800,
    sedan_medio: 1200,
    suv_compacto: 1400,
    suv_medio: 1800,
    pickup: 2200,
    premium_nacional: 2800,
    importado_padrao: 3500,
    importado_premium: 5000,
  },
  depreciationRates: {
    year1: 0.15,
    year2: 0.10,
    year3: 0.08,
    year4: 0.06,
    year5: 0.05,
    year6plus: 0.04,
  },
  licensingAnnual: 150,
  tireMounting: 250,
  treadwearMultiplier: 140,
  revisionCostSemester: 800,
};

// Methodology explanations
const methodologyExplanations = {
  fuelPrices: {
    title: 'Preços de Combustível',
    source: 'ANP - Agência Nacional do Petróleo',
    description: 'Média nacional dos preços praticados nos postos de combustível, atualizado semanalmente pela ANP.',
    lastUpdate: 'Janeiro 2025',
  },
  insuranceRates: {
    title: 'Taxas de Seguro',
    source: 'SUSEP e Seguradoras',
    description: 'Média das taxas praticadas por seguradoras, variando por categoria de veículo baseado em sinistralidade e custo de peças.',
    lastUpdate: 'Dados agregados 2024',
  },
  maintenanceBaseCosts: {
    title: 'Custos de Manutenção',
    source: 'Sindirepa e Oficinas Autorizadas',
    description: 'Custo anual médio de manutenção preventiva e corretiva por categoria, incluindo revisões programadas.',
    lastUpdate: 'Pesquisa 2024',
  },
  depreciationRates: {
    title: 'Taxas de Depreciação',
    source: 'Tabela FIPE e Estudos de Mercado',
    description: 'Curva de depreciação baseada na variação histórica dos preços FIPE ao longo do tempo, maior nos primeiros anos.',
    lastUpdate: 'Análise histórica 2020-2024',
  },
  licensing: {
    title: 'Licenciamento',
    source: 'DETRAN - Média Nacional',
    description: 'Valor médio das taxas de licenciamento anual incluindo CRLV. Varia por estado.',
    lastUpdate: '2025',
  },
  tires: {
    title: 'Pneus',
    source: 'Pneustore, Bridgestone, Pirelli',
    description: 'Preços médios de varejo por aro. Durabilidade calculada pelo índice Treadwear (TW × multiplicador = km).',
    lastUpdate: 'Janeiro 2025',
  },
  revision: {
    title: 'Revisões',
    source: 'Concessionárias Autorizadas',
    description: 'Custo médio de revisão programada em concessionária, incluindo troca de óleo e filtros.',
    lastUpdate: '2024',
  },
};

interface SimulationParametersDialogProps {
  parameters: SimulationDefaults;
  onParametersChange: (params: SimulationDefaults) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ParameterRow: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  isPercentage?: boolean;
  isDefault?: boolean;
}> = ({ label, value, onChange, suffix, prefix, step = 0.01, min, max, isPercentage, isDefault }) => {
  const displayValue = isPercentage ? (value * 100).toFixed(1) : value;
  
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm truncate">{label}</span>
        {isDefault && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 bg-muted">
            padrão
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={isPercentage ? (value * 100) : value}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value) || 0;
            onChange(isPercentage ? newValue / 100 : newValue);
          }}
          step={isPercentage ? 0.1 : step}
          min={min}
          max={max}
          className="h-8 w-24 text-right text-sm"
        />
        {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
};

const MethodologyBadge: React.FC<{ methodology: typeof methodologyExplanations.fuelPrices }> = ({ methodology }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{methodology.source}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs font-medium mb-1">{methodology.title}</p>
        <p className="text-xs text-muted-foreground">{methodology.description}</p>
        <p className="text-xs text-muted-foreground mt-1 italic">Atualização: {methodology.lastUpdate}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const SimulationParametersDialog: React.FC<SimulationParametersDialogProps> = ({
  parameters,
  onParametersChange,
  open,
  onOpenChange,
}) => {
  const [localParams, setLocalParams] = useState<SimulationDefaults>(parameters);
  const [isOpen, setIsOpen] = useState(false);
  
  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  useEffect(() => {
    if (dialogOpen) {
      setLocalParams(parameters);
    }
  }, [dialogOpen, parameters]);

  const handleReset = () => {
    setLocalParams(SYSTEM_DEFAULTS);
  };

  const handleSave = () => {
    onParametersChange(localParams);
    setDialogOpen(false);
  };

  const isModified = JSON.stringify(localParams) !== JSON.stringify(SYSTEM_DEFAULTS);

  const updateFuelPrice = (fuel: keyof SimulationDefaults['fuelPrices'], value: number) => {
    setLocalParams(prev => ({
      ...prev,
      fuelPrices: { ...prev.fuelPrices, [fuel]: value }
    }));
  };

  const updateInsuranceRate = (category: keyof SimulationDefaults['insuranceRates'], value: number) => {
    setLocalParams(prev => ({
      ...prev,
      insuranceRates: { ...prev.insuranceRates, [category]: value }
    }));
  };

  const updateMaintenanceCost = (category: keyof SimulationDefaults['maintenanceBaseCosts'], value: number) => {
    setLocalParams(prev => ({
      ...prev,
      maintenanceBaseCosts: { ...prev.maintenanceBaseCosts, [category]: value }
    }));
  };

  const updateDepreciationRate = (year: keyof SimulationDefaults['depreciationRates'], value: number) => {
    setLocalParams(prev => ({
      ...prev,
      depreciationRates: { ...prev.depreciationRates, [year]: value }
    }));
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Parâmetros</span>
          {isModified && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              editado
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Parâmetros da Simulação
          </DialogTitle>
          <DialogDescription>
            Ajuste os valores de referência utilizados nos cálculos. Cada parâmetro tem uma explicação de origem.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fuel" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 w-full shrink-0">
            <TabsTrigger value="fuel" className="text-xs gap-1">
              <Fuel className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Combust.</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="text-xs gap-1">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Seguro</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs gap-1">
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manut.</span>
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="text-xs gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Deprec.</span>
            </TabsTrigger>
            <TabsTrigger value="others" className="text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Outros</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="fuel" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Preços de Combustível</h4>
                <MethodologyBadge methodology={methodologyExplanations.fuelPrices} />
              </div>
              <div className="rounded-lg border bg-card p-3">
                <ParameterRow
                  label="Gasolina"
                  value={localParams.fuelPrices.gasoline}
                  onChange={(v) => updateFuelPrice('gasoline', v)}
                  prefix="R$"
                  suffix="/L"
                  step={0.01}
                  isDefault={localParams.fuelPrices.gasoline === SYSTEM_DEFAULTS.fuelPrices.gasoline}
                />
                <ParameterRow
                  label="Etanol"
                  value={localParams.fuelPrices.ethanol}
                  onChange={(v) => updateFuelPrice('ethanol', v)}
                  prefix="R$"
                  suffix="/L"
                  step={0.01}
                  isDefault={localParams.fuelPrices.ethanol === SYSTEM_DEFAULTS.fuelPrices.ethanol}
                />
                <ParameterRow
                  label="Diesel"
                  value={localParams.fuelPrices.diesel}
                  onChange={(v) => updateFuelPrice('diesel', v)}
                  prefix="R$"
                  suffix="/L"
                  step={0.01}
                  isDefault={localParams.fuelPrices.diesel === SYSTEM_DEFAULTS.fuelPrices.diesel}
                />
                <ParameterRow
                  label="Flex (gasolina ref.)"
                  value={localParams.fuelPrices.flex}
                  onChange={(v) => updateFuelPrice('flex', v)}
                  prefix="R$"
                  suffix="/L"
                  step={0.01}
                  isDefault={localParams.fuelPrices.flex === SYSTEM_DEFAULTS.fuelPrices.flex}
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Metodologia:</strong> {methodologyExplanations.fuelPrices.description}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="insurance" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Taxas de Seguro (% do FIPE ao ano)</h4>
                <MethodologyBadge methodology={methodologyExplanations.insuranceRates} />
              </div>
              <div className="rounded-lg border bg-card p-3">
                <ParameterRow
                  label="Hatch Compacto"
                  value={localParams.insuranceRates.hatch_compacto}
                  onChange={(v) => updateInsuranceRate('hatch_compacto', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.hatch_compacto === SYSTEM_DEFAULTS.insuranceRates.hatch_compacto}
                />
                <ParameterRow
                  label="Sedan Compacto"
                  value={localParams.insuranceRates.sedan_compacto}
                  onChange={(v) => updateInsuranceRate('sedan_compacto', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.sedan_compacto === SYSTEM_DEFAULTS.insuranceRates.sedan_compacto}
                />
                <ParameterRow
                  label="Sedan Médio"
                  value={localParams.insuranceRates.sedan_medio}
                  onChange={(v) => updateInsuranceRate('sedan_medio', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.sedan_medio === SYSTEM_DEFAULTS.insuranceRates.sedan_medio}
                />
                <ParameterRow
                  label="SUV Compacto"
                  value={localParams.insuranceRates.suv_compacto}
                  onChange={(v) => updateInsuranceRate('suv_compacto', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.suv_compacto === SYSTEM_DEFAULTS.insuranceRates.suv_compacto}
                />
                <ParameterRow
                  label="SUV Médio"
                  value={localParams.insuranceRates.suv_medio}
                  onChange={(v) => updateInsuranceRate('suv_medio', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.suv_medio === SYSTEM_DEFAULTS.insuranceRates.suv_medio}
                />
                <ParameterRow
                  label="SUV Grande"
                  value={localParams.insuranceRates.suv_grande}
                  onChange={(v) => updateInsuranceRate('suv_grande', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.suv_grande === SYSTEM_DEFAULTS.insuranceRates.suv_grande}
                />
                <ParameterRow
                  label="Picape Compacta"
                  value={localParams.insuranceRates.pickup_compacta}
                  onChange={(v) => updateInsuranceRate('pickup_compacta', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.pickup_compacta === SYSTEM_DEFAULTS.insuranceRates.pickup_compacta}
                />
                <ParameterRow
                  label="Picape Média"
                  value={localParams.insuranceRates.pickup_media}
                  onChange={(v) => updateInsuranceRate('pickup_media', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.pickup_media === SYSTEM_DEFAULTS.insuranceRates.pickup_media}
                />
                <ParameterRow
                  label="Picape Grande"
                  value={localParams.insuranceRates.pickup_grande}
                  onChange={(v) => updateInsuranceRate('pickup_grande', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.insuranceRates.pickup_grande === SYSTEM_DEFAULTS.insuranceRates.pickup_grande}
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Metodologia:</strong> {methodologyExplanations.insuranceRates.description}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Custos Base de Manutenção (R$/ano)</h4>
                <MethodologyBadge methodology={methodologyExplanations.maintenanceBaseCosts} />
              </div>
              <div className="rounded-lg border bg-card p-3">
                <ParameterRow
                  label="Popular Nacional"
                  value={localParams.maintenanceBaseCosts.popular_nacional}
                  onChange={(v) => updateMaintenanceCost('popular_nacional', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.popular_nacional === SYSTEM_DEFAULTS.maintenanceBaseCosts.popular_nacional}
                />
                <ParameterRow
                  label="Sedan Médio"
                  value={localParams.maintenanceBaseCosts.sedan_medio}
                  onChange={(v) => updateMaintenanceCost('sedan_medio', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.sedan_medio === SYSTEM_DEFAULTS.maintenanceBaseCosts.sedan_medio}
                />
                <ParameterRow
                  label="SUV Compacto"
                  value={localParams.maintenanceBaseCosts.suv_compacto}
                  onChange={(v) => updateMaintenanceCost('suv_compacto', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.suv_compacto === SYSTEM_DEFAULTS.maintenanceBaseCosts.suv_compacto}
                />
                <ParameterRow
                  label="SUV Médio"
                  value={localParams.maintenanceBaseCosts.suv_medio}
                  onChange={(v) => updateMaintenanceCost('suv_medio', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.suv_medio === SYSTEM_DEFAULTS.maintenanceBaseCosts.suv_medio}
                />
                <ParameterRow
                  label="Picape"
                  value={localParams.maintenanceBaseCosts.pickup}
                  onChange={(v) => updateMaintenanceCost('pickup', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.pickup === SYSTEM_DEFAULTS.maintenanceBaseCosts.pickup}
                />
                <ParameterRow
                  label="Premium Nacional"
                  value={localParams.maintenanceBaseCosts.premium_nacional}
                  onChange={(v) => updateMaintenanceCost('premium_nacional', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.premium_nacional === SYSTEM_DEFAULTS.maintenanceBaseCosts.premium_nacional}
                />
                <ParameterRow
                  label="Importado Padrão"
                  value={localParams.maintenanceBaseCosts.importado_padrao}
                  onChange={(v) => updateMaintenanceCost('importado_padrao', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.importado_padrao === SYSTEM_DEFAULTS.maintenanceBaseCosts.importado_padrao}
                />
                <ParameterRow
                  label="Importado Premium"
                  value={localParams.maintenanceBaseCosts.importado_premium}
                  onChange={(v) => updateMaintenanceCost('importado_premium', v)}
                  prefix="R$"
                  suffix="/ano"
                  step={100}
                  isDefault={localParams.maintenanceBaseCosts.importado_premium === SYSTEM_DEFAULTS.maintenanceBaseCosts.importado_premium}
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Metodologia:</strong> {methodologyExplanations.maintenanceBaseCosts.description}
                  <br />
                  <span className="italic">Custo final = Base × Fator Idade × Índice Complexidade</span>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="depreciation" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Taxas de Depreciação (% ao ano)</h4>
                <MethodologyBadge methodology={methodologyExplanations.depreciationRates} />
              </div>
              <div className="rounded-lg border bg-card p-3">
                <ParameterRow
                  label="1º ano (0km)"
                  value={localParams.depreciationRates.year1}
                  onChange={(v) => updateDepreciationRate('year1', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year1 === SYSTEM_DEFAULTS.depreciationRates.year1}
                />
                <ParameterRow
                  label="2º ano"
                  value={localParams.depreciationRates.year2}
                  onChange={(v) => updateDepreciationRate('year2', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year2 === SYSTEM_DEFAULTS.depreciationRates.year2}
                />
                <ParameterRow
                  label="3º ano"
                  value={localParams.depreciationRates.year3}
                  onChange={(v) => updateDepreciationRate('year3', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year3 === SYSTEM_DEFAULTS.depreciationRates.year3}
                />
                <ParameterRow
                  label="4º ano"
                  value={localParams.depreciationRates.year4}
                  onChange={(v) => updateDepreciationRate('year4', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year4 === SYSTEM_DEFAULTS.depreciationRates.year4}
                />
                <ParameterRow
                  label="5º ano"
                  value={localParams.depreciationRates.year5}
                  onChange={(v) => updateDepreciationRate('year5', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year5 === SYSTEM_DEFAULTS.depreciationRates.year5}
                />
                <ParameterRow
                  label="6º ano em diante"
                  value={localParams.depreciationRates.year6plus}
                  onChange={(v) => updateDepreciationRate('year6plus', v)}
                  suffix="%"
                  isPercentage
                  isDefault={localParams.depreciationRates.year6plus === SYSTEM_DEFAULTS.depreciationRates.year6plus}
                />
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Importante:</strong> Veículos 0km sofrem a maior depreciação no 1º ano.
                  A taxa diminui progressivamente até estabilizar após 6 anos.
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Metodologia:</strong> {methodologyExplanations.depreciationRates.description}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="others" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Outros Custos</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Licenciamento</span>
                    <MethodologyBadge methodology={methodologyExplanations.licensing} />
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <ParameterRow
                      label="Taxa anual (DETRAN + CRLV)"
                      value={localParams.licensingAnnual}
                      onChange={(v) => setLocalParams(prev => ({ ...prev, licensingAnnual: v }))}
                      prefix="R$"
                      suffix="/ano"
                      step={10}
                      isDefault={localParams.licensingAnnual === SYSTEM_DEFAULTS.licensingAnnual}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Pneus</span>
                    <MethodologyBadge methodology={methodologyExplanations.tires} />
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <ParameterRow
                      label="Montagem (alinhamento + balanc.)"
                      value={localParams.tireMounting}
                      onChange={(v) => setLocalParams(prev => ({ ...prev, tireMounting: v }))}
                      prefix="R$"
                      step={10}
                      isDefault={localParams.tireMounting === SYSTEM_DEFAULTS.tireMounting}
                    />
                    <ParameterRow
                      label="Multiplicador Treadwear"
                      value={localParams.treadwearMultiplier}
                      onChange={(v) => setLocalParams(prev => ({ ...prev, treadwearMultiplier: v }))}
                      suffix="km/TW"
                      step={10}
                      isDefault={localParams.treadwearMultiplier === SYSTEM_DEFAULTS.treadwearMultiplier}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    Durabilidade = Treadwear × {localParams.treadwearMultiplier} km (ex: TW 400 = {400 * localParams.treadwearMultiplier} km)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Revisões</span>
                    <MethodologyBadge methodology={methodologyExplanations.revision} />
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <ParameterRow
                      label="Custo por revisão (semestral)"
                      value={localParams.revisionCostSemester}
                      onChange={(v) => setLocalParams(prev => ({ ...prev, revisionCostSemester: v }))}
                      prefix="R$"
                      step={50}
                      isDefault={localParams.revisionCostSemester === SYSTEM_DEFAULTS.revisionCostSemester}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    Custo anual de revisões = R$ {(localParams.revisionCostSemester * 2).toLocaleString('pt-BR')} (2 revisões/ano)
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-row gap-2 sm:gap-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 flex-1 sm:flex-none"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrões
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimulationParametersDialog;
