import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { PortabilidadeCreditoSimulator } from '@/components/simuladores/renegociacao/PortabilidadeCreditoSimulator';
import { ArrowRightLeft } from 'lucide-react';

const PortabilidadeCredito: React.FC = () => {
  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Portabilidade de Crédito"
          description="Simule a transferência da dívida para outra instituição"
          icon={<ArrowRightLeft className="h-5 w-5 text-primary-foreground" />}
          backTo="/renegociacao-dividas"
          backLabel="Renegociação de Dívidas"
        />
        <PortabilidadeCreditoSimulator />
      </PageContainer>
    </AppLayout>
  );
};

export default PortabilidadeCredito;
