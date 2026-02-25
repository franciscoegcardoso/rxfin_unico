import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { toMonthOnly } from '@/utils/dateUtils';
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

interface ProcessedPurchase {
  date: string;
  category: string;
  store: string;
  totalValue: number;
  tipo: string;
}

interface MonthlyPurchasesDetailProps {
  transactions: CreditCardTransaction[];
  isHidden: boolean;
  formatCurrency: (value: number) => string;
}

export const MonthlyPurchasesDetail: React.FC<MonthlyPurchasesDetailProps> = ({
  transactions, isHidden, formatCurrency,
}) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Get deduplicated purchases per month
  const purchasesByMonth = useMemo(() => {
    const relevantTx = transactions
      .filter(isConsumptionTransaction)
      .filter(t => {
        if (t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1) return false;
        return true;
      });

    const installmentGroups: Record<string, CreditCardTransaction> = {};
    const nonInstallment: CreditCardTransaction[] = [];

    relevantTx.forEach(t => {
      const isInstallment = t.installment_total && t.installment_total > 1;
      if (isInstallment) {
        const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const m = toMonthOnly(t.transaction_date);
        const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}::${m}`;
        if (!installmentGroups[key] || t.value > installmentGroups[key].value) {
          installmentGroups[key] = t;
        }
      } else {
        nonInstallment.push(t);
      }
    });

    const deduped = [...nonInstallment, ...Object.values(installmentGroups)];

    const byMonth: Record<string, ProcessedPurchase[]> = {};
    deduped.forEach(t => {
      const m = toMonthOnly(t.transaction_date);
      if (!byMonth[m]) byMonth[m] = [];
      const tipo = t.installment_total && t.installment_total > 1
        ? `${t.installment_total}x`
        : 'À vista';
      byMonth[m].push({
        date: t.transaction_date,
        category: t.category || 'Não atribuído',
        store: t.friendly_name || t.store_name,
        totalValue: t.value,
        tipo,
      });
    });

    Object.values(byMonth).forEach(list => list.sort((a, b) => b.totalValue - a.totalValue));
    return byMonth;
  }, [transactions]);

  const availableMonths = useMemo(() =>
    Object.keys(purchasesByMonth).sort(), [purchasesByMonth]);

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

  const currentPurchases = purchasesByMonth[selectedMonth] || [];
  const totalMonth = currentPurchases.reduce((s, p) => s + p.totalValue, 0);

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

  const tableContent = (
    <div className="max-h-[60vh] overflow-y-auto">
      {currentPurchases.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">Nenhuma compra neste mês</p>
      ) : (
        <>
          <Table className={isMobile ? 'text-[11px]' : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                {!isMobile && <TableHead>Categoria</TableHead>}
                <TableHead>Estabelecimento</TableHead>
                {!isMobile && <TableHead>Tipo</TableHead>}
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPurchases.map((p, i) => {
                const storeLabel = isMobile && p.tipo !== 'À vista'
                  ? `${p.store} (${p.tipo})`
                  : p.store;
                return (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{formatDayMonth(p.date)}</TableCell>
                    {!isMobile && <TableCell className="text-muted-foreground">{p.category}</TableCell>}
                    <TableCell>{storeLabel}</TableCell>
                    {!isMobile && <TableCell className="whitespace-nowrap text-muted-foreground">{p.tipo}</TableCell>}
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {isHidden ? '••••••' : formatCurrency(p.totalValue)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end px-3 py-2 border-t border-border">
            <span className="text-sm font-semibold">
              Total: {isHidden ? '••••••' : formatCurrency(totalMonth)}
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
      <List className="h-3.5 w-3.5" />
      Ver compras
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="px-3">
              <DrawerTitle className="sr-only">Compras do mês</DrawerTitle>
              {monthSelector}
              <DrawerDescription className="sr-only">Lista de compras do mês</DrawerDescription>
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
            <DialogTitle className="sr-only">Compras do mês</DialogTitle>
            {monthSelector}
            <DialogDescription className="sr-only">Lista de compras do mês</DialogDescription>
          </DialogHeader>
          {tableContent}
        </DialogContent>
      </Dialog>
    </>
  );
};
