import React, { useState, useMemo } from 'react';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { SectionCard } from '@/components/shared/SectionCard';
import { CardHealthAnalytics } from '@/components/cartao/CardHealthAnalytics';
import { InteractiveTreemap, TreemapItem } from '@/components/charts/InteractiveTreemap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { expenseCategories } from '@/data/defaultData';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import { premiumXAxis, premiumTooltipStyle, CHART_PALETTE } from '@/components/charts/premiumChartTheme';
import {
  PieChart, Calendar, LayoutGrid, CalendarRange, ShoppingCart, TrendingUp,
} from 'lucide-react';
import { MonthlyPurchasesDetail } from './MonthlyPurchasesDetail';
import { BillCompositionDetail } from './BillCompositionDetail';
import { isConsumptionTransaction } from '@/utils/creditCardFilters';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';

const COLORS = [...CHART_PALETTE, 'hsl(230, 65%, 55%)', 'hsl(5, 80%, 50%)', 'hsl(180, 65%, 40%)', 'hsl(60, 70%, 45%)'];

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CHART_HEIGHT = 260;

// Period types for pie/treemap charts (existing)
type PeriodType = 'thisMonth' | 'last2Months' | 'custom';
// Period types for time-series charts (new)
type TimeSeriesPeriodType = 'last6Months' | 'last12Months' | 'last24Months' | 'custom';

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function subtractMonths(y: number, m: number, count: number): string {
  let totalMonths = y * 12 + (m - 1) - count;
  const newY = Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12) + 1;
  return getMonthKey(newY, newM);
}

function getPeriodRange(period: PeriodType, customStart: string | null, customEnd: string | null) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  if (period === 'thisMonth') {
    const k = getMonthKey(cy, cm);
    return { start: k, end: k };
  }
  if (period === 'last2Months') {
    const prev = cm === 1 ? getMonthKey(cy - 1, 12) : getMonthKey(cy, cm - 1);
    return { start: prev, end: getMonthKey(cy, cm) };
  }
  return {
    start: customStart || getMonthKey(cy, cm),
    end: customEnd || getMonthKey(cy, cm),
  };
}

function getTimeSeriesRange(period: TimeSeriesPeriodType, customStart: string | null, customEnd: string | null) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const end = getMonthKey(cy, cm);

  if (period === 'last6Months') return { start: subtractMonths(cy, cm, 5), end };
  if (period === 'last12Months') return { start: subtractMonths(cy, cm, 11), end };
  if (period === 'last24Months') return { start: subtractMonths(cy, cm, 23), end };
  return {
    start: customStart || subtractMonths(cy, cm, 11),
    end: customEnd || end,
  };
}

function getTimeSeriesLabel(period: TimeSeriesPeriodType, customStart: string | null, customEnd: string | null) {
  if (period === 'last6Months') return 'Últimos 6 meses';
  if (period === 'last12Months') return 'Últimos 12 meses';
  if (period === 'last24Months') return 'Últimos 24 meses';
  const [sy, sm] = (customStart || '').split('-').map(Number);
  const [ey, em] = (customEnd || '').split('-').map(Number);
  const s = new Date(sy, sm - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  const e = new Date(ey, em - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  return s === e ? `Dados de ${s}` : `${s} a ${e}`;
}

function getPeriodLabel(period: PeriodType, customStart: string | null, customEnd: string | null) {
  if (period === 'thisMonth') {
    return 'Dados referenciados deste mês';
  }
  if (period === 'last2Months') {
    return 'Últimos 2 meses';
  }
  const [sy, sm] = (customStart || '').split('-').map(Number);
  const [ey, em] = (customEnd || '').split('-').map(Number);
  const s = new Date(sy, sm - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  const e = new Date(ey, em - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  return s === e ? `Dados de ${s}` : `${s} a ${e}`;
}

// Inline period filter for time-series charts (6m, 12m, 24m, custom)
function TimeSeriesPeriodFilter({
  chartTitle,
  period, setPeriod,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
}: {
  chartTitle: string;
  period: TimeSeriesPeriodType;
  setPeriod: (p: TimeSeriesPeriodType) => void;
  customStart: string | null;
  setCustomStart: (v: string) => void;
  customEnd: string | null;
  setCustomEnd: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = getTimeSeriesLabel(period, customStart, customEnd);
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const startMonth = customStart?.split('-')[1] || '01';
  const startYear = customStart?.split('-')[0] || String(currentYear);
  const endMonth = customEnd?.split('-')[1] || String(new Date().getMonth() + 1).padStart(2, '0');
  const endYear = customEnd?.split('-')[0] || String(currentYear);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <span>{label}</span>
          <CalendarRange className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Personalizar período – {chartTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          {([
            ['last6Months', '6 meses'],
            ['last12Months', '12 meses'],
            ['last24Months', '24 meses'],
            ['custom', 'Personalizado'],
          ] as const).map(([key, lbl]) => (
            <Button
              key={key}
              variant={period === key ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => {
                setPeriod(key);
                if (key !== 'custom') setOpen(false);
              }}
            >
              {lbl}
            </Button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-xs text-muted-foreground">De:</span>
            <Select value={startMonth} onValueChange={(m) => setCustomStart(`${startYear}-${m}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name}</SelectItem>
              ))}</SelectContent>
            </Select>
            <Select value={startYear} onValueChange={(y) => setCustomStart(`${y}-${startMonth}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}</SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground">até</span>
            <Select value={endMonth} onValueChange={(m) => setCustomEnd(`${endYear}-${m}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name}</SelectItem>
              ))}</SelectContent>
            </Select>
            <Select value={endYear} onValueChange={(y) => setCustomEnd(`${y}-${endMonth}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}</SelectContent>
            </Select>

            <Button size="sm" className="h-7 text-xs px-3 ml-auto" onClick={() => setOpen(false)}>
              Aplicar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Inline period filter button + dialog (existing, for pie/treemap)
function InlinePeriodFilter({
  chartTitle,
  period, setPeriod,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
}: {
  chartTitle: string;
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  customStart: string | null;
  setCustomStart: (v: string) => void;
  customEnd: string | null;
  setCustomEnd: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = getPeriodLabel(period, customStart, customEnd);
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const startMonth = customStart?.split('-')[1] || '01';
  const startYear = customStart?.split('-')[0] || String(currentYear);
  const endMonth = customEnd?.split('-')[1] || String(new Date().getMonth() + 1).padStart(2, '0');
  const endYear = customEnd?.split('-')[0] || String(currentYear);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <span>{label}</span>
          <CalendarRange className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Personalizar período – {chartTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          <Button
            variant={period === 'thisMonth' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => { setPeriod('thisMonth'); setOpen(false); }}
          >
            Este mês
          </Button>
          <Button
            variant={period === 'last2Months' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => { setPeriod('last2Months'); setOpen(false); }}
          >
            Últimos 2 meses
          </Button>
          <Button
            variant={period === 'custom' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setPeriod('custom')}
          >
            Personalizado
          </Button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <span className="text-xs text-muted-foreground">De:</span>
            <Select value={startMonth} onValueChange={(m) => setCustomStart(`${startYear}-${m}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name}</SelectItem>
              ))}</SelectContent>
            </Select>
            <Select value={startYear} onValueChange={(y) => setCustomStart(`${y}-${startMonth}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}</SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground">até</span>
            <Select value={endMonth} onValueChange={(m) => setCustomEnd(`${endYear}-${m}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name}</SelectItem>
              ))}</SelectContent>
            </Select>
            <Select value={endYear} onValueChange={(y) => setCustomEnd(`${y}-${endMonth}`)}>
              <SelectTrigger className="h-7 w-[72px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}</SelectContent>
            </Select>

            <Button size="sm" className="h-7 text-xs px-3 ml-auto" onClick={() => setOpen(false)}>
              Aplicar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface AnalyticsChartsSectionProps {
  bills: CreditCardBill[];
  availableCards: Array<{ id: string; name: string; color: string; connectorName?: string; primaryColor?: string | null }>;
  cardColorMap: Record<string, string>;
  formatCurrency: (value: number) => string;
  isHidden: boolean;
  transactions: CreditCardTransaction[];
  billMonthMap: Map<string, string>;
  currentMonth: string;
}

export const AnalyticsChartsSection: React.FC<AnalyticsChartsSectionProps> = ({
  bills, availableCards, cardColorMap, formatCurrency, isHidden,
  transactions, billMonthMap, currentMonth,
}) => {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;

  // Period state for time-series charts (6m/12m/24m/custom)
  const [evolPeriod, setEvolPeriod] = useState<TimeSeriesPeriodType>('last12Months');
  const [evolCustomStart, setEvolCustomStart] = useState<string | null>(subtractMonths(cy, cm, 11));
  const [evolCustomEnd, setEvolCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  const [healthPeriod, setHealthPeriod] = useState<TimeSeriesPeriodType>('last12Months');
  const [healthCustomStart, setHealthCustomStart] = useState<string | null>(subtractMonths(cy, cm, 11));
  const [healthCustomEnd, setHealthCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  const [purchPeriod, setPurchPeriod] = useState<TimeSeriesPeriodType>('last12Months');
  const [purchCustomStart, setPurchCustomStart] = useState<string | null>(subtractMonths(cy, cm, 11));
  const [purchCustomEnd, setPurchCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  const [compPeriod, setCompPeriod] = useState<TimeSeriesPeriodType>('last12Months');
  const [compCustomStart, setCompCustomStart] = useState<string | null>(subtractMonths(cy, cm, 11));
  const [compCustomEnd, setCompCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  // Period state for pie/treemap charts (existing)
  const [piePeriod, setPiePeriod] = useState<PeriodType>('thisMonth');
  const [pieCustomStart, setPieCustomStart] = useState<string | null>(getMonthKey(cy, cm));
  const [pieCustomEnd, setPieCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  const [treemapPeriod, setTreemapPeriod] = useState<PeriodType>('thisMonth');
  const [treemapCustomStart, setTreemapCustomStart] = useState<string | null>(getMonthKey(cy, cm));
  const [treemapCustomEnd, setTreemapCustomEnd] = useState<string | null>(getMonthKey(cy, cm));

  // Compute ranges
  const evolRange = useMemo(() => getTimeSeriesRange(evolPeriod, evolCustomStart, evolCustomEnd), [evolPeriod, evolCustomStart, evolCustomEnd]);
  const healthRange = useMemo(() => getTimeSeriesRange(healthPeriod, healthCustomStart, healthCustomEnd), [healthPeriod, healthCustomStart, healthCustomEnd]);
  const purchRange = useMemo(() => getTimeSeriesRange(purchPeriod, purchCustomStart, purchCustomEnd), [purchPeriod, purchCustomStart, purchCustomEnd]);
  const compRange = useMemo(() => getTimeSeriesRange(compPeriod, compCustomStart, compCustomEnd), [compPeriod, compCustomStart, compCustomEnd]);
  const pieRange = useMemo(() => getPeriodRange(piePeriod, pieCustomStart, pieCustomEnd), [piePeriod, pieCustomStart, pieCustomEnd]);
  const treemapRange = useMemo(() => getPeriodRange(treemapPeriod, treemapCustomStart, treemapCustomEnd), [treemapPeriod, treemapCustomStart, treemapCustomEnd]);

  // Filter bills for health chart
  const healthBills = useMemo(() =>
    bills.filter(b => {
      const m = b.due_date.substring(0, 7);
      return m >= healthRange.start && m <= healthRange.end;
    }), [bills, healthRange]);

  // Pie: filter bills by pie period
  const pieBills = useMemo(() =>
    bills.filter(b => {
      const m = b.due_date.substring(0, 7);
      return m >= pieRange.start && m <= pieRange.end;
    }), [bills, pieRange]);

  // Treemap: filter transactions by treemap period (only confirmed consumption)
  const treemapTransactions = useMemo(() =>
    transactions
      .filter(isConsumptionTransaction)
      .filter(t => {
        let m = t.transaction_date.substring(0, 7);
        if (t.credit_card_bill_id) {
          const billMonth = billMonthMap.get(t.credit_card_bill_id);
          if (billMonth) m = billMonth;
        }
        return m >= treemapRange.start && m <= treemapRange.end;
      }), [transactions, treemapRange, billMonthMap]);

  // Monthly evolution: filtered by evolRange
  const monthlyComparison = useMemo(() => {
    const cardIds = availableCards.map(c => c.id);
    const filteredBills = bills.filter(b => {
      const m = b.due_date.substring(0, 7);
      return m >= evolRange.start && m <= evolRange.end;
    });
    if (filteredBills.length === 0) return [];
    const allMonths = filteredBills.map(b => b.due_date.substring(0, 7)).sort();
    const minMonth = allMonths[0];
    const maxMonth = allMonths[allMonths.length - 1];

    const [startY, startM] = minMonth.split('-').map(Number);
    const [endY, endM] = maxMonth.split('-').map(Number);

    const data: Array<Record<string, any>> = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const monthKey = getMonthKey(y, m);
      const monthName = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const label = `${monthName}/${String(y).slice(2)}`;
      const entry: Record<string, any> = { month: label };
      let total = 0;
      cardIds.forEach(cardId => {
        const cardBills = filteredBills.filter(b => b.due_date.substring(0, 7) === monthKey && b.card_id === cardId);
        const cardTotal = cardBills.reduce((sum, b) => sum + (b.total_value || 0), 0);
        entry[cardId] = cardTotal;
        total += cardTotal;
      });
      entry.total = total;
      data.push(entry);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    const firstNonZero = data.findIndex(d => d.total > 0);
    return firstNonZero > 0 ? data.slice(firstNonZero) : data;
  }, [bills, availableCards, evolRange]);

  const hiddenMonthlyComparison = isHidden
    ? monthlyComparison.map(d => {
        const hidden: Record<string, any> = { month: d.month, total: 0 };
        availableCards.forEach(c => { hidden[c.id] = 0; });
        return hidden;
      })
    : monthlyComparison;

  // Card spending pie data (uses pieBills)
  const cardSpendingPieData = useMemo(() => {
    if (availableCards.length < 2) return [];
    const data: Array<{ name: string; value: number; color: string }> = [];
    availableCards.forEach((card) => {
      const total = pieBills
        .filter(b => b.card_id === card.id)
        .reduce((sum, b) => sum + (b.total_value || 0), 0);
      if (total > 0) {
        data.push({ name: card.connectorName || card.name, value: total, color: cardColorMap[card.id] || card.color });
      }
    });
    return data;
  }, [availableCards, pieBills, cardColorMap]);

  // Category treemap data (uses treemapTransactions)
  const categoryTreemapData: TreemapItem[] = useMemo(() => {
    const categoriesWithStores: Record<string, {
      name: string; value: number; count: number;
      stores: Record<string, { name: string; value: number; count: number }>;
    }> = {};

    treemapTransactions.forEach(transaction => {
      const categoryId = transaction.category_id || 'outros';
      const categoryName = transaction.category ||
        expenseCategories.find(c => c.id === categoryId)?.name || 'Não atribuído';
      const storeName = transaction.friendly_name || transaction.store_name || 'Outros';

      if (!categoriesWithStores[categoryId]) {
        categoriesWithStores[categoryId] = { name: categoryName, value: 0, count: 0, stores: {} };
      }
      categoriesWithStores[categoryId].value += transaction.value;
      categoriesWithStores[categoryId].count += 1;

      if (!categoriesWithStores[categoryId].stores[storeName]) {
        categoriesWithStores[categoryId].stores[storeName] = { name: storeName, value: 0, count: 0 };
      }
      categoriesWithStores[categoryId].stores[storeName].value += transaction.value;
      categoriesWithStores[categoryId].stores[storeName].count += 1;
    });

    return Object.entries(categoriesWithStores)
      .map(([id, data], index) => ({
        id, name: data.name, value: data.value, count: data.count,
        color: COLORS[index % COLORS.length],
        children: Object.entries(data.stores)
          .map(([storeKey, storeData]) => ({
            id: `${id}-${storeKey}`, name: storeData.name, value: storeData.value, count: storeData.count,
          }))
          .filter(s => s.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
      }))
      .filter(cat => cat.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [treemapTransactions]);

  // Monthly Purchases: filtered by purchRange
  const monthlyPurchases = useMemo(() => {
    const cardIds = availableCards.map(c => c.id);
    const relevantTx = transactions
      .filter(isConsumptionTransaction)
      .filter(t => {
        if (t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1) return false;
        return true;
      });
    if (relevantTx.length === 0) return [];

    const deduped: typeof relevantTx = [];
    const installmentGroups: Record<string, typeof relevantTx[0]> = {};

    relevantTx.forEach(t => {
      const isInstallment = t.installment_total && t.installment_total > 1;
      if (isInstallment) {
        const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const m = t.transaction_date.substring(0, 7);
        const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}::${m}`;
        if (!installmentGroups[key] || t.value > installmentGroups[key].value) {
          installmentGroups[key] = t;
        }
      } else {
        deduped.push(t);
      }
    });

    Object.values(installmentGroups).forEach(t => deduped.push(t));

    const monthMap: Record<string, Record<string, number>> = {};
    deduped.forEach(t => {
      const m = t.transaction_date.substring(0, 7);
      if (m < purchRange.start || m > purchRange.end) return;
      if (!monthMap[m]) monthMap[m] = {};
      const cardId = t.card_id || 'unknown';
      monthMap[m][cardId] = (monthMap[m][cardId] || 0) + t.value;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    return sortedMonths.map(mk => {
      const [y, mo] = mk.split('-').map(Number);
      const label = `${new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })}/${String(y).slice(2)}`;
      const entry: Record<string, any> = { month: label };
      let total = 0;
      cardIds.forEach(id => {
        entry[id] = monthMap[mk][id] || 0;
        total += entry[id];
      });
      entry.total = total;
      return entry;
    }).filter(d => d.total > 0);
  }, [transactions, availableCards, purchRange]);

  const hiddenMonthlyPurchases = isHidden
    ? monthlyPurchases.map(d => {
        const hidden: Record<string, any> = { month: d.month, total: 0 };
        availableCards.forEach(c => { hidden[c.id] = 0; });
        return hidden;
      })
    : monthlyPurchases;

  // Cash vs Installment: bill composition per bill month, filtered by compRange
  const cashVsInstallment = useMemo(() => {
    const monthTotals: Record<string, { currentMonth: number; previousInstallments: number }> = {};

    const currentMonthTx: typeof transactions[0][] = [];
    const installmentGroups: Record<string, typeof transactions[0]> = {};
    const previousInstallmentTx: typeof transactions[0][] = [];

    transactions.forEach(t => {
      if (!isConsumptionTransaction(t)) return;
      if (!t.credit_card_bill_id) return;
      const billMonth = billMonthMap.get(t.credit_card_bill_id);
      if (!billMonth) return;
      if (billMonth < compRange.start || billMonth > compRange.end) return;

      const isPreviousInstallment = t.installment_total && t.installment_total > 1 && t.installment_current && t.installment_current > 1;
      if (isPreviousInstallment) {
        previousInstallmentTx.push(t);
      } else {
        const isInstallment = t.installment_total && t.installment_total > 1;
        if (isInstallment) {
          const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
          const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}::${billMonth}`;
          if (!installmentGroups[key] || t.value < installmentGroups[key].value) {
            installmentGroups[key] = t;
          }
        } else {
          currentMonthTx.push(t);
        }
      }
    });

    const laterInstValues: Record<string, number> = {};
    previousInstallmentTx.forEach(t => {
      if (t.installment_total && t.installment_total > 1) {
        const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}`;
        if (!laterInstValues[key] || t.value < laterInstValues[key]) {
          laterInstValues[key] = t.value;
        }
      }
    });

    Object.values(installmentGroups).forEach(t => {
      const normalizedName = t.store_name.replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const key = `${normalizedName}::${t.card_id || 'unknown'}::${t.installment_total}`;
      const laterValue = laterInstValues[key];
      let correctedValue = t.value;
      if (laterValue && t.value > laterValue * 1.5) {
        correctedValue = laterValue;
      } else if (!laterValue && t.installment_total && t.installment_total > 1) {
        const estimated = Math.round((t.value / t.installment_total!) * 100) / 100;
        if (estimated < t.value * 0.8) correctedValue = estimated;
      }
      currentMonthTx.push({ ...t, value: correctedValue });
    });

    currentMonthTx.forEach(t => {
      const billMonth = billMonthMap.get(t.credit_card_bill_id!);
      if (!billMonth) return;
      if (!monthTotals[billMonth]) monthTotals[billMonth] = { currentMonth: 0, previousInstallments: 0 };
      monthTotals[billMonth].currentMonth += t.value;
    });

    previousInstallmentTx.forEach(t => {
      const billMonth = billMonthMap.get(t.credit_card_bill_id!);
      if (!billMonth) return;
      if (!monthTotals[billMonth]) monthTotals[billMonth] = { currentMonth: 0, previousInstallments: 0 };
      monthTotals[billMonth].previousInstallments += t.value;
    });

    const sortedMonths = Object.keys(monthTotals).sort();
    return sortedMonths.map(mk => {
      const [y, mo] = mk.split('-').map(Number);
      const label = `${new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })}/${String(y).slice(2)}`;
      return {
        month: label,
        currentMonth: monthTotals[mk].currentMonth,
        previousInstallments: monthTotals[mk].previousInstallments,
      };
    }).filter(d => d.currentMonth > 0 || d.previousInstallments > 0);
  }, [transactions, billMonthMap, compRange]);

  const hiddenCashVsInstallment = isHidden
    ? cashVsInstallment.map(d => ({ month: d.month, currentMonth: 0, previousInstallments: 0 }))
    : cashVsInstallment;

  const piePeriodLabel = useMemo(() => {
    if (piePeriod === 'thisMonth') {
      return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (piePeriod === 'last2Months') return 'últimos 2 meses';
    const [sy, sm] = (pieCustomStart || '').split('-').map(Number);
    const [ey, em] = (pieCustomEnd || '').split('-').map(Number);
    const startLabel = new Date(sy, sm - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const endLabel = new Date(ey, em - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    return `${startLabel} a ${endLabel}`;
  }, [piePeriod, pieCustomStart, pieCustomEnd]);

  return (
    <CollapsibleModule
      title="Análises"
      description="Gráficos de consumo e categorias"
      icon={<PieChart className="h-4 w-4 text-primary" />}
      useDialogOnDesktop
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Evolução Mensal - with period filter */}
        <SectionCard
          title="Evolução Mensal"
          description="Consumo por cartão"
          icon={<Calendar className="h-4 w-4 text-primary" />}
          expandable
          headerRight={
            <TimeSeriesPeriodFilter
              chartTitle="Evolução Mensal"
              period={evolPeriod}
              setPeriod={setEvolPeriod}
              customStart={evolCustomStart}
              setCustomStart={setEvolCustomStart}
              customEnd={evolCustomEnd}
              setCustomEnd={setEvolCustomEnd}
            />
          }
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiddenMonthlyComparison} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="month"
                  {...premiumXAxis}
                  tick={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
                    const showTotal = availableCards.length > 1 && payload.length > 1;
                    return (
                      <div style={premiumTooltipStyle} className="rounded-lg p-2.5 shadow-lg">
                        <p className="text-xs font-medium mb-1">{label}</p>
                        {payload.map((p: any) => {
                          const card = availableCards.find(c => c.id === p.dataKey);
                          return (
                            <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
                              {card?.connectorName || card?.name || p.dataKey}: {formatCurrency(p.value)}
                            </p>
                          );
                        })}
                        {showTotal && (
                          <p className="text-xs font-semibold mt-1 pt-1 border-t border-border/50">
                            Total: {formatCurrency(total)}
                          </p>
                        )}
                      </div>
                    );
                  }}
                  cursor={{ fill: 'hsl(var(--muted))', radius: 6 }}
                />
                {availableCards.map((card, idx) => {
                  const barColor = cardColorMap[card.id] || card.color;
                  return (
                    <Bar
                      key={card.id}
                      dataKey={card.id}
                      name={card.id}
                      stackId="cards"
                      fill={barColor}
                      radius={idx === availableCards.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3">
            {availableCards.map((card) => (
              <div key={card.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cardColorMap[card.id] || card.color }} />
                <span className="text-[11px] text-muted-foreground font-medium">{card.connectorName || card.name}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 2. Saúde do Cartão - with period filter */}
        <CardHealthAnalytics
          bills={healthBills}
          periodFilter={
            <TimeSeriesPeriodFilter
              chartTitle="Saúde do Cartão"
              period={healthPeriod}
              setPeriod={setHealthPeriod}
              customStart={healthCustomStart}
              setCustomStart={setHealthCustomStart}
              customEnd={healthCustomEnd}
              setCustomEnd={setHealthCustomEnd}
            />
          }
        />

        {/* 3. Compras Mensal - with period filter, detail button at bottom-right */}
        <SectionCard
          title="Compras Mensal"
          description="Valor integral da compra no mês de aquisição"
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          expandable
          headerRight={
            <TimeSeriesPeriodFilter
              chartTitle="Compras Mensal"
              period={purchPeriod}
              setPeriod={setPurchPeriod}
              customStart={purchCustomStart}
              setCustomStart={setPurchCustomStart}
              customEnd={purchCustomEnd}
              setCustomEnd={setPurchCustomEnd}
            />
          }
        >
          {hiddenMonthlyPurchases.length > 0 ? (
            <>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hiddenMonthlyPurchases} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="month"
                      {...premiumXAxis}
                      tick={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
                        const showTotal = availableCards.length > 1 && payload.length > 1;
                        return (
                          <div style={premiumTooltipStyle} className="rounded-lg p-2.5 shadow-lg">
                            <p className="text-xs font-medium mb-1">{label}</p>
                            {payload.map((p: any) => {
                              const card = availableCards.find(c => c.id === p.dataKey);
                              return (
                                <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
                                  {card?.connectorName || card?.name || p.dataKey}: {formatCurrency(p.value)}
                                </p>
                              );
                            })}
                            {showTotal && (
                              <p className="text-xs font-semibold mt-1 pt-1 border-t border-border/50">
                                Total: {formatCurrency(total)}
                              </p>
                            )}
                          </div>
                        );
                      }}
                      cursor={{ fill: 'hsl(var(--muted))', radius: 6 }}
                    />
                    {availableCards.map((card, idx) => (
                      <Bar
                        key={card.id}
                        dataKey={card.id}
                        name={card.id}
                        stackId="cards"
                        fill={cardColorMap[card.id] || card.color}
                        radius={idx === availableCards.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4">
                  {availableCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cardColorMap[card.id] || card.color }} />
                      <span className="text-[11px] text-muted-foreground font-medium">{card.connectorName || card.name}</span>
                    </div>
                  ))}
                </div>
                <MonthlyPurchasesDetail
                  transactions={transactions}
                  isHidden={isHidden}
                  formatCurrency={formatCurrency}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm h-[260px]">
              Nenhuma transação importada
            </div>
          )}
        </SectionCard>

        {/* 4. Composição da Fatura - with period filter, detail button at bottom-right */}
        <SectionCard
          title="Composição da Fatura"
          description="Quanto da fatura são compras novas vs parcelas de meses anteriores"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          expandable
          headerRight={
            <TimeSeriesPeriodFilter
              chartTitle="Composição da Fatura"
              period={compPeriod}
              setPeriod={setCompPeriod}
              customStart={compCustomStart}
              setCustomStart={setCompCustomStart}
              customEnd={compCustomEnd}
              setCustomEnd={setCompCustomEnd}
            />
          }
        >
          {hiddenCashVsInstallment.length > 0 ? (
            <>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hiddenCashVsInstallment} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="month"
                      {...premiumXAxis}
                      tick={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const total = (payload[0]?.value as number || 0) + (payload[1]?.value as number || 0);
                        return (
                          <div style={premiumTooltipStyle} className="rounded-lg p-2.5 shadow-lg">
                            <p className="text-xs font-medium mb-1">{label}</p>
                            {payload.map((p: any) => (
                              <p key={p.dataKey} className="text-xs" style={{ color: p.stroke }}>
                                {p.dataKey === 'currentMonth' ? 'Compras do mês' : 'Parcelas anteriores'}: {formatCurrency(p.value)}
                              </p>
                            ))}
                            <p className="text-xs font-semibold mt-1 pt-1 border-t border-border/50">
                              Total: {formatCurrency(total)}
                            </p>
                          </div>
                        );
                      }}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="currentMonth"
                      stroke="hsl(145, 63%, 42%)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'hsl(145, 63%, 42%)' }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previousInstallments"
                      stroke="hsl(262, 83%, 58%)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'hsl(262, 83%, 58%)' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(145, 63%, 42%)' }} />
                    <span className="text-[11px] text-muted-foreground font-medium">Compras do mês</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(262, 83%, 58%)' }} />
                    <span className="text-[11px] text-muted-foreground font-medium">Parcelas anteriores</span>
                  </div>
                </div>
                <BillCompositionDetail
                  transactions={transactions}
                  billMonthMap={billMonthMap}
                  isHidden={isHidden}
                  formatCurrency={formatCurrency}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm h-[260px]">
              Nenhuma transação importada
            </div>
          )}
        </SectionCard>

        {/* 5. Gasto por Cartão (pie) - with inline period filter */}
        {cardSpendingPieData.length > 0 && (
          <SectionCard
            title="Gasto por Cartão"
            description={piePeriodLabel}
            icon={<PieChart className="h-4 w-4 text-primary" />}
            expandable
            headerRight={
              <InlinePeriodFilter
                chartTitle="Gasto por Cartão"
                period={piePeriod}
                setPeriod={setPiePeriod}
                customStart={pieCustomStart}
                setCustomStart={setPieCustomStart}
                customEnd={pieCustomEnd}
                setCustomEnd={setPieCustomEnd}
              />
            }
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ minHeight: CHART_HEIGHT }}>
              <div className="flex-shrink-0">
                <ResponsiveContainer width={180} height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={isHidden ? cardSpendingPieData.map(d => ({ ...d, value: 1 })) : cardSpendingPieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {cardSpendingPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={premiumTooltipStyle}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                {cardSpendingPieData.map((entry, index) => {
                  const total = cardSpendingPieData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{entry.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                          {isHidden ? '••••' : `${formatCurrency(entry.value)} · ${pct}%`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        )}

        {/* 6. Distribuição por Categoria (treemap) - with inline period filter */}
        <SectionCard
          title="Distribuição por Categoria"
          description="Clique em uma categoria para ver os estabelecimentos"
          icon={<LayoutGrid className="h-4 w-4 text-primary" />}
          expandable
          headerRight={
            <InlinePeriodFilter
              chartTitle="Distribuição por Categoria"
              period={treemapPeriod}
              setPeriod={setTreemapPeriod}
              customStart={treemapCustomStart}
              setCustomStart={setTreemapCustomStart}
              customEnd={treemapCustomEnd}
              setCustomEnd={setTreemapCustomEnd}
            />
          }
        >
          {categoryTreemapData.length > 0 ? (
            <InteractiveTreemap
              data={categoryTreemapData}
              formatValue={formatCurrency}
              isHidden={isHidden}
              height={CHART_HEIGHT}
              showLegend={true}
            />
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: CHART_HEIGHT }}>
              Nenhuma transação importada
            </div>
          )}
        </SectionCard>
      </div>
    </CollapsibleModule>
  );
};
