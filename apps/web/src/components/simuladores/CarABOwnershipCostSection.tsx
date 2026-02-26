import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  Car,
  MapPin,
  Fuel,
  Wrench,
  Milestone,
  Droplets,
  CircleParking,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { statesList } from '@/data/vehicleBenchmarks';
import { FipeOwnershipCostCard } from './FipeOwnershipCostCard';
import { FuelParametersTable, FuelRowData } from './FuelParametersTable';
import { formatFipeYearName } from '@/hooks/useFipe';
import { cn } from '@/lib/utils';

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface CarData {
  fipeValue: number;
  modelName: string;
  brandName: string;
  vehicleAge: number;
  vehicleType: 'carros' | 'motos' | 'caminhoes';
  depreciationMonthly: number;
  yearLabel: string;
  totalMonthly: number;
  totalAnnual: number;
}

interface CarABOwnershipCostSectionProps {
  carA: CarData;
  carB: CarData;
  // Shared params
  vehicleState: string;
  onVehicleStateChange: (state: string) => void;
  // Config A
  configA: {
    totalMonthlyKm: number;
    calculatedFuelCost: number;
    fuelRows: FuelRowData[];
    monthlyParking: number;
    monthlyTolls: number;
    monthlyWashing: number;
  };
  onConfigAChange: (updates: Partial<CarABOwnershipCostSectionProps['configA']>) => void;
  // Config B
  configB: {
    totalMonthlyKm: number;
    calculatedFuelCost: number;
    fuelRows: FuelRowData[];
    monthlyParking: number;
    monthlyTolls: number;
    monthlyWashing: number;
  };
  onConfigBChange: (updates: Partial<CarABOwnershipCostSectionProps['configB']>) => void;
  // Fuel consumption
  consumptionHookA: { suggestion: any; loading: boolean };
  consumptionHookB: { suggestion: any; loading: boolean };
  // Year labels for FuelParametersTable
  yearLabelA: string;
  yearLabelB: string;
  // Theft risk
  theftRiskA?: { isHighRisk: boolean; adjustment: number; reason: string };
  theftRiskB?: { isHighRisk: boolean; adjustment: number; reason: string };
}

export const CarABOwnershipCostSection: React.FC<CarABOwnershipCostSectionProps> = ({
  carA,
  carB,
  vehicleState,
  onVehicleStateChange,
  configA,
  onConfigAChange,
  configB,
  onConfigBChange,
  consumptionHookA,
  consumptionHookB,
  yearLabelA,
  yearLabelB,
  theftRiskA,
  theftRiskB,
}) => {
  const [showParamsDialog, setShowParamsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('carA');

  const kmMismatch = configA.totalMonthlyKm !== configB.totalMonthlyKm;

  return (
    <div className="space-y-4">
      {/* Summary - Side by side totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
            <span className="text-xs text-muted-foreground truncate">{carA.modelName || 'Carro A'}</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{formatMoney(carA.totalMonthly)}</div>
          <div className="text-[10px] text-muted-foreground">/mês • {formatMoney(carA.totalAnnual)}/ano</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
            <span className="text-xs text-muted-foreground truncate">{carB.modelName || 'Carro B'}</span>
          </div>
          <div className="text-lg font-bold text-amber-600">{formatMoney(carB.totalMonthly)}</div>
          <div className="text-[10px] text-muted-foreground">/mês • {formatMoney(carB.totalAnnual)}/ano</div>
        </div>
      </div>

      {/* Difference highlight */}
      {carA.totalMonthly > 0 && carB.totalMonthly > 0 && (
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <span className="text-xs text-muted-foreground">
            Diferença: <strong className={carA.totalMonthly < carB.totalMonthly ? "text-blue-600" : "text-amber-600"}>
              {formatMoney(Math.abs(carA.totalMonthly - carB.totalMonthly))}/mês
            </strong>
            {' '}a favor do Carro {carA.totalMonthly < carB.totalMonthly ? 'A' : 'B'}
          </span>
        </div>
      )}

      {/* Tabs with FipeOwnershipCostCard for each car */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="carA" className="gap-1.5">
            <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 border-blue-500/30 text-blue-600">A</Badge>
            <span className="truncate max-w-[120px]">{carA.modelName || 'Carro A'}</span>
          </TabsTrigger>
          <TabsTrigger value="carB" className="gap-1.5">
            <Badge variant="outline" className="text-[8px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">B</Badge>
            <span className="truncate max-w-[120px]">{carB.modelName || 'Carro B'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carA">
          <Card>
            <FipeOwnershipCostCard
              fipeValue={carA.fipeValue}
              modelName={carA.modelName}
              brandName={carA.brandName}
              vehicleAge={carA.vehicleAge}
              vehicleType={carA.vehicleType}
              depreciationMonthly={carA.depreciationMonthly}
              yearLabel={carA.yearLabel}
              theftRisk={theftRiskA}
            />
          </Card>
        </TabsContent>

        <TabsContent value="carB">
          <Card>
            <FipeOwnershipCostCard
              fipeValue={carB.fipeValue}
              modelName={carB.modelName}
              brandName={carB.brandName}
              vehicleAge={carB.vehicleAge}
              vehicleType={carB.vehicleType}
              depreciationMonthly={carB.depreciationMonthly}
              yearLabel={carB.yearLabel}
              theftRisk={theftRiskB}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
