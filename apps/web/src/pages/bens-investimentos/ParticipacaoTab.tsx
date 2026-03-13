import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
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
      <EmptyState
        icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
        title="Nenhuma participação cadastrada"
        description="Adicione suas participações societárias em empresas para acompanhar seu patrimônio empresarial."
        actionLabel="Adicionar participação"
        onAction={() => handleOpenAddDialog(undefined, undefined, 'company')}
      />
    </div>
  );
}
