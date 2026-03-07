import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FipeSimulator } from '@/components/simuladores/FipeSimulator';
import { FipePublicCTA } from '@/components/simuladores/FipePublicCTA';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Car } from 'lucide-react';

const SimuladorFipe: React.FC = () => {
  const { config } = useFinancial();
  const { user } = useAuth();
  
  // SECURITY: Only show registered vehicles for authenticated users
  const registeredVehicles = user 
    ? config.assets.filter(asset => asset.type === 'vehicle')
    : [];

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        <PageHeader
          icon={Car}
          title="Valor de mercado (FIPE) e Custo real de propriedade"
          subtitle="Histórico completo de preços e custo real do veículo para seu bolso"
        />
        <div className="min-w-0 w-full">
          <FipeSimulator registeredVehicles={registeredVehicles} />
        </div>

        {/* CTA for public (non-authenticated) users */}
        {!user && (
          <div className="min-w-0 w-full">
            <FipePublicCTA />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SimuladorFipe;
