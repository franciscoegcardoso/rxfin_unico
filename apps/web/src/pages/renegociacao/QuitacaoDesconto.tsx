import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { QuitacaoDescontoSimulator } from '@/components/simuladores/renegociacao/QuitacaoDescontoSimulator';
import { Receipt } from 'lucide-react';
import { PageBreadcrumb } from '@/components/navigation/PageBreadcrumb';

const QuitacaoDesconto: React.FC = () => {
  return (
    
      <PageContainer>
        <PageBreadcrumb />
        <PageHeader
          title="Quitação com Desconto"
          description="Avalie se vale a pena aceitar uma proposta de quitação à vista"
          icon={<Receipt className="h-5 w-5 text-primary-foreground" />}
          backTo="/renegociacao-dividas"
          backLabel="Renegociação de Dívidas"
        />
        <QuitacaoDescontoSimulator />
      </PageContainer>
    
  );
};

export default QuitacaoDesconto;
