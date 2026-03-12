import React, { useState, useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { usePatrimonyProjection } from '@/hooks/usePatrimonyProjection';
import { PatrimonyMonthlyTable } from '@/components/planejamento/PatrimonyMonthlyTable';
import { MonthlyOverviewTable } from '@/components/planejamento/MonthlyOverviewTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, DollarSign, Building2,
  ChevronLeft, ChevronRight, CheckCircle2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrencyBase = (value: number): string => {
  if (value === 0) return '–';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const generateMonthsForYear = (year: number): string[] =>
  Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  );

// Índices históricos para cálculo do projectionRate (IPCA últimos 5 anos)
const HISTORICAL_IPCA: number[] = [4.83, 4.62, 5.79, 10.06, 4.31]; // 2024→2020
const DEFAULT_PROJECTION_RATE = HISTORICAL_IPCA.reduce((a, b) => a + b, 0) / HISTORICAL_IPCA.length + 2; // média + spread 2%

// ─── Componente ───────────────────────────────────────────────────────────────

export const PlanoAnualTab: React.FC = () => {
  const { config, getMonthlyEntry } = useFinancial();
  const { isHidden } = useVisibility();
  const { getLancamentosByMonth, isMonthConsolidated } = useLancamentosRealizados();

  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Ano selecionado na guia
  const [selectedYear, setSelectedYear] = useState<number>(
    currentYear >= 2026 ? currentYear : 2026
  );

  const months = useMemo(() => generateMonthsForYear(selectedYear), [selectedYear]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return formatCurrencyBase(value);
  };

  // ─── Projeção patrimonial ─────────────────────────────────────────

  const getManualEntry = (month: string, assetId: string): number | undefined => {
    const entry = config.assetMonthlyEntries?.find(
      e => e.month === month && e.assetId === assetId
    );
    return entry?.value;
  };

  const patrimonyProjection = usePatrimonyProjection({
    assets: config.assets,
    getManualEntry,
    projectionRate: DEFAULT_PROJECTION_RATE,
    currentMonth,
  });

  // ─── Totais mensais de receita/despesa ────────────────────────────

  const enabledIncomeItems = config.incomeItems.filter(i => i.enabled);
  const enabledExpenseItems = config.expenseItems.filter(i => i.enabled);

  const getMonthlyIncome = (month: string): number => {
    if (isMonthConsolidated(month)) {
      return getLancamentosByMonth(month)
        .filter(l => l.tipo === 'receita')
        .reduce((sum, l) => sum + (l.valor_realizado ?? 0), 0);
    }
    return enabledIncomeItems.reduce((sum, item) => {
      const val = getMonthlyEntry(month, item.id, 'income');
      return sum + (val === 0 && item.isAssetGenerated && item.defaultValue ? item.defaultValue : val);
    }, 0);
  };

  const getMonthlyExpense = (month: string): number => {
    if (isMonthConsolidated(month)) {
      return getLancamentosByMonth(month)
        .filter(l => l.tipo === 'despesa' && !isBillPaymentTransaction(l))
        .reduce((sum, l) => sum + (l.valor_realizado ?? 0), 0);
    }
    return enabledExpenseItems.reduce((sum, item) => {
      const val = getMonthlyEntry(month, item.id, 'expense');
      if (val === 0 && item.isAssetGenerated && item.defaultValue) {
        if (item.frequency === 'annual' && item.annualMonths) {
          const monthNum = parseInt(month.split('-')[1]);
          return sum + (item.annualMonths.includes(monthNum) ? item.defaultValue : 0);
        }
        return sum + item.defaultValue;
      }
      return sum + val;
    }, 0);
  };

  const getMonthlyTotals = (month: string) => {
    const income = getMonthlyIncome(month);
    const expense = getMonthlyExpense(month);
    return { income, expense, balance: income - expense };
  };

  // ─── Cards de resumo anual ────────────────────────────────────────

  const annualTotals = useMemo(() => {
    let income = 0, expense = 0;
    for (const m of months) {
      income += getMonthlyIncome(m);
      expense += getMonthlyExpense(m);
    }
    const lastMonth = months[months.length - 1];
    const patrimony = patrimonyProjection.getMonthlyTotals(lastMonth).grandTotal;
    return { income, expense, balance: income - expense, patrimony };
  }, [months, selectedYear]);

  // Status de consolidação do ano
  const consolidatedMonths = months.filter(m => isMonthConsolidated(m)).length;
  const consolidationLabel =
    consolidatedMonths === 12 ? 'Fechado' :
    consolidatedMonths > 0 ? `${consolidatedMonths}/12 meses` :
    'Projetado';

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Seletor de ano ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => setSelectedYear(y => Math.max(2026, y - 1))}
          disabled={selectedYear <= 2026}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={selectedYear.toString()}
          onValueChange={v => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-28 h-8 text-sm font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2026, 2027].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => setSelectedYear(y => Math.min(2027, y + 1))}
          disabled={selectedYear >= 2027}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            consolidatedMonths === 12 && 'border-income text-income',
            consolidatedMonths > 0 && consolidatedMonths < 12 && 'border-amber-400 text-amber-600',
            consolidatedMonths === 0 && 'border-muted-foreground text-muted-foreground',
          )}
        >
          {consolidatedMonths === 12
            ? <><CheckCircle2 className="h-3 w-3 mr-1" />{consolidationLabel}</>
            : <><Clock className="h-3 w-3 mr-1" />{consolidationLabel}</>}
        </Badge>
      </div>

      {/* ── Cards de resumo ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-income/10 border-income/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-income/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-income" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Receitas {selectedYear}</p>
              <p className="text-sm font-bold text-income truncate">
                {formatCurrency(annualTotals.income)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-expense/10 border-expense/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-expense/20 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Despesas {selectedYear}</p>
              <p className="text-sm font-bold text-expense truncate">
                {formatCurrency(annualTotals.expense)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'border',
          annualTotals.balance >= 0 ? 'bg-income/5 border-income/20' : 'bg-expense/5 border-expense/20'
        )}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
              annualTotals.balance >= 0 ? 'bg-income/20' : 'bg-expense/20'
            )}>
              <DollarSign className={cn('h-4 w-4', annualTotals.balance >= 0 ? 'text-income' : 'text-expense')} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Saldo {selectedYear}</p>
              <p className={cn('text-sm font-bold truncate', annualTotals.balance >= 0 ? 'text-income' : 'text-expense')}>
                {formatCurrency(annualTotals.balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Patrimônio dez/{selectedYear}</p>
              <p className="text-sm font-bold text-primary truncate">
                {formatCurrency(annualTotals.patrimony)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabela de Patrimônio ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Evolução Patrimonial — {selectedYear}
          </CardTitle>
          <CardDescription className="text-xs">
            Projeção mês a mês. Clique na categoria para expandir os ativos.
            Veículos depreciam; imóveis e investimentos valorizam.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-4 sm:pb-4 overflow-hidden">
          <PatrimonyMonthlyTable
            assets={config.assets}
            months={months}
            currentMonth={currentMonth}
            getAssetMonthlyValue={patrimonyProjection.getAssetMonthlyValue}
            getMonthlyTotals={patrimonyProjection.getMonthlyTotals}
            formatCurrency={formatCurrencyBase}
            isHidden={isHidden}
          />
        </CardContent>
      </Card>

      {/* ── Tabela de Receitas e Despesas ─────────────────────────── */}
      <MonthlyOverviewTable
        months={months}
        currentMonth={currentMonth}
        getMonthlyTotals={getMonthlyTotals}
        formatCurrency={formatCurrencyBase}
        isMonthConsolidated={isMonthConsolidated}
        isHidden={isHidden}
      />

      {/* ── Nota sobre projeções ──────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <strong className="text-primary">Sobre as projeções: </strong>
          Veículos usam depreciação linear baseada em compra → valor atual.
          Imóveis: interpolação proporcional.
          Investimentos: taxa IPCA 5a ({DEFAULT_PROJECTION_RATE.toFixed(1)}% a.a.).
          Meses com lançamentos consolidados exibem valores reais.
        </CardContent>
      </Card>
    </div>
  );
};
