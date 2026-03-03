import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2, Car } from 'lucide-react';
import { FipeOwnershipCostCard } from './FipeOwnershipCostCard';
import { VehicleType } from '@/hooks/useFipe';

interface CarOwnershipCostDialogProps {
  fipeValue: number;
  modelName: string;
  brandName: string;
  vehicleAge: number;
  vehicleType: VehicleType;
  depreciationMonthly: number;
  yearLabel: string;
  totalMonthly: number;
  onTotalChange?: (total: number) => void;
  trigger?: React.ReactNode;
}

export const CarOwnershipCostDialog: React.FC<CarOwnershipCostDialogProps> = ({
  fipeValue,
  modelName,
  brandName,
  vehicleAge,
  vehicleType,
  depreciationMonthly,
  yearLabel,
  totalMonthly,
  onTotalChange,
  trigger,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span>Configurar custos</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Quanto custa ter este carro?
          </DialogTitle>
          <DialogDescription>
            Configure os custos de propriedade do veículo. Os valores são salvos automaticamente.
          </DialogDescription>
        </DialogHeader>
        
        <FipeOwnershipCostCard
          fipeValue={fipeValue}
          modelName={modelName}
          brandName={brandName}
          vehicleAge={vehicleAge}
          vehicleType={vehicleType}
          depreciationMonthly={depreciationMonthly}
          yearLabel={yearLabel}
        />
      </DialogContent>
    </Dialog>
  );
};
