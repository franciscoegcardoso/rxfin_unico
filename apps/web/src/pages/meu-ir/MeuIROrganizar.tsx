import React, { useState } from 'react';
import { FiscalOrganizerChat } from '@/components/ir-import/FiscalOrganizerChat';
import { FiscalProgressDashboard } from '@/components/ir-import/FiscalProgressDashboard';
import { ComprovantesList } from '@/components/ir-import/ComprovantesList';
import { IRSimulator } from '@/components/ir-import/IRSimulator';
import { DocumentChecklist } from '@/components/ir-import/DocumentChecklist';
import { InsuranceIRSummary } from '@/components/ir-import/InsuranceIRSummary';
import { useFiscalOrganizer } from '@/hooks/useFiscalOrganizer';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { ClipboardCheck, Shield, Calculator, FileText } from 'lucide-react';

const MeuIROrganizar: React.FC = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const {
    messages,
    comprovantes,
    isLoading,
    sendMessage,
    addComprovante,
    updateComprovante,
    deleteComprovante,
    downloadFile,
    clearChat,
    getStats,
  } = useFiscalOrganizer();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FiscalOrganizerChat
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onClearChat={clearChat}
        />
        <FiscalProgressDashboard stats={getStats()} />
      </div>

      <CollapsibleModule
        title="Resumo de Deduções"
        description="Checklist de comprovantes por categoria"
        icon={<ClipboardCheck className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <DocumentChecklist comprovantes={comprovantes} onAddByCategory={(categoryId) => setOpenCategory(categoryId)} />
      </CollapsibleModule>

      <CollapsibleModule
        title="Resumo de Deduções"
        description="Seguros e despesas dedutíveis no IR"
        icon={<Shield className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <InsuranceIRSummary variant="card" />
      </CollapsibleModule>

      <CollapsibleModule
        title="Simulador de Economia de IR"
        description="Simule o impacto das deduções no seu imposto"
        icon={<Calculator className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <IRSimulator stats={getStats()} />
      </CollapsibleModule>

      <CollapsibleModule
        title="Comprovantes Arquivados"
        description="Documentos fiscais organizados por categoria"
        icon={<FileText className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
        count={comprovantes.length}
      >
        <ComprovantesList
          comprovantes={comprovantes}
          onAdd={addComprovante}
          onUpdate={updateComprovante}
          onDelete={deleteComprovante}
          onDownload={downloadFile}
          openWithCategory={openCategory}
          onClearOpenCategory={() => setOpenCategory(null)}
        />
      </CollapsibleModule>
    </div>
  );
};

export default MeuIROrganizar;
