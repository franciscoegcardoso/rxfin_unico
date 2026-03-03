import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FipeSimulator } from '@/components/simuladores/FipeSimulator';
import { FipePublicCTA } from '@/components/simuladores/FipePublicCTA';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { BackLink } from '@/components/shared/BackLink';

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
        <div className="px-0 sm:px-0">
          <BackLink to="/simuladores" label="Simuladores" className="mb-2 min-h-[44px] touch-manipulation" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Valor de mercado (FIPE) e Custo real de propriedade
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-3xl">
            Não olhe apenas o preço de compra e venda. Acesse o histórico completo de preços e projete quanto esse veículo realmente custa para o seu bolso.
          </p>
        </div>
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
