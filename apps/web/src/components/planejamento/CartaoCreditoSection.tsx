import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CategoryAssignmentCard } from '@/components/shared/CategoryAssignmentDialog';
import { getActiveBillingMonth } from '@/utils/billingCycleUtils';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { useVisibility } from '@/contexts/VisibilityContext';
import { useSyncContext } from '@/contexts/SyncContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRecurringDetection } from '@/hooks/useRecurringDetection';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { SectionSkeleton } from '@/components/shared/PageSkeleton';


import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';

import {
  CreditCard,
  Repeat,
  Calendar,
  FileText,
  CalendarClock,
  FolderOpen,
} from 'lucide-react';
import { ImportFaturaDialog } from '@/components/cartao/ImportFaturaDialog';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { CardBrandIcon } from '@/components/openfinance/CardBrandIcon';
import { CreditCardPlastic } from '@/components/openfinance/CreditCardPlastic';
import { SyncOpenFinanceDialog } from '@/components/cartao/SyncOpenFinanceDialog';
import { PluggySyncStatus } from '@/components/sync/PluggySyncStatus';
import { ImportedTransactionsTable } from '@/components/cartao/ImportedTransactionsTable';
import { ImportedFilesSection } from '@/components/cartao/ImportedFilesSection';
import { BillTransactionsView } from '@/components/cartao/BillTransactionsView';
import { InstallmentPurchasesSection } from '@/components/cartao/InstallmentPurchasesSection';
import { RecurringPurchasesSection } from '@/components/cartao/RecurringPurchasesSection';
import { CreditCardMonthlyTable } from '@/components/planejamento/CreditCardMonthlyTable';
import { AnalyticsChartsSection } from '@/components/planejamento/AnalyticsChartsSection';

import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { usePluggyCreditCardSync } from '@/hooks/usePluggyCreditCardSync';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useRecurringPayments } from '@/hooks/useRecurringPayments';
import { useFinanceMode } from '@/hooks/useFinanceMode';
import { cn } from '@/lib/utils';
import { financialInstitutions } from '@/data/defaultData';

const FALLBACK_COLORS = [
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(339, 82%, 51%)',
  'hsl(173, 80%, 40%)',
  'hsl(31, 90%, 55%)',
  'hsl(145, 63%, 42%)',
  'hsl(47, 96%, 53%)',
  'hsl(15, 85%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(210, 70%, 50%)',
];

const COLORS = [
  ...FALLBACK_COLORS,
  'hsl(350, 75%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(45, 85%, 45%)',
  'hsl(190, 75%, 45%)',
  'hsl(320, 70%, 55%)',
  'hsl(100, 55%, 45%)',
  'hsl(230, 65%, 55%)',
  'hsl(5, 80%, 50%)',
  'hsl(180, 65%, 40%)',
  'hsl(60, 70%, 45%)',
];

/**
 * Convert hex color to HSL [h(0-360), s(0-100), l(0-100)].
 */
const hexToHsl = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
};

const hslToString = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

const isVeryDark = (hsl: [number, number, number]) => hsl[2] < 15;
const isLowSaturation = (hsl: [number, number, number]) => hsl[1] < 10;

const hueDistance = (h1: number, h2: number) => {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
};

/**
 * Build a color map for all cards, prioritizing the highest-spending card's
 * original bank color. Cards with similar or very dark colors get adjusted
 * variants to ensure visual contrast.
 */
const buildCardColorMap = (
  cards: Array<{ id: string; primaryColor?: string | null; color: string }>,
  cardTotals: Record<string, number>
): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  
  // Sort cards by total spending descending
  const sorted = [...cards].sort((a, b) => (cardTotals[b.id] || 0) - (cardTotals[a.id] || 0));
  
  // Track assigned HSL values to detect conflicts
  const assignedHsls: Array<[number, number, number]> = [];

  sorted.forEach((card, idx) => {
    const rawColor = card.primaryColor;
    // Ensure hex colors have # prefix (DB stores without it)
    const bankColor = rawColor ? (rawColor.startsWith('#') ? rawColor : `#${rawColor}`) : null;
    if (!bankColor) {
      colorMap[card.id] = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
      const hsl = hexToHsl(FALLBACK_COLORS[idx % FALLBACK_COLORS.length].replace(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/, '#000')) || [idx * 60, 70, 50];
      assignedHsls.push(hsl);
      return;
    }

    const thisHsl = hexToHsl(bankColor);
    if (!thisHsl) {
      colorMap[card.id] = bankColor;
      assignedHsls.push([0, 0, 50]);
      return;
    }

    // First card (highest spending): keep original but avoid pure black
    if (idx === 0) {
      if (isVeryDark(thisHsl)) {
        // Replace near-black with a clean dark gray
        const softened: [number, number, number] = [thisHsl[0] || 220, Math.max(thisHsl[1], 8), 32];
        colorMap[card.id] = hslToString(softened[0], softened[1], softened[2]);
        assignedHsls.push(softened);
      } else {
        colorMap[card.id] = bankColor;
        assignedHsls.push(thisHsl);
      }
      return;
    }

    // Check if this color conflicts with any already-assigned color
    let hasConflict = false;
    for (const prev of assignedHsls) {
      const bothDark = isVeryDark(thisHsl) && isVeryDark(prev);
      const bothLowSat = isLowSaturation(thisHsl) && isLowSaturation(prev);
      const hueTooClose = hueDistance(thisHsl[0], prev[0]) < 30;
      const lumTooClose = Math.abs(thisHsl[2] - prev[2]) < 15;

      if (bothDark || bothLowSat || (hueTooClose && lumTooClose)) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      // Color is distinct enough — keep original
      colorMap[card.id] = bankColor;
      assignedHsls.push(thisHsl);
    } else {
      // Adjust color to create contrast
      let adjusted: [number, number, number];
      
      if (isVeryDark(thisHsl) || isLowSaturation(thisHsl)) {
        // Very dark/achromatic color: use a distinguishable dark gray
        adjusted = [thisHsl[0] || 220, Math.max(thisHsl[1], 12), 38];
      } else {
        // Similar hue: shift luminosity for contrast
        const avgAssignedLum = assignedHsls.reduce((s, h) => s + h[2], 0) / assignedHsls.length;
        adjusted = [
          thisHsl[0],
          Math.min(thisHsl[1] + 10, 90),
          avgAssignedLum > 45 ? Math.max(thisHsl[2] - 20, 25) : Math.min(thisHsl[2] + 20, 65),
        ];
      }

      colorMap[card.id] = hslToString(adjusted[0], adjusted[1], adjusted[2]);
      assignedHsls.push(adjusted);
    }
  });

  return colorMap;
};

export const CartaoCreditoSection: React.FC = () => {
  const { config } = useFinancial();
  const { isHidden } = useVisibility();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isOpenFinance, isManual } = useFinanceMode();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const viewMode = 'cobranca' as const;

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    if (value === 0) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const {
    transactions,
    loading: transactionsLoading,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    fetchTransactions,
    consolidateInstallmentGroups,
  } = useCreditCardTransactions();

  const { bills, fetchBills } = useCreditCardBills();
  const { detectRecurring, detecting } = useRecurringDetection();
  const { payments: recurringPayments, syncRecurringPayments } = useRecurringPayments();

  // Auto-sync Open Finance credit card transactions on mount
  usePluggyCreditCardSync(true);

  // Refresh bills and transactions when sync completes
  const { step: syncStep } = useSyncContext();
  useEffect(() => {
    if (syncStep === 'done') {
      fetchBills();
      fetchTransactions();
    }
  }, [syncStep, fetchBills, fetchTransactions]);

  // Sync recurring payments on mount
  useEffect(() => {
    syncRecurringPayments();
  }, [syncRecurringPayments]);

  // Fetch pluggy account numbers for card labels
  const [pluggyAccountNumbers, setPluggyAccountNumbers] = useState<Record<string, { number: string; connectorName: string; imageUrl: string | null; primaryColor: string | null; cardBrand: string | null; cardLevel: string | null }>>({});
  React.useEffect(() => {
    if (!user) return;
    const fetchNumbers = async () => {
      const { data } = await supabase
        .from('pluggy_accounts')
        .select('id, number, name, connection_id, card_brand')
        .eq('type', 'CREDIT')
        .is('deleted_at', null);
      if (!data || data.length === 0) return;
      
      const connIds = [...new Set(data.map(a => a.connection_id))];
      const { data: conns } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name, connector_image_url, connector_primary_color')
        .in('id', connIds)
        .is('deleted_at', null);
      const connMap = new Map((conns || []).map(c => [c.id, c]));

      const LEVEL_KEYWORDS = ['infinite', 'black', 'platinum', 'gold', 'signature', 'nanquim', 'ultravioleta', 'grafite'];
      const extractLevel = (name: string | null): string | null => {
        if (!name) return null;
        const lower = name.toLowerCase();
        return LEVEL_KEYWORDS.find(kw => lower.includes(kw)) || null;
      };
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      
      const map: Record<string, { number: string; connectorName: string; imageUrl: string | null; primaryColor: string | null; cardBrand: string | null; cardLevel: string | null }> = {};
      data.forEach(a => {
        const conn = connMap.get(a.connection_id);
        const level = extractLevel(a.name);
        map[a.id] = {
          number: (a.number as string) || '',
          connectorName: conn?.connector_name || '',
          imageUrl: conn?.connector_image_url || null,
          primaryColor: conn?.connector_primary_color || null,
          cardBrand: a.card_brand || null,
          cardLevel: level ? capitalize(level) : null,
        };
      });
      setPluggyAccountNumbers(map);
    };
    fetchNumbers();
  }, [user]);

  const [todayYear] = useState(() => new Date().getFullYear());
  const [todayMonth] = useState(() => new Date().getMonth());
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

  const selectedDate = useMemo(() => {
    return new Date(todayYear, todayMonth + selectedMonthOffset, 1);
  }, [todayYear, todayMonth, selectedMonthOffset]);

  const currentYear = selectedDate.getFullYear();
  const currentMonthNum = selectedDate.getMonth() + 1;
  const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const selectedMonthLabel = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Active billing month based on open bills (for "Atual" marker)
  const activeBillingMonth = useMemo(() => {
    const billsForCalc = selectedCards.length > 0
      ? bills.filter(b => selectedCards.includes(b.card_id))
      : bills;
    return getActiveBillingMonth(billsForCalc);
  }, [bills, selectedCards]);


  // Generate months for the table (same logic as planning page)
  const summaryMonths = useMemo(() => {
    const centerMonth = activeBillingMonth || currentMonth;
    const [cY, cM] = centerMonth.split('-').map(Number);
    const allMonths: string[] = [];
    const startYear = cY - 1;
    for (let i = 0; i < 24; i++) {
      const date = new Date(startYear, 0 + i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      allMonths.push(month);
    }
    
    const currentIdx = allMonths.indexOf(centerMonth);
    const monthCount = isMobile ? 3 : (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 9 : 6;
    const beforeCurrent = Math.floor(monthCount / 2);
    
    const startIdx = Math.max(0, currentIdx - beforeCurrent);
    const endIdx = Math.min(allMonths.length, startIdx + monthCount);
    const adjustedStartIdx = Math.max(0, endIdx - monthCount);
    
    return allMonths.slice(adjustedStartIdx, endIdx);
  }, [activeBillingMonth, currentMonth, isMobile]);

  const handleUpdateCategory = useCallback(async (id: string, categoryId: string, categoryName: string) => {
    return await updateTransaction(id, {
      category_id: categoryId,
      category: categoryName,
      is_category_confirmed: true,
    });
  }, [updateTransaction]);

  const handleConfirmCategory = useCallback(async (id: string) => {
    return await updateTransaction(id, {
      is_category_confirmed: true,
    });
  }, [updateTransaction]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    return await deleteTransaction(id);
  }, [deleteTransaction]);

  const handleDeleteMultipleTransactions = useCallback(async (ids: string[]) => {
    return await deleteMultipleTransactions(ids);
  }, [deleteMultipleTransactions]);

  const handleToggleRecurring = useCallback(async (id: string, isRecurring: boolean, confidenceLevel?: string) => {
    return await updateTransaction(id, { 
      is_recurring: isRecurring, 
      confidence_level: confidenceLevel || (isRecurring ? 'confirmed' : 'dismissed') 
    });
  }, [updateTransaction]);

  const handleUpdateFriendlyName = useCallback(async (id: string, friendlyName: string) => {
    return await updateTransaction(id, { friendly_name: friendlyName });
  }, [updateTransaction]);

  const handleFriendlyNameAppliedAll = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);


  // Get all unique card IDs from transactions and bills for the selector
  const availableCards = useMemo(() => {
    const defaultColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const result: Array<{ id: string; name: string; color: string; brand: string; number?: string; connectorName?: string; imageUrl?: string | null; primaryColor?: string | null; cardBrand?: string | null; cardLevel?: string | null }> = [];
    const addedIds = new Set<string>();

    // Get unique card_ids from transactions
    const cardIdsFromTx = new Set<string>();
    transactions.forEach(tx => {
      if (tx.card_id) cardIdsFromTx.add(tx.card_id);
    });
    bills.forEach(bill => {
      if (bill.card_id) cardIdsFromTx.add(bill.card_id);
    });

    // Add cards from transactions/bills
    const cardIdsArray = Array.from(cardIdsFromTx);
    cardIdsArray.forEach((cardId, idx) => {
      const pluggyInfo = pluggyAccountNumbers[cardId];
      const fiConfig = config.financialInstitutions.find(fi => fi.id === cardId);
      if (fiConfig) {
        const institution = financialInstitutions.find(i => i.id === fiConfig.institutionId);
        result.push({
          id: cardId,
          name: fiConfig.customName || institution?.name || 'Cartão',
          color: institution?.color || defaultColors[idx % defaultColors.length],
          brand: fiConfig.creditCardBrand || '',
          number: pluggyInfo?.number,
          connectorName: pluggyInfo?.connectorName,
          imageUrl: pluggyInfo?.imageUrl,
          primaryColor: pluggyInfo?.primaryColor,
          cardBrand: pluggyInfo?.cardBrand,
          cardLevel: pluggyInfo?.cardLevel,
        });
      } else {
        result.push({
          id: cardId,
          name: pluggyInfo?.connectorName || `Cartão ${idx + 1}`,
          color: defaultColors[idx % defaultColors.length],
          brand: '',
          number: pluggyInfo?.number,
          connectorName: pluggyInfo?.connectorName,
          imageUrl: pluggyInfo?.imageUrl,
          primaryColor: pluggyInfo?.primaryColor,
          cardBrand: pluggyInfo?.cardBrand,
          cardLevel: pluggyInfo?.cardLevel,
        });
      }
      addedIds.add(cardId);
    });

    // Add configured cards that aren't in transactions yet
    config.financialInstitutions
      .filter(fi => fi.hasCreditCard && !addedIds.has(fi.id))
      .forEach((fi, idx) => {
        const institution = financialInstitutions.find(i => i.id === fi.institutionId);
        result.push({
          id: fi.id,
          name: fi.customName || institution?.name || 'Cartão',
          color: institution?.color || defaultColors[(cardIdsArray.length + idx) % defaultColors.length],
          brand: fi.creditCardBrand || '',
        });
      });

    return result;
  }, [config.financialInstitutions, transactions, bills, pluggyAccountNumbers]);

  const filteredTransactions = useMemo(() => {
    if (selectedCards.length === 0) {
      return transactions;
    }
    return transactions.filter(t => t.card_id && selectedCards.includes(t.card_id));
  }, [transactions, selectedCards]);

  // Build a map of bill_id -> due_date month for billing date attribution
  const billMonthMap = useMemo(() => {
    const map = new Map<string, string>();
    bills.forEach(bill => {
      map.set(bill.id, bill.due_date.substring(0, 7));
    });
    return map;
  }, [bills]);

  // Process transactions based on view mode (billing date vs transaction date)
  const processedTransactions = useMemo(() => {
    const getBillingMonth = (t: typeof filteredTransactions[number]) => {
      // If linked to a bill, use the bill's due_date month
      if (t.credit_card_bill_id) {
        const billMonth = billMonthMap.get(t.credit_card_bill_id);
        if (billMonth) return billMonth;
      }
      // Fallback: use transaction_date month
      return t.transaction_date.substring(0, 7);
    };

    if (viewMode === 'cobranca') {
      return filteredTransactions.filter(t => getBillingMonth(t) === currentMonth);
    }
    // Lancamento mode: filter by transaction_date month
    return filteredTransactions.filter(t => {
      return t.transaction_date.substring(0, 7) === currentMonth;
    });
  }, [filteredTransactions, viewMode, currentMonth, billMonthMap]);

  const filteredBills = useMemo(() => {
    if (selectedCards.length === 0) {
      return bills;
    }
    return bills.filter(b => b.card_id && selectedCards.includes(b.card_id));
  }, [bills, selectedCards]);

  const handleCardToggle = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      return [...prev, cardId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCards([]);
  }, []);

  const getFilterLabel = () => {
    if (selectedCards.length === 0) return 'Todos os Cartões';
    if (selectedCards.length === 1) {
      const card = availableCards.find(c => c.id === selectedCards[0]);
      if (!card) return 'Cartão';
      const parts: string[] = [];
      if (card.cardBrand) parts.push(card.cardBrand.charAt(0) + card.cardBrand.slice(1).toLowerCase());
      if (card.cardLevel) parts.push(card.cardLevel);
      if (parts.length === 0) parts.push(card.connectorName || card.name);
      if (card.number) parts.push(`(•••• ${card.number.slice(-4)})`);
      return parts.join(' ');
    }
    return `${selectedCards.length} cartões`;
  };

  const currentMonthTransactions = processedTransactions;

  const { totalFiltered, recurringTotal, variableTotal } = useMemo(() => {
    let total = 0;
    let recurring = 0;
    let variable = 0;

    processedTransactions.forEach(t => {
      total += t.value;
      if (t.is_recurring) {
        recurring += t.value;
      } else {
        variable += t.value;
      }
    });

    return { totalFiltered: total, recurringTotal: recurring, variableTotal: variable };
  }, [processedTransactions]);

  // Calculate projected balance: pending + recurring payments not yet completed
  const projectedAdditional = useMemo(() => {
    // Pending transactions for current month
    const pendingTotal = transactions
      .filter(t => t.status === 'PENDING' && t.transaction_date.substring(0, 7) === currentMonth)
      .reduce((s, t) => s + t.value, 0);
    
    // Recurring payments expected this month
    const recurringExpected = recurringPayments
      .filter(rp => rp.is_active && (!rp.next_expected_date || rp.next_expected_date.substring(0, 7) === currentMonth))
      .reduce((s, rp) => s + Math.abs(rp.average_amount), 0);

    return pendingTotal + recurringExpected;
  }, [transactions, recurringPayments, currentMonth]);

  const projectedTotal = totalFiltered + projectedAdditional;

  // Build card color map based on spending totals
  const cardColorMap = useMemo(() => {
    const totals: Record<string, number> = {};
    availableCards.forEach(card => {
      const cardBills = bills.filter(b => b.card_id === card.id);
      totals[card.id] = cardBills.reduce((sum, b) => sum + (b.total_value || 0), 0);
    });
    return buildCardColorMap(availableCards, totals);
  }, [availableCards, bills]);

  if (transactionsLoading && transactions.length === 0) {
    return (
      <div className="space-y-4">
        <SectionSkeleton rows={4} />
        <SectionSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons Row — mobile: empilhar; desktop: linha */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {isOpenFinance && <SyncOpenFinanceDialog />}
          <ImportFaturaDialog />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Arquivos Importados
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Arquivos Importados
                </DialogTitle>
                <DialogDescription>Histórico de importações de faturas</DialogDescription>
              </DialogHeader>
              <ImportedFilesSection cardFilter={selectedCards.length === 1 ? selectedCards[0] : selectedCards.length === 0 ? 'all' : undefined} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Sync Status - only in openfinance mode */}
        {!isManual && <PluggySyncStatus accountType="CREDIT" compact />}

        {/* Card Filter */}
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-56 h-9 justify-between">
                <div className="flex items-center gap-2 truncate">
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span className="truncate">{getFilterLabel()}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                    selectedCards.length === 0 && "bg-muted"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center",
                    selectedCards.length === 0 ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedCards.length === 0 && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span>Todos os Cartões</span>
                </button>
                
                <div className="h-px bg-border my-1" />
                
                {availableCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleCardToggle(card.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                      selectedCards.includes(card.id) && "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                      selectedCards.includes(card.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                    )}>
                      {selectedCards.includes(card.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <ConnectorLogo
                      imageUrl={card.imageUrl}
                      primaryColor={card.primaryColor}
                      connectorName={card.connectorName || card.name}
                      size="sm"
                    />
                    <span className="text-xs">
                      {(() => {
                        const parts: string[] = [];
                        if (card.cardBrand) parts.push(card.cardBrand.charAt(0) + card.cardBrand.slice(1).toLowerCase());
                        if (card.cardLevel) parts.push(card.cardLevel);
                        if (parts.length === 0) parts.push(card.connectorName || card.name);
                        if (card.number) parts.push(`(•••• ${card.number.slice(-4)})`);
                        return parts.join(' ');
                      })()}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Monthly Bills Overview Table */}
      <CollapsibleModule
        title="Visão Mensal de Faturas"
        description="Resumo mensal por cartão"
        icon={<Calendar className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <CreditCardMonthlyTable
          months={summaryMonths}
          currentMonth={currentMonth}
          activeMonth={activeBillingMonth}
          isHidden={isHidden}
          selectedCardIds={selectedCards}
          availableCards={availableCards}
          bills={bills}
          transactions={transactions}
        />
      </CollapsibleModule>


      {/* Bill-grouped Transactions View */}
      <CollapsibleModule
        title="Gestão de Faturas"
        description="Transações agrupadas por fatura"
        icon={<CreditCard className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <BillTransactionsView
          bills={bills}
          transactions={transactions}
          onRefreshBills={() => { fetchBills(); fetchTransactions(); }}
          availableCards={availableCards}
        />
      </CollapsibleModule>

      {/* Category Assignment Card */}
      <CategoryAssignmentCard
        title="Atribuir gastos nas suas categorias"
        description="Novos lançamentos do mês — compras parceladas aparecem no mês da compra original"
        count={processedTransactions.filter(t => !t.is_category_confirmed).length}
        defaultTab="cartao"
      />


      {/* Recurring Purchases Section */}
      <CollapsibleModule
        title="Compras Recorrentes"
        description="Assinaturas e cobranças automáticas detectadas"
        icon={<Repeat className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <RecurringPurchasesSection
          transactions={filteredTransactions}
          onToggleRecurring={handleToggleRecurring}
          onDetectRecurring={async () => { const r = await detectRecurring(); if (r) await fetchTransactions(); return r; }}
          detecting={detecting}
        />
      </CollapsibleModule>

      {/* Installment Purchases Section */}
      <CollapsibleModule
        title="Projeção de Parcelas Futuras"
        description="Compras parceladas e projeções de cobrança"
        icon={<CalendarClock className="h-4 w-4 text-primary" />}
        useDialogOnDesktop
      >
        <InstallmentPurchasesSection 
          transactions={filteredTransactions}
          bills={filteredBills}
          creditCards={availableCards.map(c => ({ id: c.id, name: c.name }))}
          onConsolidate={consolidateInstallmentGroups}
        />
      </CollapsibleModule>

      {/* Charts Section - Last */}
      <AnalyticsChartsSection
        bills={bills}
        availableCards={availableCards}
        cardColorMap={cardColorMap}
        formatCurrency={formatCurrency}
        isHidden={isHidden}
        transactions={filteredTransactions}
        billMonthMap={billMonthMap}
        currentMonth={currentMonth}
      />
    </div>
  );
};

export default CartaoCreditoSection;
