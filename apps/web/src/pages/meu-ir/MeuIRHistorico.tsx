import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, History, LayoutList, FileBarChart } from 'lucide-react';
import { IRImportDialog } from '@/components/ir-import/IRImportDialog';
import { MeuIRSection } from '@/components/ir-import/MeuIRSection';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import IrBensDireitosTab from '@/components/ir/IrBensDireitosTab';
import IrHistoricoPatrimonial from '@/components/ir/IrHistoricoPatrimonial';

const MeuIRHistorico: React.FC = () => {
  const location = useLocation();
  const [isIRImportOpen, setIsIRImportOpen] = useState(false);
  const [irRefreshKey, setIrRefreshKey] = useState(0);

  useEffect(() => {
    const st = location.state as { openImport?: boolean; scrollTo?: string } | null;
    if (st?.openImport) {
      setIsIRImportOpen(true);
    }
    if (st?.scrollTo === 'bens') {
      const t = window.setTimeout(() => {
        document.getElementById('meu-ir-bens-direitos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [location.state]);

  const scrollToReconcile = () => {
    document.getElementById('ir-reconcile-banners')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <IRImportDialog
        open={isIRImportOpen}
        onOpenChange={setIsIRImportOpen}
        onImportComplete={() => setIrRefreshKey((k) => k + 1)}
      />
      <div className="space-y-4">
        <div id="meu-ir-bens-direitos">
          <CollapsibleModule
            title="Bens e Direitos"
            description="Bens declarados no IR e comparação com valores de mercado"
            icon={<LayoutList className="h-4 w-4 text-primary" />}
            defaultOpen
          >
            <IrBensDireitosTab
              onImportIRClick={() => setIsIRImportOpen(true)}
              onNavigateToReconcile={scrollToReconcile}
            />
          </CollapsibleModule>
        </div>

        <div id="ir-reconcile-banners">
          <CollapsibleModule
            title="Declarações anteriores"
            description="Importe PDF da declaração e reconcilie bens com o patrimônio"
            icon={<History className="h-4 w-4 text-primary" />}
            actions={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() => setIsIRImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Importar declaração
              </Button>
            }
            defaultOpen
          >
            <MeuIRSection onOpenImport={() => setIsIRImportOpen(true)} refreshKey={irRefreshKey} />
          </CollapsibleModule>
        </div>

        <CollapsibleModule
          title="Evolução patrimonial"
          description="Histórico declarado vs mercado ao longo dos anos"
          icon={<FileBarChart className="h-4 w-4 text-primary" />}
          defaultOpen={false}
        >
          <IrHistoricoPatrimonial />
        </CollapsibleModule>
      </div>
    </>
  );
};

export default MeuIRHistorico;
