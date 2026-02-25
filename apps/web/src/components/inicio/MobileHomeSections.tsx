import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
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
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Resumo do Mês</CardTitle>
        <button onClick={() => navigate('/lancamentos')} className="text-xs text-primary flex items-center gap-0.5">
          Ver mais <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-income" /> Receitas
          </span>
          <span className="text-sm font-medium text-income">{fmt(summary.receitas)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-expense" /> Despesas
          </span>
          <span className="text-sm font-medium text-expense">{fmt(summary.despesas)}</span>
        </div>
        <div className="border-t pt-2 flex items-center justify-between">
          <span className="text-sm font-medium">Saldo</span>
          <span className={cn(
            "text-sm font-bold",
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Despesas do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Realizadas</span>
          <span className="text-sm font-medium">{fmt(stats.despesasRealizadas)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-warning" /> Em aberto
            {stats.qtdEmAberto > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{stats.qtdEmAberto}</Badge>
            )}
          </span>
          <span className="text-sm font-medium text-warning">{fmt(stats.despesasEmAberto)}</span>
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
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Cartão de Crédito
        </CardTitle>
        <button onClick={() => navigate('/cartao-credito')} className="text-xs text-primary flex items-center gap-0.5">
          Ver mais <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Fatura do mês</span>
          <span className="text-sm font-bold">{fmt(totalCartao)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Composição do Orçamento ────────────────────────────────

export const BudgetCompositionCard: React.FC = () => {
  const { isHidden } = useVisibility();
  const { lancamentos } = useLancamentosRealizados();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const treemapData: TreemapItem[] = useMemo(() => {
    const monthExpenses = lancamentos.filter(
      l => l.tipo === 'despesa' && l.mes_referencia === currentMonth && !isBillPaymentTransaction(l)
    );

    const byCategory = monthExpenses.reduce((acc, l) => {
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
  }, [lancamentos, currentMonth]);

  const fmt = (v: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  if (treemapData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Composição do Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InteractiveTreemap
          data={treemapData}
          formatValue={fmt}
          isHidden={isHidden}
          height={160}
          showLegend={true}
        />
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
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" /> Categorização Pendente
        </CardTitle>
        <button onClick={() => navigate('/lancamentos')} className="text-xs text-primary flex items-center gap-0.5">
          Categorizar <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
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
