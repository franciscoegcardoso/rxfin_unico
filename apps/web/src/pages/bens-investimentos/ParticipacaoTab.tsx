import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';

export default function ParticipacaoTab() {
  const { handleOpenAddDialog } = useBensInvestimentos();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Participações Societárias
        </h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => handleOpenAddDialog(undefined, undefined, 'company')}
        >
          <Plus className="h-4 w-4" />
          Adicionar participação
        </Button>
      </div>
      <Card className="rounded-[14px] border border-dashed border-border/80 p-8">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground">Em breve</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Participações societárias serão exibidas aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
