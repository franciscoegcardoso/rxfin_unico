import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageContainer } from '@/components/shared/PageContainer';
import { QuitacaoDescontoSimulator } from '@/components/simuladores/renegociacao/QuitacaoDescontoSimulator';
import { Receipt } from 'lucide-react';

const QuitacaoDesconto: React.FC = () => {
  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Quitação com Desconto"
          description="Avalie se vale a pena aceitar uma proposta de quitação à vista"
          icon={<Receipt className="h-5 w-5 text-primary-foreground" />}
          backTo="/renegociacao-dividas"
          backLabel="Renegociação de Dívidas"
        />
        <QuitacaoDescontoSimulator />
      </PageContainer>
    </AppLayout>
  );
};

export default QuitacaoDesconto;
