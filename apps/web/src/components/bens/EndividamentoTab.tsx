import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEndividamento, type PluggyLoan, type ManualLoan, type EndividamentoSummary } from '@/hooks/useEndividamento';
import { useVisibility } from '@/contexts/VisibilityContext';
import { TrendingDown, AlertTriangle, Building2, Calendar, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, hidden: boolean) =>
  hidden ? '••••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function EndividamentoTab() {
  const { data, isLoading, error } = useEndividamento();
  const { isHidden } = useVisibility();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Não foi possível carregar os dados de endividamento. Tente novamente.</AlertDescription>
      </Alert>
    );
  }

  const summary: EndividamentoSummary | null = data?.summary ?? null;
  const pluggyLoans: PluggyLoan[] = data?.pluggy_loans ?? [];
  const manualLoans: ManualLoan[] = data?.manual_loans ?? [];
  const totalLoans = pluggyLoans.length + manualLoans.length;
  const hasOverdue = summary?.has_overdue ?? false;
  const overdueCount = summary?.overdue_count ?? 0;

  if (!data || totalLoans === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingDown className="h-14 w-14 text-[hsl(var(--color-text-muted))] mb-4" strokeWidth={1.5} />
          <h3 className="font-semibold text-[hsl(var(--color-text-primary))] mb-2">Nenhum empréstimo ativo encontrado</h3>
          <p className="text-sm text-[hsl(var(--color-text-muted))] max-w-sm">
            Empréstimos e financiamentos conectados via Open Finance ou cadastrados manualmente aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastPluggySync = pluggyLoans.length > 0
    ? pluggyLoans.reduce((acc, l) => {
        const t = l.last_synced_at ? new Date(l.last_synced_at).getTime() : 0;
        return t > acc ? t : acc;
      }, 0)
    : 0;

  return (
    <div className="space-y-6">
      {hasOverdue && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <span className="font-medium text-destructive">
              {overdueCount} empréstimo(s) com parcelas em atraso
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-muted))]">Total devedor</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--color-text-primary))] mt-0.5">
              {formatCurrency(summary?.total_outstanding ?? 0, isHidden)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-muted))]">Empréstimos ativos</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--color-text-primary))] mt-0.5">
              {(summary?.pluggy_loans_count ?? 0) + (summary?.manual_loans_count ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--color-text-muted))]">CET médio</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--color-text-primary))] mt-0.5">
              {summary?.avg_cet_annual_pct != null ? `${(summary.avg_cet_annual_pct).toFixed(1)}% a.a.` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automático (Open Finance) */}
      {pluggyLoans.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[hsl(var(--color-text-primary))] mb-3 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Automático (Open Finance)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pluggyLoans.map((loan) => (
              <Card key={loan.id} className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {loan.connector_image_url ? (
                      <img src={loan.connector_image_url} alt="" className="h-10 w-10 rounded-full object-contain bg-muted/50" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[hsl(var(--color-text-muted))]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[hsl(var(--color-text-primary))] truncate">{loan.product_name || 'Empréstimo'}</p>
                      <p className="text-sm text-[hsl(var(--color-text-muted))]">{loan.connector_name}</p>
                    </div>
                    {loan.is_overdue && (
                      <Badge variant="destructive" className="shrink-0 text-xs">Em atraso</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-lg font-semibold tabular-nums text-[hsl(var(--color-text-primary))]">
                    {formatCurrency(loan.outstanding_balance ?? 0, isHidden)}
                  </p>
                  <p className="text-xs text-[hsl(var(--color-text-muted))] mt-0.5">Saldo devedor</p>
                  {(loan.total_installments != null && loan.paid_installments != null) && (
                    <>
                      <Progress value={loan.progress_pct ?? 0} className="h-2 mt-3" />
                      <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1.5">
                        {loan.paid_installments} de {loan.total_installments} parcelas pagas
                        {loan.progress_pct != null && ` (${Math.round(loan.progress_pct)}%)`}
                      </p>
                    </>
                  )}
                  {loan.cet_annual_pct != null && (
                    <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">
                      CET ao ano: {(loan.cet_annual_pct).toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Manual */}
      {manualLoans.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[hsl(var(--color-text-primary))] mb-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Manual
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {manualLoans.map((loan) => (
              <Card key={loan.id} className="bg-[hsl(var(--color-surface-raised))] border-[hsl(var(--color-border-default))]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[hsl(var(--color-text-primary))] truncate">{loan.nome || 'Financiamento'}</p>
                    {loan.instituicao && (
                      <Badge variant="outline" className="text-xs shrink-0">{loan.instituicao}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-[hsl(var(--color-text-primary))]">
                    {formatCurrency(loan.saldo_devedor ?? 0, isHidden)}
                  </p>
                  <p className="text-xs text-[hsl(var(--color-text-muted))]">Saldo devedor</p>
                  {loan.valor_parcela != null && (
                    <p className="text-sm text-[hsl(var(--color-text-muted))] mt-1">Parcela: {formatCurrency(loan.valor_parcela, isHidden)}/mês</p>
                  )}
                  {(loan.prazo_total != null && loan.parcelas_pagas != null) && (
                    <>
                      <Progress value={loan.progress_pct ?? 0} className="h-2 mt-3" />
                      <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1.5">
                        {loan.parcelas_pagas} de {loan.prazo_total} parcelas ({(loan.progress_pct ?? 0).toFixed(0)}%)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {lastPluggySync > 0 && (
        <p className="text-xs text-[hsl(var(--color-text-muted))]">
          Dados automáticos via Open Finance · Atualizado {format(new Date(lastPluggySync), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
