import React from 'react';
import { Package, Plus, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';

export default function IntangiveisTab() {
  const { handleOpenAddDialog } = useBensInvestimentos();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Intangíveis
        </h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => handleOpenAddDialog(undefined, undefined, 'intellectual_property')}
        >
          <Plus className="h-4 w-4" />
          Adicionar intangível
        </Button>
      </div>
      <EmptyState
        icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
        title="Nenhum intangível cadastrado"
        description="Adicione propriedade intelectual, licenças e direitos contratuais para acompanhar seu patrimônio."
        actionLabel="Adicionar intangível"
        onAction={() => handleOpenAddDialog(undefined, undefined, 'intellectual_property')}
      />
    </div>
  );
}
