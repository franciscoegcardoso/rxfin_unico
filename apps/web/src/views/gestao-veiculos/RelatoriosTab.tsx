import React from 'react';
import { VehicleReports } from '@/components/veiculos/VehicleReports';
import { useGestaoVeiculos } from '@/contexts/GestaoVeiculosContext';

const RelatoriosTab: React.FC = () => {
  const { vehicleRecords } = useGestaoVeiculos();

  return <VehicleReports records={vehicleRecords} />;
};

export default RelatoriosTab;
