import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Landmark, ChevronRight, FileText, X } from 'lucide-react';
import { ImportedTransactionsTable } from '@/components/cartao/ImportedTransactionsTable';
import { LancamentoCategorySection } from '@/components/lancamentos/LancamentoCategorySection';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CategoryAssignmentFilters,
  getPeriodBounds,
  type PeriodFilterValue,
  type StatusFilterValue,
} from '@/components/shared/CategoryAssignmentFilters';
import type { LancamentoRealizado } from '@/hooks/useLancamentosRealizados';
import type { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';

export type CategoryAssignmentTab = 'cartao' | 'conta';

function getBancoLabel(item: LancamentoRealizado): string {
  const ext = item as LancamentoRealizado & { account_name?: string | null; conta_nome?: string | null; instituicao?: string | null };
  return ext.account_name ?? ext.conta_nome ?? ext.instituicao ?? item.forma_pagamento ?? '—';
}

const useIsTabletOrMobile = () => {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const check = () => setIs(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return is;
};

interface CategoryAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: CategoryAssignmentTab;
  onComplete?: () => void;
}

type PluggyCardInfo = {
  number: string;
  connectorName: string;
  imageUrl: string | null;
  primaryColor: string | null;
  cardBrand: string | null;
  cardLevel: string | null;
};

/** The inner tabbed content shared by Dialog and Drawer */
const CategoryAssignmentContent: React.FC<{
  defaultTab: CategoryAssignmentTab;
  open: boolean;
}> = ({ defaultTab, open }) => {
  const [activeTab, setActiveTab] = useState<CategoryAssignmentTab>(defaultTab);
  const { user } = useAuth();
  const [pluggyAccountNumbers, setPluggyAccountNumbers] = useState<Record<string, PluggyCardInfo>>({});

  // Filtros unificados (período, status, banco, categoria, cartão)
  const [period, setPeriod] = useState<PeriodFilterValue>('this_month');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [bankValue, setBankValue] = useState<string>('all');
  const [categoryValue, setCategoryValue] = useState<string>('all');
  const [cardValue, setCardValue] = useState<string>('all');

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  const {
    transactions,
    loading: transactionsLoading,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    fetchTransactions,
  } = useCreditCardTransactions();
  const { bills } = useCreditCardBills();
  const { lancamentos, fetchLancamentos } = useLancamentosRealizados();

  // Fetch Pluggy credit card accounts (connector + brand) so Banco/Bandeira columns can be filled
  useEffect(() => {
    if (!user || !open) return;
    const fetchNumbers = async () => {
      const { data } = await supabase
        .from('pluggy_accounts')
        .select('id, number, name, connection_id, card_brand')
        .eq('type', 'CREDIT')
        .is('deleted_at', null);
      if (!data?.length) return;
      const connIds = [...new Set(data.map((a: { connection_id: string }) => a.connection_id))];
      const { data: conns } = await supabase
        .from('pluggy_connections')
        .select('id, connector_name, connector_image_url, connector_primary_color')
        .in('id', connIds)
        .is('deleted_at', null);
      const connMap = new Map((conns || []).map((c: { id: string; connector_name?: string; connector_image_url?: string | null; connector_primary_color?: string | null }) => [c.id, c]));
      const LEVEL_KEYWORDS = ['infinite', 'black', 'platinum', 'gold', 'signature', 'nanquim', 'ultravioleta', 'grafite'];
      const extractLevel = (name: string | null): string | null => {
        if (!name) return null;
        const lower = name.toLowerCase();
        return LEVEL_KEYWORDS.find(kw => lower.includes(kw)) || null;
      };
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const map: Record<string, PluggyCardInfo> = {};
      data.forEach((a: { id: string; number?: string; name?: string | null; connection_id: string; card_brand?: string | null }) => {
        const conn = connMap.get(a.connection_id);
        const level = extractLevel(a.name ?? null);
        map[a.id] = {
          number: (a.number as string) || '',
          connectorName: (conn as { connector_name?: string })?.connector_name || '',
          imageUrl: (conn as { connector_image_url?: string | null })?.connector_image_url ?? null,
          primaryColor: (conn as { connector_primary_color?: string | null })?.connector_primary_color ?? null,
          cardBrand: a.card_brand ?? null,
          cardLevel: level ? capitalize(level) : null,
        };
      });
      setPluggyAccountNumbers(map);
    };
    fetchNumbers();
  }, [user, open]);

  const defaultColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  const availableCards = useMemo(() => {
    const cardIds = new Set<string>();
    transactions.forEach(t => { if (t.card_id) cardIds.add(t.card_id); });
    bills.forEach(b => { if (b.card_id) cardIds.add(b.card_id); });
    return Array.from(cardIds).map((cardId, idx) => {
      const pluggy = pluggyAccountNumbers[cardId];
      const bill = bills.find(b => b.card_id === cardId);
      return {
        id: cardId,
        name: pluggy?.connectorName || bill?.card_name || `Cartão ${idx + 1}`,
        color: defaultColors[idx % defaultColors.length],
        brand: pluggy?.cardBrand || '',
        number: pluggy?.number,
        connectorName: pluggy?.connectorName,
        imageUrl: pluggy?.imageUrl ?? bill?.connector_image_url ?? undefined,
        primaryColor: pluggy?.primaryColor ?? bill?.connector_primary_color ?? undefined,
        cardBrand: pluggy?.cardBrand ?? undefined,
        cardLevel: pluggy?.cardLevel ?? undefined,
      };
    });
  }, [transactions, bills, pluggyAccountNumbers]);

  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const bankOptions = useMemo(() => {
    const labels = new Map<string, string>();
    lancamentos.forEach(l => {
      const label = getBancoLabel(l);
      if (label && label !== '—') labels.set(label, label);
    });
    return Array.from(labels.entries()).map(([value, label]) => ({ value, label }));
  }, [lancamentos]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    lancamentos.forEach(l => { if (l.categoria?.trim()) set.add(l.categoria.trim()); });
    transactions.forEach((t: CreditCardTransaction) => { if (t.category?.trim()) set.add(t.category.trim()); });
    return Array.from(set).sort().map(name => ({ value: name, label: name }));
  }, [lancamentos, transactions]);

  const filteredLancamentos = useMemo(() => {
    let list = [...lancamentos];
    if (periodBounds) {
      list = list.filter(l => {
        const dateStr = l.data_pagamento || l.data_registro || l.mes_referencia + '-01';
        const d = dateStr.substring(0, 10);
        return d >= periodBounds.start && d <= periodBounds.end;
      });
    }
    if (status === 'pending') list = list.filter(l => !l.is_category_confirmed);
    else if (status === 'confirmed') list = list.filter(l => l.is_category_confirmed);
    if (bankValue !== 'all') list = list.filter(l => getBancoLabel(l) === bankValue);
    if (categoryValue !== 'all') list = list.filter(l => (l.categoria || '').trim() === categoryValue);
    return list;
  }, [lancamentos, periodBounds, status, bankValue, categoryValue]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];
    if (periodBounds) {
      list = list.filter(t => {
        const d = (t as CreditCardTransaction).transaction_date?.substring(0, 10) ?? '';
        return d >= periodBounds.start && d <= periodBounds.end;
      });
    }
    if (status === 'pending') list = list.filter(t => !t.is_category_confirmed);
    else if (status === 'confirmed') list = list.filter(t => t.is_category_confirmed);
    if (cardValue !== 'all') list = list.filter(t => t.card_id === cardValue);
    if (categoryValue !== 'all') list = list.filter(t => (t.category || '').trim() === categoryValue);
    return list;
  }, [transactions, periodBounds, status, cardValue, categoryValue]);

  const hasActiveFilters = period !== 'this_month' || status !== 'all' || bankValue !== 'all' || categoryValue !== 'all' || cardValue !== 'all';

  const clearFilters = useCallback(() => {
    setPeriod('this_month');
    setStatus('all');
    setBankValue('all');
    setCategoryValue('all');
    setCardValue('all');
  }, []);

  const handleUpdateCategory = useCallback(async (id: string, categoryId: string, categoryName: string) => {
    return await updateTransaction(id, { category_id: categoryId, category: categoryName, is_category_confirmed: true });
  }, [updateTransaction]);

  const handleConfirmCategory = useCallback(async (id: string) => {
    return await updateTransaction(id, { is_category_confirmed: true });
  }, [updateTransaction]);

  const handleDelete = useCallback(async (id: string) => {
    return await deleteTransaction(id);
  }, [deleteTransaction]);

  const handleDeleteMultiple = useCallback(async (ids: string[]) => {
    return await deleteMultipleTransactions(ids);
  }, [deleteMultipleTransactions]);

  const handleUpdateFriendlyName = useCallback(async (id: string, friendlyName: string) => {
    return await updateTransaction(id, { friendly_name: friendlyName });
  }, [updateTransaction]);

  const unconfirmedCCCount = transactions.filter(t => !t.is_category_confirmed).length;
  const unconfirmedLancCount = lancamentos.filter(l => !l.is_category_confirmed).length;

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryAssignmentTab)} className="flex flex-col min-h-0 flex-1">
      <TabsList className="w-full shrink-0">
        <TabsTrigger value="conta" className="flex-1 gap-1.5 text-xs">
          <Landmark className="h-3.5 w-3.5" />
          Lançamentos em Conta
          {unconfirmedLancCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {unconfirmedLancCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="cartao" className="flex-1 gap-1.5 text-xs">
          <CreditCard className="h-3.5 w-3.5" />
          Cartão de Crédito
          {unconfirmedCCCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {unconfirmedCCCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <div className="shrink-0 mt-2">
        <CategoryAssignmentFilters
          activeTab={activeTab}
          period={period}
          onPeriodChange={setPeriod}
          status={status}
          onStatusChange={setStatus}
          bankOptions={bankOptions}
          bankValue={bankValue}
          onBankChange={setBankValue}
          categoryOptions={categoryOptions}
          categoryValue={categoryValue}
          onCategoryChange={setCategoryValue}
          cardOptions={availableCards.map(c => ({ id: c.id, name: c.name }))}
          cardValue={cardValue}
          onCardChange={setCardValue}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          compact
        />
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 mt-2">
        <TabsContent value="cartao" className="mt-0 h-full">
          <ImportedTransactionsTable
            transactions={filteredTransactions}
            bills={bills}
            loading={transactionsLoading}
            onUpdateCategory={handleUpdateCategory}
            onUpdateFriendlyName={handleUpdateFriendlyName}
            onFriendlyNameAppliedAll={fetchTransactions}
            onConfirmCategory={handleConfirmCategory}
            onDelete={handleDelete}
            onDeleteMultiple={handleDeleteMultiple}
            availableCards={availableCards}
            hideFilters
          />
        </TabsContent>
        <TabsContent value="conta" className="mt-0 h-full">
          <LancamentoCategorySection
            lancamentos={filteredLancamentos}
            onCategoryUpdated={fetchLancamentos}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export const CategoryAssignmentDialog: React.FC<CategoryAssignmentDialogProps> = ({
  open,
  onOpenChange,
  defaultTab = 'conta',
  onComplete,
}) => {
  const isTabletOrMobile = useIsTabletOrMobile();

  const handleClose = (value: boolean) => {
    onOpenChange(value);
    if (!value) onComplete?.();
  };

  if (isTabletOrMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="h-[95vh] max-h-[95vh]">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Atribuir Categorias
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <CategoryAssignmentContent defaultTab={defaultTab} open={open} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[1600px] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Atribuir Categorias
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CategoryAssignmentContent defaultTab={defaultTab} open={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Card trigger that matches CollapsibleModule visual style */
interface CategoryAssignmentCardProps {
  title: string;
  description?: string;
  count?: number;
  defaultTab?: CategoryAssignmentTab;
}

export const CategoryAssignmentCard: React.FC<CategoryAssignmentCardProps> = ({
  title,
  description,
  count,
  defaultTab = 'conta',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        className="cursor-pointer hover:bg-muted/30 transition-colors border-border/60 active:scale-[0.99]"
        onClick={() => setOpen(true)}
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{title}</span>
                  {count !== undefined && count > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                      {count}
                    </span>
                  )}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>

      <CategoryAssignmentDialog
        open={open}
        onOpenChange={setOpen}
        defaultTab={defaultTab}
      />
    </>
  );
};
