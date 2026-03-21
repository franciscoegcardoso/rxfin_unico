import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PackagesSection } from '@/components/lancamentos/PackagesSection';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { Package } from 'lucide-react';

export const PacotesOrcamento: React.FC = () => {
  return (
    
      <div className="space-y-6">
        <PageHeader
          icon={Package}
          title="Pacotes de Orçamento"
          subtitle="Controle gastos de viagens, projetos e eventos com metas definidas"
          actions={<PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.pacotesOrcamento} />}
        />
        <PackagesSection />
      </div>
    
  );
};

export default PacotesOrcamento;
