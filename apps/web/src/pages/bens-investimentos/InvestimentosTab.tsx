import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstitutionInvestmentTypesCard } from '@/components/bens/InstitutionInvestmentTypesCard';
import { InvestmentsSection } from '@/components/bens/InvestmentsSection';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';

const InvestimentosTab: React.FC = () => {
  const { handleOpenAddDialog, handleEditAsset, handleDeleteAsset } = useBensInvestimentos();

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenAddDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Adicionar Bem/Direito
        </Button>
      </div>

      <InstitutionInvestmentTypesCard onAddInvestment={handleOpenAddDialog} />

      <InvestmentsSection
        onAddInvestment={handleOpenAddDialog}
        onEditInvestment={handleEditAsset}
        onDeleteInvestment={handleDeleteAsset}
      />
    </>
  );
};

export default InvestimentosTab;
