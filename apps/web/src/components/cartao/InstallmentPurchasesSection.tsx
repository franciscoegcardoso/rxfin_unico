import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { 
  Calendar, 
  CreditCard, 
  TrendingDown,
  RefreshCw,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  CircleDollarSign,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import { InstallmentDiagnosticDialog } from './InstallmentDiagnosticDialog';
import { useConsolidationStatus } from '@/hooks/useAutoConsolidation';

interface InstallmentPurchasesSectionProps {
  transactions: CreditCardTransaction[];
  bills?: CreditCardBill[];
  creditCards?: Array<{ id: string; name: string }>;
  onConsolidate?: () => Promise<{ success: boolean; updated: number }>;
}

interface InstallmentGroup {
  id: string;
  storeName: string;
  totalValue: number;
  installmentValue: number;
  currentInstallment: number;
  totalInstallments: number;
  remainingInstallments: number;
  remainingValue: number;
  startDate: string;
  endDate: string;
  lastBilledMonth: string;
  earliestBilledMonth: string;
  earliestInstallmentCurrent: number;
  category: string;
  transactions: CreditCardTransaction[];
}

const formatShortMonth = (dateStr: string) => {
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
};

const formatDate = (dateStr: string) => {
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(month) - 1]}/${year}`;
};

export function InstallmentPurchasesSection({ 
  transactions, 
  bills = [], 
  creditCards = [], 
  onConsolidate 
}: InstallmentPurchasesSectionProps) {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();
  const [isConsolidating, setIsConsolidating] = useState(false);
  const consolidationStatus = useConsolidationStatus();

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [startMonth, setStartMonth] = useState(getCurrentMonth);

  const shiftStartMonth = (delta: number) => {
    setStartMonth(prev => {
      const [y, m] = prev.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  };

  const handleConsolidate = async () => {
    if (!onConsolidate) return;
    setIsConsolidating(true);
    try {
      await onConsolidate();
    } finally {
      setIsConsolidating(false);
    }
  };

  const formatCurrency = (value: number, compact = false) => {
    if (isHidden) return compact ? '••••' : '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2,
    }).format(value);
  };

  const normalizeStoreName = (name: string) => {
    return name
      .replace(/\s*\d+\/\d+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const getInstallmentPurchaseKey = (t: CreditCardTransaction) => {
    const normalizedName = normalizeStoreName(t.store_name);
    const cardKey = t.card_id || 'no-card';
    const total = t.installment_total || 1;
    return `${cardKey}::${normalizedName}::${total}`;
  };

  const installmentGroups = useMemo(() => {
    const groups: InstallmentGroup[] = [];
    const installmentTxs = transactions.filter(
      (t) => t.installment_total && t.installment_total > 1
    );
    const groupedByPurchase = new Map<string, CreditCardTransaction[]>();

    installmentTxs.forEach((t) => {
      const groupId = getInstallmentPurchaseKey(t);
      const existing = groupedByPurchase.get(groupId) || [];
      const tMonth = t.transaction_date.substring(0, 7);
      const isDuplicate = existing.some((existingTx) => {
        const eMonth = existingTx.transaction_date.substring(0, 7);
        return (
          (existingTx.installment_current ?? 1) === (t.installment_current ?? 1) &&
          eMonth === tMonth
        );
      });

      if (!isDuplicate) {
        existing.push(t);
        groupedByPurchase.set(groupId, existing);
      }
    });

    const billMonthMap = new Map<string, string>();
    bills.forEach(b => {
      const dueMonth = b.due_date?.substring(0, 7) || '';
      billMonthMap.set(b.id, dueMonth);
    });

    groupedByPurchase.forEach((txs, groupId) => {
      const sortedTxs = [...txs].sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
      const latestTx = sortedTxs[0];

      const totalInstallments = latestTx.installment_total || 1;
      const maxImportedInstallment = Math.max(...txs.map((t) => t.installment_current || 1));
      const remainingInstallments = Math.max(0, totalInstallments - maxImportedInstallment);

      const avgInstallmentValue = txs.reduce((sum, t) => sum + t.value, 0) / Math.max(1, txs.length);
      const installmentValue = avgInstallmentValue;
      const totalValue = installmentValue * totalInstallments;
      const remainingValue = installmentValue * remainingInstallments;

      let earliestBilledMonth = '';
      let earliestInstallmentCurrent = Infinity;
      let lastBilledMonth = '';
      
      txs.forEach(tx => {
        let txMonth = tx.transaction_date.substring(0, 7);
        if (tx.credit_card_bill_id) {
          const bm = billMonthMap.get(tx.credit_card_bill_id);
          if (bm) txMonth = bm;
        }
        const ic = tx.installment_current ?? 1;
        if (ic < earliestInstallmentCurrent || (ic === earliestInstallmentCurrent && txMonth < earliestBilledMonth)) {
          earliestInstallmentCurrent = ic;
          earliestBilledMonth = txMonth;
        }
        if (txMonth > lastBilledMonth) lastBilledMonth = txMonth;
      });
      if (!lastBilledMonth) lastBilledMonth = latestTx.transaction_date.substring(0, 7);
      if (!earliestBilledMonth) earliestBilledMonth = lastBilledMonth;

      const oldestTx = sortedTxs[sortedTxs.length - 1];
      const oldestCurrent = oldestTx.installment_current ?? 1;
      const oldestTxDate = new Date(oldestTx.transaction_date);
      const purchaseStartDate = new Date(oldestTxDate);
      purchaseStartDate.setMonth(purchaseStartDate.getMonth() - (oldestCurrent - 1));
      const startDateKey = `${purchaseStartDate.getFullYear()}-${String(purchaseStartDate.getMonth() + 1).padStart(2, '0')}-${String(purchaseStartDate.getDate()).padStart(2, '0')}`;
      
      const startDate = new Date(startDateKey);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (totalInstallments - 1));

      groups.push({
        id: groupId,
        storeName: latestTx.store_name
          .replace(/\s*\d+\/\d+\s*/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
        totalValue,
        installmentValue,
        currentInstallment: maxImportedInstallment,
        totalInstallments,
        remainingInstallments,
        remainingValue,
        startDate: startDateKey,
        endDate: endDate.toISOString().split('T')[0],
        lastBilledMonth,
        earliestBilledMonth,
        earliestInstallmentCurrent,
        category: latestTx.category || 'Não atribuído',
        transactions: sortedTxs,
      });
    });

    return groups.sort((a, b) => b.installmentValue - a.installmentValue);
  }, [transactions, bills]);

  const futureMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    installmentGroups.forEach(group => {
      if (group.remainingInstallments <= 0) return;
      const [ey, em] = group.earliestBilledMonth.split('-').map(Number);
      const firstBillingDate = new Date(ey, em - 1 - (group.earliestInstallmentCurrent - 1), 1);
      for (let i = 0; i < group.totalInstallments; i++) {
        const d = new Date(firstBillingDate.getFullYear(), firstBillingDate.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(key);
      }
    });
    return Array.from(monthsSet).sort();
  }, [installmentGroups]);

  const filteredMonths = useMemo(() => {
    return futureMonths.filter(m => m >= startMonth);
  }, [futureMonths, startMonth]);

  const projectionMatrix = useMemo(() => {
    const activeGroups = installmentGroups.filter(g => g.remainingInstallments > 0);
    return activeGroups.map(group => {
      const rowData: Record<string, number> = {};
      const [ey, em] = group.earliestBilledMonth.split('-').map(Number);
      const firstBillingDate = new Date(ey, em - 1 - (group.earliestInstallmentCurrent - 1), 1);
      for (let i = 0; i < group.totalInstallments; i++) {
        const d = new Date(firstBillingDate.getFullYear(), firstBillingDate.getMonth() + i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        rowData[monthKey] = group.installmentValue;
      }
      return {
        ...group,
        monthlyValues: rowData,
        rowTotal: Object.values(rowData).reduce((sum, v) => sum + v, 0),
      };
    });
  }, [installmentGroups]);

  const columnSubtotals = useMemo(() => {
    const subtotals: Record<string, number> = {};
    filteredMonths.forEach(month => {
      subtotals[month] = projectionMatrix.reduce((sum, row) => sum + (row.monthlyValues[month] || 0), 0);
    });
    return subtotals;
  }, [projectionMatrix, filteredMonths]);

  const totals = useMemo(() => {
    const activeGroups = installmentGroups.filter(g => g.remainingInstallments > 0);
    const totalPending = activeGroups.reduce((sum, g) => sum + g.remainingValue, 0);
    const totalPaid = activeGroups.reduce((sum, g) => sum + (g.totalValue - g.remainingValue), 0);
    const totalAll = totalPending + totalPaid;
    const pctPaid = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0;
    const pendingInstallments = activeGroups.reduce((sum, g) => sum + g.remainingInstallments, 0);
    return {
      totalRemaining: totalPending,
      totalPaid,
      pctPaid,
      pendingInstallments,
      activePurchases: activeGroups.length,
      completedPurchases: installmentGroups.filter(g => g.remainingInstallments === 0).length,
    };
  }, [installmentGroups]);

  if (installmentGroups.length === 0) {
    return (
      <div className="text-center py-16 text-[hsl(var(--color-text-tertiary))]">
        <CreditCard className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
        <p className="font-medium text-sm text-[hsl(var(--color-text-primary))]">Nenhuma compra parcelada identificada</p>
        <p className="text-xs mt-1 text-[hsl(var(--color-text-tertiary))]">
          Importe faturas para visualizar os parcelamentos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact status + action row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="gap-1 text-[10px] font-medium py-0 px-1.5 h-5"
            style={consolidationStatus.isToday ? {
              background: 'hsl(var(--color-income-bg))',
              borderColor: 'hsl(var(--color-income) / 0.3)',
              color: 'hsl(var(--color-income))',
            } : {
              background: 'hsl(var(--color-surface-sunken))',
              borderColor: 'hsl(var(--color-border-subtle))',
              color: 'hsl(var(--color-text-tertiary))',
            }}
          >
            <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
            {consolidationStatus.displayText}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5">
          <InstallmentDiagnosticDialog
            transactions={transactions}
            bills={bills}
            creditCards={creditCards}
          />
          {onConsolidate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleConsolidate}
              disabled={isConsolidating}
              className="gap-1 h-6 px-2 text-xs font-medium text-[hsl(var(--color-text-tertiary))] hover:text-[hsl(var(--color-text-primary))]"
            >
              {isConsolidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
              )}
              Consolidar
            </Button>
          )}
        </div>
      </div>

      {/* Compact summary row */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--color-text-tertiary))]">
        <span><Layers className="h-3 w-3 inline mr-1" strokeWidth={1.5} />{totals.pendingInstallments} parcelas</span>
        <span className="font-numeric tabular-nums text-[hsl(var(--color-text-primary))]">{formatCurrency(totals.totalRemaining)}</span>
        <span>{totals.pctPaid}% quitado</span>
      </div>

      {/* Monthly Projection Table */}
      {projectionMatrix.length > 0 && filteredMonths.length > 0 && (
        <div className="space-y-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-xs text-[hsl(var(--color-text-tertiary))]">Próximos {filteredMonths.length} meses</p>
            <div className="flex items-center gap-1 bg-muted/20 border border-[hsl(var(--color-border-subtle))] rounded-lg p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/50" onClick={() => shiftStartMonth(-1)}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <span className="text-xs font-medium min-w-[70px] text-center font-numeric tabular-nums text-[hsl(var(--color-text-primary))]">
                {formatDate(startMonth)}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/50" onClick={() => shiftStartMonth(1)}>
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
          <CardContent className="pt-2 px-0 pb-0">
            <div className="w-full overflow-x-auto touch-pan-x">
              <div className="min-w-max space-y-4">
                {(() => {
                  const itemColWidth = isMobile ? 120 : 200;
                  const monthColWidth = isMobile ? 60 : 100;
                  const totalWidth = itemColWidth + (filteredMonths.length * monthColWidth);
                  
                  return (
                    <>
                      <div style={{ width: totalWidth }}>
                        <Table 
                          className={cn(isMobile && "text-[10px]")}
                          style={{ tableLayout: 'fixed', width: '100%' }}
                        >
                          <TableHeader>
                            <TableRow className="border-b border-[hsl(var(--color-border-subtle))] hover:bg-transparent">
                              <TableHead 
                                className={cn(
                                  "sticky left-0 bg-card z-10 text-xs font-semibold text-[hsl(var(--color-text-tertiary))] uppercase tracking-wider",
                                  isMobile ? "py-2.5 px-2" : "py-3"
                                )}
                                style={{ width: itemColWidth }}
                              >
                                Item
                              </TableHead>
                              {filteredMonths.map(month => (
                                <TableHead 
                                  key={month} 
                                  className={cn(
                                    "text-center text-xs font-semibold text-[hsl(var(--color-text-tertiary))] uppercase tracking-wider",
                                    isMobile ? "py-2.5 px-1" : "py-3"
                                  )}
                                  style={{ width: monthColWidth }}
                                >
                                  {formatShortMonth(month)}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Inline bar chart row */}
                            <TableRow className="hover:bg-transparent border-b border-[hsl(var(--color-border-subtle))]">
                              <TableCell 
                                className={cn(
                                  "sticky left-0 bg-card z-10",
                                  isMobile ? "py-1 px-2" : "py-1"
                                )}
                                style={{ width: itemColWidth }}
                              />
                              {filteredMonths.map((month, index) => {
                                const value = columnSubtotals[month] || 0;
                                const maxValue = Math.max(...Object.values(columnSubtotals), 1);
                                const barHeight = (value / maxValue) * (isMobile ? 40 : 52);
                                return (
                                  <TableCell 
                                    key={month}
                                    className="text-center p-0 align-bottom"
                                    style={{ width: monthColWidth }}
                                  >
                                    <div className="flex flex-col items-center justify-end" style={{ height: isMobile ? 60 : 72 }}>
                                      <span className={cn(
                                        "text-[hsl(var(--color-text-tertiary))] mb-0.5 font-numeric tabular-nums",
                                        isMobile ? "text-[10px]" : "text-xs"
                                      )}>
                                        {isHidden ? '••' : formatCurrency(value, true)}
                                      </span>
                                      <div 
                                        className="rounded-t transition-all duration-500 ease-out"
                                        style={{ 
                                          height: `${Math.max(barHeight, 3)}px`,
                                          width: isMobile ? 24 : 40,
                                          backgroundColor: 'hsl(var(--color-brand-500))',
                                          opacity: index === 0 ? 0.85 : 0.3 + (0.55 * (1 - index / filteredMonths.length)),
                                        }}
                                      />
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>

                            {projectionMatrix.filter(row => filteredMonths.some(m => row.monthlyValues[m])).map((row, rowIdx) => (
                              <TableRow key={row.id} className={cn("hover:bg-muted/20 transition-colors", rowIdx % 2 === 0 ? "bg-muted/8" : "")}>
                                <TableCell 
                                  className={cn(
                                    "sticky left-0 z-10 font-medium overflow-hidden",
                                    rowIdx % 2 === 0 ? "bg-muted/8" : "bg-card",
                                    isMobile ? "py-2.5 px-2" : "py-3"
                                  )}
                                  style={{ width: itemColWidth }}
                                >
                                  <div className={cn(isMobile && "leading-tight")}>
                                    <span className={cn(
                                      "block truncate font-medium text-[hsl(var(--color-text-primary))]",
                                      isMobile ? "text-[10px] break-words line-clamp-2" : "text-xs"
                                    )}>
                                      {row.storeName}
                                    </span>
                                    <span className={cn(
                                      "text-[hsl(var(--color-text-tertiary))] font-numeric tabular-nums",
                                      isMobile ? "text-[10px]" : "text-xs"
                                    )}>
                                      ({row.currentInstallment}/{row.totalInstallments})
                                    </span>
                                  </div>
                                </TableCell>
                                {filteredMonths.map(month => (
                                  <TableCell 
                                    key={month} 
                                    className={cn(
                                      "text-center",
                                      isMobile ? "py-2.5 px-1" : "py-3"
                                    )}
                                    style={{ width: monthColWidth }}
                                  >
                                    {row.monthlyValues[month] ? (
                                      <span className={cn(
                                        "font-numeric tabular-nums font-medium text-[hsl(var(--color-text-primary))]",
                                        isMobile ? "text-[10px]" : "text-xs"
                                      )}>
                                        {formatCurrency(row.monthlyValues[month], isMobile)}
                                      </span>
                                    ) : (
                                      <span className="text-[hsl(var(--color-text-tertiary))]/40">—</span>
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                            <TableRow className="bg-[hsl(var(--color-surface-sunken))] border-t-2 border-[hsl(var(--color-border-subtle))] hover:bg-muted/30">
                              <TableCell 
                                className={cn(
                                  "sticky left-0 bg-[hsl(var(--color-surface-sunken))] z-10 font-semibold text-xs uppercase tracking-wider text-[hsl(var(--color-text-primary))]",
                                  isMobile ? "py-3 px-2" : "py-3"
                                )}
                                style={{ width: itemColWidth }}
                              >
                                Subtotal
                              </TableCell>
                              {filteredMonths.map(month => (
                                <TableCell 
                                  key={month} 
                                  className={cn(
                                    "text-center",
                                    isMobile ? "py-3 px-1" : "py-3"
                                  )}
                                  style={{ width: monthColWidth }}
                                >
                                  <span className={cn(
                                    "font-numeric font-semibold tabular-nums text-[hsl(var(--color-text-primary))]",
                                    isMobile ? "text-[10px]" : "text-xs"
                                  )}>
                                    {formatCurrency(columnSubtotals[month], isMobile)}
                                  </span>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </div>
      )}
    </div>
  );
}
