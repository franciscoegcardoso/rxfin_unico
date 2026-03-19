import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstitutionInvestmentTypesCard } from '@/components/bens/InstitutionInvestmentTypesCard';
import { InvestmentsSection } from '@/components/bens/InvestmentsSection';
import { useBensInvestimentos } from '@/contexts/BensInvestimentosContext';
import { INVESTIMENTOS_ALOCACAO_PATH } from '@/constants/appPaths';

const InvestimentosTab: React.FC = () => {
  const { handleOpenAddDialog, handleEditAsset, handleDeleteAsset } = useBensInvestimentos();

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          to={INVESTIMENTOS_ALOCACAO_PATH}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <PieChart className="w-4 h-4" />
          Ver Alocação de Ativos
        </Link>
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
