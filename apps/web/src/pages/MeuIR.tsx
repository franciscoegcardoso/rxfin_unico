import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Bot, History, Settings2, Calculator, FileText, Shield, ClipboardCheck, HelpCircle } from 'lucide-react';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { MeuIRSection } from '@/components/ir-import/MeuIRSection';
import { IRImportDialog } from '@/components/ir-import/IRImportDialog';
import { FiscalOrganizerChat } from '@/components/ir-import/FiscalOrganizerChat';
import { FiscalProgressDashboard } from '@/components/ir-import/FiscalProgressDashboard';
import { ComprovantesList } from '@/components/ir-import/ComprovantesList';
import { IRTipsDialog } from '@/components/ir-import/IRTipsDialog';
import { IRSimulator } from '@/components/ir-import/IRSimulator';
import { DocumentChecklist } from '@/components/ir-import/DocumentChecklist';
import { InsuranceIRSummary } from '@/components/ir-import/InsuranceIRSummary';
import { useFiscalOrganizer } from '@/hooks/useFiscalOrganizer';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';

const MeuIR: React.FC = () => {
  const [isIRImportOpen, setIsIRImportOpen] = useState(false);
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
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meu Imposto de Renda</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Organize comprovantes e acompanhe seu histórico de declarações
              </p>
            </div>
            <VisibilityToggle />
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.meuIR} />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/configuracoes-fiscais">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações Fiscais</span>
                <span className="sm:hidden">Config</span>
              </Button>
            </Link>
            <IRTipsDialog />
          </div>
        </div>

        <Tabs defaultValue="organizer" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-auto p-0 bg-transparent gap-0">
            <TabsTrigger 
              value="organizer" 
              className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-normal rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Organizar {new Date().getFullYear()}
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-normal rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <History className="h-4 w-4" />
              Declarações anteriores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizer" className="mt-6 space-y-6">
            {/* Row 1: Chat + Progress Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FiscalOrganizerChat
                messages={messages}
                isLoading={isLoading}
                onSendMessage={sendMessage}
                onClearChat={clearChat}
              />
              <FiscalProgressDashboard stats={getStats()} />
            </div>

            {/* Row 2: Checklist (full width) */}
            <CollapsibleModule
              title="Resumo de Deduções"
              description="Checklist de comprovantes por categoria"
              icon={<ClipboardCheck className="h-4 w-4 text-primary" />}
              useDialogOnDesktop
            >
              <DocumentChecklist 
                comprovantes={comprovantes} 
                onAddByCategory={(categoryId) => setOpenCategory(categoryId)}
              />
            </CollapsibleModule>

            {/* Row 2.5: Insurance IR Summary */}
            <CollapsibleModule
              title="Resumo de Deduções"
              description="Seguros e despesas dedutíveis no IR"
              icon={<Shield className="h-4 w-4 text-primary" />}
              useDialogOnDesktop
            >
              <InsuranceIRSummary variant="card" />
            </CollapsibleModule>

            {/* Row 3: Simulator */}
            <CollapsibleModule
              title="Simulador de Economia de IR"
              description="Simule o impacto das deduções no seu imposto"
              icon={<Calculator className="h-4 w-4 text-primary" />}
              useDialogOnDesktop
            >
              <IRSimulator stats={getStats()} />
            </CollapsibleModule>
            
            {/* Row 4: Comprovantes List */}
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
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <IRImportDialog
              open={isIRImportOpen}
              onOpenChange={setIsIRImportOpen}
            />
            <MeuIRSection onOpenImport={() => setIsIRImportOpen(true)} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MeuIR;
