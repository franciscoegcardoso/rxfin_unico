import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { useIsMobile } from '@/hooks/use-mobile';
import { InteractiveTreemap, TreemapItem } from '@/components/charts/InteractiveTreemap';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Resumo do Mês ──────────────────────────────────────────

export const MonthSummaryCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { lancamentos } = useLancamentosRealizados();
  const navigate = useNavigate();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const summary = useMemo(() => {
    const monthItems = lancamentos.filter(l => l.mes_referencia === currentMonth && !isBillPaymentTransaction(l));
    const receitas = monthItems.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor_realizado, 0);
    const despesas = monthItems.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor_realizado, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [lancamentos, currentMonth]);

  const fmt = (v: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between p-3 sm:p-4">
        <CardTitle className="text-base">Resumo do Mês</CardTitle>
        <button onClick={() => navigate('/movimentacoes/extrato')} className="text-xs text-primary flex items-center gap-0.5">
          Ver mais <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2.5 p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0"><TrendingUp className="h-3.5 w-3.5 text-income" /> Receitas</span>
          <span className="text-sm font-medium text-income truncate tabular-nums">{fmt(summary.receitas)}</span>
        </div>
        <div className="flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-2 shrink-0"><TrendingDown className="h-3.5 w-3.5 text-expense" /> Despesas</span>
          <span className="text-sm font-medium text-expense truncate tabular-nums">{fmt(summary.despesas)}</span>
        </div>
        <div className="border-t border-border pt-2 flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm font-medium shrink-0">Saldo</span>
          <span className={cn(
            "text-sm font-bold truncate tabular-nums",
            summary.saldo >= 0 ? "text-income" : "text-expense"
          )}>
            {fmt(summary.saldo)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Despesas Realizadas / Em Aberto ────────────────────────

export const ExpensesStatusCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { lancamentos } = useLancamentosRealizados();
  const { contas } = useContasPagarReceber();
  const navigate = useNavigate();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const stats = useMemo(() => {
    const despesasRealizadas = lancamentos
      .filter(l => l.tipo === 'despesa' && l.mes_referencia === currentMonth && !isBillPaymentTransaction(l))
      .reduce((s, l) => s + l.valor_realizado, 0);

    // Contas a pagar do mês sem data de pagamento
    const contasMes = contas.filter(c => {
      const venc = c.dataVencimento?.slice(0, 7);
      return c.tipo === 'pagar' && venc === currentMonth && !c.dataPagamento;
    });
    const despesasEmAberto = contasMes.reduce((s, c) => s + c.valor, 0);
    const qtdEmAberto = contasMes.length;

    return { despesasRealizadas, despesasEmAberto, qtdEmAberto };
  }, [lancamentos, contas, currentMonth]);

  const fmt = (v: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <Card>
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-base">Despesas do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Realizadas</span>
          <span className="text-sm font-medium truncate tabular-nums">{fmt(stats.despesasRealizadas)}</span>
        </div>
        <div className="flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5 text-warning" /> Em aberto
            {stats.qtdEmAberto > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.qtdEmAberto}</Badge>
            )}
          </span>
          <span className="text-sm font-medium text-warning truncate tabular-nums">{fmt(stats.despesasEmAberto)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Gastos Cartão de Crédito ───────────────────────────────

export const CreditCardSpendingCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { bills } = useCreditCardBills();
  const navigate = useNavigate();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const totalCartao = useMemo(() => {
    return bills
      .filter(b => b.billing_month?.slice(0, 7) === currentMonth || b.due_date?.slice(0, 7) === currentMonth)
      .reduce((s, b) => s + b.total_value, 0);
  }, [bills, currentMonth]);

  const fmt = (v: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between p-3 sm:p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Cartão de Crédito
        </CardTitle>
        <button onClick={() => navigate('/movimentacoes/cartao-credito')} className="text-xs text-primary flex items-center gap-0.5 shrink-0">
          Ver mais <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Fatura do mês</span>
          <span className="text-sm font-bold truncate tabular-nums">{fmt(totalCartao)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Composição de gastos ───────────────────────────────────

const BUDGET_COMPOSITION_PERIODS = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'last_2', label: 'Últimos 2 meses' },
  { value: 'last_6', label: 'Últimos 6 meses' },
  { value: 'last_12', label: 'Últimos 12 meses' },
] as const;

type BudgetCompositionPeriod = (typeof BUDGET_COMPOSITION_PERIODS)[number]['value'];

function getMonthKeysForPeriod(period: BudgetCompositionPeriod): string[] {
  const now = new Date();
  const keys: string[] = [];
  if (period === 'this_month') {
    keys.push(format(now, 'yyyy-MM'));
  } else if (period === 'last_month') {
    keys.push(format(subMonths(now, 1), 'yyyy-MM'));
  } else {
    const n = period === 'last_2' ? 2 : period === 'last_6' ? 6 : 12;
    for (let i = n - 1; i >= 0; i--) {
      keys.push(format(subMonths(now, i), 'yyyy-MM'));
    }
  }
  return keys;
}

export const BudgetCompositionCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { lancamentos } = useLancamentosRealizados();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<BudgetCompositionPeriod>('this_month');

  const allowedMonths = useMemo(() => getMonthKeysForPeriod(period), [period]);

  const treemapData: TreemapItem[] = useMemo(() => {
    const periodExpenses = lancamentos.filter(
      l =>
        l.tipo === 'despesa' &&
        allowedMonths.includes(l.mes_referencia) &&
        !isBillPaymentTransaction(l)
    );

    const byCategory = periodExpenses.reduce((acc, l) => {
      const cat = l.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + l.valor_realizado;
      return acc;
    }, {} as Record<string, number>);

    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        id: name.toLowerCase().replace(/\s/g, '-'),
        name,
        value,
        color: colors[i % colors.length],
      }));
  }, [lancamentos, allowedMonths]);

  const fmt = (v: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="pb-2 p-3 sm:p-4 shrink-0 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Composição de gastos
        </CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v as BudgetCompositionPeriod)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_COMPOSITION_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 flex-1 min-h-0">
        {treemapData.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground py-8">
            Nenhum gasto no período
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <InteractiveTreemap
              data={treemapData}
              formatValue={fmt}
              isHidden={isHidden}
              height={isMobile ? 192 : 256}
              showLegend={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Categorização Pendente ─────────────────────────────────

export const PendingCategorizationCard: React.FC = () => {
  const { lancamentos } = useLancamentosRealizados();
  const navigate = useNavigate();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const pendingItems = useMemo(() => {
    // Lançamentos (receitas e despesas) sem categoria confirmada
    const uncategorized = lancamentos
      .filter(l => l.mes_referencia === currentMonth && !l.is_category_confirmed && !isBillPaymentTransaction(l))
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        name: l.nome,
        value: l.valor_realizado,
        type: l.tipo as 'receita' | 'despesa',
        source: 'lancamento' as const,
      }));

    return uncategorized;
  }, [lancamentos, currentMonth]);

  if (pendingItems.length === 0) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between p-3 sm:p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" /> Categorização Pendente
        </CardTitle>
        <button onClick={() => navigate('/movimentacoes/extrato')} className="text-xs text-primary flex items-center gap-0.5 shrink-0">
          Categorizar <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
        {pendingItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 shrink-0",
                  item.type === 'receita' ? "border-income/30 text-income" : "border-expense/30 text-expense"
                )}
              >
                {item.type === 'receita' ? 'Rec' : 'Desp'}
              </Badge>
              <span className="text-sm truncate">{item.name}</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{fmt(item.value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
