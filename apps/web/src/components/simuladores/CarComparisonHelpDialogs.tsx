import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Wrench,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
  Minus,
  HelpCircle,
  AlertTriangle,
  Car,
  Fuel,
  TrendingDown,
  Calculator,
  Sparkles,
  X,
  Pencil,
  RotateCcw,
  ParkingCircle,
  Milestone,
  Droplets,
} from 'lucide-react';
import { EditValueSection, CalculatedParameterGuidance } from './EditValueSection';
import { cn } from '@/lib/utils';
import {
  ipvaRates,
  calculateMonthlyIPVAWithBenefits,
  electricIPVABenefits,
} from '@/data/vehicleBenchmarks';
import { InsuranceEstimate } from '@/utils/insuranceEstimator';
import { MaintenanceEstimate } from '@/utils/maintenanceEstimator';
import { TireCostEstimate, TIRE_PRICE_ESTIMATES } from '@/utils/tireEstimator';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// ============================================================================
// TYPES
// ============================================================================
export interface VehicleCostsData {
  insurance: number;
  insuranceEstimate: InsuranceEstimate;
  maintenance: number;
  maintenanceEstimate: MaintenanceEstimate;
  revision: number;
  ipva: number;
  fuel: number;
  tires: number;
  tireEstimate: TireCostEstimate | null;
  rimSize: number; // Tamanho do aro detectado/selecionado
  licensing: number;
  parking: number;
  tolls: number;
  cleaning: number;
  opportunityCost: number;
  totalMonthly: number;
}

export interface VehicleConfigData {
  vehicleState: string;
  vehicleAge: number;
  monthlyKm: number;
  fuelRows: Array<{ fuelType: string; price: number; percentage: number; consumption: number }>;
  calculatedFuelCost: number;
}

// Tire-related overrides
export interface TireOverrides {
  rimSizeA?: number;
  rimSizeB?: number;
  tirePriceA?: number; // Preço unitário do pneu (não jogo)
  tirePriceB?: number;
}

export interface CostOverrides {
  insurance?: number;
  maintenance?: number;
  depreciation?: number;
}

export interface HelpDialogsProps {
  openDialog: string | null;
  setOpenDialog: (key: string | null) => void;
  
  // Vehicle values
  valueA: number;
  valueB: number;
  
  // Vehicle costs
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  
  // Vehicle configs
  configA: VehicleConfigData;
  configB: VehicleConfigData;
  
  // Model names for detection display
  modelNameA?: string;
  modelNameB?: string;
  
  // Depreciation rates
  depreciationRateA: number;
  depreciationRateB: number;
  depreciationMonthlyA: number;
  depreciationMonthlyB: number;
  hasV6ResultA: boolean;
  hasV6ResultB: boolean;
  
  // Cost overrides
  costOverridesA: CostOverrides;
  costOverridesB: CostOverrides;
  handleCostOverrideA: (key: keyof CostOverrides, value: number | undefined) => void;
  handleCostOverrideB: (key: keyof CostOverrides, value: number | undefined) => void;
  
  // Tire overrides
  tireOverrides: TireOverrides;
  handleTireOverride: (key: keyof TireOverrides, value: number | undefined) => void;
  
  // Opportunity cost rate
  opportunityCostRate: number;
  
  // Helper function for primary fuel type
  getPrimaryFuelType: (fuelRows: Array<{ fuelType: string; percentage: number }>) => string;
}

// ============================================================================
// INSURANCE HELP DIALOG
// ============================================================================
const InsuranceHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  costOverridesA: CostOverrides;
  costOverridesB: CostOverrides;
  handleCostOverrideA: (key: keyof CostOverrides, value: number | undefined) => void;
  handleCostOverrideB: (key: keyof CostOverrides, value: number | undefined) => void;
  onClose: () => void;
}> = ({ costsA, costsB, costOverridesA, costOverridesB, handleCostOverrideA, handleCostOverrideB, onClose }) => {
  const insuranceComparison = React.useMemo(() => {
    if (costsA.insurance === 0 || costsB.insurance === 0) {
      return { text: 'Selecione ambos os veículos para comparar seguros', percentDiff: 0, moreExpensive: '' };
    }
    const diff = Math.abs(costsA.insurance - costsB.insurance);
    const base = Math.min(costsA.insurance, costsB.insurance);
    const percentDiff = base > 0 ? ((diff / base) * 100).toFixed(0) : '0';
    const moreExpensive = costsA.insurance > costsB.insurance ? 'A' : 'B';
    const cheaper = costsA.insurance > costsB.insurance ? 'B' : 'A';
    
    if (costsA.insurance === costsB.insurance) {
      return { text: 'Ambos os veículos têm custo de seguro similar', percentDiff: 0, moreExpensive: '' };
    }
    
    return { text: `O seguro do Carro ${moreExpensive} é ${percentDiff}% mais caro que o Carro ${cheaper}`, percentDiff, moreExpensive };
  }, [costsA.insurance, costsB.insurance]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Como Estimamos o Seguro
        </DialogTitle>
        <DialogDescription>
          Metodologia para comparação entre veículos
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {(costsA.insurance > 0 || costsB.insurance > 0) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              {insuranceComparison.text}
            </p>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {costsA.insuranceEstimate.justificativas.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600 shrink-0">Carro A:</span>
                  <span>{costsA.insuranceEstimate.justificativas.join('; ')}</span>
                </div>
              )}
              
              {costsB.insuranceEstimate.justificativas.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-amber-600 shrink-0">Carro B:</span>
                  <span>{costsB.insuranceEstimate.justificativas.join('; ')}</span>
                </div>
              )}
              
              <div className="pt-2 mt-2 border-t border-amber-500/20 flex flex-wrap gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Taxa A:</span>
                  <span className="font-medium text-blue-600">
                    {(costsA.insuranceEstimate.taxaBase * 100).toFixed(2)}%
                  </span>
                  {costsA.insuranceEstimate.ajusteIVR > 1 && (
                    <span className="text-red-500">
                      (+{((costsA.insuranceEstimate.ajusteIVR - 1) * 100).toFixed(0)}% IVR)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Taxa B:</span>
                  <span className="font-medium text-amber-600">
                    {(costsB.insuranceEstimate.taxaBase * 100).toFixed(2)}%
                  </span>
                  {costsB.insuranceEstimate.ajusteIVR > 1 && (
                    <span className="text-red-500">
                      (+{((costsB.insuranceEstimate.ajusteIVR - 1) * 100).toFixed(0)}% IVR)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Esta estimativa serve para <strong className="text-foreground">comparar</strong> veículos, 
              não para orçar seguro. O valor real depende de CEP, idade, bônus e seguradora.
            </span>
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fórmula Aplicada</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            Seguro = Valor FIPE × Fator Categoria × Ajuste IVR
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fatores por Categoria</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Sedan Médio</span><span className="font-medium">3,5%</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Sedan Compacto</span><span className="font-medium">3,8%</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Hatch Compacto</span><span className="font-medium">4,0%</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>SUV Compacto</span><span className="font-medium">4,2%</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>SUV Médio</span><span className="font-medium">4,5%</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Picape Grande</span><span className="font-medium">7,0%</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Ajuste de Veículos Visados (IVR)</h4>
          <p className="text-muted-foreground text-xs mb-2">
            Veículos com alto índice de roubo recebem acréscimo:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>Hilux</span><span className="font-medium text-red-600">+35%</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>SW4</span><span className="font-medium text-red-600">+32%</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
              <span>Gol/Voyage</span><span className="font-medium text-amber-600">+25%</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
              <span>HB20</span><span className="font-medium text-amber-600">+20%</span>
            </div>
          </div>
        </div>

        {/* Edit Section */}
        <EditValueSection
          label="Seguro"
          description="Se você conhece o valor real do seguro, informe abaixo (valor anual):"
          originalValueA={costsA.insurance * 12}
          originalValueB={costsB.insurance * 12}
          currentValueA={costOverridesA.insurance}
          currentValueB={costOverridesB.insurance}
          onChangeA={(v) => handleCostOverrideA('insurance', v)}
          onChangeB={(v) => handleCostOverrideB('insurance', v)}
          onClose={onClose}
        />
      </div>
    </>
  );
};

// ============================================================================
// MAINTENANCE HELP DIALOG
// ============================================================================
const MaintenanceHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  costOverridesA: CostOverrides;
  costOverridesB: CostOverrides;
  handleCostOverrideA: (key: keyof CostOverrides, value: number | undefined) => void;
  handleCostOverrideB: (key: keyof CostOverrides, value: number | undefined) => void;
  onClose: () => void;
}> = ({ costsA, costsB, costOverridesA, costOverridesB, handleCostOverrideA, handleCostOverrideB, onClose }) => {
  const maintenanceComparison = React.useMemo(() => {
    if (costsA.maintenance === 0 || costsB.maintenance === 0) {
      return { text: 'Selecione ambos os veículos para comparar manutenção' };
    }
    const diff = Math.abs(costsA.maintenance - costsB.maintenance);
    const base = Math.min(costsA.maintenance, costsB.maintenance);
    const percentDiff = base > 0 ? ((diff / base) * 100).toFixed(0) : '0';
    const moreExpensive = costsA.maintenance > costsB.maintenance ? 'A' : 'B';
    const cheaper = costsA.maintenance > costsB.maintenance ? 'B' : 'A';
    
    if (costsA.maintenance === costsB.maintenance) {
      return { text: 'Ambos os veículos têm custo de manutenção similar' };
    }
    
    return { text: `A manutenção do Carro ${moreExpensive} é ${percentDiff}% mais cara que o Carro ${cheaper}` };
  }, [costsA.maintenance, costsB.maintenance]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Como Estimamos a Manutenção
        </DialogTitle>
        <DialogDescription>
          Metodologia para comparação de custos de manutenção
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {(costsA.maintenance > 0 || costsB.maintenance > 0) && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-600 shrink-0" />
              {maintenanceComparison.text}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-blue-600">Carro A</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {costsA.maintenanceEstimate.vereditoLabel}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  {costsA.maintenanceEstimate.vereditoDescricao}
                </p>
                {costsA.maintenanceEstimate.fatores.regraRestoRico && (
                  <p className="text-red-500 text-[10px] mt-1">
                    ⚠️ Regra do Resto de Rico aplicada
                  </p>
                )}
              </div>
              
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-amber-600">Carro B</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {costsB.maintenanceEstimate.vereditoLabel}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  {costsB.maintenanceEstimate.vereditoDescricao}
                </p>
                {costsB.maintenanceEstimate.fatores.regraRestoRico && (
                  <p className="text-red-500 text-[10px] mt-1">
                    ⚠️ Regra do Resto de Rico aplicada
                  </p>
                )}
              </div>
            </div>
            
            <div className="pt-2 border-t border-purple-500/20">
              <p className="text-xs text-muted-foreground mb-2">
                💰 Reserva recomendada para corretivas surpresa:
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Carro A:</span>
                  <span className="font-medium text-blue-600">
                    {formatMoney(costsA.maintenanceEstimate.reservaEmergencia)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Carro B:</span>
                  <span className="font-medium text-amber-600">
                    {formatMoney(costsB.maintenanceEstimate.reservaEmergencia)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Esta estimativa serve para <strong className="text-foreground">comparar</strong> veículos. 
              O custo real varia conforme uso, região e oficina escolhida.
            </span>
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fórmula Aplicada</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            Custo Anual = Base × Fator Idade × Índice Complexidade
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Índice de Complexidade</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Popular Nacional</span><span className="font-medium">1.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Sedan Médio</span><span className="font-medium">1.4x</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>SUV Compacto</span><span className="font-medium">1.6x</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Picape</span><span className="font-medium">2.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
              <span>Importado Padrão</span><span className="font-medium text-amber-600">3.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>Importado Premium</span><span className="font-medium text-red-600">4.0x</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Fator de Idade</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-green-500/10 rounded">
              <span>0-2 anos</span><span className="font-medium text-green-600">1.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>3-4 anos</span><span className="font-medium">1.5x</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
              <span>5-7 anos</span><span className="font-medium text-amber-600">2.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-500/10 rounded">
              <span>8-10 anos</span><span className="font-medium text-amber-600">2.5x</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>11-15 anos</span><span className="font-medium text-red-600">3.0x</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>16+ anos</span><span className="font-medium text-red-600">3.5x</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">⚠️ Regra do "Resto de Rico"</h4>
          <p className="text-muted-foreground text-xs mb-2">
            Veículos premium/importados antigos têm custo mínimo fixo, 
            pois o valor FIPE depreciado não reflete o custo real de peças:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>5-7 anos</span><span className="font-medium text-red-600">mín R$ 4.000/ano</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>8-10 anos</span><span className="font-medium text-red-600">mín R$ 8.000/ano</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>11-14 anos</span><span className="font-medium text-red-600">mín R$ 12.000/ano</span>
            </div>
            <div className="flex justify-between p-2 bg-red-500/10 rounded">
              <span>15+ anos</span><span className="font-medium text-red-600">mín R$ 15.000/ano</span>
            </div>
          </div>
        </div>

        {/* Edit Section */}
        <EditValueSection
          label="Manutenção"
          description="Se você conhece o valor real de manutenção, informe abaixo (valor anual):"
          originalValueA={(costsA.maintenance + costsA.revision) * 12}
          originalValueB={(costsB.maintenance + costsB.revision) * 12}
          currentValueA={costOverridesA.maintenance}
          currentValueB={costOverridesB.maintenance}
          onChangeA={(v) => handleCostOverrideA('maintenance', v)}
          onChangeB={(v) => handleCostOverrideB('maintenance', v)}
          onClose={onClose}
        />
      </div>
    </>
  );
};

// ============================================================================
// IPVA HELP DIALOG
// ============================================================================
const IPVAHelpDialogContent: React.FC<{
  valueA: number;
  valueB: number;
  configA: VehicleConfigData;
  configB: VehicleConfigData;
  getPrimaryFuelType: (fuelRows: Array<{ fuelType: string; percentage: number }>) => string;
  onClose: () => void;
}> = ({ valueA, valueB, configA, configB, getPrimaryFuelType, onClose }) => {
  const fuelTypeA = getPrimaryFuelType(configA.fuelRows);
  const fuelTypeB = getPrimaryFuelType(configB.fuelRows);
  const ipvaResultA = calculateMonthlyIPVAWithBenefits(valueA, configA.vehicleState, fuelTypeA);
  const ipvaResultB = calculateMonthlyIPVAWithBenefits(valueB, configB.vehicleState, fuelTypeB);
  const baseRateA = ipvaRates[configA.vehicleState]?.rate || 4;
  const baseRateB = ipvaRates[configB.vehicleState]?.rate || 4;
  
  const isElectricOrHybridA = fuelTypeA === 'eletrico' || fuelTypeA === 'hibrido';
  const isElectricOrHybridB = fuelTypeB === 'eletrico' || fuelTypeB === 'hibrido';
  
  const benefitA = electricIPVABenefits[configA.vehicleState];
  const benefitB = electricIPVABenefits[configB.vehicleState];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Como Calculamos o IPVA
        </DialogTitle>
        <DialogDescription>
          Imposto sobre Propriedade de Veículos Automotores
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            O IPVA varia conforme o <strong className="text-foreground">estado</strong> e 
            o <strong className="text-foreground">valor FIPE</strong> do veículo.
            {(isElectricOrHybridA || isElectricOrHybridB) && (
              <> Veículos <strong className="text-green-600">elétricos e híbridos</strong> podem ter isenção ou desconto dependendo do estado.</>
            )}
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fórmula</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            <p>IPVA Anual = Valor FIPE × Alíquota do Estado</p>
            <p>IPVA Mensal = IPVA Anual ÷ 12</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Alíquotas por Estado</h4>
          <div className="grid grid-cols-3 gap-2 text-xs max-h-40 overflow-y-auto">
            {Object.entries(ipvaRates).slice(0, 12).map(([state, data]) => (
              <div key={state} className="flex justify-between p-2 bg-muted/50 rounded">
                <span>{state}</span><span className="font-medium">{data.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {(isElectricOrHybridA || isElectricOrHybridB) && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Car className="h-4 w-4 text-green-600" />
              Benefícios para Elétricos/Híbridos
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-muted-foreground mb-2">
                  Em 2024/2025, <strong className="text-foreground">18 estados + DF</strong> oferecem isenção ou desconto de IPVA para veículos elétricos e/ou híbridos.
                </p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> DF: Isenção total</div>
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> RS: Isenção elétricos</div>
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> PE: Isenção elétricos</div>
                  <div className="flex items-center gap-1"><Minus className="h-3 w-3 text-amber-600" /> RJ: 0,5% elétricos</div>
                  <div className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> SP: Sem benefício</div>
                  <div className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> MG: Sem benefício</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cálculo dos Veículos</h4>
          <div className="space-y-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A ({configA.vehicleState})</p>
              {ipvaResultA.hasExemption ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="line-through">{formatMoney(valueA)} × {baseRateA}% = {formatMoney(valueA * baseRateA / 100)}/ano</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">
                      ISENÇÃO
                    </Badge>
                    <span className="text-xs text-green-600 font-medium">{formatMoney(0)}/ano</span>
                  </div>
                  {benefitA && <p className="text-[10px] text-muted-foreground mt-1">{benefitA.notes}</p>}
                </div>
              ) : ipvaResultA.discount > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="line-through">{formatMoney(valueA)} × {baseRateA}%</span> → {ipvaResultA.rate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                      -{ipvaResultA.discount.toFixed(0)}%
                    </Badge>
                    <span className="text-xs font-medium">{formatMoney(ipvaResultA.annual)}/ano</span>
                    <span className="text-[10px] text-muted-foreground">({formatMoney(ipvaResultA.monthly)}/mês)</span>
                  </div>
                  {benefitA && <p className="text-[10px] text-muted-foreground mt-1">{benefitA.notes}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(valueA)} × {baseRateA}% = <strong className="text-foreground">{formatMoney(ipvaResultA.annual)}/ano</strong> ({formatMoney(ipvaResultA.monthly)}/mês)
                </p>
              )}
            </div>
            <div className="p-2 bg-amber-500/10 rounded">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B ({configB.vehicleState})</p>
              {ipvaResultB.hasExemption ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="line-through">{formatMoney(valueB)} × {baseRateB}% = {formatMoney(valueB * baseRateB / 100)}/ano</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">
                      ISENÇÃO
                    </Badge>
                    <span className="text-xs text-green-600 font-medium">{formatMoney(0)}/ano</span>
                  </div>
                  {benefitB && <p className="text-[10px] text-muted-foreground mt-1">{benefitB.notes}</p>}
                </div>
              ) : ipvaResultB.discount > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="line-through">{formatMoney(valueB)} × {baseRateB}%</span> → {ipvaResultB.rate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                      -{ipvaResultB.discount.toFixed(0)}%
                    </Badge>
                    <span className="text-xs font-medium">{formatMoney(ipvaResultB.annual)}/ano</span>
                    <span className="text-[10px] text-muted-foreground">({formatMoney(ipvaResultB.monthly)}/mês)</span>
                  </div>
                  {benefitB && <p className="text-[10px] text-muted-foreground mt-1">{benefitB.notes}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(valueB)} × {baseRateB}% = <strong className="text-foreground">{formatMoney(ipvaResultB.annual)}/ano</strong> ({formatMoney(ipvaResultB.monthly)}/mês)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground border-t pt-3">
          <p><strong>Fontes:</strong> AutoEsporte (19/12/2025), G1 (08/02/2025), Legislação estadual 2024/2025</p>
        </div>

        {/* Guidance for calculated parameter */}
        <CalculatedParameterGuidance
          parameterName="IPVA"
          adjustmentSteps={[
            { step: 'Altere o Estado do veículo', description: 'Na seção "Configuração do Veículo", selecione o estado onde o veículo será emplacado.' },
            { step: 'Verifique o valor FIPE', description: 'O IPVA é calculado sobre o valor FIPE do veículo.' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// FUEL HELP DIALOG
// ============================================================================
const FuelHelpDialogContent: React.FC<{
  configA: VehicleConfigData;
  configB: VehicleConfigData;
  onClose: () => void;
}> = ({ configA, configB, onClose }) => {
  const fuelCostA = configA.calculatedFuelCost;
  const fuelCostB = configB.calculatedFuelCost;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-primary" />
          Como Calculamos o Combustível
        </DialogTitle>
        <DialogDescription>
          Metodologia para estimativa de custo com combustível
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            O custo é calculado com base na <strong className="text-foreground">quilometragem mensal</strong>, 
            <strong className="text-foreground"> consumo do veículo</strong> e <strong className="text-foreground">preço do combustível</strong> selecionado.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fórmula</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            <p>Litros/mês = Km/mês ÷ Consumo (km/l)</p>
            <p>Custo/mês = Litros × Preço por Litro</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cálculo dos Veículos</h4>
          <div className="space-y-2">
            <div className="p-3 bg-blue-500/10 rounded">
              <p className="text-xs font-medium text-blue-600 mb-2">Carro A</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Km/mês: <strong className="text-foreground">{configA.monthlyKm.toLocaleString('pt-BR')}</strong></p>
                {configA.fuelRows.filter(r => r.percentage > 0).map((row, idx) => (
                  <p key={idx}>
                    {row.fuelType === 'gasoline' ? 'Gasolina' : 
                     row.fuelType === 'ethanol' ? 'Etanol' : 
                     row.fuelType === 'diesel' ? 'Diesel' : 
                     row.fuelType === 'eletrico' ? 'Elétrico' : 'Flex'}: 
                    {row.consumption.toFixed(1)} km/l × R$ {row.price.toFixed(2)}/l ({row.percentage}%)
                  </p>
                ))}
                <p className="font-medium text-foreground pt-1">
                  Total: {formatMoney(fuelCostA)}/mês
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded">
              <p className="text-xs font-medium text-amber-600 mb-2">Carro B</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Km/mês: <strong className="text-foreground">{configB.monthlyKm.toLocaleString('pt-BR')}</strong></p>
                {configB.fuelRows.filter(r => r.percentage > 0).map((row, idx) => (
                  <p key={idx}>
                    {row.fuelType === 'gasoline' ? 'Gasolina' : 
                     row.fuelType === 'ethanol' ? 'Etanol' : 
                     row.fuelType === 'diesel' ? 'Diesel' : 
                     row.fuelType === 'eletrico' ? 'Elétrico' : 'Flex'}: 
                    {row.consumption.toFixed(1)} km/l × R$ {row.price.toFixed(2)}/l ({row.percentage}%)
                  </p>
                ))}
                <p className="font-medium text-foreground pt-1">
                  Total: {formatMoney(fuelCostB)}/mês
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guidance for calculated parameter */}
        <CalculatedParameterGuidance
          parameterName="Combustível"
          adjustmentSteps={[
            { step: 'Ajuste a quilometragem mensal', description: 'Na seção "Configuração do Veículo", altere o campo "Km rodados por mês".' },
            { step: 'Configure o consumo', description: 'Na tabela de combustível, ajuste o consumo em km/l de acordo com o seu uso real.' },
            { step: 'Atualize o preço do combustível', description: 'Informe o preço atual do litro de gasolina, etanol ou diesel na sua região.' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// LICENSING HELP DIALOG
// ============================================================================
const LicensingHelpDialogContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Licenciamento Anual
        </DialogTitle>
        <DialogDescription>
          Taxa obrigatória para circulação do veículo
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              O licenciamento é uma <strong className="text-foreground">taxa anual obrigatória</strong> cobrada 
              pelos DETRANs estaduais para permitir a circulação do veículo.
            </span>
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Valor Médio Nacional</h4>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">R$ 160,00</p>
            <p className="text-xs text-muted-foreground">por ano (média nacional)</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">O que está incluído</h4>
          <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
            <li>Emissão do CRLV (Certificado de Registro e Licenciamento)</li>
            <li>Atualização do cadastro do veículo</li>
            <li>Quitação de débitos anteriores</li>
          </ul>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-amber-700">Atenção:</strong> O valor varia entre estados. 
            Para maior precisão, consulte o site do DETRAN do seu estado.
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Sobre o DPVAT/SPVAT</h4>
          <p className="text-xs text-muted-foreground mb-2">
            O DPVAT foi extinto em 2020 e substituído pelo SPVAT. 
            Em 2024, o SPVAT foi novamente suspenso por decisão judicial.
          </p>
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs">
            <p className="text-green-700 dark:text-green-300">
              <strong>Status atual:</strong> O SPVAT <strong>NÃO</strong> está sendo cobrado. 
              Portanto, não incluímos este valor na simulação.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// TIRE HELP DIALOG
// ============================================================================
const RIM_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const TireHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  configA: VehicleConfigData;
  configB: VehicleConfigData;
  modelNameA?: string;
  modelNameB?: string;
  tireOverrides: TireOverrides;
  handleTireOverride: (key: keyof TireOverrides, value: number | undefined) => void;
  onClose: () => void;
}> = ({ costsA, costsB, configA, configB, modelNameA, modelNameB, tireOverrides, handleTireOverride, onClose }) => {
  // Local state for pending changes (rim size)
  const [pendingRimA, setPendingRimA] = React.useState<number>(costsA.rimSize);
  const [pendingRimB, setPendingRimB] = React.useState<number>(costsB.rimSize);
  
  // Local state for pending price changes (preço unitário)
  const estimatedPriceA = TIRE_PRICE_ESTIMATES[costsA.rimSize]?.avg || 520;
  const estimatedPriceB = TIRE_PRICE_ESTIMATES[costsB.rimSize]?.avg || 520;
  const [pendingPriceA, setPendingPriceA] = React.useState<number>(tireOverrides.tirePriceA ?? estimatedPriceA);
  const [pendingPriceB, setPendingPriceB] = React.useState<number>(tireOverrides.tirePriceB ?? estimatedPriceB);
  const [editingPriceA, setEditingPriceA] = React.useState(false);
  const [editingPriceB, setEditingPriceB] = React.useState(false);
  
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  // Update estimated prices when rim changes
  React.useEffect(() => {
    if (!tireOverrides.tirePriceA) {
      setPendingPriceA(TIRE_PRICE_ESTIMATES[pendingRimA]?.avg || 520);
    }
  }, [pendingRimA, tireOverrides.tirePriceA]);
  
  React.useEffect(() => {
    if (!tireOverrides.tirePriceB) {
      setPendingPriceB(TIRE_PRICE_ESTIMATES[pendingRimB]?.avg || 520);
    }
  }, [pendingRimB, tireOverrides.tirePriceB]);

  const hasRimChanges = pendingRimA !== costsA.rimSize || pendingRimB !== costsB.rimSize;
  const hasPriceChanges = (editingPriceA && pendingPriceA !== estimatedPriceA) || 
                          (editingPriceB && pendingPriceB !== estimatedPriceB) ||
                          tireOverrides.tirePriceA !== undefined ||
                          tireOverrides.tirePriceB !== undefined;
  const hasChanges = hasRimChanges || hasPriceChanges || editingPriceA || editingPriceB;

  const handleSave = () => {
    if (hasChanges) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  };

  const confirmSave = () => {
    if (pendingRimA !== costsA.rimSize) {
      handleTireOverride('rimSizeA', pendingRimA);
    }
    if (pendingRimB !== costsB.rimSize) {
      handleTireOverride('rimSizeB', pendingRimB);
    }
    if (editingPriceA) {
      handleTireOverride('tirePriceA', pendingPriceA);
    }
    if (editingPriceB) {
      handleTireOverride('tirePriceB', pendingPriceB);
    }
    setShowConfirmation(false);
    onClose();
  };

  const handleRestoreRim = (vehicle: 'A' | 'B') => {
    if (vehicle === 'A') {
      handleTireOverride('rimSizeA', undefined);
      setPendingRimA(costsA.rimSize);
    } else {
      handleTireOverride('rimSizeB', undefined);
      setPendingRimB(costsB.rimSize);
    }
  };
  
  const handleRestorePrice = (vehicle: 'A' | 'B') => {
    if (vehicle === 'A') {
      handleTireOverride('tirePriceA', undefined);
      setPendingPriceA(TIRE_PRICE_ESTIMATES[pendingRimA]?.avg || 520);
      setEditingPriceA(false);
    } else {
      handleTireOverride('tirePriceB', undefined);
      setPendingPriceB(TIRE_PRICE_ESTIMATES[pendingRimB]?.avg || 520);
      setEditingPriceB(false);
    }
  };

  const isCustomRimA = tireOverrides.rimSizeA !== undefined;
  const isCustomRimB = tireOverrides.rimSizeB !== undefined;
  const isCustomPriceA = tireOverrides.tirePriceA !== undefined || editingPriceA;
  const isCustomPriceB = tireOverrides.tirePriceB !== undefined || editingPriceB;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Como Calculamos os Pneus
        </DialogTitle>
        <DialogDescription>
          Metodologia para estimativa de custo com pneus
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            Estimamos o custo mensal com pneus baseado na <strong className="text-foreground">quilometragem</strong>, 
            <strong className="text-foreground"> durabilidade média</strong> e <strong className="text-foreground">preço por categoria</strong> de veículo.
          </p>
        </div>

        {/* Rim Size and Price Selection Section */}
        <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Configuração de Pneus
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Car A */}
            <div className="space-y-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-600">Carro A</span>
              </div>
              {modelNameA && (
                <p className="text-xs text-muted-foreground truncate">{modelNameA}</p>
              )}
              
              {/* Rim Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Aro:</span>
                  {isCustomRimA && (
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => handleRestoreRim('A')}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  )}
                </div>
                <select
                  value={pendingRimA}
                  onChange={(e) => setPendingRimA(Number(e.target.value))}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RIM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      Aro {size}"
                    </option>
                  ))}
                </select>
                {isCustomRimA && <Badge variant="outline" className="text-[10px] h-4 px-1">Manual</Badge>}
              </div>
              
              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Preço unitário (pneu):</span>
                  {isCustomPriceA && (
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => handleRestorePrice('A')}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  )}
                </div>
                {editingPriceA || tireOverrides.tirePriceA !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <input
                      type="number"
                      value={pendingPriceA}
                      onChange={(e) => {
                        setPendingPriceA(Number(e.target.value));
                        setEditingPriceA(true);
                      }}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatMoney(TIRE_PRICE_ESTIMATES[pendingRimA]?.avg || 520)}</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditingPriceA(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
                {isCustomPriceA && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-500/20">Preço manual</Badge>}
              </div>
              
              {/* Total set price */}
              <div className="pt-2 border-t border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Jogo (4 pneus):</span>
                  <span className="text-sm font-semibold text-blue-600">{formatMoney(pendingPriceA * 4)}</span>
                </div>
              </div>
            </div>
            
            {/* Car B */}
            <div className="space-y-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600">Carro B</span>
              </div>
              {modelNameB && (
                <p className="text-xs text-muted-foreground truncate">{modelNameB}</p>
              )}
              
              {/* Rim Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Aro:</span>
                  {isCustomRimB && (
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => handleRestoreRim('B')}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  )}
                </div>
                <select
                  value={pendingRimB}
                  onChange={(e) => setPendingRimB(Number(e.target.value))}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RIM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      Aro {size}"
                    </option>
                  ))}
                </select>
                {isCustomRimB && <Badge variant="outline" className="text-[10px] h-4 px-1">Manual</Badge>}
              </div>
              
              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Preço unitário (pneu):</span>
                  {isCustomPriceB && (
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => handleRestorePrice('B')}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  )}
                </div>
                {editingPriceB || tireOverrides.tirePriceB !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <input
                      type="number"
                      value={pendingPriceB}
                      onChange={(e) => {
                        setPendingPriceB(Number(e.target.value));
                        setEditingPriceB(true);
                      }}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatMoney(TIRE_PRICE_ESTIMATES[pendingRimB]?.avg || 520)}</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditingPriceB(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
                {isCustomPriceB && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/20">Preço manual</Badge>}
              </div>
              
              {/* Total set price */}
              <div className="pt-2 border-t border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Jogo (4 pneus):</span>
                  <span className="text-sm font-semibold text-amber-600">{formatMoney(pendingPriceB * 4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Fórmula</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            <p>Custo/km = (Jogo 4 pneus) ÷ Durabilidade</p>
            <p>Custo/mês = (Km/mês) × Custo/km</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Durabilidade Média</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Consideramos uma vida útil média de <strong className="text-foreground">45.000 km</strong> por jogo de pneus.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Preço por Aro (jogo de 4)</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(TIRE_PRICE_ESTIMATES).slice(0, 6).map(([rim, prices]) => {
              const isSelectedA = Number(rim) === pendingRimA;
              const isSelectedB = Number(rim) === pendingRimB;
              return (
                <div 
                  key={rim} 
                  className={cn(
                    "flex justify-between p-2 rounded transition-colors",
                    isSelectedA && isSelectedB ? "bg-gradient-to-r from-blue-500/20 to-amber-500/20 border border-primary/30" :
                    isSelectedA ? "bg-blue-500/20 border border-blue-500/30" :
                    isSelectedB ? "bg-amber-500/20 border border-amber-500/30" :
                    "bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-1">
                    Aro {rim}"
                    {isSelectedA && <span className="text-blue-600 text-[10px]">(A)</span>}
                    {isSelectedB && <span className="text-amber-600 text-[10px]">(B)</span>}
                  </span>
                  <span className="font-medium">R$ {(prices.avg * 4).toLocaleString('pt-BR')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cálculo dos Veículos</h4>
          <div className="space-y-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-2">
                Carro A - Aro {costsA.rimSize}"
                {(isCustomRimA || isCustomPriceA) && <Badge variant="outline" className="text-[10px] h-4 px-1">Manual</Badge>}
              </p>
              {costsA.tireEstimate && (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(costsA.tireEstimate.custoTotal)} ÷ {costsA.tireEstimate.durabilidadeKm.toLocaleString('pt-BR')} km × {configA.monthlyKm.toLocaleString('pt-BR')} km/mês = <strong className="text-foreground">{formatMoney(costsA.tires)}/mês</strong>
                </p>
              )}
            </div>
            <div className="p-2 bg-amber-500/10 rounded">
              <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-2">
                Carro B - Aro {costsB.rimSize}"
                {(isCustomRimB || isCustomPriceB) && <Badge variant="outline" className="text-[10px] h-4 px-1">Manual</Badge>}
              </p>
              {costsB.tireEstimate && (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(costsB.tireEstimate.custoTotal)} ÷ {costsB.tireEstimate.durabilidadeKm.toLocaleString('pt-BR')} km × {configB.monthlyKm.toLocaleString('pt-BR')} km/mês = <strong className="text-foreground">{formatMoney(costsB.tires)}/mês</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Guidance for calculated parameter */}
        <CalculatedParameterGuidance
          parameterName="Pneus"
          adjustmentSteps={[
            { step: 'Ajuste o tamanho do aro e preço acima', description: 'Selecione o aro correto e/ou edite o preço unitário do pneu para cada veículo.' },
            { step: 'Ajuste a quilometragem mensal', description: 'Na seção "Configuração do Veículo", altere o campo "Km rodados por mês".' },
          ]}
        />

        {/* Confirmation dialog for changes */}
        {showConfirmation && (
          <div className="border-2 border-amber-500/50 rounded-lg p-4 bg-amber-500/10">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Confirmar Alterações
            </h4>
            <div className="space-y-2 text-xs mb-3">
              {pendingRimA !== costsA.rimSize && (
                <p>
                  <strong>Carro A - Aro:</strong> {costsA.rimSize}" → {pendingRimA}"
                </p>
              )}
              {editingPriceA && (
                <p>
                  <strong>Carro A - Preço unitário:</strong> {formatMoney(estimatedPriceA)} → {formatMoney(pendingPriceA)}
                </p>
              )}
              {pendingRimB !== costsB.rimSize && (
                <p>
                  <strong>Carro B - Aro:</strong> {costsB.rimSize}" → {pendingRimB}"
                </p>
              )}
              {editingPriceB && (
                <p>
                  <strong>Carro B - Preço unitário:</strong> {formatMoney(estimatedPriceB)} → {formatMoney(pendingPriceB)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmSave}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {hasChanges && !showConfirmation && (
            <Button variant="default" size="sm" onClick={handleSave}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Salvar e Fechar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            {hasChanges ? 'Cancelar' : 'Fechar'}
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// DEPRECIATION HELP DIALOG
// ============================================================================
const DepreciationHelpDialogContent: React.FC<{
  valueA: number;
  valueB: number;
  depreciationRateA: number;
  depreciationRateB: number;
  depreciationMonthlyA: number;
  depreciationMonthlyB: number;
  hasV6ResultA: boolean;
  hasV6ResultB: boolean;
  costOverridesA: CostOverrides;
  costOverridesB: CostOverrides;
  handleCostOverrideA: (key: keyof CostOverrides, value: number | undefined) => void;
  handleCostOverrideB: (key: keyof CostOverrides, value: number | undefined) => void;
  onClose: () => void;
}> = ({ 
  valueA, valueB, 
  depreciationRateA, depreciationRateB,
  depreciationMonthlyA, depreciationMonthlyB,
  hasV6ResultA, hasV6ResultB,
  costOverridesA, costOverridesB,
  handleCostOverrideA, handleCostOverrideB,
  onClose
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Como Calculamos a Depreciação
          {(hasV6ResultA || hasV6ResultB) && (
            <Badge className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-0 font-medium">
              <Sparkles className="h-3 w-3 mr-1" />
              Motor V6
            </Badge>
          )}
        </DialogTitle>
        <DialogDescription>
          Perda de valor do veículo ao longo do tempo
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            A depreciação representa a <strong className="text-foreground">perda de valor de mercado</strong> do 
            veículo ao longo do tempo, baseada em dados históricos da tabela FIPE.
          </p>
        </div>

        {(hasV6ResultA || hasV6ResultB) && (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="flex items-start gap-2 text-xs">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Motor Inteligente V6:</strong> Utilizamos regressão sobre o 
                histórico FIPE real de cada modelo para projetar a depreciação com maior precisão.
              </span>
            </p>
          </div>
        )}
        
        <div>
          <h4 className="font-semibold mb-2">Taxas Aplicadas</h4>
          <div className="space-y-2">
            <div className="p-2 bg-blue-500/10 rounded flex justify-between items-center">
              <span className="text-xs font-medium text-blue-600">Carro A</span>
              <span className="font-medium text-sm">{(depreciationRateA * 100).toFixed(1)}% ao ano</span>
            </div>
            <div className="p-2 bg-amber-500/10 rounded flex justify-between items-center">
              <span className="text-xs font-medium text-amber-600">Carro B</span>
              <span className="font-medium text-sm">{(depreciationRateB * 100).toFixed(1)}% ao ano</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cálculo dos Veículos</h4>
          <div className="space-y-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A</p>
              <p className="text-xs text-muted-foreground">
                {formatMoney(valueA)} × {(depreciationRateA * 100).toFixed(1)}% ÷ 12 = <strong className="text-foreground">{formatMoney(depreciationMonthlyA)}/mês</strong>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                ({formatMoney(depreciationMonthlyA * 12)}/ano)
              </p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B</p>
              <p className="text-xs text-muted-foreground">
                {formatMoney(valueB)} × {(depreciationRateB * 100).toFixed(1)}% ÷ 12 = <strong className="text-foreground">{formatMoney(depreciationMonthlyB)}/mês</strong>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                ({formatMoney(depreciationMonthlyB * 12)}/ano)
              </p>
            </div>
          </div>
        </div>

        {/* Edit Section */}
        <EditValueSection
          label="Depreciação"
          description="Se você tem uma estimativa diferente de depreciação, informe abaixo (valor anual):"
          originalValueA={depreciationMonthlyA * 12}
          originalValueB={depreciationMonthlyB * 12}
          currentValueA={costOverridesA.depreciation}
          currentValueB={costOverridesB.depreciation}
          onChangeA={(v) => handleCostOverrideA('depreciation', v)}
          onChangeB={(v) => handleCostOverrideB('depreciation', v)}
          onClose={onClose}
        />
      </div>
    </>
  );
};

// ============================================================================
// PARKING HELP DIALOG
// ============================================================================
const ParkingHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  onClose: () => void;
}> = ({ costsA, costsB, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ParkingCircle className="h-5 w-5 text-primary" />
          Estacionamento
        </DialogTitle>
        <DialogDescription>
          Custos fixos e variáveis com estacionamento
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            O custo de estacionamento inclui <strong className="text-foreground">mensalidades de garagem</strong>, 
            <strong className="text-foreground"> estacionamentos rotativos</strong> e 
            <strong className="text-foreground"> aluguel de vaga</strong> no trabalho ou residência.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">O que considerar</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Garagem em casa:</strong> Custo incluído no aluguel/condomínio ou separado?</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Estacionamento no trabalho:</strong> Gratuito, convênio ou vaga alugada?</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Estacionamentos rotativos:</strong> Shopping, restaurantes, médicos, etc.</span>
            </li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Valores Configurados</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A</p>
              <p className="font-semibold">{formatMoney(costsA.parking)}/mês</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B</p>
              <p className="font-semibold">{formatMoney(costsB.parking)}/mês</p>
            </div>
          </div>
        </div>

        <CalculatedParameterGuidance
          parameterName="Estacionamento"
          adjustmentSteps={[
            { step: 'Localize na seção de Custos Adicionais', description: 'Na área de configuração do veículo, encontre o campo "Estacionamento".' },
            { step: 'Informe o custo mensal total', description: 'Some todos os gastos recorrentes com estacionamento (garagem + rotativos médios).' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// TOLLS HELP DIALOG
// ============================================================================
const TollsHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  onClose: () => void;
}> = ({ costsA, costsB, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Milestone className="h-5 w-5 text-primary" />
          Pedágio / Sem Parar
        </DialogTitle>
        <DialogDescription>
          Custos com pedágios e tags de passagem automática
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-muted-foreground">
            Inclui <strong className="text-foreground">mensalidade da tag</strong> (Sem Parar, Veloe, ConectCar) e 
            <strong className="text-foreground"> gastos recorrentes com pedágios</strong> em trajetos frequentes.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Componentes do Custo</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Mensalidade da tag:</strong> R$ 15 a R$ 25/mês dependendo do plano</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Pedágios fixos:</strong> Trajeto casa-trabalho, viagens frequentes</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Estacionamentos com tag:</strong> Shoppings e aeroportos com desconto</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="flex items-start gap-2 text-xs">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Dica:</strong> Consulte o extrato do seu Sem Parar ou app da operadora 
              para ter uma média mensal precisa dos últimos 3 meses.
            </span>
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Valores Configurados</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A</p>
              <p className="font-semibold">{formatMoney(costsA.tolls)}/mês</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B</p>
              <p className="font-semibold">{formatMoney(costsB.tolls)}/mês</p>
            </div>
          </div>
        </div>

        <CalculatedParameterGuidance
          parameterName="Pedágio/Sem Parar"
          adjustmentSteps={[
            { step: 'Localize na seção de Custos Adicionais', description: 'Na área de configuração do veículo, encontre o campo "Pedágio".' },
            { step: 'Informe a média mensal', description: 'Some mensalidade da tag + média de pedágios pagos por mês.' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// CLEANING HELP DIALOG
// ============================================================================
const CleaningHelpDialogContent: React.FC<{
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  onClose: () => void;
}> = ({ costsA, costsB, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Limpeza / Lavagem
        </DialogTitle>
        <DialogDescription>
          Custos com lavagem e higienização do veículo
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-muted-foreground">
            Inclui <strong className="text-foreground">lavagens externas</strong>, 
            <strong className="text-foreground"> limpeza interna</strong> e 
            <strong className="text-foreground"> higienização periódica</strong> do veículo.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Referência de Custos</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Lavagem simples</span><span className="font-medium">R$ 30-50</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Lavagem completa</span><span className="font-medium">R$ 60-100</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Higienização interna</span><span className="font-medium">R$ 80-150</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>Polimento/cera</span><span className="font-medium">R$ 150-300</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Frequência Típica</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• <strong className="text-foreground">Semanal:</strong> ~R$ 120-200/mês</li>
            <li>• <strong className="text-foreground">Quinzenal:</strong> ~R$ 60-100/mês</li>
            <li>• <strong className="text-foreground">Mensal:</strong> ~R$ 30-50/mês</li>
          </ul>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Valores Configurados</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A</p>
              <p className="font-semibold">{formatMoney(costsA.cleaning)}/mês</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B</p>
              <p className="font-semibold">{formatMoney(costsB.cleaning)}/mês</p>
            </div>
          </div>
        </div>

        <CalculatedParameterGuidance
          parameterName="Limpeza"
          adjustmentSteps={[
            { step: 'Localize na seção de Custos Adicionais', description: 'Na área de configuração do veículo, encontre o campo "Limpeza".' },
            { step: 'Calcule seu gasto médio', description: 'Multiplique o valor da lavagem pela frequência mensal que você costuma fazer.' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// OPPORTUNITY COST HELP DIALOG
// ============================================================================
const OpportunityCostHelpDialogContent: React.FC<{
  valueA: number;
  valueB: number;
  costsA: VehicleCostsData;
  costsB: VehicleCostsData;
  opportunityCostRate: number;
  onClose: () => void;
}> = ({ valueA, valueB, costsA, costsB, opportunityCostRate, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Custo de Oportunidade
        </DialogTitle>
        <DialogDescription>
          O que você deixa de ganhar ao investir no carro
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-muted-foreground">
            O custo de oportunidade representa o <strong className="text-foreground">rendimento que você deixa de ter</strong> ao 
            imobilizar capital em um veículo em vez de investir.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Metodologia</h4>
          <div className="p-3 bg-muted rounded-lg font-mono text-xs">
            <p>Benchmark: 85% do CDI (≈ {(opportunityCostRate * 100).toFixed(1)}% a.a.)</p>
            <p>Custo/mês = Valor do Veículo × Taxa ÷ 12</p>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-amber-700">Por que 85% do CDI?</strong> É o retorno líquido aproximado 
            de uma aplicação em renda fixa com garantia do FGC, descontando IR.
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cálculo dos Veículos</h4>
          <div className="space-y-2">
            <div className="p-3 bg-blue-500/10 rounded">
              <p className="text-xs font-medium text-blue-600 mb-1">Carro A</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Valor: {formatMoney(valueA)}</p>
                <p>Rendimento anual: {formatMoney(valueA * opportunityCostRate)}</p>
                <p className="font-medium text-foreground">
                  "Custo" mensal: {formatMoney(costsA.opportunityCost)}
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded">
              <p className="text-xs font-medium text-amber-600 mb-1">Carro B</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Valor: {formatMoney(valueB)}</p>
                <p>Rendimento anual: {formatMoney(valueB * opportunityCostRate)}</p>
                <p className="font-medium text-foreground">
                  "Custo" mensal: {formatMoney(costsB.opportunityCost)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
          <p className="text-blue-700 dark:text-blue-300 text-xs">
            <strong>Por que isso importa?</strong> Veículos mais caros "custam" mais mesmo estacionados, 
            porque o capital poderia estar rendendo. Carros mais baratos têm menor custo de oportunidade.
          </p>
        </div>

        {/* Guidance for calculated parameter */}
        <CalculatedParameterGuidance
          parameterName="Custo de Oportunidade"
          adjustmentSteps={[
            { step: 'Verifique o valor FIPE', description: 'O custo de oportunidade é calculado sobre o valor do veículo. Selecione o veículo correto na FIPE.' },
            { step: 'Considere valores personalizados', description: 'Se você for financiar ou dar entrada, o custo de oportunidade real pode ser diferente do calculado aqui.' },
          ]}
        />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// MAIN EXPORT COMPONENT
// ============================================================================
export const CarComparisonHelpDialogs: React.FC<HelpDialogsProps> = React.memo(({
  openDialog,
  setOpenDialog,
  valueA,
  valueB,
  costsA,
  costsB,
  configA,
  configB,
  modelNameA,
  modelNameB,
  depreciationRateA,
  depreciationRateB,
  depreciationMonthlyA,
  depreciationMonthlyB,
  hasV6ResultA,
  hasV6ResultB,
  costOverridesA,
  costOverridesB,
  handleCostOverrideA,
  handleCostOverrideB,
  tireOverrides,
  handleTireOverride,
  opportunityCostRate,
  getPrimaryFuelType,
}) => {
  const handleOpenChange = React.useCallback((dialogKey: string) => (open: boolean) => {
    if (!open) setOpenDialog(null);
  }, [setOpenDialog]);

  const handleClose = React.useCallback(() => {
    setOpenDialog(null);
  }, [setOpenDialog]);

  const dialogProps = {
    onPointerDownOutside: (e: Event) => e.preventDefault(),
    onInteractOutside: (e: Event) => e.preventDefault(),
  };

  return (
    <>
      {/* IPVA Dialog */}
      <Dialog open={openDialog === 'ipva'} onOpenChange={handleOpenChange('ipva')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <IPVAHelpDialogContent
            valueA={valueA}
            valueB={valueB}
            configA={configA}
            configB={configB}
            getPrimaryFuelType={getPrimaryFuelType}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Insurance Dialog */}
      <Dialog open={openDialog === 'insurance'} onOpenChange={handleOpenChange('insurance')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <InsuranceHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            costOverridesA={costOverridesA}
            costOverridesB={costOverridesB}
            handleCostOverrideA={handleCostOverrideA}
            handleCostOverrideB={handleCostOverrideB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Fuel Dialog */}
      <Dialog open={openDialog === 'fuel'} onOpenChange={handleOpenChange('fuel')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <FuelHelpDialogContent
            configA={configA}
            configB={configB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={openDialog === 'maintenance'} onOpenChange={handleOpenChange('maintenance')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <MaintenanceHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            costOverridesA={costOverridesA}
            costOverridesB={costOverridesB}
            handleCostOverrideA={handleCostOverrideA}
            handleCostOverrideB={handleCostOverrideB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Licensing Dialog */}
      <Dialog open={openDialog === 'licensing'} onOpenChange={handleOpenChange('licensing')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <LicensingHelpDialogContent onClose={handleClose} />
        </DialogContent>
      </Dialog>

      {/* Tire Dialog */}
      <Dialog open={openDialog === 'tires'} onOpenChange={handleOpenChange('tires')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <TireHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            configA={configA}
            configB={configB}
            modelNameA={modelNameA}
            modelNameB={modelNameB}
            tireOverrides={tireOverrides}
            handleTireOverride={handleTireOverride}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Depreciation Dialog */}
      <Dialog open={openDialog === 'depreciation'} onOpenChange={handleOpenChange('depreciation')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <DepreciationHelpDialogContent
            valueA={valueA}
            valueB={valueB}
            depreciationRateA={depreciationRateA}
            depreciationRateB={depreciationRateB}
            depreciationMonthlyA={depreciationMonthlyA}
            depreciationMonthlyB={depreciationMonthlyB}
            hasV6ResultA={hasV6ResultA}
            hasV6ResultB={hasV6ResultB}
            costOverridesA={costOverridesA}
            costOverridesB={costOverridesB}
            handleCostOverrideA={handleCostOverrideA}
            handleCostOverrideB={handleCostOverrideB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Parking Dialog */}
      <Dialog open={openDialog === 'parking'} onOpenChange={handleOpenChange('parking')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <ParkingHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Tolls Dialog */}
      <Dialog open={openDialog === 'tolls'} onOpenChange={handleOpenChange('tolls')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <TollsHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Cleaning Dialog */}
      <Dialog open={openDialog === 'cleaning'} onOpenChange={handleOpenChange('cleaning')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <CleaningHelpDialogContent
            costsA={costsA}
            costsB={costsB}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>

      {/* Opportunity Cost Dialog */}
      <Dialog open={openDialog === 'opportunityCost'} onOpenChange={handleOpenChange('opportunityCost')}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" {...dialogProps}>
          <OpportunityCostHelpDialogContent
            valueA={valueA}
            valueB={valueB}
            costsA={costsA}
            costsB={costsB}
            opportunityCostRate={opportunityCostRate}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
});

CarComparisonHelpDialogs.displayName = 'CarComparisonHelpDialogs';
