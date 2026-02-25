import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FinancingSimulator } from '@/components/simuladores/FinancingSimulator';
import { BackLink } from '@/components/shared/BackLink';

const SimuladorFinanciamento: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-3xl font-bold text-foreground">Financiamento Vs Consórcio</h1>
          <p className="text-muted-foreground mt-1">
            Descubra qual a melhor forma de pagar. Compare taxas, Custo Efetivo Total (CET) e veja a composição real das parcelas antes de assinar o contrato.
          </p>
        </div>
        <FinancingSimulator />
      </div>
    </AppLayout>
  );
};

export default SimuladorFinanciamento;
