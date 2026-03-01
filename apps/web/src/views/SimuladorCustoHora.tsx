import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageContainer } from '@/components/shared/PageContainer';
import { PageHeader } from '@/components/shared/PageHeader';
import { HourlyCostSimulator } from '@/components/simuladores/HourlyCostSimulator';
import { Clock } from 'lucide-react';

const SimuladorCustoHora: React.FC = () => {
  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Custo da Hora"
          description="Calcule o custo real da sua hora de trabalho"
          icon={<Clock className="h-5 w-5 text-primary-foreground" />}
          backTo="/simuladores"
          backLabel="Simuladores"
        />
        <HourlyCostSimulator />
      </PageContainer>
    </AppLayout>
  );
};

export default SimuladorCustoHora;
