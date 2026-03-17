import React, { useMemo } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreditCard, Check, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFinancial } from '@/contexts/FinancialContext';
import { financialInstitutions } from '@/data/defaultData';
import type { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import type { Tables } from '@/integrations/supabase/types';

interface AvailableCardInfo {
  id: string;
  name: string;
  connectorName?: string;
  number?: string;
  cardBrand?: string | null;
  cardLevel?: string | null;
  imageUrl?: string | null;
  primaryColor?: string | null;
}

interface CreditCardMonthlyTableProps {
  months: string[];
  currentMonth: string;
  activeMonth?: string; // The billing month to highlight as "Atual" (defaults to currentMonth)
  isHidden?: boolean;
  selectedCardIds?: string[];
  availableCards?: AvailableCardInfo[];
  bills: Tables<'credit_card_bills'>[];
  transactions: CreditCardTransaction[];
}

const formatMonthLabel = (month: string) => {
  const [, monthNum] = month.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return monthNames[parseInt(monthNum) - 1];
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CreditCardMonthlyTable: React.FC<CreditCardMonthlyTableProps> = ({
  months,
  currentMonth,
  activeMonth,
  isHidden = false,
  selectedCardIds = [],
  availableCards = [],
  bills,
  transactions,
}) => {
  const isMobile = useIsMobile();
  const { config } = useFinancial();

  // Get all unique card IDs from transactions and bills
  const transactionCardIds = useMemo(() => {
    const cardIds = new Set<string>();
    transactions.forEach(tx => {
      if (tx.card_id) cardIds.add(tx.card_id);
    });
    bills.forEach(bill => {
      if (bill.card_id) cardIds.add(bill.card_id);
    });
    return cardIds;
  }, [transactions, bills]);

  // Get cards: prioritize transaction card_ids, then merge with config
  const creditCards = useMemo(() => {
    const defaultColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const result: Array<{ id: string; name: string; color: string }> = [];
    const addedIds = new Set<string>();

    // First, add all cards from transactions/bills
    const cardIdsArray = Array.from(transactionCardIds);
    cardIdsArray.forEach((cardId, idx) => {
      // Try to find rich info from availableCards prop first
      const avCard = availableCards.find(ac => ac.id === cardId);
      if (avCard) {
        const parts: string[] = [];
        if (avCard.connectorName) parts.push(avCard.connectorName);
        if (avCard.cardBrand) parts.push(avCard.cardBrand.charAt(0) + avCard.cardBrand.slice(1).toLowerCase());
        if (avCard.cardLevel) parts.push(avCard.cardLevel);
        if (parts.length === 0) parts.push(avCard.name || 'Cartão');
        if (avCard.number) parts.push(`(•••• ${avCard.number.slice(-4)})`);
        result.push({
          id: cardId,
          name: parts.join(' '),
          color: avCard.primaryColor ? `#${avCard.primaryColor.replace(/^#/, '')}` : defaultColors[idx % defaultColors.length],
        });
      } else {
        const fiConfig = config.financialInstitutions.find(fi => fi.id === cardId);
        if (fiConfig) {
          const institution = financialInstitutions.find(i => i.id === fiConfig.institutionId);
          result.push({
            id: cardId,
            name: fiConfig.customName || institution?.name || 'Cartão',
            color: institution?.color || defaultColors[idx % defaultColors.length],
          });
        } else {
          result.push({
            id: cardId,
            name: `Cartão ${idx + 1}`,
            color: defaultColors[idx % defaultColors.length],
          });
        }
      }
      addedIds.add(cardId);
    });

    // If no cards from transactions, add configured credit cards
    if (result.length === 0) {
      config.financialInstitutions
        .filter(fi => fi.hasCreditCard)
        .forEach((fi, idx) => {
          if (!addedIds.has(fi.id)) {
            const institution = financialInstitutions.find(i => i.id === fi.institutionId);
            result.push({
              id: fi.id,
              name: fi.customName || institution?.name || 'Cartão',
              color: institution?.color || defaultColors[idx % defaultColors.length],
            });
            addedIds.add(fi.id);
          }
        });
    }

    return result;
  }, [config.financialInstitutions, transactionCardIds]);

  // Filter credit cards based on selection
  const filteredCreditCards = useMemo(() => {
    if (!selectedCardIds || selectedCardIds.length === 0) {
      return creditCards;
    }
    return creditCards.filter(card => selectedCardIds.includes(card.id));
  }, [creditCards, selectedCardIds]);

  // Calculate monthly totals from transactions and bills
  const monthlyData = useMemo(() => {
    const data: Record<string, Record<string, { total: number; isPaid: boolean; isProjection: boolean }>> = {};

    const billsById = new Map(bills.map(b => [b.id, b] as const));

    const monthIndex = (m: string) => {
      const [y, mm] = m.split('-');
      return Number(y) * 12 + (Number(mm) - 1);
    };

    // Initialize data structure
    months.forEach(month => {
      data[month] = {};
      creditCards.forEach(card => {
        data[month][card.id] = { total: 0, isPaid: false, isProjection: month > currentMonth };
      });
    });

    // For past/current months: ALWAYS attribute a transaction to the BILL month when available.
    // This fixes cases where the statement export keeps the original purchase date for all installments.
    transactions.forEach(tx => {
      if (!tx.card_id) return;

      let txMonth = tx.transaction_date.substring(0, 7);
      if (tx.credit_card_bill_id) {
        const bill = billsById.get(tx.credit_card_bill_id);
        if (bill) txMonth = bill.due_date.substring(0, 7);
      }

      if (data[txMonth] && data[txMonth][tx.card_id]) {
        data[txMonth][tx.card_id].total += tx.value;
      }
    });

    // Use bill total_value as the primary source for any month with a bill
    bills.forEach(bill => {
      const billMonth = bill.due_date.substring(0, 7);
      if (data[billMonth] && data[billMonth][bill.card_id]) {
        if (bill.status === 'paid') {
          data[billMonth][bill.card_id].isPaid = true;
        }
        // Use bill total_value for past AND current months when available
        if (billMonth <= currentMonth && bill.total_value > 0) {
          data[billMonth][bill.card_id].total = bill.total_value;
        }
      }
    });

    // For future months: project installments using the SAME algorithm as BillTransactionsView
    const futureMonths = months.filter(m => m > currentMonth);

    // Payment keywords to exclude (same as BillTransactionsView)
    const PAYMENT_KEYWORDS = [
      'pagamento de fatura', 'pagamento recebido', 'desconto antecipação',
      'desconto antecipacao', 'pagamento em', 'pgto fatura', 'pag fatura',
    ];
    const isPayment = (tx: typeof transactions[number]) => {
      const desc = (tx.friendly_name || tx.store_name || '').toLowerCase();
      return PAYMENT_KEYWORDS.some(kw => desc.includes(kw));
    };

    const normalizeStore = (name: string) =>
      name
        .replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

    // Group installments using the SAME key as BillTransactionsView:
    // card_id::normalize(name)::installment_total
    const groups = new Map<string, (typeof transactions)[number][]>();
    transactions.forEach(tx => {
      if (isPayment(tx)) return;
      if (!tx.card_id) return;
      if (!tx.installment_total || tx.installment_total <= 1) return;
      if (!tx.installment_current) return;

      const key = `${tx.card_id}::${normalizeStore(tx.friendly_name || tx.store_name)}::${tx.installment_total}`;
      const list = groups.get(key) || [];
      list.push(tx);
      groups.set(key, list);
    });

    // Helper to get the due month for a transaction (same as BillTransactionsView's getTxDueMonth)
    const getTxDueMonth = (tx: typeof transactions[number]): string => {
      if (tx.credit_card_bill_id) {
        const bill = billsById.get(tx.credit_card_bill_id);
        if (bill) return bill.due_date.substring(0, 7);
      }
      return tx.transaction_date.substring(0, 7);
    };

    // For each future month, project installments (same algorithm as BillTransactionsView)
    futureMonths.forEach(month => {
      groups.forEach((txs) => {
        const total = txs[0].installment_total!;
        const minCurrent = Math.min(...txs.map(t => t.installment_current || 1));

        const earliestTx = txs.find(t => (t.installment_current || 1) === minCurrent) || txs[0];
        const earliestBilledMonth = getTxDueMonth(earliestTx);

        const [ey, em] = earliestBilledMonth.split('-').map(Number);
        const firstBillingDate = new Date(ey, em - 1 - (minCurrent - 1), 1);
        const firstBillingMonth = `${firstBillingDate.getFullYear()}-${String(firstBillingDate.getMonth() + 1).padStart(2, '0')}`;

        const expectedInstallment = monthIndex(month) - monthIndex(firstBillingMonth) + 1;
        if (expectedInstallment < 1 || expectedInstallment > total) return;

        // Check if a real transaction already exists for this installment in this month
        const existsInThisMonth = txs.some(t =>
          (t.installment_current || 0) === expectedInstallment && getTxDueMonth(t) === month
        );
        if (existsInThisMonth) return;

        const maxCurrent = Math.max(...txs.map(t => t.installment_current || 1));
        const lastTx = txs.find(t => (t.installment_current || 0) === maxCurrent) || txs[0];
        const cardId = lastTx.card_id!;

        if (data[month] && data[month][cardId]) {
          data[month][cardId].total += lastTx.value;
        }
      });
    });

    return data;
  }, [months, currentMonth, transactions, bills, creditCards]);

  // Get card month data
  const getCardMonthData = (cardId: string, month: string) => {
    return monthlyData[month]?.[cardId] || { total: 0, isPaid: false, isProjection: false };
  };

  // Calculate total for filtered cards in a month
  const getMonthTotal = (month: string): number => {
    return filteredCreditCards.reduce((sum, card) => {
      return sum + (getCardMonthData(card.id, month).total);
    }, 0);
  };

  const highlightMonth = activeMonth || currentMonth;

  const monthsData = useMemo(() => {
    return months.map(month => ({
      month,
      label: formatMonthLabel(month),
      isCurrent: month === highlightMonth,
      isProjection: month > currentMonth,
    }));
  }, [months, currentMonth, highlightMonth]);

  if (filteredCreditCards.length === 0) {
    return (
      <EmptyState
        description="Você ainda não configurou nenhum cartão de crédito"
        actionLabel="Adicionar primeiro cartão"
        onAction={() => window.location.href = '/cartoes-credito'}
        className="py-6"
      />
    );
  }

  return (
    <div className="w-full p-2 md:p-3">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-[hsl(var(--color-border-default))]">
            <th className="w-28 md:w-40 py-2 text-left text-[hsl(var(--color-text-tertiary))] font-normal text-xs">
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {!isMobile && <span>Cartão</span>}
              </div>
            </th>
            {monthsData.map(({ month, label, isCurrent, isProjection }) => (
              <th
                key={month}
                className={cn(
                  "py-2 text-center font-medium relative",
                  isCurrent && "bg-amber-50 dark:bg-amber-950/20 rounded-t-md"
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className={cn(
                    "text-xs",
                    isCurrent && "font-semibold text-[hsl(var(--color-text-primary))]",
                    isProjection && !isCurrent && "text-[hsl(var(--color-text-tertiary))] italic"
                  )}>
                    {label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                      Atual
                    </span>
                  )}
                  {isProjection && !isCurrent && (
                    <TrendingUp className="h-2.5 w-2.5 text-[hsl(var(--color-text-tertiary))]" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* One row per credit card */}
          {filteredCreditCards.map((card) => (
            <tr key={card.id} className="border-b border-[hsl(var(--color-border-subtle))]">
              <td className="py-2.5">
                <div className="flex items-center gap-1.5 min-w-0" title={card.name}>
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: card.color }}
                  />
                  <span className="text-xs truncate text-[hsl(var(--color-text-primary))]">{card.name}</span>
                </div>
              </td>
              {monthsData.map(({ month, isCurrent, isProjection }) => {
                const { total, isPaid } = getCardMonthData(card.id, month);
                return (
                  <td
                    key={month}
                    className={cn(
                      "py-2.5 text-center",
                      isCurrent && "bg-amber-50 dark:bg-amber-950/20"
                    )}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      {isPaid && total > 0 && (
                        <Check className="h-2.5 w-2.5 text-[hsl(var(--color-text-success))] shrink-0" />
                      )}
                      <span className={cn(
                        "text-xs font-mono tabular-nums font-medium",
                        total > 0 ? "text-[hsl(var(--color-text-primary))]" : "text-[hsl(var(--color-text-tertiary))]",
                        isPaid && total > 0 && "text-[hsl(var(--color-text-success))]",
                        isProjection && !isCurrent && "italic opacity-75"
                      )}>
                        {isHidden ? '••••' : total > 0 ? formatFullCurrency(total) : '-'}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Total row - only show if more than one card */}
          {filteredCreditCards.length > 1 && (
            <tr className="bg-[hsl(var(--color-surface-sunken))]">
              <td className="py-2.5 font-semibold text-xs text-[hsl(var(--color-text-primary))]">Total</td>
              {monthsData.map(({ month, isCurrent, isProjection }) => {
                const total = getMonthTotal(month);
                return (
                  <td
                    key={month}
                    className={cn(
                      "py-2.5 text-center",
                      isCurrent && "bg-amber-100/60 dark:bg-amber-900/40 rounded-b-md"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
                      total > 0 ? "text-[hsl(var(--color-text-primary))]" : "text-[hsl(var(--color-text-tertiary))]",
                      isProjection && !isCurrent && "italic opacity-75"
                    )}>
                      {isHidden ? '••••' : total > 0 ? formatFullCurrency(total) : '-'}
                    </span>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
