import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { SegurosSection } from '@/components/seguros/SegurosSection';
import { Shield } from 'lucide-react';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

const Seguros: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          icon={Shield}
          title="Seguros"
          subtitle="Gerencie suas apólices e coberturas"
          actions={<PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.seguros} />}
        />

        <SegurosSection />
      </div>
    </AppLayout>
  );
};

export default Seguros;
