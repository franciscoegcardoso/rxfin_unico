import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { ParcelamentoDividaSimulator } from '@/components/simuladores/renegociacao/ParcelamentoDividaSimulator';
import { Percent } from 'lucide-react';

const ParcelamentoDivida: React.FC = () => {
  return (
    
      <PageContainer>
        <PageHeader
          title="Parcelamento de Dívida"
          description="Compare sua dívida atual com uma nova proposta de parcelamento"
          icon={<Percent className="h-5 w-5 text-primary-foreground" />}
          backTo="/renegociacao-dividas"
          backLabel="Renegociação de Dívidas"
        />
        <ParcelamentoDividaSimulator />
      </PageContainer>
    
  );
};

export default ParcelamentoDivida;
