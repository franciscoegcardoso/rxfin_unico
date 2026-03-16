import React from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
import { CartaoCreditoSection } from '@/components/planejamento/CartaoCreditoSection';
import { CreditCardBillView } from '@/components/cards/CreditCardBillView';
import { CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { useCreditCardDashboard } from '@/hooks/useCreditCardDashboard';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

const CartaoCredito: React.FC<CartaoCreditoProps> = ({ embedded = false }) => {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data, loading, error } = useCreditCardDashboard(currentMonth);
  const dashboard = data as DashboardData | null;

  const totals = dashboard?.totals ?? dashboard?.summary;
  const totalBills = totals?.total_bills ?? 0;
  const totalPaid = totals?.total_paid ?? 0;
  const pending = totalBills - totalPaid;
  const bills = dashboard?.bills ?? [];
  const recentTransactions = (dashboard?.recent_transactions ?? dashboard?.transactions ?? []) as TransactionRow[];
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

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full bg-[hsl(var(--color-surface-base))]">
        <div className="content-zone py-5 md:py-6 space-y-5 flex-1">
        {!embedded && (
        <PageHeader
          icon={CreditCard}
          title="Cartão de Crédito"
          subtitle="Faturas, lançamentos e sincronização"
        />
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
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
            {/* Visão de fatura consolidada (RPC get_credit_card_bills_detail) */}
            <CreditCardBillView showSummaryRow />
            {/* A) Cards de resumo — mobile: só Total faturas; sm+: os três */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <HeaderMetricCard label="Total faturas" value={formatCurrency(totalBills)} variant="blue" icon={<CreditCard className="h-4 w-4" />} />
              <HeaderMetricCard label="Total pago" value={formatCurrency(totalPaid)} variant="positive" icon={<CheckCircle2 className="h-4 w-4" />} className="hidden sm:block" />
              <HeaderMetricCard label="Pendente" value={formatCurrency(pending)} variant={pending > 0 ? 'amber' : 'positive'} icon={<Clock className="h-4 w-4" />} className="hidden sm:block" />
            </div>

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

            {/* C) Últimas transações — tabela em desktop, cards empilhados em mobile */}
            {sortedTransactions.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Últimas transações</h2>
                {/* Mobile: cards empilhados */}
                <div className="md:hidden space-y-3">
                  {sortedTransactions.map((tx, i) => {
                    const dateStr = tx.date ?? tx.transaction_date ?? '';
                    const dateFormatted = dateStr ? format(new Date(dateStr), 'dd/MM') : '—';
                    return (
                      <Card key={tx.id ?? i} className="rounded-[14px] border border-border/80 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{tx.store_name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{dateFormatted}</p>
                            {tx.category && (
                              <Badge variant="secondary" className="text-xs mt-1.5">{tx.category}</Badge>
                            )}
                          </div>
                          <p className="font-semibold text-foreground shrink-0 tabular-nums whitespace-nowrap">{formatCurrency(tx.value ?? 0)}</p>
                        </div>
                        {tx.card_id && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 truncate">{tx.card_id}</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
                {/* Desktop: tabela com overflow e colunas responsivas */}
                <Card className="hidden md:block rounded-[14px] border border-border/80 overflow-hidden">
                  <div className="overflow-x-auto min-w-0">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/30">
                          <th className="px-4 py-3 text-left font-medium">Data</th>
                          <th className="px-4 py-3 text-left font-medium min-w-0">Loja</th>
                          <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Categoria</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Cartão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTransactions.map((tx, i) => {
                          const dateStr = tx.date ?? tx.transaction_date ?? '';
                          const dateFormatted = dateStr
                            ? format(new Date(dateStr), 'dd/MM')
                            : '—';
                          return (
                            <tr
                              key={tx.id ?? i}
                              className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                            >
                              <td className="px-4 py-3 text-muted-foreground">{dateFormatted}</td>
                              <td className="px-4 py-3 font-medium max-w-[160px] truncate" title={tx.store_name ?? undefined}>{tx.store_name ?? '—'}</td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {tx.category ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {tx.category}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium tabular-nums">
                                {formatCurrency(tx.value ?? 0)}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{tx.card_id ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            )}

            {!loading && !error && bills.length === 0 && sortedTransactions.length === 0 && (
              <Card className="rounded-[14px] border border-border/80 p-12 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Nenhuma fatura ou transação neste mês.</p>
              </Card>
            )}
          </>
        )}

        <CartaoCreditoSection />
        </div>
      </div>
    </AppLayout>
  );
};

export default CartaoCredito;
