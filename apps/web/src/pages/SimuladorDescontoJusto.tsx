import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DescontoJustoSimulator } from '@/components/simuladores/DescontoJustoSimulator';
import { BackLink } from '@/components/shared/BackLink';

const SimuladorDescontoJusto: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <BackLink to="/simuladores" label="Simuladores" className="mb-2" />
          <h1 className="text-3xl font-bold text-foreground">À Vista x Parcelado - Desconto Justo</h1>
          <p className="text-muted-foreground mt-1">
            Descubra o custo real do parcelamento "sem juros" e o desconto mínimo para pagamento à vista
          </p>
        </div>
        <DescontoJustoSimulator />
      </div>
    </AppLayout>
  );
};

export default SimuladorDescontoJusto;
