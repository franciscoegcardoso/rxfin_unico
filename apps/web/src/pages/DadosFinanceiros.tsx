import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { useConsolidatedData } from '@/hooks/useConsolidatedData';
import { ConsolidatedTable } from '@/components/dados/ConsolidatedTable';
import { DeleteAllDialog } from '@/components/dados/DeleteAllDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, Trash2 } from 'lucide-react';

const DadosFinanceiros: React.FC = () => {
  const navigate = useNavigate();
  const { consolidated, loading, deleting, deleteSelected, deleteAll } = useConsolidatedData();
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const handleDeleteAll = async () => {
    const success = await deleteAll();
    if (success) setShowDeleteAll(false);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/instituicoes-financeiras')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Dados Financeiros</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visão consolidada de lançamentos e transações de cartão
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {consolidated.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setShowDeleteAll(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir tudo
              </Button>
            )}
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        <ConsolidatedTable
          data={consolidated}
          loading={loading}
          onDeleteSelected={deleteSelected}
          deleting={deleting}
        />

        <DeleteAllDialog
          open={showDeleteAll}
          onOpenChange={setShowDeleteAll}
          totalCount={consolidated.length}
          lancamentoCount={consolidated.filter(r => r.origin === 'lancamento').length}
          cartaoCount={consolidated.filter(r => r.origin === 'cartao').length}
          onConfirm={handleDeleteAll}
          deleting={deleting}
        />
      </div>
    </SettingsLayout>
  );
};

export default DadosFinanceiros;
