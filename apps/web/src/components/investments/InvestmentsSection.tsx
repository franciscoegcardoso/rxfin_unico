import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  usePluggyInvestments,
  type PluggyInvestment,
  type InvestmentSummary,
  type InvestmentSummaryRow,
  type InvestmentTotals,
} from '@/hooks/usePluggyInvestments';
import { formatCurrency } from '@/lib/utils';
import { formatInvestmentYield, getInvestmentStatusBadge, getDueDateUrgency } from '@/utils/investments';
import { toast } from 'sonner';
import {
  TrendingUp,
  ShieldCheck,
  Landmark,
  BarChart2,
  PieChart,
  Umbrella,
  Building2,
  Coins,
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  LineChart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  MUTUAL_FUND: { label: 'Fundos', icon: TrendingUp },
  FIXED_INCOME: { label: 'Renda Fixa', icon: ShieldCheck },
  TREASURE: { label: 'Tesouro Direto', icon: Landmark },
  STOCK: { label: 'Ações', icon: BarChart2 },
  EQUITY: { label: 'Ações', icon: BarChart2 },
  ETF: { label: 'ETF', icon: PieChart },
  PENSION: { label: 'Previdência', icon: Umbrella },
  REAL_ESTATE_FUND: { label: 'FIIs', icon: Building2 },
  CRYPTOCURRENCY: { label: 'Cripto', icon: Coins },
  SECURITY: { label: 'Títulos', icon: ShieldCheck },
  BOND: { label: 'Títulos', icon: Landmark },
  COE: { label: 'COE', icon: Package },
  LOAN: { label: 'Empréstimos', icon: Package },
  OTHER: { label: 'Outros', icon: Package },
};

const SUBTYPE_LABELS: Record<string, string> = {
  CDB: 'CDB',
  LCA: 'LCA',
  STOCK: 'Ações',
  REAL_ESTATE_FUND: 'FIIs',
  MUTUAL_FUND: 'Fundos',
  FIXED_INCOME: 'Renda Fixa',
  ETF: 'ETF',
  EQUITY: 'Ações',
};

function getTypeLabel(type: string): string {
  return TYPE_CONFIG[type]?.label ?? type;
}

function getRowLabel(row: InvestmentSummaryRow): string {
  const sub = row.investment_subtype && SUBTYPE_LABELS[row.investment_subtype];
  if (sub) return sub;
  return getTypeLabel(row.investment_type);
}

function getTypeIcon(type: string): React.ElementType {
  return TYPE_CONFIG[type]?.icon ?? Package;
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}% a.a.`;
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Minutes ago from now (UTC). */
function getMinutesAgo(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / 60_000);
}

function getUpdatedLabel(isoDate: string | null): string {
  const min = getMinutesAgo(isoDate);
  if (min == null) return 'Data não disponível';
  if (min < 1) return 'Atualizado agora';
  if (min < 60) return `Atualizado há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Atualizado há ${h} h`;
  const d = Math.floor(h / 24);
  return `Atualizado há ${d} dia${d !== 1 ? 's' : ''}`;
}

/** True if balance_updated_at is null or older than 24h. */
function isStale(isoDate: string | null): boolean {
  if (!isoDate) return true;
  const min = getMinutesAgo(isoDate);
  return min == null || min > 24 * 60;
}

/** Rentabilidade para exibição na tabela por tipo. */
function getRendimentoDisplay(inv: PluggyInvestment): { text: string; className: string } {
  const yieldStr = formatInvestmentYield({
    rate: inv.rate,
    rate_type: inv.rate_type,
    fixed_annual_rate: inv.fixed_annual_rate,
    annual_rate: inv.annual_rate,
  });
  if (yieldStr) {
    return { text: yieldStr, className: 'text-foreground' };
  }
  const twelve = inv.last_twelve_months_rate;
  if ((inv.type === 'EQUITY' || inv.type === 'ETF') && twelve != null) {
    const n = Number(twelve);
    const cls = n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const sign = n >= 0 ? '+' : '';
    return { text: `12m: ${sign}${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}%`, className: cls };
  }
  const one = inv.last_month_rate;
  if (inv.type === 'MUTUAL_FUND' && one != null) {
    const n = Number(one);
    const cls = n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const sign = n >= 0 ? '+' : '';
    return { text: `1m: ${sign}${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}%`, className: cls };
  }
  return { text: '—', className: 'text-muted-foreground' };
}

type SortKey = 'balance' | 'due_date';
type StatusFilter = 'all' | 'ACTIVE' | 'PENDING' | 'TOTAL_WITHDRAWAL';

export const InvestmentsSection: React.FC = () => {
  const {
    investments,
    summary,
    summaryV2,
    totals,
    totalBalance,
    totalAmount,
    totalTaxes,
    loading,
    error,
    hasSyncedData,
    refetch,
  } = usePluggyInvestments();
  const [syncing, setSyncing] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('balance');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const latestUpdatedAt = useMemo(() => {
    if (totals?.oldest_balance_date) return totals.oldest_balance_date;
    const dates = investments
      .map((i) => i.balance_updated_at)
      .filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  }, [investments, totals?.oldest_balance_date]);

  const showStaleBanner = hasSyncedData && (totals?.has_stale_data ?? isStale(latestUpdatedAt));
  const totalSuspectZero = totals?.suspect_zero_total ?? 0;

  const filteredInvestments = useMemo(() => {
    let list = investments;
    if (statusFilter === 'ACTIVE') {
      list = list.filter((i) => i.status === 'ACTIVE' || i.status === null);
    } else if (statusFilter === 'PENDING') {
      list = list.filter((i) => i.status === 'PENDING');
    } else if (statusFilter === 'TOTAL_WITHDRAWAL') {
      list = list.filter((i) => i.status === 'TOTAL_WITHDRAWAL');
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'due_date') {
        const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      return (Number(b.balance) || 0) - (Number(a.balance) || 0);
    });
  }, [investments, statusFilter, sortKey]);

  const statusCounts = useMemo(() => {
    const active = investments.filter((i) => i.status === 'ACTIVE' || i.status === null).length;
    const pending = investments.filter((i) => i.status === 'PENDING').length;
    const closed = investments.filter((i) => i.status === 'TOTAL_WITHDRAWAL').length;
    return { active, pending, closed };
  }, [investments]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error: err } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'sync-investments' },
      });
      if (err) throw err;
      toast.success('Sincronização de investimentos iniciada.');
      await refetch();
    } catch (e) {
      console.error('[InvestmentsSection] sync error:', e);
      toast.error('Erro ao sincronizar investimentos. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-[14px] border border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[14px] border border-destructive/50 bg-destructive/5">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasSyncedData) {
    return (
      <Card className="rounded-[14px] border border-dashed border-border/80">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <LineChart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Seus investimentos aparecerão aqui após a primeira sincronização.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 gap-2"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sincronizar agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  const showBrutoTaxes = totalAmount > totalBalance || totalTaxes > 0;

  return (
    <div className="space-y-4">
      {showStaleBanner && (
        <button
          type="button"
          onClick={handleSync}
          className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-center gap-2 text-left hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-foreground">Dados podem estar desatualizados. Toque para sincronizar.</span>
        </button>
      )}

      {/* Card total — v2: bruto, líquido, Δ */}
      <Card className="rounded-[14px] border border-border">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total em investimentos</p>
            {totals != null ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Valor bruto{' '}
                  <span className="font-mono tabular-nums font-medium text-foreground">
                    {formatCurrency(Number(totals.gross_total))}
                  </span>
                  {' '}(para conferir com app do banco)
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor líquido{' '}
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {formatCurrency(Number(totals.net_total))}
                  </span>
                </p>
                {Number(totals.gross_net_spread) !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono tabular-nums">Δ {formatCurrency(Math.abs(Number(totals.gross_net_spread)))}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground cursor-help inline-flex align-middle" aria-label="Explicação">?</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Diferença entre o valor bruto aplicado e o valor líquido estimado. Para Renda Fixa inclui IR estimado. Para Fundos pode refletir diferença de cota.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                )}
              </>
            ) : (
              <>
                {showBrutoTaxes && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Total bruto: <span className="font-mono tabular-nums">{formatCurrency(totalAmount)}</span>
                    </p>
                    {totalTaxes > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        IR/IOF: <span className="font-mono tabular-nums">-{formatCurrency(totalTaxes)}</span>
                      </p>
                    )}
                  </>
                )}
                <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-foreground mt-0.5">
                  Saldo líq.: {formatCurrency(totalBalance)}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {totals?.has_stale_data && latestUpdatedAt ? (
              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300">
                Cota com {formatDistanceToNow(new Date(latestUpdatedAt), { addSuffix: true, locale: ptBR })} atrás
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs font-normal">
                {getUpdatedLabel(latestUpdatedAt)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid/tabela por classe — v2: Bruto, Líquido, Δ */}
      {summaryV2.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-[14px] border border-border overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div>Classe</div>
              <div className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Bruto</span>
                    </TooltipTrigger>
                    <TooltipContent>Valor nominal aplicado. Use para conferir com o app do seu banco.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>Líquido</span>
                    </TooltipTrigger>
                    <TooltipContent>Valor estimado após IR (Renda Fixa) e ajuste de cota (Fundos).</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-right hidden sm:block">Δ IR/Cota</div>
            </div>
            {summaryV2.map((row) => {
              const Icon = getTypeIcon(row.investment_type);
              const spread = Number(row.gross_net_spread);
              const showSpread = spread !== 0;
              const gross = Number(row.gross_balance);
              const net = Number(row.net_balance);
              const same = gross === net;
              return (
                <div
                  key={`${row.investment_type}-${row.investment_subtype}`}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-t border-border items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getRowLabel(row)}</p>
                      {row.has_stale_data && row.oldest_balance_date && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 text-amber-600 border-amber-300">
                          Cota {formatDistanceToNow(new Date(row.oldest_balance_date), { addSuffix: true, locale: ptBR })} atrás
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(gross)}
                  </div>
                  <div className="text-right font-mono text-sm tabular-nums font-medium">
                    {same ? formatCurrency(net) : formatCurrency(net)}
                  </div>
                  <div className="text-right hidden sm:block">
                    {showSpread ? (
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        −{formatCurrency(Math.abs(spread))}
                        {row.total_taxes != null && Number(row.total_taxes) > 0 ? ' IR est.' : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalSuspectZero > 0 && (
            <Alert variant="default" className="mt-4 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>
                {totalSuspectZero} posição{totalSuspectZero > 1 ? 'ões' : ''} a confirmar
              </AlertTitle>
              <AlertDescription>
                A sincronização retornou {totalSuspectZero} ativo
                {totalSuspectZero > 1 ? 's' : ''} com saldo zero que podem ainda ter posição aberta no seu banco.
                Verifique diretamente no app da XP e adicione manualmente se necessário.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(summary as InvestmentSummary[]).map((s) => {
            const Icon = getTypeIcon(s.investment_type);
            const avgRate = s.avg_fixed_annual_rate ?? s.avg_annual_rate ?? null;
            const activeC = s.active_count ?? s.count;
            const showActiveWarning = activeC < s.count && s.count > 0;
            const totalTaxesVal = s.total_taxes != null ? Number(s.total_taxes) : 0;
            return (
              <Card key={s.investment_type} className="rounded-[14px] border border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{getTypeLabel(s.investment_type)}</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(Number(s.total_balance))}
                    </p>
                    {avgRate != null && Number(avgRate) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Taxa média: {formatPercent(avgRate)}
                      </p>
                    )}
                    <p className={cn('text-xs', showActiveWarning && 'text-amber-600 dark:text-amber-400')}>
                      {showActiveWarning ? `${activeC} de ${s.count} ativos` : `${s.count} item${s.count !== 1 ? 's' : ''}`}
                    </p>
                    {s.investment_type === 'FIXED_INCOME' && totalTaxesVal > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        IR/IOF: {formatCurrency(totalTaxesVal)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabela expandível */}
      <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
        <Card className="rounded-[14px] border border-border">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-t-[14px]"
            >
              <span className="font-medium text-sm">Lista completa de investimentos</span>
              {tableOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Filtro de status e ordenação */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </Button>
                {statusCounts.active > 0 && (
                  <Button
                    variant={statusFilter === 'ACTIVE' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setStatusFilter('ACTIVE')}
                  >
                    Ativos ({statusCounts.active})
                  </Button>
                )}
                {statusCounts.pending > 0 && (
                  <Button
                    variant={statusFilter === 'PENDING' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setStatusFilter('PENDING')}
                  >
                    Pendentes ({statusCounts.pending})
                  </Button>
                )}
                {statusCounts.closed > 0 && (
                  <Button
                    variant={statusFilter === 'TOTAL_WITHDRAWAL' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setStatusFilter('TOTAL_WITHDRAWAL')}
                  >
                    Encerrados ({statusCounts.closed})
                  </Button>
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground ml-2">Ordenar:</span>
              <Button
                variant={sortKey === 'balance' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortKey('balance')}
              >
                Saldo
              </Button>
              <Button
                variant={sortKey === 'due_date' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortKey('due_date')}
              >
                Vencimento
              </Button>
            </div>
            <div className="overflow-x-auto border-t border-border">
              <TooltipProvider>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Emissor</th>
                      <th className="text-right p-3 font-medium">Rendimento</th>
                      <th className="text-right p-3 font-medium">Vencimento</th>
                      <th className="text-right p-3 font-medium">Saldo</th>
                      <th className="text-right p-3 font-medium">IR/IOF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestments.map((inv) => {
                      const statusBadge = getInvestmentStatusBadge(inv.status);
                      const urgency = getDueDateUrgency(inv.due_date);
                      const rend = getRendimentoDisplay(inv);
                      const invTaxes = (inv.taxes ?? 0) + (inv.taxes2 ?? 0);
                      const showTaxesCol = inv.type === 'FIXED_INCOME';
                      return (
                        <tr key={inv.id} className="border-t border-border/50">
                          <td className="p-3 max-w-[180px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-foreground truncate">
                                  {inv.marketing_name ?? inv.name}
                                </span>
                                {statusBadge && (
                                  <Badge
                                    variant={statusBadge.variant === 'success' ? 'default' : statusBadge.variant === 'warning' ? 'secondary' : 'outline'}
                                    className={cn(
                                      'text-[10px]',
                                      statusBadge.variant === 'success' && 'bg-green-600',
                                      statusBadge.variant === 'warning' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
                                      statusBadge.variant === 'neutral' && 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {statusBadge.label}
                                  </Badge>
                                )}
                              </div>
                              {inv.code && (
                                <span className="font-mono text-xs text-muted-foreground">{inv.code}</span>
                              )}
                              {inv.isin ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[10px] text-muted-foreground cursor-help truncate block">ISIN: {inv.isin}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-mono text-xs">{inv.isin}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{getTypeLabel(inv.type)}</td>
                          <td className="p-3 text-muted-foreground truncate max-w-[100px]">{inv.issuer ?? '—'}</td>
                          <td className={cn('p-3 text-right font-mono tabular-nums text-xs', rend.className)}>
                            {rend.text}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-mono tabular-nums text-muted-foreground">
                                {formatDueDate(inv.due_date)}
                              </span>
                              {urgency && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    urgency.variant === 'danger' && 'border-red-500/50 text-red-600 dark:text-red-400',
                                    urgency.variant === 'warning' && 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                                  )}
                                >
                                  {urgency.label}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-medium tabular-nums text-foreground">
                                {formatCurrency(Number(inv.balance))}
                              </span>
                              {inv.amount_original != null && Number(inv.amount_original) !== Number(inv.balance) && (
                                <span className="text-xs text-muted-foreground">Investido: {formatCurrency(Number(inv.amount_original))}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {showTaxesCol ? (
                              invTaxes > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-xs tabular-nums text-red-600 dark:text-red-400 cursor-help">
                                      {formatCurrency(invTaxes)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Imposto de Renda estimado sobre o rendimento</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
