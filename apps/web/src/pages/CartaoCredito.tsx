import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CartaoCreditoSection } from '@/components/planejamento/CartaoCreditoSection';
import { CreditCardBillView } from '@/components/cards/CreditCardBillView';
import { MonthSelector } from '@/components/lancamentos/MonthSelector';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle2, Clock, ChevronRight, Search, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreditCardDashboard } from '@/hooks/useCreditCardDashboard';
import { useCreditCardTransactions, type CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { useConsolidarEstabelecimentos } from '@/hooks/useConsolidarEstabelecimentos';
import { useFinancial } from '@/contexts/FinancialContext';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CategoryAssignmentDialog } from '@/components/shared/CategoryAssignmentDialog';
import { financialInstitutions, expenseCategories } from '@/data/defaultData';
import { supabase } from '@/integrations/supabase/client';
import { PeriodFilterControls, type PeriodPreset } from '@/components/lancamentos/PeriodFilterControls';

interface BillRow {
  id?: string;
  card_id?: string;
  card_name?: string | null;
  status?: string;
  total_value?: number;
  paid_amount?: number | null;
  due_date?: string;
  closing_date?: string;
  is_overdue?: boolean;
  days_until_due?: number;
  billing_month?: string;
  transaction_count?: number;
  top_categories?: unknown[];
}

interface TransactionRow {
  id?: string;
  store_name?: string;
  value?: number;
  date?: string;
  transaction_date?: string;
  card_id?: string;
  category?: string;
  installment?: number | null;
}

type DashboardData = {
  month?: string;
  totals?: { bill_count?: number; total_paid?: number; total_bills?: number };
  summary?: { total_bills?: number; total_paid?: number; total_pending?: number };
  bills?: BillRow[];
  recent_transactions?: TransactionRow[];
  transactions?: TransactionRow[];
};

interface CartaoCreditoProps {
  embedded?: boolean;
}

/** Exibição legível do cartão: banco, bandeira e 4 últimos dígitos */
function getCardDisplayLabel(
  cardId: string | undefined,
  config: { financialInstitutions: Array<{ id: string; institutionId: string; customName?: string; creditCardBrand?: string }> },
  pluggyMap: Record<string, { bank: string; brand: string; last4: string }>
): string {
  if (!cardId) return '—';
  const pluggy = pluggyMap[cardId];
  if (pluggy) {
    const parts = [pluggy.bank, pluggy.brand].filter(Boolean);
    if (pluggy.last4) parts.push(`•••• ${pluggy.last4}`);
    return parts.length > 0 ? parts.join(' · ') : cardId;
  }
  const fi = config.financialInstitutions.find((f) => f.id === cardId);
  if (fi) {
    const institution = financialInstitutions.find((i) => i.id === fi.institutionId);
    const bank = fi.customName || institution?.name || 'Cartão';
    const brand = fi.creditCardBrand || '';
    const parts = [bank, brand].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : bank;
  }
  return cardId;
}

const TODOS_CARTAO_PAGE_SIZE = 50;

function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastNMonthsSet(ym: string, n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < n; i++) {
    set.add(shiftYearMonth(ym, -i));
  }
  return set;
}

function txRefMonth(tx: CreditCardTransaction): string {
  if (tx.reference_month && tx.reference_month.length === 7) return tx.reference_month;
  const d = tx.transaction_date?.slice(0, 10);
  if (d) return `${d.slice(0, 4)}-${d.slice(5, 7)}`;
  return '';
}

function txDateKey(tx: CreditCardTransaction): string {
  return (tx.transaction_date || '').slice(0, 10);
}

function getGrupoCartao(tx: CreditCardTransaction): string {
  if (tx.category_id) {
    const ec = expenseCategories.find((c) => c.id === tx.category_id);
    if (ec) return ec.name;
  }
  return '—';
}

const CartaoCredito: React.FC<CartaoCreditoProps> = ({ embedded = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [todasTransacoesDialogOpen, setTodasTransacoesDialogOpen] = useState(false);
  const [todosDialogPeriod, setTodosDialogPeriod] = useState<PeriodPreset>('thisMonth');
  const [todosDialogCustomFrom, setTodosDialogCustomFrom] = useState('');
  const [todosDialogCustomTo, setTodosDialogCustomTo] = useState('');
  const [todosDialogSearch, setTodosDialogSearch] = useState('');
  const [todosDialogCategory, setTodosDialogCategory] = useState<string>('all');
  const [todosDialogPage, setTodosDialogPage] = useState(0);
  const [categoriasDialogOpen, setCategoriasDialogOpen] = useState(false);
  const [visaoMensalDialogOpen, setVisaoMensalDialogOpen] = useState(false);
  const [gestaoFaturasDialogOpen, setGestaoFaturasDialogOpen] = useState(false);
  const [comprasRecorrentesDialogOpen, setComprasRecorrentesDialogOpen] = useState(false);
  const [projecaoParcelasDialogOpen, setProjecaoParcelasDialogOpen] = useState(false);
  const { config } = useFinancial();
  const [pluggyCardDisplay, setPluggyCardDisplay] = useState<Record<string, { bank: string; brand: string; last4: string }>>({});
  const { data, loading, error } = useCreditCardDashboard(selectedMonth);
  const { transactions: allTransactions } = useCreditCardTransactions(selectedMonth);
  const { transactions: allTransactionsGlobal = [] } = useCreditCardTransactions(undefined);
  const { data: consolidarData = [] } = useConsolidarEstabelecimentos('card');
  const dashboard = data as DashboardData | null;

  useEffect(() => {
    const fetchPluggyCards = async () => {
      const { data: accounts } = await supabase
        .from('pluggy_accounts')
        .select('id, number, card_brand, connection_id')
        .eq('type', 'CREDIT')
        .is('deleted_at', null);
      if (!accounts?.length) return;
      const connIds = [...new Set(accounts.map((a) => a.connection_id))];
      const { data: conns } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name')
        .in('id', connIds)
        .is('deleted_at', null);
      const connMap = new Map((conns || []).map((c) => [c.id, c]));
      const map: Record<string, { bank: string; brand: string; last4: string }> = {};
      accounts.forEach((a) => {
        const conn = connMap.get(a.connection_id);
        const number = (a.number as string) || '';
        map[a.id] = {
          bank: conn?.connector_name || '',
          brand: (a.card_brand as string) || '',
          last4: number.length >= 4 ? number.slice(-4) : number,
        };
      });
      setPluggyCardDisplay(map);
    };
    fetchPluggyCards();
  }, []);

  const uniqueStoresCount = useMemo(
    () => consolidarData.filter((r) => r.total_pendentes > 0).length,
    [consolidarData]
  );

  const pendentesCartao = useMemo(() => {
    return allTransactions.filter(
      (t) => t.transaction_date?.startsWith(selectedMonth) && !t.is_category_confirmed
    ).length;
  }, [allTransactions, selectedMonth]);

  const totals = dashboard?.totals ?? dashboard?.summary;
  const totalBills = totals?.total_bills ?? 0;
  const totalPaid = totals?.total_paid ?? 0;
  const pending = totalBills - totalPaid;
  const bills = dashboard?.bills ?? [];
  const cartoesAtivos = useMemo(
    () => new Set(bills.map((b) => b.card_id).filter(Boolean)).size,
    [bills]
  );
  const recentTransactions = (dashboard?.recent_transactions ?? dashboard?.transactions ?? []) as TransactionRow[];

  const todosDialogPeriodFiltered = useMemo(() => {
    const list = allTransactionsGlobal;
    if (!list.length) return [];
    if (todosDialogPeriod === 'thisMonth') {
      return list.filter((t) => txRefMonth(t) === selectedMonth);
    }
    if (todosDialogPeriod === 'lastMonth') {
      const m = shiftYearMonth(selectedMonth, -1);
      return list.filter((t) => txRefMonth(t) === m);
    }
    if (todosDialogPeriod === 'last3Months') {
      const months = lastNMonthsSet(selectedMonth, 3);
      return list.filter((t) => months.has(txRefMonth(t)));
    }
    if (todosDialogPeriod === 'custom' && todosDialogCustomFrom && todosDialogCustomTo) {
      return list.filter((t) => {
        const d = txDateKey(t);
        return d >= todosDialogCustomFrom && d <= todosDialogCustomTo;
      });
    }
    return list;
  }, [
    allTransactionsGlobal,
    todosDialogPeriod,
    selectedMonth,
    todosDialogCustomFrom,
    todosDialogCustomTo,
  ]);

  const todosDialogFiltered = useMemo(() => {
    let rows = todosDialogPeriodFiltered;
    if (todosDialogCategory !== 'all') {
      rows = rows.filter((t) => (t.category || '') === todosDialogCategory);
    }
    if (todosDialogSearch.trim()) {
      const q = todosDialogSearch.trim().toLowerCase();
      rows = rows.filter(
        (t) =>
          (t.store_name || '').toLowerCase().includes(q) ||
          (t.friendly_name && t.friendly_name.toLowerCase().includes(q)) ||
          (t.category || '').toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) =>
      (b.transaction_date || '').localeCompare(a.transaction_date || '')
    );
  }, [todosDialogPeriodFiltered, todosDialogCategory, todosDialogSearch]);

  const todosDialogTotalCount = todosDialogFiltered.length;
  const todosDialogTotalPages = Math.max(1, Math.ceil(todosDialogTotalCount / TODOS_CARTAO_PAGE_SIZE));

  const todosDialogPagedRows = useMemo(() => {
    const from = todosDialogPage * TODOS_CARTAO_PAGE_SIZE;
    return todosDialogFiltered.slice(from, from + TODOS_CARTAO_PAGE_SIZE);
  }, [todosDialogFiltered, todosDialogPage]);

  const todosDialogCategoryOptions = useMemo(() => {
    const s = new Set<string>();
    todosDialogPeriodFiltered.forEach((t) => {
      if (t.category) s.add(t.category);
    });
    return Array.from(s).sort();
  }, [todosDialogPeriodFiltered]);

  useEffect(() => {
    setTodosDialogPage(0);
  }, [
    todosDialogPeriod,
    todosDialogCustomFrom,
    todosDialogCustomTo,
    todosDialogSearch,
    todosDialogCategory,
    selectedMonth,
  ]);

  useEffect(() => {
    if (todosDialogPage >= todosDialogTotalPages) {
      setTodosDialogPage(Math.max(0, todosDialogTotalPages - 1));
    }
  }, [todosDialogPage, todosDialogTotalPages]);

  const sortedTransactions = [...recentTransactions]
    .sort((a, b) => {
      const dA = a.date ?? a.transaction_date ?? '';
      const dB = b.date ?? b.transaction_date ?? '';
      return dB.localeCompare(dA);
    })
    .slice(0, 10);
  const isEmpty = bills.length === 0 && sortedTransactions.length === 0;

  const getStatusBadge = (bill: BillRow) => {
    const status = bill.status ?? '';
    const isOverdue = bill.is_overdue === true;
    if (status === 'paid') {
      return <Badge className="bg-green-600 text-white border-0 hover:bg-green-600">Paga</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Em aberto</Badge>;
  };

  const getDueText = (bill: BillRow) => {
    const days = bill.days_until_due;
    if (days == null) {
      if (bill.due_date) {
        return `Vence em ${format(new Date(bill.due_date), 'dd/MM')}`;
      }
      return '';
    }
    if (days < 0) return `Venceu há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`;
    if (days === 0) return 'Vence hoje';
    return `Vence em ${days} dia${days !== 1 ? 's' : ''}`;
  };

  const content = (
      <div className="flex flex-col min-h-full bg-[hsl(var(--color-surface-base))]">
        <div
          className={cn(
            'content-zone space-y-5 flex-1',
            embedded ? 'py-4 md:py-5 px-4 md:px-6 flex-1 min-h-0 overflow-y-auto' : 'py-5 md:py-6'
          )}
        >
        {!embedded && (
        <PageHeader
          icon={CreditCard}
          title="Cartão de Crédito"
          subtitle="Faturas, lançamentos e sincronização"
        />
        )}

        {/* Sticky: seletor de período + KPIs (paridade com extrato) */}
        <div className="sticky top-0 z-10 bg-background border-b border-border -mx-4 px-4 md:-mx-6 md:px-6">
          <div className="py-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Período</Label>
            <div className="mt-1.5">
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-0 py-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total faturas</p>
              <p className="text-lg font-semibold tabular-nums">
                {loading ? '—' : formatCurrency(totalBills)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total pago</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {loading ? '—' : formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-semibold text-destructive tabular-nums">
                {loading ? '—' : formatCurrency(pending)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cartões ativos</p>
              <p className="text-lg font-semibold tabular-nums">
                {loading ? '—' : cartoesAtivos}
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando...</span>
          </div>
        )}
        {error && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Lista única de ações (benchmark: extrato — Ver todos, Atribuir categorias, etc.) */}
            <div className="flex flex-col gap-1 py-1 border border-border rounded-xl px-3 py-3 bg-card">
              {allTransactionsGlobal.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTodasTransacoesDialogOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  <span className="text-primary font-medium">›</span>
                  Ver todas as transações ({allTransactionsGlobal.length})
                </button>
              )}
              {pendentesCartao > 0 ? (
                <button
                  type="button"
                  onClick={() => setCategoriasDialogOpen(true)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <span>⚠️</span>
                        {pendentesCartao} lançamentos sem categoria
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        {uniqueStoresCount} estabelecimentos únicos · resolva de uma vez →
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCategoriasDialogOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  <span className="text-primary font-medium">›</span>
                  Atribuir categorias às transações
                </button>
              )}
              <button
                type="button"
                onClick={() => setVisaoMensalDialogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <span className="text-primary font-medium">›</span>
                Visão Mensal de Faturas
              </button>
              <button
                type="button"
                onClick={() => setGestaoFaturasDialogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <span className="text-primary font-medium">›</span>
                Gestão de Faturas
              </button>
              <button
                type="button"
                onClick={() => setComprasRecorrentesDialogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <span className="text-primary font-medium">›</span>
                Compras Recorrentes
              </button>
              <button
                type="button"
                onClick={() => setProjecaoParcelasDialogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <span className="text-primary font-medium">›</span>
                Projeção de Parcelas Futuras
              </button>
            </div>

            <CartaoCreditoSection
              visaoMensalDialogOpen={visaoMensalDialogOpen}
              onVisaoMensalDialogOpenChange={setVisaoMensalDialogOpen}
              gestaoFaturasDialogOpen={gestaoFaturasDialogOpen}
              onGestaoFaturasDialogOpenChange={setGestaoFaturasDialogOpen}
              comprasRecorrentesDialogOpen={comprasRecorrentesDialogOpen}
              onComprasRecorrentesDialogOpenChange={setComprasRecorrentesDialogOpen}
              projecaoParcelasDialogOpen={projecaoParcelasDialogOpen}
              onProjecaoParcelasDialogOpenChange={setProjecaoParcelasDialogOpen}
            />

            {/* Visão de fatura consolidada (RPC get_credit_card_bills_detail) */}
            <CreditCardBillView showSummaryRow />

            {/* B) Faturas do mês */}
            {bills.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Faturas do mês</h2>
                <div className="space-y-3">
                  {bills.map((bill, i) => {
                    const total = bill.total_value ?? 0;
                    const paid = Number(bill.paid_amount ?? 0);
                    const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                    return (
                      <Card key={bill.id ?? i} className="rounded-[14px] border border-border/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">{bill.card_name ?? 'Cartão'}</p>
                          {getStatusBadge(bill)}
                        </div>
                        <p className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums">{formatCurrency(total)}</p>
                        <Progress value={pct} className="mt-2 h-2" />
                        <p className="mt-2 text-sm text-muted-foreground">{getDueText(bill)}</p>
                        {bill.status !== 'paid' && (
                          <Button variant="outline" size="sm" className="mt-3 min-h-[44px] touch-manipulation w-full sm:w-auto" disabled>
                            Registrar pagamento
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Dialog "Todas as transações" aberto pelo CTA */}
            {allTransactionsGlobal.length > 0 && (
              <Dialog open={todasTransacoesDialogOpen} onOpenChange={setTodasTransacoesDialogOpen}>
                <DialogContent className="max-w-[min(96rem,calc(100vw-1.5rem))] w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                  <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      Todas as transações ({todosDialogTotalCount})
                    </DialogTitle>
                  </DialogHeader>
                  <div className="shrink-0 px-6 pb-3 flex flex-col gap-3 border-b border-border/80">
                    <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
                      <PeriodFilterControls
                        className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end"
                        value={todosDialogPeriod}
                        onChange={setTodosDialogPeriod}
                        customFrom={todosDialogCustomFrom}
                        customTo={todosDialogCustomTo}
                        onCustomFromChange={setTodosDialogCustomFrom}
                        onCustomToChange={setTodosDialogCustomTo}
                      />
                      <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground">Buscar</Label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Nome do lançamento…"
                            value={todosDialogSearch}
                            onChange={(e) => setTodosDialogSearch(e.target.value)}
                            className="h-9 pl-9"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-[180px]">
                        <Label className="text-xs text-muted-foreground">Categoria</Label>
                        <Select value={todosDialogCategory} onValueChange={setTodosDialogCategory}>
                          <SelectTrigger className="h-9 bg-background">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {todosDialogCategoryOptions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
                    {todosDialogTotalCount > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/80 mb-2">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Página {todosDialogPage + 1} de {todosDialogTotalPages} ({todosDialogTotalCount} registro
                          {todosDialogTotalCount !== 1 ? 's' : ''})
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTodosDialogPage((p) => Math.max(0, p - 1))}
                            disabled={todosDialogPage === 0}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTodosDialogPage((p) => Math.min(todosDialogTotalPages - 1, p + 1))}
                            disabled={todosDialogPage >= todosDialogTotalPages - 1}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                    {todosDialogFiltered.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma transação com os filtros atuais.</p>
                    ) : (
                      <>
                        <div className="md:hidden space-y-3">
                          {todosDialogFiltered.map((tx, i) => {
                            const dateStr = tx.transaction_date ?? '';
                            const dateFormatted = dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : '—';
                            return (
                              <Card key={tx.id ?? i} className="rounded-[14px] border border-border/80 p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">{tx.store_name ?? '—'}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      {getGrupoCartao(tx)} · {tx.category ?? '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{dateFormatted}</p>
                                    {tx.card_id && (
                                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 truncate flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                        {getCardDisplayLabel(tx.card_id, config, pluggyCardDisplay)}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold text-foreground shrink-0 tabular-nums whitespace-nowrap">{formatCurrency(tx.value ?? 0)}</p>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                        <Card className="hidden md:block rounded-[14px] border border-border/80 overflow-hidden">
                          <div className="overflow-x-auto min-w-0">
                            <table className="w-full min-w-[960px] text-sm">
                              <thead>
                                <tr className="border-b border-border/80 bg-muted/30">
                                  <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide w-[140px]">Cartão</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide max-w-[140px]">Grupo</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide max-w-[160px]">Categoria</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide max-w-[140px]">Data</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-wide min-w-[200px]">Estabelecimento</th>
                                  <th className="px-3 py-2.5 text-right font-medium text-[10px] uppercase tracking-wide">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {todosDialogPagedRows.map((tx, i) => {
                                  const dateStr = tx.transaction_date ?? '';
                                  const dateFormatted = dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : '—';
                                  return (
                                    <tr
                                      key={tx.id ?? i}
                                      className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                                    >
                                      <td className="px-3 py-2.5 align-middle">
                                        <div className="flex items-center gap-2 min-w-0 max-w-[140px]">
                                          <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                          </div>
                                          <span className="text-xs truncate" title={getCardDisplayLabel(tx.card_id, config, pluggyCardDisplay)}>
                                            {getCardDisplayLabel(tx.card_id, config, pluggyCardDisplay)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]" title={getGrupoCartao(tx)}>
                                        {getGrupoCartao(tx)}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs truncate max-w-[160px]">{tx.category ?? '—'}</td>
                                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{dateFormatted}</td>
                                      <td className="px-3 py-2.5 font-medium max-w-[280px] truncate" title={tx.store_name ?? undefined}>{tx.store_name ?? '—'}</td>
                                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(tx.value ?? 0)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {!loading && !error && bills.length === 0 && sortedTransactions.length === 0 && (
              <Card className="rounded-[14px] border border-border/80 p-12 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Nenhuma fatura ou transação neste mês.</p>
              </Card>
            )}

            <CategoryAssignmentDialog
              open={categoriasDialogOpen}
              onOpenChange={setCategoriasDialogOpen}
              defaultTab="cartao"
            />
          </>
        )}
        </div>
      </div>
  );

  if (embedded) return content;
  return content;
};

export default CartaoCredito;
