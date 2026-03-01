import { createContext, useContext } from 'react';
import { Asset } from '@/types/financial';
import { VehicleRecord } from '@/types/vehicle';

export interface GestaoVeiculosContextType {
  vehicles: Asset[];
  vehicleRecords: VehicleRecord[];
  openRecordDialog: (record?: VehicleRecord) => void;
  handleDeleteRecord: (id: string) => void;
  handleEditVehicle: (vehicle: Asset) => void;
  handleAddVehicle: () => void;
}

export const GestaoVeiculosContext = createContext<GestaoVeiculosContextType | null>(null);

export const useGestaoVeiculos = () => {
  const context = useContext(GestaoVeiculosContext);
  if (!context) {
    throw new Error('useGestaoVeiculos must be used within GestaoVeiculosProvider');
  }
  return context;
};
