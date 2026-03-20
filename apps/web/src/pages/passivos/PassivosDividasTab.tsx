import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/shared/EmptyState';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, FileText, Plus, RefreshCw } from 'lucide-react';
import { DividaObrigacaoDialog } from '@/components/passivos/DividaObrigacaoDialog';

type PluggyLoan = {
  product_name: string;
  outstanding_balance: number;
  progress_pct?: number | null;
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

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PassivosDividasTab() {
  const [data, setData] = useState<PassivosDividasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('get_passivos_dividas');
        if (rpcError) throw rpcError;
        if (cancelled) return;
        setData((result ?? null) as PassivosDividasResponse | null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

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
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
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
    <DividaObrigacaoDialog open={dialogOpen} onOpenChange={setDialogOpen} editingAsset={null} />
    </>
  );
}

