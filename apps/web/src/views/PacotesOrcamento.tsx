import React from 'react';
import { PackagesSection } from '@/components/lancamentos/PackagesSection';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

export const PacotesOrcamento: React.FC = () => {
  return (
    
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pacotes de Orçamento</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Controle gastos de viagens, projetos e eventos com metas definidas
            </p>
          </div>
          <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.pacotesOrcamento} />
        </div>
        
        <PackagesSection />
      </div>
    
  );
};

export default PacotesOrcamento;
