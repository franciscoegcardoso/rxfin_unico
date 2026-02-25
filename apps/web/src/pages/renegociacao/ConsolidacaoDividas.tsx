import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { ConsolidacaoDividasSimulator } from '@/components/simuladores/renegociacao/ConsolidacaoDividasSimulator';
import { Layers } from 'lucide-react';

const ConsolidacaoDividas: React.FC = () => {
  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Consolidação de Dívidas"
          description="Junte múltiplas dívidas em um único contrato e compare o custo total"
          icon={<Layers className="h-5 w-5 text-primary-foreground" />}
          backTo="/renegociacao-dividas"
          backLabel="Renegociação de Dívidas"
        />
        <ConsolidacaoDividasSimulator />
      </PageContainer>
    </AppLayout>
  );
};

export default ConsolidacaoDividas;
