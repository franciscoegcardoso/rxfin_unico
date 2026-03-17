import React from 'react';
import { CreditoSection } from '@/components/credito/CreditoSection';
import { DividasObrigacoesSection } from '@/components/passivos/DividasObrigacoesSection';

const PassivosPage: React.FC = () => {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Passivos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dívidas, financiamentos e obrigações financeiras
        </p>
      </div>
      <div className="space-y-10">
        <DividasObrigacoesSection />
        <CreditoSection />
      </div>
    </div>
  );
};

export default PassivosPage;
