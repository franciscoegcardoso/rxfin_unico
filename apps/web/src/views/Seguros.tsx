import React from 'react';
import { BackLink } from '@/components/shared/BackLink';
import { SegurosSection } from '@/components/seguros/SegurosSection';
import { Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

const Seguros: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && <BackLink to="/bens-investimentos" label="Voltar" />}
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Seguros</h1>
            </div>
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.seguros} />
          </div>
        </div>

        {/* Conteúdo */}
        <SegurosSection />
      </div>
    
  );
};

export default Seguros;
