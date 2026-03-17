import React from 'react';
import { CreditoSection } from '@/components/credito/CreditoSection';
import { DividasObrigacoesSection } from '@/components/passivos/DividasObrigacoesSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, FileText } from 'lucide-react';

const PassivosPage: React.FC = () => {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Passivos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dívidas, financiamentos e obrigações financeiras
        </p>
      </div>

      <Tabs defaultValue="financiamento" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full sm:w-auto h-auto flex flex-wrap gap-1 p-1 bg-muted/50">
          <TabsTrigger value="financiamento" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Financiamento
          </TabsTrigger>
          <TabsTrigger value="dividas" className="gap-2">
            <FileText className="h-4 w-4" />
            Dívidas e obrigações
          </TabsTrigger>
        </TabsList>
        <TabsContent value="financiamento" className="flex-1 mt-4 min-h-0">
          <CreditoSection />
        </TabsContent>
        <TabsContent value="dividas" className="flex-1 mt-4 min-h-0">
          <DividasObrigacoesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PassivosPage;
