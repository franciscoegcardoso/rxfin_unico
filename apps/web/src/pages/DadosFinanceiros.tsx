import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { useConsolidatedData } from '@/hooks/useConsolidatedData';
import { useExpenseTrends } from '@/hooks/useExpenseTrends';
import { ConsolidatedTable } from '@/components/dados/ConsolidatedTable';
import { DeleteAllDialog } from '@/components/dados/DeleteAllDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Database, Trash2, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CATEGORY_COLORS: Record<string, string> = {
  'Contas da Casa': '#3b82f6',
  'Alimentação': '#22c55e',
  'Saúde': '#ef4444',
  'Lazer': '#a855f7',
  'Transporte': '#f59e0b',
  'Pessoal': '#ec4899',
  'Investimentos': '#14b8a6',
};
const getCategoryColor = (c: string) => CATEGORY_COLORS[c] ?? 'var(--primary)';

const DadosFinanceiros: React.FC = () => {
  const navigate = useNavigate();
  const { consolidated, loading, deleting, deleteSelected, deleteAll } = useConsolidatedData();
  const { data: trendsData, loading: trendsLoading, error: trendsError } = useExpenseTrends(6);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const categories = trendsData?.categories ?? [];
  const totalExpense = trendsData?.total_expense ?? 0;
  const maxAmount = Math.max(1, ...categories.flatMap((cat) => (cat.months ?? []).map((m) => m.amount)));

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

        {/* Tendências de Gastos */}
        {trendsError && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{trendsError}</p>
        )}
        {trendsLoading && (
          <p className="text-muted-foreground">Carregando tendências...</p>
        )}
        {!trendsLoading && !trendsError && (categories.length > 0 || totalExpense > 0) && (
          <div className="space-y-4">
            <Card className="rounded-[14px] border border-border/80">
              <CardContent className="p-4">
                <p className="text-lg font-semibold">{formatCurrency(totalExpense)}</p>
                <p className="text-sm text-muted-foreground">Total gasto no período · Últimos 6 meses</p>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const color = getCategoryColor(cat.category);
                const months = cat.months ?? [];
                return (
                  <Card key={cat.category} className="rounded-[14px] border border-border/80 overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {cat.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-lg font-semibold">{formatCurrency(cat.total)}</p>
                      <p className="text-xs text-muted-foreground">Média mensal: {formatCurrency(cat.avg_monthly ?? 0)}</p>
                      <div className="flex items-end gap-0.5 h-12 mt-2">
                        {months.length === 0 ? (
                          <div className="flex-1 h-1 rounded bg-muted" />
                        ) : (
                          months.map((m) => {
                            const pct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                            const monthNum = parseInt(m.month.split('-')[1], 10);
                            const label = MONTHS_SHORT[monthNum - 1] ?? m.month;
                            return (
                              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                                <div
                                  className={cn('w-full min-w-[4px] rounded-t transition-all', pct === 0 && 'bg-muted')}
                                  style={pct > 0 ? { height: `${Math.max(4, pct)}%`, backgroundColor: color } : { height: 4 }}
                                />
                                <span className="text-[10px] text-muted-foreground truncate max-w-full">{label}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {!trendsLoading && !trendsError && categories.length === 0 && totalExpense === 0 && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Sem dados de despesas no período</p>
          </Card>
        )}

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
