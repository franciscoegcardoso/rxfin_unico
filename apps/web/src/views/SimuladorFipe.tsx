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
      <div className="space-y-6">
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-3xl font-bold text-foreground">Valor de mercado (FIPE) e Custo real de propriedade</h1>
          <p className="text-muted-foreground mt-1">
            Não olhe apenas o preço de compra e venda. Acesse o histórico completo de preços e projete quanto esse veículo realmente custa para o seu bolso.
          </p>
        </div>
        <FipeSimulator registeredVehicles={registeredVehicles} />
        
        {/* CTA for public (non-authenticated) users */}
        {!user && <FipePublicCTA />}
      </div>
    </AppLayout>
  );
};

export default SimuladorFipe;
