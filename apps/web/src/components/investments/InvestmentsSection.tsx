import React, { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePluggyInvestments, type PluggyInvestment, type InvestmentSummary } from '@/hooks/usePluggyInvestments';
import { formatCurrency } from '@/lib/utils';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  MUTUAL_FUND: { label: 'Fundos', icon: TrendingUp },
  FIXED_INCOME: { label: 'Renda Fixa', icon: ShieldCheck },
  TREASURE: { label: 'Tesouro Direto', icon: Landmark },
  STOCK: { label: 'Ações', icon: BarChart2 },
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

function getTypeLabel(type: string): string {
  return TYPE_CONFIG[type]?.label ?? type;
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

export const InvestmentsSection: React.FC = () => {
  const { investments, summary, totalBalance, loading, error, hasSyncedData, refetch } = usePluggyInvestments();
  const [syncing, setSyncing] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const latestUpdatedAt = useMemo(() => {
    const dates = investments
      .map((i) => i.balance_updated_at)
      .filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  }, [investments]);

  const showStaleBanner = hasSyncedData && isStale(latestUpdatedAt);

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

      {/* Card total */}
      <Card className="rounded-[14px] border border-border">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total em investimentos</p>
            <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-foreground mt-0.5">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-normal">
            {getUpdatedLabel(latestUpdatedAt)}
          </Badge>
        </CardContent>
      </Card>

      {/* Grid por tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(summary as InvestmentSummary[]).map((s) => {
          const Icon = getTypeIcon(s.investment_type);
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
                  <p className="text-xs text-muted-foreground">{s.count} item{s.count !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Emissor</th>
                    <th className="text-right p-3 font-medium">Taxa (% a.a.)</th>
                    <th className="text-right p-3 font-medium">Vencimento</th>
                    <th className="text-right p-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(investments as PluggyInvestment[]).map((inv) => (
                    <tr key={inv.id} className="border-t border-border/50">
                      <td className="p-3 font-medium text-foreground truncate max-w-[140px]">{inv.name}</td>
                      <td className="p-3 text-muted-foreground">{getTypeLabel(inv.type)}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[100px]">{inv.issuer ?? '—'}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                        {formatPercent(inv.fixed_annual_rate ?? inv.rate)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted-foreground">
                        {formatDueDate(inv.due_date)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium tabular-nums text-foreground">
                        {formatCurrency(Number(inv.balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
