import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Columns } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { isConsumptionTransaction } from '@/utils/creditCardFilters';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${y.toString().slice(-2)}`;
}

function formatDayMonth(dateStr: string) {
  const parts = dateStr.split('T')[0].split('-');
  return `${parts[2]}/${parts[1]}`;
}

interface CompositionItem {
  date: string;
  store: string;
  value: number;
  type: 'current' | 'previous';
  installmentInfo: string;
}

interface BillCompositionDetailProps {
  transactions: CreditCardTransaction[];
  billMonthMap: Map<string, string>;
  isHidden: boolean;
  formatCurrency: (value: number) => string;
}

export const BillCompositionDetail: React.FC<BillCompositionDetailProps> = ({
  transactions, billMonthMap, isHidden, formatCurrency,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'all' | 'current' | 'previous'>('all');
  const isMobile = useIsMobile();

  const itemsByMonth = useMemo(() => {
    const byMonth: Record<string, CompositionItem[]> = {};

    // Deduplication for first-installment (keep MIN value for bill composition)
    const installmentGroups: Record<string, CreditCardTransaction> = {};
    const others: CreditCardTransaction[] = [];

    transactions.forEach(t => {
      if (!isConsumptionTransaction(t)) return;
      if (!t.credit_card_bill_id) return;
      if (!billMonthMap.has(t.credit_card_bill_id)) return;

      const isPrevInstallment = t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1;
      const isFirstInstallment = t.installment_total && t.installment_total > 1 && (!t.installment_current || t.installment_current === 1);

      if (isFirstInstallment) {
        const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const billMonth = billMonthMap.get(t.credit_card_bill_id)!;
        const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}::${billMonth}`;
        if (!installmentGroups[key] || t.value < installmentGroups[key].value) {
          installmentGroups[key] = t;
        }
      } else {
        others.push(t);
      }
    });

    // Build a map of per-installment values from later installments (current > 1)
    // to cross-reference against first installments that might have the full purchase price
    const laterInstallmentValues: Record<string, number> = {};
    others.forEach(t => {
      if (t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1) {
        const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}`;
        // Keep the smallest value as the real per-installment amount
        if (!laterInstallmentValues[key] || t.value < laterInstallmentValues[key]) {
          laterInstallmentValues[key] = t.value;
        }
      }
    });

    // For first installments, use the per-installment value if the stored value seems like the full price
    const correctedFirstInstallments = Object.values(installmentGroups).map(t => {
      const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}`;
      const laterValue = laterInstallmentValues[key];
      
      if (laterValue && t.value > laterValue * 1.5) {
        // The stored value is much larger than later installments → it's the full price
        return { ...t, value: laterValue };
      }
      if (!laterValue && t.installment_total && t.installment_total > 1) {
        // No later installment to compare; estimate per-installment value
        const estimated = Math.round((t.value / t.installment_total) * 100) / 100;
        // Only correct if dividing gives a significantly different number
        if (estimated < t.value * 0.8) {
          return { ...t, value: estimated };
        }
      }
      return t;
    });

    const allTx = [...others, ...correctedFirstInstallments];

    allTx.forEach(t => {
      const billMonth = billMonthMap.get(t.credit_card_bill_id!);
      if (!billMonth) return;

      const isPrev = t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1;

      let installmentInfo = 'À vista';
      if (t.installment_total && t.installment_total > 1) {
        installmentInfo = `${t.installment_current || 1}/${t.installment_total}`;
      }

      if (!byMonth[billMonth]) byMonth[billMonth] = [];
      byMonth[billMonth].push({
        date: t.transaction_date,
        store: t.friendly_name || t.store_name,
        value: t.value,
        type: isPrev ? 'previous' : 'current',
        installmentInfo,
      });
    });

    // Sort: current first, then previous; within each group by value desc
    Object.values(byMonth).forEach(list => {
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'current' ? -1 : 1;
        return b.value - a.value;
      });
    });

    return byMonth;
  }, [transactions, billMonthMap]);

  const availableMonths = useMemo(() =>
    Object.keys(itemsByMonth).sort(), [itemsByMonth]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : ''
  );

  React.useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  const currentIdx = availableMonths.indexOf(selectedMonth);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < availableMonths.length - 1;
  const goToPrev = () => { if (canPrev) setSelectedMonth(availableMonths[currentIdx - 1]); };
  const goToNext = () => { if (canNext) setSelectedMonth(availableMonths[currentIdx + 1]); };

  const currentItems = itemsByMonth[selectedMonth] || [];
  const currentMonthItems = currentItems.filter(i => i.type === 'current');
  const previousItems = currentItems.filter(i => i.type === 'previous');
  const totalCurrent = currentMonthItems.reduce((s, i) => s + i.value, 0);
  const totalPrevious = previousItems.reduce((s, i) => s + i.value, 0);
  const totalMonth = totalCurrent + totalPrevious;

  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [open, selectedMonth]);

  const monthSelector = (
    <div className="flex items-center gap-1 w-full border border-border rounded-lg px-1 py-1 min-w-0">
      <Button variant="ghost" size="icon-sm" onClick={goToPrev} disabled={!canPrev} className="shrink-0">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0.5">
          {availableMonths.map((m) => {
            const isSelected = m === selectedMonth;
            return (
              <button
                key={m}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {formatMonthLabel(m)}
              </button>
            );
          })}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={goToNext} disabled={!canNext} className="shrink-0">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderSection = (title: string, items: CompositionItem[], total: number, colorClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 py-1.5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colorClass}`} />
            <span className="text-xs font-semibold text-foreground">{title}</span>
            <span className="text-[10px] text-muted-foreground">({items.length})</span>
          </div>
          <span className="text-xs font-semibold font-mono tabular-nums">
            {isHidden ? '••••••' : formatCurrency(total)}
          </span>
        </div>
        <Table className={isMobile ? 'text-[11px]' : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Estabelecimento</TableHead>
              {!isMobile && <TableHead>Parcela</TableHead>}
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const storeLabel = isMobile && item.installmentInfo !== 'À vista'
                ? `${item.store} (${item.installmentInfo})`
                : item.store;
              return (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{formatDayMonth(item.date)}</TableCell>
                  <TableCell>{storeLabel}</TableCell>
                  {!isMobile && <TableCell className="text-muted-foreground whitespace-nowrap">{item.installmentInfo}</TableCell>}
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {isHidden ? '••••••' : formatCurrency(item.value)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
      {([['all', 'Tudo'], ['current', 'Compras do mês'], ['previous', 'Parcelas anteriores']] as const).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setView(key)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            view === key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const filteredCurrentItems = view === 'previous' ? [] : currentMonthItems;
  const filteredPreviousItems = view === 'current' ? [] : previousItems;
  const filteredTotal = (view === 'previous' ? 0 : totalCurrent) + (view === 'current' ? 0 : totalPrevious);

  const tableContent = (
    <div className="max-h-[60vh] overflow-y-auto space-y-4">
      {viewToggle}
      {filteredCurrentItems.length === 0 && filteredPreviousItems.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">Nenhuma transação nesta visão</p>
      ) : (
        <>
          {renderSection('Compras do mês', filteredCurrentItems, totalCurrent, 'bg-emerald-500')}
          {renderSection('Parcelas anteriores', filteredPreviousItems, totalPrevious, 'bg-violet-500')}
          <div className="flex justify-end px-3 py-2 border-t border-border">
            <span className="text-sm font-semibold">
              Total: {isHidden ? '••••••' : formatCurrency(filteredTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  );

  const triggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={() => setOpen(true)}
    >
      <Columns className="h-3.5 w-3.5" />
      Ver composição
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="px-3">
              <DrawerTitle className="sr-only">Composição da fatura</DrawerTitle>
              {monthSelector}
              <DrawerDescription className="sr-only">Detalhamento da composição da fatura</DrawerDescription>
            </DrawerHeader>
            <div className="px-2 pb-4">
              {tableContent}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {triggerButton}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl overflow-hidden">
          <DialogHeader className="min-w-0 overflow-hidden">
            <DialogTitle className="sr-only">Composição da fatura</DialogTitle>
            {monthSelector}
            <DialogDescription className="sr-only">Detalhamento da composição da fatura</DialogDescription>
          </DialogHeader>
          {tableContent}
        </DialogContent>
      </Dialog>
    </>
  );
};
