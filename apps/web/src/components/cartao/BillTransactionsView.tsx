import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { MonthSelector } from '@/components/lancamentos/MonthSelector';
import { toDateOnly, clampDayToMonth } from '@/utils/dateUtils';
import { getActiveBillingMonth } from '@/utils/billingCycleUtils';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CreditCard,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Wallet,
  Package,
  Calendar,
  
  Download,
  Search,
} from 'lucide-react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { CardBrandIcon } from '@/components/openfinance/CardBrandIcon';
import { CreditCardChip } from '@/components/openfinance/CreditCardChip';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useVisibility } from '@/contexts/VisibilityContext';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import { toast } from 'sonner';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { BillPaymentDialog } from './BillPaymentDialog';
import { InstallmentEditDialog } from './InstallmentEditDialog';

type BillStatusType = 'open' | 'closed' | 'paid' | 'overdue';
type DisplayStatusType = 'open' | 'closed' | 'paid' | 'partial' | 'awaiting' | 'overdue' | 'manual_check';

const statusConfig: Record<DisplayStatusType, { label: string; icon: React.ElementType; className: string }> = {
  open: {
    label: 'Em Aberto',
    icon: Clock,
    className: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/60',
  },
  closed: {
    label: 'Pendente',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60',
  },
  paid: {
    label: 'Paga',
    icon: Check,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  partial: {
    label: 'Pgto. Parcial',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60',
  },
  awaiting: {
    label: 'Aguardando Pgto.',
    icon: Clock,
    className: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/60',
  },
  overdue: {
    label: 'Vencida',
    icon: AlertCircle,
    className: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/60',
  },
  manual_check: {
    label: 'Verificar',
    icon: AlertCircle,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200/80 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800/60',
  },
};

function getBillDisplayStatus(bill: CreditCardBill): { displayStatus: DisplayStatusType; remaining: number | null } {
  const status = bill.status as BillStatusType;
  const total = bill.total_value;
  const paid = bill.paid_amount;

  if (status === 'overdue') return { displayStatus: 'overdue', remaining: null };
  if (bill.requires_manual_check) return { displayStatus: 'manual_check', remaining: null };
  if (status === 'open') return { displayStatus: 'open', remaining: null };

  if (status === 'paid') {
    if (paid != null && paid < total) {
      return { displayStatus: 'partial', remaining: total - paid };
    }
    return { displayStatus: 'paid', remaining: null };
  }

  // closed
  if (paid == null || paid === 0) {
    return { displayStatus: 'awaiting', remaining: null };
  }
  if (paid < total) {
    return { displayStatus: 'partial', remaining: total - paid };
  }
  return { displayStatus: 'paid', remaining: null };
}

const PAYMENT_KEYWORDS = [
  'pagamento de fatura',
  'pagamento recebido',
  'pagto fatura',
  'pgto fatura',
  'pag fatura',
  'recebido',
  'desconto antecipação',
  'credit card payment',
  'estorno',
];

function isPaymentTransaction(tx: CreditCardTransaction): boolean {
  const desc = (tx.friendly_name || tx.store_name || '').toLowerCase();
  return PAYMENT_KEYWORDS.some(kw => desc.includes(kw));
}

interface CardInfo {
  id: string;
  name: string;
  color: string;
  number?: string;
  connectorName?: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
  cardBrand?: string | null;
  cardLevel?: string | null;
}

interface BillTransactionsViewProps {
  bills: CreditCardBill[];
  transactions: CreditCardTransaction[];
  onRefreshBills: () => void;
  availableCards: CardInfo[];
}

interface ProjectedInstallment {
  id: string;
  store_name: string;
  friendly_name: string | null;
  value: number;
  transaction_date: string;
  installment_current: number;
  installment_total: number;
  category: string | null;
  card_id: string | null;
  display_installment: string;
  isProjection: true;
  purchase_date: string | null;
}

type DisplayTransaction = (CreditCardTransaction & { isProjection?: false }) | ProjectedInstallment;

export const BillTransactionsView: React.FC<BillTransactionsViewProps> = ({
  bills,
  transactions,
  onRefreshBills,
  availableCards,
}) => {
  const { isHidden } = useVisibility();
  const [selectedBill, setSelectedBill] = useState<CreditCardBill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  
  const [editTransaction, setEditTransaction] = useState<CreditCardTransaction | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [currentMonth, setCurrentMonth] = useState(() =>
    getActiveBillingMonth(bills)
  );

  const formatCurrency = useCallback((value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [isHidden]);

const monthBills = useMemo(() => {
  const realBills = bills
    .filter(b => b.due_date.substring(0, 7) === currentMonth)
    
    .sort((a, b) => a.card_id.localeCompare(b.card_id));

  const cardsWithBill = new Set(realBills.map(b => b.card_id));

  const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

  const virtualBills: CreditCardBill[] = [];
  const cardFilter = [...new Set(bills.map(b => b.card_id))];

  cardFilter.forEach(cardId => {
    if (cardsWithBill.has(cardId)) return;

    const cardBills = bills
      .filter(b => b.card_id === cardId)
      .sort((a, b) => b.due_date.localeCompare(a.due_date));

    if (cardBills.length === 0) return;

    const lastBill = cardBills[0];
    const lastDue = parseISO(lastBill.due_date);
    const lastClosing = parseISO(lastBill.closing_date);

    const dueDay = isValid(lastDue) ? lastDue.getDate() : 1;

    const dueIdx = isValid(lastDue) ? monthIndex(lastDue) : 0;
    const closingIdx = isValid(lastClosing) ? monthIndex(lastClosing) : dueIdx - 1;
    const closingMonthOffset = Math.max(1, dueIdx - closingIdx);

    const closingDay = isValid(lastClosing) && lastBill.closing_date !== lastBill.due_date
      ? lastClosing.getDate()
      : Math.min(28, dueDay);

    const viewYear = parseInt(currentMonth.substring(0, 4));
    const viewMonthNum = parseInt(currentMonth.substring(5, 7));

    const projDue = new Date(viewYear, viewMonthNum - 1, dueDay);
    const projClosing = new Date(viewYear, viewMonthNum - 1 - closingMonthOffset, closingDay);

    if (isValid(lastClosing) && projClosing <= lastClosing) return;

    const closingStr = `${projClosing.getFullYear()}-${String(projClosing.getMonth() + 1).padStart(2, '0')}-${String(projClosing.getDate()).padStart(2, '0')}`;
    const dueStr = `${projDue.getFullYear()}-${String(projDue.getMonth() + 1).padStart(2, '0')}-${String(projDue.getDate()).padStart(2, '0')}`;

    virtualBills.push({
      id: `virtual-${cardId}-${currentMonth}`,
      user_id: lastBill.user_id,
      card_id: cardId,
      card_name: lastBill.card_name,
      closing_date: closingStr,
      due_date: dueStr,
      total_value: 0,
      paid_amount: null,
      status: 'open' as const,
      lancamento_id: null,
      billing_month: currentMonth,
      created_at: '',
      updated_at: '',
      requires_manual_check: false,
      payment_source: null,
      connector_image_url: null,
      connector_primary_color: null,
      pluggy_bill_id: null,
    });
  });

  return [...realBills, ...virtualBills].sort((a, b) => a.card_id.localeCompare(b.card_id));
}, [bills, currentMonth]);

const projectedInstallments = useMemo((): ProjectedInstallment[] => {
  const monthIndex = (m: string) => {
    const [y, mm] = m.split('-').map(Number);
    return y * 12 + (mm - 1);
  };

  const billDueMonthById = new Map<string, string>();
  bills.forEach(b => {
    billDueMonthById.set(b.id, b.due_date.substring(0, 7));
  });

  const getTxDueMonth = (tx: CreditCardTransaction): string => {
    if (tx.credit_card_bill_id) {
      const dm = billDueMonthById.get(tx.credit_card_bill_id);
      if (dm) return dm;
    }
    return tx.transaction_date.substring(0, 7);
  };

  const normalize = (name: string) =>
    name
      .replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const groups = new Map<string, CreditCardTransaction[]>();
  transactions.forEach(tx => {
    if (isPaymentTransaction(tx)) return;
    if (!tx.card_id) return;
    if (!tx.installment_total || tx.installment_total <= 1) return;
    if (!tx.installment_current) return;

    const key = `${tx.card_id}::${normalize(tx.friendly_name || tx.store_name)}::${tx.installment_total}`;
    const list = groups.get(key) || [];
    list.push(tx);
    groups.set(key, list);
  });

  const projected: ProjectedInstallment[] = [];

  groups.forEach((txs, key) => {
    const total = txs[0].installment_total!;
    const maxCurrent = Math.max(...txs.map(t => t.installment_current || 1));
    const minCurrent = Math.min(...txs.map(t => t.installment_current || 1));

    const earliestTx = txs.find(t => (t.installment_current || 1) === minCurrent) || txs[0];
    const earliestBilledMonth = getTxDueMonth(earliestTx);

    const [ey, em] = earliestBilledMonth.split('-').map(Number);
    const firstBillingDate = new Date(ey, em - 1 - (minCurrent - 1), 1);
    const firstBillingMonth = `${firstBillingDate.getFullYear()}-${String(firstBillingDate.getMonth() + 1).padStart(2, '0')}`;

    const expectedInstallment = monthIndex(currentMonth) - monthIndex(firstBillingMonth) + 1;
    if (expectedInstallment < 1 || expectedInstallment > total) return;

    const existsInThisMonth = txs.some(t =>
      (t.installment_current || 0) === expectedInstallment && getTxDueMonth(t) === currentMonth
    );
    if (existsInThisMonth) return;

    const lastTx = txs.find(t => (t.installment_current || 0) === maxCurrent) || txs[0];

    const todayStr = new Date().toISOString().split('T')[0];

    // Only project if this card's bill for this month is still open
    // A bill is considered closed if: status is 'paid', or closing_date has passed
    const cardBillsThisMonth = monthBills.filter(b => b.card_id === lastTx.card_id);
    const allBillsClosed = cardBillsThisMonth.length > 0 && cardBillsThisMonth.every(b => {
      if (b.status === 'paid') return true;
      if (b.closing_date && b.closing_date <= todayStr) return true;
      return false;
    });
    if (allBillsClosed) return;

    const [cy, cm] = currentMonth.split('-').map(Number);
    const originalDay = parseInt(toDateOnly(earliestTx.transaction_date).split('-')[2], 10);
    const projectedDate = clampDayToMonth(cy, cm, originalDay);

    projected.push({
      id: `proj-${key}-${currentMonth}-${expectedInstallment}`,
      store_name: lastTx.store_name,
      friendly_name: lastTx.friendly_name,
      value: lastTx.value,
      transaction_date: projectedDate,
      installment_current: expectedInstallment,
      installment_total: total,
      category: lastTx.category,
      card_id: lastTx.card_id,
      isProjection: true,
      display_installment: `${String(expectedInstallment).padStart(2, '0')}/${String(total).padStart(2, '0')}`,
      purchase_date: earliestTx.purchase_date || earliestTx.transaction_date.split('T')[0],
    });
  });

  return projected.sort((a, b) => b.value - a.value || a.store_name.localeCompare(b.store_name));
}, [transactions, bills, currentMonth]);

  const transactionsByBill = useMemo(() => {
    const map = new Map<string, DisplayTransaction[]>();
    const addedTxIds = new Set<string>();

    const getEffectiveClosing = (bill: CreditCardBill): string => {
      if (bill.closing_date && bill.closing_date !== bill.due_date) {
        const cd = parseISO(bill.closing_date);
        if (isValid(cd)) return bill.closing_date;
      }
      const due = parseISO(bill.due_date);
      if (!isValid(due)) return bill.closing_date;
      const effective = new Date(due);
      effective.setDate(effective.getDate() - 7);
      return `${effective.getFullYear()}-${String(effective.getMonth() + 1).padStart(2, '0')}-${String(effective.getDate()).padStart(2, '0')}`;
    };

    const allBillsIncludingVirtual = [...bills, ...monthBills.filter(b => b.id.startsWith('virtual-'))];
    const allBillsSorted = allBillsIncludingVirtual.sort((a, b) => getEffectiveClosing(a).localeCompare(getEffectiveClosing(b)));
    const billsByCard = new Map<string, CreditCardBill[]>();
    const seenBillIds = new Set<string>();
    allBillsSorted.forEach(b => {
      if (seenBillIds.has(b.id)) return;
      seenBillIds.add(b.id);
      const list = billsByCard.get(b.card_id) || [];
      list.push(b);
      billsByCard.set(b.card_id, list);
    });

    const billRanges = new Map<string, { prevClosing: string; closing: string }>();
    const monthBillIds = new Set(monthBills.map(b => b.id));
    monthBills.forEach(bill => {
      const cardBills = billsByCard.get(bill.card_id) || [];
      const idx = cardBills.findIndex(b => b.id === bill.id);
      const closing = getEffectiveClosing(bill);

      const prevClosing = (() => {
        if (bill.id.startsWith('virtual-')) {
          const d = parseISO(closing);
          if (!isValid(d)) return '1900-01-01';
          const prev = new Date(d);
          prev.setMonth(prev.getMonth() - 1);
          return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
        }
        return idx > 0 ? getEffectiveClosing(cardBills[idx - 1]) : '1900-01-01';
      })();

      billRanges.set(bill.id, { prevClosing, closing });
    });

    const addTx = (billId: string, tx: CreditCardTransaction, source: string) => {
      if (addedTxIds.has(tx.id)) return;
      addedTxIds.add(tx.id);
      const existing = map.get(billId) || [];
      existing.push({ ...tx, isProjection: false as const });
      map.set(billId, existing);
    };

    transactions.forEach(tx => {
      if (isPaymentTransaction(tx)) return;
      if (!tx.card_id) return;

      const txDate = tx.transaction_date.split('T')[0].substring(0, 10);

      if (tx.credit_card_bill_id && monthBillIds.has(tx.credit_card_bill_id) && tx.bill_from_pluggy) {
        addTx(tx.credit_card_bill_id, tx, 'pluggy_bill_id');
        return;
      }

      const dateMatchBill = monthBills.find(b => {
        if (b.card_id !== tx.card_id) return false;
        const range = billRanges.get(b.id);
        if (!range) return false;
        return txDate > range.prevClosing && txDate <= range.closing;
      });

      if (dateMatchBill) {
        addTx(dateMatchBill.id, tx, 'date_range');
        return;
      }
    });

    projectedInstallments.forEach(proj => {

      const matchedBill = monthBills.find(b => b.card_id === proj.card_id);
      if (matchedBill) {
        const existing = map.get(matchedBill.id) || [];
        existing.push(proj);
        map.set(matchedBill.id, existing);
      } else {
        const existing = map.get('__projected__') || [];
        existing.push(proj);
        map.set('__projected__', existing);
      }
    });

    map.forEach((txs, key) => {
      const deduped: DisplayTransaction[] = [];
      const seenGroups = new Map<string, DisplayTransaction>();

      for (const tx of txs) {
        if (tx.isProjection || !tx.installment_total || tx.installment_total <= 1) {
          deduped.push(tx);
          continue;
        }

        const baseName = (tx.friendly_name || tx.store_name || '')
          .replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        const groupKey = `${baseName}::${tx.installment_total}::${tx.card_id || ''}`;

        const existing = seenGroups.get(groupKey);
        if (!existing) {
          seenGroups.set(groupKey, tx);
          deduped.push(tx);
        } else {
          if ((tx.installment_current || 999) < (existing.installment_current || 999)) {
            const idx = deduped.indexOf(existing);
            if (idx !== -1) deduped[idx] = tx;
            seenGroups.set(groupKey, tx);
          }
        }
      }

      deduped.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      map.set(key, deduped);
    });
    return map;
  }, [transactions, monthBills, bills, projectedInstallments]);

  const unlinkedTransactions: DisplayTransaction[] = [];
  const projectedUnlinked = transactionsByBill.get('__projected__') || [];

  const getBillTotal = useCallback((bill: CreditCardBill) => {
    if (bill.id.startsWith('virtual-')) {
      const txs = transactionsByBill.get(bill.id) || [];
      return txs.reduce((sum, tx) => sum + tx.value, 0);
    }
    return bill.total_value;
  }, [transactionsByBill]);

  const monthTotal = useMemo(() =>
    monthBills.reduce((sum, b) => sum + getBillTotal(b), 0),
    [monthBills, getBillTotal]
  );

  const paidCount = useMemo(() =>
    monthBills.filter(b => b.status === 'paid').length,
    [monthBills]
  );

  const monthLabel = useMemo(() => {
    try {
      return format(parseISO(`${currentMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return currentMonth;
    }
  }, [currentMonth]);

  const toggleBill = (billId: string) => {
    setExpandedBills(prev => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };

  // Reset expanded state when month changes (all collapsed by default)
  useEffect(() => {
    setExpandedBills(new Set());
  }, [currentMonth]);

  const handlePayBill = (bill: CreditCardBill) => {
    setSelectedBill(bill);
    setPaymentDialogOpen(true);
  };


  const buildExportRows = useCallback(() => {
    const rows: { Cartão: string; 'Data da Compra': string; 'Data da Cobrança': string; Descrição: string; Valor: number }[] = [];
    
    monthBills.forEach(bill => {
      const billTxs = transactionsByBill.get(bill.id) || [];
      const cardLabel = (() => {
        const card = availableCards.find(c => c.id === bill.card_id);
        if (!card) return 'Cartão de Crédito';
        if (card.number) return `${card.connectorName || card.name} (•••• ${card.number.slice(-4)})`;
        return card.name;
      })();
      
      billTxs.forEach(tx => {
        const installment = (() => {
          const c = 'installment_current' in tx ? tx.installment_current : null;
          const t = 'installment_total' in tx ? tx.installment_total : null;
          return c && t && t > 1 ? ` (${c}/${t})` : '';
        })();
        
        rows.push({
          'Cartão': cardLabel,
          'Data da Compra': format(parseISO(tx.transaction_date), 'dd/MM/yyyy'),
          'Data da Cobrança': bill.due_date ? format(parseISO(bill.due_date), 'dd/MM/yyyy') : '—',
          'Descrição': `${tx.friendly_name || tx.store_name}${installment}${tx.isProjection ? ' (Projeção)' : ''}`,
          'Valor': tx.value,
        });
      });
    });

    (transactionsByBill.get('__unlinked__') || []).forEach(tx => {
      const card = availableCards.find(c => c.id === tx.card_id);
      rows.push({
        'Cartão': card ? (card.connectorName || card.name) : 'Sem cartão',
        'Data da Compra': format(parseISO(tx.transaction_date), 'dd/MM/yyyy'),
        'Data da Cobrança': '—',
        'Descrição': tx.friendly_name || tx.store_name,
        'Valor': tx.value,
      });
    });

    (transactionsByBill.get('__projected__') || []).forEach(tx => {
      const card = availableCards.find(c => c.id === tx.card_id);
      rows.push({
        'Cartão': card ? (card.connectorName || card.name) : 'Sem cartão',
        'Data da Compra': format(parseISO(tx.transaction_date), 'dd/MM/yyyy'),
        'Data da Cobrança': '—',
        'Descrição': `${tx.friendly_name || tx.store_name} (Projeção)`,
        'Valor': tx.value,
      });
    });

    return rows;
  }, [monthBills, transactionsByBill, availableCards]);

  const exportToExcel = useCallback(() => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faturas');
    XLSX.writeFile(wb, `faturas-${currentMonth}.xlsx`);
  }, [buildExportRows, currentMonth]);

  const exportToCSV = useCallback(() => {
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faturas-${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExportRows, currentMonth]);

  const getCardLabel = (cardId: string) => {
    const card = availableCards.find(c => c.id === cardId);
    if (!card) return 'Cartão de Crédito';
    const parts: string[] = [];
    if (card.cardBrand) parts.push(card.cardBrand.charAt(0) + card.cardBrand.slice(1).toLowerCase());
    if (card.cardLevel) parts.push(card.cardLevel);
    if (parts.length === 0) parts.push(card.connectorName || card.name);
    if (card.number) parts.push(`(•••• ${card.number.slice(-4)})`);
    return parts.join(' ');
  };

  const getOverallStatus = (): DisplayStatusType => {
    if (monthBills.length === 0) return 'open';
    if (monthBills.every(b => b.status === 'paid')) return 'paid';
    if (monthBills.some(b => b.status === 'closed')) return 'closed';
    return 'open';
  };

  const overallStatus = getOverallStatus();
  const overallConfig = statusConfig[overallStatus];
  const OverallIcon = overallConfig.icon;

  const getInstallmentInfo = (tx: DisplayTransaction): { current: number; total: number } | null => {
    const current = 'installment_current' in tx ? tx.installment_current : null;
    const total = 'installment_total' in tx ? tx.installment_total : null;
    if (current && total && total > 1) return { current, total };

    const name = tx.friendly_name || tx.store_name || '';
    const match = name.match(/(\d{1,2})\s*[\/\\]\s*(\d{1,2})\s*$/);
    if (match) {
      const c = parseInt(match[1]);
      const t = parseInt(match[2]);
      if (c <= t && t <= 48 && t > 1) return { current: c, total: t };
    }
    return null;
  };

  /* ─── Transaction list header ─── */
  const renderTransactionHeader = () => (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_88px] sm:grid-cols-[56px_1fr_64px_88px] items-center py-2.5 px-4 border-b border-border/30 bg-muted/30">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Data</span>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest min-w-0">Descrição</span>
      <span className="hidden sm:block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Parc.</span>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Valor</span>
    </div>
  );

  /* ─── Single transaction row ─── */
  const renderTransaction = (tx: DisplayTransaction, billDueDate?: string, index?: number) => {
    const installmentInfo = getInstallmentInfo(tx);
    const isProjection = tx.isProjection === true;
    const isEven = index !== undefined && index % 2 === 0;

    return (
      <div
        key={tx.id}
        onClick={() => {
          if (!isProjection) {
            setEditTransaction(tx as CreditCardTransaction);
          }
        }}
        className={cn(
          "grid grid-cols-[56px_minmax(0,1fr)_88px] sm:grid-cols-[56px_1fr_64px_88px] items-center py-2 px-4 transition-colors cursor-pointer group",
          isProjection
            ? "border-l-2 border-l-violet-300 dark:border-l-violet-700 bg-violet-50/20 dark:bg-violet-950/10"
            : isEven
              ? "bg-muted/15"
              : "bg-transparent",
          !isProjection && "hover:bg-muted/30"
        )}
      >
        {/* Data */}
        <div className="flex flex-col shrink-0">
          <span className="text-xs font-medium text-muted-foreground tabular-nums font-mono">
            {tx.transaction_date && isValid(parseISO(tx.transaction_date)) ? format(parseISO(tx.transaction_date), 'dd/MM') : '—'}
          </span>
          {(() => {
            const pd = 'purchase_date' in tx ? (tx as any).purchase_date : null;
            if (!pd) return null;
            const pdStr = typeof pd === 'string' ? pd.split('T')[0] : null;
            const tdStr = tx.transaction_date?.split('T')[0];
            if (!pdStr || pdStr === tdStr) return null;
            try {
              return (
                <span className="text-[9px] text-muted-foreground/60 tabular-nums font-mono leading-tight">
                  compra {format(parseISO(pdStr), 'dd/MM')}
                </span>
              );
            } catch { return null; }
          })()}
        </div>
        {/* Descrição / Estabelecimento */}
        <div className="flex items-center gap-1.5 min-w-0 pr-2 max-w-[160px] sm:max-w-none">
          <span
            className={cn(
              "text-xs truncate",
              isProjection ? "text-muted-foreground italic" : "text-muted-foreground font-medium"
            )}
          >
            {tx.friendly_name || tx.store_name}
          </span>
          {isProjection && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-700 font-medium">
              Projeção
            </Badge>
          )}
        </div>
        {/* Parcelamento — oculto em mobile */}
        <div className="hidden sm:block text-center">
          {installmentInfo ? (
            <span
              className={cn(
                "text-xs font-mono tabular-nums",
                isProjection ? "text-muted-foreground/60" : "text-muted-foreground"
              )}
            >
              {String(installmentInfo.current).padStart(2, '0')}/{String(installmentInfo.total).padStart(2, '0')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/20">—</span>
          )}
        </div>
        {/* Valor */}
        <span
          className={cn(
            "text-xs font-mono font-medium tabular-nums text-right shrink-0",
            isProjection ? "text-muted-foreground" : "text-muted-foreground"
          )}
        >
          {formatCurrency(tx.value)}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Controls: month navigation first */}
        <div className="flex flex-col gap-3">
          {/* Month navigation - full width */}
          <MonthSelector selectedMonth={currentMonth} onMonthChange={setCurrentMonth} activeMonth={getActiveBillingMonth(bills)} />

          {/* Month label + actions row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                overallStatus === 'paid' ? "bg-emerald-50 dark:bg-emerald-950/30" : overallStatus === 'closed' ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/50"
              )}>
                <Calendar className={cn(
                  "h-4.5 w-4.5",
                  overallStatus === 'paid' ? "text-emerald-600 dark:text-emerald-400" : overallStatus === 'closed' ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                )} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold capitalize tracking-tight text-foreground">{monthLabel}</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Single export button with popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-border/50 hover:bg-muted/30 transition-all"
                    title="Exportar"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1.5 rounded-xl border-border/50" align="end">
                  <div className="space-y-0.5">
                    <button
                      onClick={exportToExcel}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      CSV (.csv)
                    </button>
                  </div>
                </PopoverContent>
              </Popover>


            </div>
          </div>

          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/50 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Bills list */}
          {monthBills.length === 0 && unlinkedTransactions.length === 0 && projectedUnlinked.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
              <p className="font-medium text-sm">Nenhuma fatura para <span className="capitalize">{monthLabel}</span></p>
              <p className="text-xs mt-1 text-muted-foreground/70">Sincronize via Open Finance ou importe faturas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthBills.map(bill => {
                const { displayStatus, remaining } = getBillDisplayStatus(bill);
                const config = statusConfig[displayStatus];
                const StatusIcon = config.icon;
                const allBillTxs = transactionsByBill.get(bill.id) || [];
                const billTxs = searchQuery.trim()
                  ? allBillTxs.filter(tx => {
                      const q = searchQuery.toLowerCase();
                      const name = (tx.friendly_name || tx.store_name || '').toLowerCase();
                      const cat = ('category' in tx ? (tx.category || '') : '').toLowerCase();
                      return name.includes(q) || cat.includes(q);
                    })
                  : allBillTxs;
                const isExpanded = expandedBills.has(bill.id);
                const isOverdue = displayStatus !== 'paid' && displayStatus !== 'partial' && new Date(bill.due_date) < new Date();

                // Hide bill card if search active and no matching transactions
                if (searchQuery.trim() && billTxs.length === 0) return null;

                return (
                  <Collapsible
                    key={bill.id}
                    open={isExpanded}
                    onOpenChange={() => toggleBill(bill.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex flex-col p-4 rounded-xl border transition-all group",
                          isOverdue
                            ? "border-red-200/80 bg-red-50/30 hover:bg-red-50/50 dark:border-red-800/30 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                            : isExpanded
                              ? "border-border/60 bg-muted/40 dark:bg-muted/20"
                              : "border-border/50 bg-muted/25 hover:bg-muted/45 hover:border-border/70 dark:bg-muted/10 dark:hover:bg-muted/20"
                        )}
                      >
                        {/* Row 1: Card chip + badge + chevron */}
                        <div className="w-full flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {(() => {
                              const card = availableCards.find(c => c.id === bill.card_id);
                              return (
                                <CreditCardChip
                                  bankName={card?.connectorName || card?.name || 'Cartão'}
                                  bankImageUrl={card?.imageUrl}
                                  bankPrimaryColor={card?.primaryColor}
                                  cardBrand={card?.cardBrand}
                                  cardLevel={card?.cardLevel}
                                  lastFourDigits={card?.number}
                                />
                              );
                            })()}
                            <p className="font-semibold text-sm tracking-tight truncate min-w-0 hidden sm:block">
                              {getCardLabel(bill.card_id)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium whitespace-nowrap", config.className)}>
                              <StatusIcon className="h-2.5 w-2.5 mr-0.5" strokeWidth={1.5} />
                              {config.label}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium whitespace-nowrap bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/60">
                                Vencida
                              </Badge>
                            )}
                            <div className="text-muted-foreground/50">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                              ) : (
                                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile only: Card name below chip */}
                        <p className="font-semibold text-sm tracking-tight mt-1.5 sm:hidden">
                          {getCardLabel(bill.card_id)}
                        </p>

                        {/* Dates + items + value */}
                        <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono tabular-nums">Fecha {format(parseISO(bill.closing_date), 'dd/MM')}</span>
                              {(() => {
                                const due = parseISO(bill.due_date);
                                const closing = parseISO(bill.closing_date);
                                const diffMs = due.getTime() - closing.getTime();
                                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                                const isEstimate = bill.closing_date === bill.due_date || diffDays === 7;
                                return isEstimate ? (
                                  <span className="text-amber-500 italic text-[10px]" title="Data de fechamento estimada">~aprox.</span>
                                ) : null;
                              })()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono tabular-nums">Vence {format(parseISO(bill.due_date), 'dd/MM')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                {billTxs.length} {billTxs.length === 1 ? 'item' : 'itens'}
                              </p>
                              <p className={cn(
                                "font-bold text-xl sm:text-2xl font-mono tabular-nums tracking-tight",
                                displayStatus === 'paid' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                              )}>
                                {formatCurrency(getBillTotal(bill))}
                              </p>
                            </div>
                            {displayStatus !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 border-border/50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePayBill(bill);
                                }}
                              >
                                <Wallet className="h-3 w-3 mr-1" strokeWidth={1.5} />
                                Pagar
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Partial payment alert */}
                        {remaining != null && remaining > 0 && (
                          <div className="w-full mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs" onClick={(e) => e.stopPropagation()}>
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            <span className="font-medium">Pagamento Parcial: Restam {formatCurrency(remaining)}</span>
                          </div>
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1.5 rounded-xl border border-border/30 overflow-hidden bg-card">
                        {billTxs.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 py-6 px-4 text-center italic">
                            Nenhum lançamento vinculado
                          </p>
                        ) : (
                          <div className="overflow-x-auto min-w-0">
                            {renderTransactionHeader()}
                            {billTxs.map((tx, idx) => renderTransaction(tx, bill.due_date, idx))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Unlinked transactions */}
              {unlinkedTransactions.length > 0 && (
                <Collapsible
                  open={expandedBills.has('__unlinked__')}
                  onOpenChange={() => toggleBill('__unlinked__')}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-border/40 bg-muted/5 hover:bg-muted/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm text-muted-foreground">Sem Fatura Vinculada</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {unlinkedTransactions.length} lançamento{unlinkedTransactions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-sm text-muted-foreground font-mono tabular-nums">
                          {formatCurrency(unlinkedTransactions.reduce((s, tx) => s + tx.value, 0))}
                        </p>
                        <div className="text-muted-foreground/40">
                          {expandedBills.has('__unlinked__') ? (
                            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1.5 rounded-xl border border-border/30 overflow-hidden bg-card">
                      <div className="overflow-x-auto min-w-0">
                        {renderTransactionHeader()}
                        {unlinkedTransactions.map((tx, idx) => renderTransaction(tx, undefined, idx))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Projected installments without a bill */}
              {projectedUnlinked.length > 0 && (
                <Collapsible
                  open={expandedBills.has('__projected__')}
                  onOpenChange={() => toggleBill('__projected__')}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-violet-200/60 bg-violet-50/20 hover:bg-violet-50/40 dark:border-violet-800/30 dark:bg-violet-950/10 dark:hover:bg-violet-950/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                          <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm text-violet-700 dark:text-violet-300">Parcelas Projetadas</p>
                          <p className="text-[10px] text-muted-foreground">
                            {projectedUnlinked.length} parcela{projectedUnlinked.length !== 1 ? 's' : ''} futuras
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-sm text-violet-700 dark:text-violet-300 font-mono tabular-nums">
                          {formatCurrency(projectedUnlinked.reduce((s, tx) => s + tx.value, 0))}
                        </p>
                        <div className="text-muted-foreground/40">
                          {expandedBills.has('__projected__') ? (
                            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1.5 rounded-xl border border-border/30 overflow-hidden bg-card">
                      <div className="overflow-x-auto min-w-0">
                        {renderTransactionHeader()}
                        {projectedUnlinked.map((tx, idx) => renderTransaction(tx, undefined, idx))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </div>

      <BillPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        bill={selectedBill}
        onPaymentComplete={onRefreshBills}
      />

      <InstallmentEditDialog
        open={!!editTransaction}
        onOpenChange={(open) => { if (!open) setEditTransaction(null); }}
        transaction={editTransaction}
        onSuccess={() => {
          setEditTransaction(null);
          onRefreshBills();
        }}
      />
    </>
  );
};
