import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, FileText, Plus, RefreshCw } from 'lucide-react';
import { DividaObrigacaoDialog } from '@/components/passivos/DividaObrigacaoDialog';
import { usePassivosPage } from '@/hooks/usePassivosPage';
import { useAuth } from '@/contexts/AuthContext';

type PluggyLoan = {
  product_name: string;
  outstanding_balance: number;
  progress_pct?: number | null;
  cet_annual_pct?: number | null;
  cet_monthly_pct?: number | null;
  pre_fixed_rate_pct?: number | null;
  contract_date?: string | null;
  amortization_system?: string | null;
  interest_rates?: unknown[] | null;
  contracted_fees?: unknown[] | null;
  warranties?: unknown[] | null;
  first_installment_due_date?: string | null;
};

type ManualLoan = {
  nome: string;
  saldo_devedor: number;
  progress_pct?: number | null;
};

type PassivosDividasResponse = {
  pluggy_loans: PluggyLoan[];
  manual_loans: ManualLoan[];
  summary: {
    total_pluggy_outstanding: number;
    total_manual_outstanding: number;
    total_outstanding: number;
    pluggy_count: number;
    manual_count: number;
    overdue_count: number;
    has_overdue: boolean;
    avg_cet_annual_pct: number;
  };
  fetched_at: string;
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPct = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatDateBr = (value: string): string => {
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
};

const cetTone = (value: number | null | undefined): string => {
  if (value == null) return 'bg-muted text-muted-foreground border-border';
  if (value > 20) return 'bg-red-500/10 text-red-600 border-red-500/30';
  if (value >= 10) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
};

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PassivosDividasTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: pageData, isLoading, error } = usePassivosPage(user?.id, 'dividas');
  const data = (pageData?.tab_data ?? null) as PassivosDividasResponse | null;

  const pluggyLoans = data?.pluggy_loans ?? [];
  const manualLoans = data?.manual_loans ?? [];
  const hasAnyLoans = useMemo(() => pluggyLoans.length > 0 || manualLoans.length > 0, [pluggyLoans.length, manualLoans.length]);

  if (isLoading) {
    return (
      <div className="py-6">
        <RXFinLoadingSpinner message="Carregando dívidas..." height="h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Não foi possível carregar</p>
                <p className="text-xs text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error)}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Dívidas
        </h2>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Adicionar dívida
        </Button>
      </div>
      {data?.summary?.has_overdue && (data.summary.overdue_count ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{data.summary.overdue_count} vencida(s)</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">CET médio</span>
        <Badge variant="outline" className={cetTone(data?.summary?.avg_cet_annual_pct)}>
          {data?.summary?.avg_cet_annual_pct != null
            ? `${formatPct(data.summary.avg_cet_annual_pct)}% a.a.`
            : '—'}
        </Badge>
      </div>

      {!hasAnyLoans ? (
        <EmptyState
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          title="Nenhuma dívida cadastrada"
          description="Adicione dívidas manuais para acompanhar seu saldo devedor e evolução."
          actionLabel="Adicionar dívida"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="space-y-4">
            {pluggyLoans.map((loan) => {
              const progress = typeof loan.progress_pct === 'number' ? loan.progress_pct : 0;
              return (
                <Card key={`pluggy-${loan.product_name}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{loan.product_name}</p>
                        <p className="text-xs text-muted-foreground">Open Finance</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {formatMoney(loan.outstanding_balance)}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>

                    <div className="rounded-md border border-border/60 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Detalhes financeiros</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">CET Anual</span>
                          <Badge variant="outline" className={cetTone(loan.cet_annual_pct)}>
                            {loan.cet_annual_pct != null ? `${formatPct(loan.cet_annual_pct)}% a.a.` : '—'}
                          </Badge>
                        </div>
                        {loan.cet_monthly_pct != null && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Taxa Mensal Efetiva</span>
                            <span className="font-medium">{formatPct(loan.cet_monthly_pct)}% a.m.</span>
                          </div>
                        )}
                        {loan.pre_fixed_rate_pct != null && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Taxa Pré-fixada</span>
                            <span className="font-medium">{formatPct(loan.pre_fixed_rate_pct)}% a.a.</span>
                          </div>
                        )}
                        {loan.contract_date && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Contratado em</span>
                            <span className="font-medium">{formatDateBr(loan.contract_date)}</span>
                          </div>
                        )}
                        {loan.amortization_system && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Sistema de amortização</span>
                            <span className="font-medium">{loan.amortization_system}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {manualLoans.map((loan) => {
              const progress = typeof loan.progress_pct === 'number' ? loan.progress_pct : 0;
              return (
                <Card key={`manual-${loan.nome}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{loan.nome}</p>
                        <p className="text-xs text-muted-foreground">Financiamento manual</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {formatMoney(loan.saldo_devedor)}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
    <DividaObrigacaoDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      editingAsset={null}
      onSaved={() => {
        if (user?.id) {
          void queryClient.invalidateQueries({ queryKey: ['passivos-page', user.id] });
        }
      }}
    />
    </>
  );
}

