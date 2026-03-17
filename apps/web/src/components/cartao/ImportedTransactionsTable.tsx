import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { CardBrandIcon } from '@/components/openfinance/CardBrandIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCcw,
  Calendar,
  X,
  Trash2,
  Check,
  Loader2,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Star,
  CreditCard,
  SortAsc,
  SortDesc,
  Package,
} from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { expenseCategories, financialInstitutions } from '@/data/defaultData';
import { detectRecurringByWhitelist } from '@/utils/recurringWhitelist';
import { CreditCardTransaction } from '@/hooks/useCreditCardTransactions';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import { InstallmentEditDialog } from './InstallmentEditDialog';
import { applyStoreFriendlyNameRule } from '@/utils/storeFriendlyNameRules';
import { toast } from 'sonner';
import { FriendlyNameConfirmDialog } from './FriendlyNameConfirmDialog';

interface AvailableCardInfo {
  id: string;
  name: string;
  color: string;
  brand?: string;
  number?: string;
  connectorName?: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
  cardBrand?: string | null;
  cardLevel?: string | null;
}

interface ImportedTransactionsTableProps {
  transactions: CreditCardTransaction[];
  bills?: CreditCardBill[];
  loading: boolean;
  onUpdateCategory: (id: string, categoryId: string, categoryName: string) => Promise<boolean>;
  onUpdateFriendlyName?: (id: string, friendlyName: string) => Promise<boolean>;
  onConfirmCategory?: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDeleteMultiple?: (ids: string[]) => Promise<boolean>;
  selectedCardId?: string;
  availableCards?: AvailableCardInfo[];
  onFriendlyNameAppliedAll?: () => void;
  /** Quando true, não exibe filtros internos (período, status, cartão); usa transactions já filtrados pelo parent (ex.: Atribuir Categorias). */
  hideFilters?: boolean;
}

type SortField = 'date' | 'storeName' | 'value' | 'category';
type SortDirection = 'asc' | 'desc';

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatShortDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
};

/** Compute estimated purchase date from charge date and installment info */
const getPurchaseDateFromTransaction = (t: CreditCardTransaction): string => {
  if (t.installment_current && t.installment_current > 1) {
    const d = new Date(t.transaction_date + 'T00:00:00');
    d.setMonth(d.getMonth() - (t.installment_current - 1));
    return d.toISOString().split('T')[0];
  }
  return t.transaction_date;
};

/** Get the bill reference month (YYYY-MM) from the transaction date */
const getBillMonth = (t: CreditCardTransaction): string => {
  return t.transaction_date.substring(0, 7);
};

/** Payment patterns to exclude from display (bill payments, not actual purchases) */
const PAYMENT_PATTERNS = ['pagamento de fatura', 'pagamento recebido', 'desconto antecipação', 'desconto antecipacao'];
const isPaymentTransaction = (name: string) =>
  PAYMENT_PATTERNS.some(p => name.toLowerCase().includes(p));

export function ImportedTransactionsTable({
  transactions,
  bills = [],
  loading,
  onUpdateCategory,
  onUpdateFriendlyName,
  onConfirmCategory,
  onDelete,
  onDeleteMultiple,
  selectedCardId,
  availableCards = [],
  onFriendlyNameAppliedAll,
  hideFilters = false,
}: ImportedTransactionsTableProps) {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (isHidden) return '••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filters
  const [showMobileSortMenu, setShowMobileSortMenu] = useState(false);
  
  // Period filter
  type PeriodFilter = 'thisMonth' | 'last2Months' | 'custom';
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [customStartMonth, setCustomStartMonth] = useState('');
  const [customEndMonth, setCustomEndMonth] = useState('');
  const [showUnvalidatedOnly, setShowUnvalidatedOnly] = useState(false);
  
  // Edit friendly name
  const [editingFriendlyNameId, setEditingFriendlyNameId] = useState<string | null>(null);
  const [friendlyNameValue, setFriendlyNameValue] = useState('');

  // Sorting - default to date ascending (charge date)
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Grouping - always flat list (grouped view removed)
  const groupByCategory = false;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(new Set());

  // Loading states for individual actions
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Mobile long-press selection
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CreditCardTransaction | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [installmentEditTransaction, setInstallmentEditTransaction] = useState<CreditCardTransaction | null>(null);
  
  // Edit dialog local state
  const [editDialogFriendlyName, setEditDialogFriendlyName] = useState('');
  const [editDialogOriginalFriendlyName, setEditDialogOriginalFriendlyName] = useState('');
  const [editDialogCategoryId, setEditDialogCategoryId] = useState('');
  const [editDialogOriginalCategoryId, setEditDialogOriginalCategoryId] = useState('');
  const [editDialogSaving, setEditDialogSaving] = useState(false);

  // Friendly name confirmation dialog state
  const [friendlyNameDialogOpen, setFriendlyNameDialogOpen] = useState(false);
  const [friendlyNameDialogContext, setFriendlyNameDialogContext] = useState<{
    storeName: string;
    friendlyName: string;
    transactionId: string;
    previousName: string;
  } | null>(null);

  const allCategories = useMemo(() => [
    ...expenseCategories,
    { id: 'outros', name: 'Não atribuído', reference: '' }
  ], []);

  // Map bill ID to due_date for quick lookup
  const billDueDateMap = useMemo(() => {
    const map = new Map<string, string>();
    bills.forEach(b => map.set(b.id, b.due_date));
    return map;
  }, [bills]);

  const getDueDate = (t: CreditCardTransaction): string | null => {
    if (t.credit_card_bill_id) {
      return billDueDateMap.get(t.credit_card_bill_id) || null;
    }
    return null;
  };

  // Get card info by card_id - prefer availableCards prop, fallback to financialInstitutions
  const getCardInfo = (cardId: string | null) => {
    if (!cardId) return null;
    const avCard = availableCards.find(c => c.id === cardId);
    if (avCard) return avCard;
    return financialInstitutions.find(inst => inst.id === cardId);
  };

  // Available years for custom period selector
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Filter by selected card and exclude payment transactions (when !hideFilters; when hideFilters, parent already filtered)
  const cardFilteredTransactions = useMemo(() => {
    let result = transactions.filter(t => !isPaymentTransaction(t.store_name));
    if (!hideFilters && selectedCardId && selectedCardId !== 'all') {
      result = result.filter(t => t.card_id === selectedCardId);
    }
    return result;
  }, [transactions, selectedCardId, hideFilters]);

  // Compute period date range from periodFilter
  const periodRange = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth(); // 0-indexed
    
    if (periodFilter === 'thisMonth') {
      const start = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
      return { startMonth: start, endMonth: start };
    }
    if (periodFilter === 'last2Months') {
      const endMonth = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
      const prevDate = new Date(thisYear, thisMonth - 1, 1);
      const startMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      return { startMonth, endMonth };
    }
    // custom
    return { startMonth: customStartMonth, endMonth: customEndMonth };
  }, [periodFilter, customStartMonth, customEndMonth]);

  // Period label for display
  const periodLabel = useMemo(() => {
    if (periodFilter === 'thisMonth') return 'este mês';
    if (periodFilter === 'last2Months') return 'últimos 2 meses';
    if (periodRange.startMonth && periodRange.endMonth) {
      if (periodRange.startMonth === periodRange.endMonth) return formatMonthLabel(periodRange.startMonth);
      return `${formatMonthLabel(periodRange.startMonth)} a ${formatMonthLabel(periodRange.endMonth)}`;
    }
    return 'período personalizado';
  }, [periodFilter, periodRange]);

  // Filter and sort transactions (when hideFilters, parent already applied period/status/card; only sort here)
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...cardFilteredTransactions];

    if (!hideFilters) {
      if (periodRange.startMonth) {
        result = result.filter(t => t.transaction_date.substring(0, 7) >= periodRange.startMonth);
      }
      if (periodRange.endMonth) {
        result = result.filter(t => t.transaction_date.substring(0, 7) <= periodRange.endMonth);
      }
      if (showUnvalidatedOnly) {
        result = result.filter(t => !t.is_category_confirmed);
      }
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.transaction_date.localeCompare(b.transaction_date);
          break;
        case 'storeName': {
          const aName = a.friendly_name || a.store_name;
          const bName = b.friendly_name || b.store_name;
          comparison = aName.localeCompare(bName);
          break;
        }
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cardFilteredTransactions, periodRange, showUnvalidatedOnly, sortField, sortDirection, hideFilters]);

  // Calculate totals
  const totals = useMemo(() => {
    const filteredTotal = filteredAndSortedTransactions.reduce((sum, t) => sum + t.value, 0);
    const grandTotal = cardFilteredTransactions.reduce((sum, t) => sum + t.value, 0);
    const unvalidatedCount = filteredAndSortedTransactions.filter(t => !t.is_category_confirmed).length;
    return { filteredTotal, grandTotal, filteredCount: filteredAndSortedTransactions.length, unvalidatedCount };
  }, [filteredAndSortedTransactions, cardFilteredTransactions]);

  // Group transactions by category
  const groupedTransactions = useMemo(() => {
    if (!groupByCategory) return null;
    
    const groups: Record<string, { 
      categoryId: string; 
      categoryName: string; 
      transactions: CreditCardTransaction[];
      subGroups: {
        storeName: string;
        transactions: CreditCardTransaction[];
        total: number;
      }[];
      total: number;
    }> = {};
    
    filteredAndSortedTransactions.forEach(t => {
      const catId = t.category_id || 'outros';
      const cat = allCategories.find(c => c.id === catId);
      const catName = cat?.name || 'Não atribuído';
      
      if (!groups[catId]) {
        groups[catId] = {
          categoryId: catId,
          categoryName: catName,
          transactions: [],
          subGroups: [],
          total: 0,
        };
      }
      groups[catId].transactions.push(t);
      groups[catId].total += t.value;
    });
    
    // Create subgroups for repeated items within each category
    Object.values(groups).forEach(group => {
      const storeGroups: Record<string, { 
        storeName: string; 
        transactions: CreditCardTransaction[]; 
        total: number 
      }> = {};
      
      group.transactions.forEach(t => {
        // Normalize store name (remove installment info for grouping)
        const baseStoreName = t.friendly_name || t.store_name.replace(/\s*\d+\/\d+\s*$/, '').trim();
        
        if (!storeGroups[baseStoreName]) {
          storeGroups[baseStoreName] = {
            storeName: baseStoreName,
            transactions: [],
            total: 0,
          };
        }
        storeGroups[baseStoreName].transactions.push(t);
        storeGroups[baseStoreName].total += t.value;
      });
      
      // Sort transactions within each subgroup by date descending
      Object.values(storeGroups).forEach(sg => {
        sg.transactions.sort((a, b) => 
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        );
      });
      
      // Sort subgroups by total value descending
      group.subGroups = Object.values(storeGroups).sort((a, b) => b.total - a.total);
    });
    
    // Sort groups by total value descending
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [filteredAndSortedTransactions, groupByCategory, allCategories]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const clearFilters = () => {
    setPeriodFilter('thisMonth');
    setCustomStartMonth('');
    setCustomEndMonth('');
    setShowUnvalidatedOnly(false);
  };

  const hasActiveFilters = !hideFilters && (periodFilter !== 'thisMonth' || showUnvalidatedOnly);
  
  // Friendly name handlers
  const handleEditFriendlyName = (transaction: CreditCardTransaction) => {
    setEditingFriendlyNameId(transaction.id);
    setFriendlyNameValue(transaction.friendly_name || transaction.store_name);
  };
  
  const handleSaveFriendlyName = async (transaction: CreditCardTransaction) => {
    const newName = friendlyNameValue.trim();
    if (!newName || newName === transaction.store_name) {
      if (onUpdateFriendlyName && newName === transaction.store_name) {
        await onUpdateFriendlyName(transaction.id, '');
      }
      setEditingFriendlyNameId(null);
      setFriendlyNameValue('');
      return;
    }
    
    if (onUpdateFriendlyName) {
      await onUpdateFriendlyName(transaction.id, newName);
    }
    setEditingFriendlyNameId(null);
    setFriendlyNameValue('');

    // Open confirmation dialog instead of toast
    setFriendlyNameDialogContext({
      storeName: transaction.store_name,
      friendlyName: newName,
      transactionId: transaction.id,
      previousName: transaction.friendly_name || '',
    });
    setFriendlyNameDialogOpen(true);
  };

  const handleFriendlyNameApplyThisOnly = () => {
    // Name already saved to this transaction, just close
    setFriendlyNameDialogOpen(false);
    setFriendlyNameDialogContext(null);
    toast.success('Nome atualizado nesta transação.');
  };

  const handleFriendlyNameApplyAll = async () => {
    if (!friendlyNameDialogContext) return;
    const { storeName, friendlyName } = friendlyNameDialogContext;
    await applyStoreFriendlyNameRule(storeName, friendlyName);
    setFriendlyNameDialogOpen(false);
    setFriendlyNameDialogContext(null);
    onFriendlyNameAppliedAll?.();
  };

  const handleFriendlyNameCancel = async () => {
    // Revert the name
    if (friendlyNameDialogContext && onUpdateFriendlyName) {
      await onUpdateFriendlyName(
        friendlyNameDialogContext.transactionId,
        friendlyNameDialogContext.previousName,
      );
    }
    setFriendlyNameDialogOpen(false);
    setFriendlyNameDialogContext(null);
  };
  
  const handleCancelFriendlyName = () => {
    setEditingFriendlyNameId(null);
    setFriendlyNameValue('');
  };

  const openEditDialog = (transaction: CreditCardTransaction) => {
    setSelectedTransaction(transaction);
    const fname = transaction.friendly_name || transaction.store_name;
    setEditDialogFriendlyName(fname);
    setEditDialogOriginalFriendlyName(fname);
    const catId = transaction.category_id || 'outros';
    setEditDialogCategoryId(catId);
    setEditDialogOriginalCategoryId(catId);
    setEditDialogSaving(false);
    setShowEditSheet(true);
  };

  // Get display name (friendly name or store name)
  const getDisplayName = (transaction: CreditCardTransaction): string => {
    return transaction.friendly_name || transaction.store_name;
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const expandAllCategories = () => {
    if (groupedTransactions) {
      setExpandedCategories(new Set(groupedTransactions.map(g => g.categoryId)));
    }
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
    setExpandedSubGroups(new Set());
  };

  const toggleSubGroup = (subGroupKey: string) => {
    setExpandedSubGroups(prev => {
      const next = new Set(prev);
      if (next.has(subGroupKey)) {
        next.delete(subGroupKey);
      } else {
        next.add(subGroupKey);
      }
      return next;
    });
  };

  // Detect if transaction might be recurring (uses shared whitelist)
  const isRecurring = (storeName: string): boolean => {
    return detectRecurringByWhitelist(storeName);
  };

  // Detect installment info from store name
  const parseInstallmentInfo = (storeName: string): { current: number; total: number } | null => {
    const patterns = [
      /(\d{1,2})\s*\/\s*(\d{1,2})/,
      /parcela?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/i,
      /parc\.?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/i,
    ];
    
    for (const pattern of patterns) {
      const match = storeName.match(pattern);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        if (current <= total && total <= 48) {
          return { current, total };
        }
      }
    }
    return null;
  };

  const handleCategoryChange = async (transaction: CreditCardTransaction, newCategoryId: string) => {
    const category = allCategories.find(c => c.id === newCategoryId);
    if (!category) return;
    
    setUpdatingId(transaction.id);
    await onUpdateCategory(transaction.id, newCategoryId, category.name);
    setUpdatingId(null);
  };

  const handleConfirmCategory = async (transaction: CreditCardTransaction) => {
    if (!onConfirmCategory) return;
    setUpdatingId(transaction.id);
    await onConfirmCategory(transaction.id);
    setUpdatingId(null);

    // Offer to create auto-category rule via toast
    const storeName = transaction.store_name;
    const categoryId = transaction.category_id;
    const categoryName = transaction.category || 'Não atribuído';
    if (categoryId && categoryId !== 'outros') {
      const { toast: sonnerToast } = await import('sonner');
      const { createStoreCategoryRule } = await import('@/utils/storeCategoryRules');
      const label = storeName.length > 25 ? storeName.substring(0, 25) + '…' : storeName;
      sonnerToast.success('Categoria confirmada!', {
        action: {
          label: `Sempre aplicar para ${label}`,
          onClick: () => createStoreCategoryRule(storeName, categoryId, categoryName),
        },
        duration: 8000,
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Direct delete (used after AlertDialog confirmation)
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    // Remove from selection if deleted
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setShowEditSheet(false);
    setSelectedTransaction(null);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await handleDelete(transactionToDelete);
      setTransactionToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedTransactions.map(t => t.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    
    if (onDeleteMultiple) {
      await onDeleteMultiple(Array.from(selectedIds));
    } else {
      // Fallback: delete one by one
      for (const id of selectedIds) {
        await onDelete(id);
      }
    }
    
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
  };

  const confirmBulkDelete = async () => {
    await handleBulkDelete();
    setBulkDeleteConfirmOpen(false);
  };

  // Mobile long-press handlers
  const handleTouchStart = (transaction: CreditCardTransaction) => {
    if (!isMobile) return;
    
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      openEditDialog(transaction);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  const isAllSelected = filteredAndSortedTransactions.length > 0 && 
    selectedIds.size === filteredAndSortedTransactions.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedTransactions.length;
  const selectedTotal = filteredAndSortedTransactions
    .filter(t => selectedIds.has(t.id))
    .reduce((sum, t) => sum + t.value, 0);

  if (loading) {
    return (
      <RXFinLoadingSpinner height="py-12" size={56} />
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma transação importada ainda.</p>
        <p className="text-sm mt-1">Use o botão "Importar Fatura" para adicionar transações.</p>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    // Mobile grouped view render function
    const renderMobileGroupedView = () => (
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {groupedTransactions && groupedTransactions.length > 0 ? (
            groupedTransactions.map((group) => {
              const isExpanded = expandedCategories.has(group.categoryId);
              return (
                <Collapsible
                  key={group.categoryId}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(group.categoryId)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg cursor-pointer",
                      group.categoryId === 'outros'
                        ? "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900"
                        : "bg-muted/50"
                    )}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <div>
                          <p className={cn(
                            "font-medium text-xs",
                            group.categoryId === 'outros' && "text-red-700 dark:text-red-400 font-bold"
                          )}>{group.categoryName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {group.transactions.length} itens
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-primary">{formatCurrencyCompact(group.total)}</p>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 ml-5 space-y-1">
                      {group.transactions.map((t) => {
                        const installmentInfo = parseInstallmentInfo(t.store_name);
                        const recurring = isRecurring(t.store_name) || t.is_recurring;
                        const isInstallment = installmentInfo !== null;
                        const isConfirmed = t.is_category_confirmed === true;
                        
                        return (
                          <div 
                            key={t.id}
                            className={cn(
                              "p-2 rounded-md border text-xs cursor-pointer active:scale-[0.98] transition-colors",
                              isConfirmed
                                ? "bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                                : "bg-background border-border"
                            )}
                            onClick={() => {
                              openEditDialog(t);
                            }}
                            onTouchStart={() => handleTouchStart(t)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchMove}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-[10px] text-muted-foreground">{formatShortDate(t.transaction_date)}</span>
                                  {recurring && (
                                    <Badge variant="outline" className="h-3 px-0.5 text-[7px] bg-primary/10 border-primary/20">
                                      <RefreshCcw className="h-1.5 w-1.5" />
                                    </Badge>
                                  )}
                                  {isInstallment && (
                                    <Badge variant="secondary" className="h-3 px-1 text-[7px] bg-amber-500/10 text-amber-600">
                                      {installmentInfo.current}/{installmentInfo.total}
                                    </Badge>
                                  )}
                                  {isConfirmed && (
                                    <Check className="h-2.5 w-2.5 text-emerald-500/60" strokeWidth={2.5} />
                                  )}
                                </div>
                                <p className="text-[11px] font-medium truncate" title={t.store_name}>
                                  {getDisplayName(t)}
                                </p>
                              </div>
                              <div className="flex items-center shrink-0">
                                <span className="font-medium text-[11px] tabular-nums">
                                  {formatCurrencyCompact(t.value)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground text-xs">
              {hasActiveFilters ? 'Nenhuma transação encontrada' : 'Nenhuma transação'}
            </div>
          )}
        </div>
      </ScrollArea>
    );

    // Mobile flat list view render function
    const renderMobileFlatView = () => (
      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              {hasActiveFilters ? 'Nenhuma transação encontrada' : 'Nenhuma transação'}
            </div>
          ) : (
            filteredAndSortedTransactions.map((t) => {
              const installmentInfo = parseInstallmentInfo(t.store_name);
              const recurring = isRecurring(t.store_name) || t.is_recurring;
              const isInstallment = installmentInfo !== null;
              const cardInfo = getCardInfo(t.card_id);
              const isSelected = selectedIds.has(t.id);
              const isConfirmed = t.is_category_confirmed === true;
              
              return (
                <div 
                  key={t.id}
                  className={cn(
                    "p-2.5 rounded-lg border transition-colors touch-none select-none cursor-pointer active:scale-[0.98]",
                    isSelected 
                      ? "bg-primary/10 border-primary/30" 
                      : isConfirmed
                        ? "bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                        : "bg-card border-border",
                    t.status === 'PENDING' && !isConfirmed && "border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20"
                  )}
                  onClick={() => {
                    if (selectedIds.size > 0) {
                      toggleSelectOne(t.id);
                    } else {
                      openEditDialog(t);
                    }
                  }}
                  onTouchStart={() => handleTouchStart(t)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {t.status === 'PENDING' && (
                          <Badge variant="outline" className="h-3.5 px-1 text-[7px] border-dashed border-amber-400 text-amber-600 dark:text-amber-400">
                            Pendente
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{formatShortDate(t.transaction_date)}</span>
                        {recurring && (
                          <Badge variant="outline" className="h-3.5 px-1 text-[8px] bg-primary/10 border-primary/20">
                            <RefreshCcw className="h-2 w-2" />
                          </Badge>
                        )}
                        {isInstallment && (
                          <Badge variant="secondary" className="h-3.5 px-1 text-[8px] bg-amber-500/10 text-amber-600">
                            {installmentInfo.current}/{installmentInfo.total}
                          </Badge>
                        )}
                        {isConfirmed && (
                          <Check className="h-3 w-3 text-emerald-500/60" strokeWidth={2.5} />
                        )}
                      </div>
                      <p className="text-xs font-medium truncate" title={getDisplayName(t)}>
                        {getDisplayName(t)}
                      </p>
                      {t.friendly_name && t.friendly_name !== t.store_name && (
                        <p className="text-[9px] text-muted-foreground/60 truncate flex items-center gap-0.5" title={t.store_name}>
                          <CreditCard className="h-2 w-2 shrink-0" />
                          {t.store_name.length > 20 ? t.store_name.substring(0, 20) + '…' : t.store_name}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {cardInfo && (
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cardInfo.color }}
                            />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                              {cardInfo.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      <p className="text-xs font-bold tabular-nums">{formatCurrencyCompact(t.value)}</p>
                    </div>
                  </div>
                  {/* Category below */}
                  <div className="mt-1.5 pt-1 border-t border-border/30">
                    <span className={cn(
                      "text-[10px]",
                      (!t.category_id || t.category_id === 'outros') 
                        ? "text-red-500 dark:text-red-400 font-medium" 
                        : "text-muted-foreground"
                    )}>
                      {t.category || 'Não atribuído'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    );

    return (
      <div className="space-y-3">
        {!hideFilters && (
        <>
        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {(['thisMonth', 'last2Months', 'custom'] as const).map((p) => (
              <Button
                key={p}
                variant={periodFilter === p ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-7 text-[10px] px-2", periodFilter === p && "shadow-sm")}
                onClick={() => setPeriodFilter(p)}
              >
                {p === 'thisMonth' ? 'Este mês' : p === 'last2Months' ? 'Últimos 2 meses' : 'Personalizado'}
              </Button>
            ))}
          </div>
          
          <Button
            variant={showUnvalidatedOnly ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
          >
            <Filter className="h-3 w-3" />
            Não validados
            {totals.unvalidatedCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center ml-0.5">
                {totals.unvalidatedCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Custom period selectors */}
        {periodFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">De:</span>
            <Select value={customStartMonth ? customStartMonth.split('-')[1] : ''} onValueChange={(m) => setCustomStartMonth(`${customStartMonth ? customStartMonth.split('-')[0] : new Date().getFullYear()}-${m}`)}>
              <SelectTrigger className="h-7 w-[90px] text-[10px]"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name.substring(0, 3)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={customStartMonth ? customStartMonth.split('-')[0] : ''} onValueChange={(y) => setCustomStartMonth(`${y}-${customStartMonth ? customStartMonth.split('-')[1] : '01'}`)}>
              <SelectTrigger className="h-7 w-[72px] text-[10px]"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">até</span>
            <Select value={customEndMonth ? customEndMonth.split('-')[1] : ''} onValueChange={(m) => setCustomEndMonth(`${customEndMonth ? customEndMonth.split('-')[0] : new Date().getFullYear()}-${m}`)}>
              <SelectTrigger className="h-7 w-[90px] text-[10px]"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name.substring(0, 3)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={customEndMonth ? customEndMonth.split('-')[0] : ''} onValueChange={(y) => setCustomEndMonth(`${y}-${customEndMonth ? customEndMonth.split('-')[1] : '12'}`)}>
              <SelectTrigger className="h-7 w-[72px] text-[10px]"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        </>
        )}
        {/* Sort Popover (mobile) */}
        <div className="flex items-center gap-2">
          <Popover open={showMobileSortMenu} onOpenChange={setShowMobileSortMenu}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]">
                {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                Ordenar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Ordenar por</p>
                {([
                  { field: 'date' as SortField, label: 'Data' },
                  { field: 'storeName' as SortField, label: 'Nome (A-Z)' },
                  { field: 'value' as SortField, label: 'Valor' },
                  { field: 'category' as SortField, label: 'Categoria' },
                ]).map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={sortField === field ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-between h-8 text-xs"
                    onClick={() => { handleSort(field); setShowMobileSortMenu(false); }}
                  >
                    {label}
                    {sortField === field && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile Bulk Selection Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedIds(new Set())}>
                Limpar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-6 text-[10px] gap-1" disabled={isBulkDeleting}>
                    <Trash2 className="h-2.5 w-2.5" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedIds.size} transações?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Total: {formatCurrency(selectedTotal)}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-expense hover:bg-expense/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Mobile Transaction List - Show grouped or flat view */}
        {groupByCategory ? renderMobileGroupedView() : renderMobileFlatView()}

        {/* Mobile Summary */}
        <div className="border-t pt-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{totals.filteredCount}</span> transações no {periodLabel}
            </span>
            <span className="font-bold text-primary">{formatCurrency(totals.filteredTotal)}</span>
          </div>
          {totals.unvalidatedCount > 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              {totals.unvalidatedCount} transação(ões) com categoria não validada
            </p>
          )}
        </div>

        {/* Mobile Edit Dialog */}
        <Dialog open={showEditSheet} onOpenChange={setShowEditSheet}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl" hideCloseButton={false} onOpenAutoFocus={(e) => e.preventDefault()}>
            {selectedTransaction && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-left text-sm">
                    {getDisplayName(selectedTransaction)}
                  </DialogTitle>
                  <DialogDescription className="text-left text-[11px] text-muted-foreground/70 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Na fatura: {selectedTransaction.store_name}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3">
                  {/* Friendly Name */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Nome personalizado</span>
                    <div className="flex gap-2">
                      <Input
                        value={editingFriendlyNameId === selectedTransaction.id ? friendlyNameValue : (selectedTransaction.friendly_name || selectedTransaction.store_name)}
                        onChange={(e) => {
                          if (editingFriendlyNameId !== selectedTransaction.id) {
                            setEditingFriendlyNameId(selectedTransaction.id);
                            setFriendlyNameValue(e.target.value);
                          } else {
                            setFriendlyNameValue(e.target.value);
                          }
                        }}
                        onFocus={() => {
                          if (editingFriendlyNameId !== selectedTransaction.id) {
                            setEditingFriendlyNameId(selectedTransaction.id);
                            setFriendlyNameValue(selectedTransaction.friendly_name || selectedTransaction.store_name);
                          }
                        }}
                        className="flex-1 h-9 text-sm"
                        placeholder="Nome personalizado"
                      />
                      {editingFriendlyNameId === selectedTransaction.id && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-9"
                            onClick={() => handleSaveFriendlyName(selectedTransaction)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9"
                            onClick={handleCancelFriendlyName}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Original invoice name (read-only) */}
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Nome na fatura
                    </span>
                    <p className="text-sm text-muted-foreground/80 bg-muted/40 rounded-md px-3 py-1.5">{selectedTransaction.store_name}</p>
                  </div>
                  
                  {/* Value */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedTransaction.value)}</span>
                  </div>
                  
                  {/* Date */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Data da Compra</span>
                    <span className="text-sm font-medium">{formatDate(selectedTransaction.transaction_date)}</span>
                  </div>
                  {(() => { const dd = getDueDate(selectedTransaction); return dd ? (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Competência</span>
                    <span className="text-sm text-muted-foreground">{formatDate(dd)}</span>
                  </div>
                  ) : null; })()}
                  
                  {/* Category */}
                  <div className="space-y-1.5">
                    <span className="text-sm text-muted-foreground">Categoria</span>
                    <Select
                      value={selectedTransaction.category_id || 'outros'}
                      onValueChange={(value) => handleCategoryChange(selectedTransaction, value)}
                      disabled={updatingId === selectedTransaction.id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Card */}
                  {getCardInfo(selectedTransaction.card_id) && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Cartão</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCardInfo(selectedTransaction.card_id)?.color }}
                        />
                        <span className="text-sm">{getCardInfo(selectedTransaction.card_id)?.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Installment Info - Editable */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Parcelamento</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setInstallmentEditTransaction(selectedTransaction);
                        setShowEditSheet(false);
                      }}
                    >
                      <Package className="h-3 w-3" />
                      {selectedTransaction.installment_total && selectedTransaction.installment_total > 1
                        ? `${selectedTransaction.installment_current}/${selectedTransaction.installment_total}`
                        : 'Definir parcelas'}
                    </Button>
                  </div>
                  
                  {/* Recurring */}
                  {(isRecurring(selectedTransaction.store_name) || selectedTransaction.is_recurring) && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Tipo</span>
                      <Badge variant="outline" className="bg-primary/10 border-primary/20">
                        <RefreshCcw className="h-3 w-3 mr-1" />
                        Recorrente
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!selectedTransaction.is_category_confirmed && selectedTransaction.category_id && selectedTransaction.category_id !== 'outros' && (
                    <Button 
                      variant="default" 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleConfirmCategory(selectedTransaction);
                        setSelectedTransaction({...selectedTransaction, is_category_confirmed: true});
                      }}
                      disabled={updatingId === selectedTransaction.id}
                    >
                      {updatingId === selectedTransaction.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar Categoria
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditSheet(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      {!hideFilters && (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {(['thisMonth', 'last2Months', 'custom'] as const).map((p) => (
            <Button
              key={p}
              variant={periodFilter === p ? 'default' : 'ghost'}
              size="sm"
              className={cn("h-7 text-xs px-3", periodFilter === p && "shadow-sm")}
              onClick={() => setPeriodFilter(p)}
            >
              {p === 'thisMonth' ? 'Este mês' : p === 'last2Months' ? 'Últimos 2 meses' : 'Personalizado'}
            </Button>
          ))}
        </div>

        {periodFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">De:</span>
            <Select value={customStartMonth ? customStartMonth.split('-')[1] : ''} onValueChange={(m) => setCustomStartMonth(`${customStartMonth ? customStartMonth.split('-')[0] : new Date().getFullYear()}-${m}`)}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name.substring(0, 3)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={customStartMonth ? customStartMonth.split('-')[0] : ''} onValueChange={(y) => setCustomStartMonth(`${y}-${customStartMonth ? customStartMonth.split('-')[1] : '01'}`)}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">até</span>
            <Select value={customEndMonth ? customEndMonth.split('-')[1] : ''} onValueChange={(m) => setCustomEndMonth(`${customEndMonth ? customEndMonth.split('-')[0] : new Date().getFullYear()}-${m}`)}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((name, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">{name.substring(0, 3)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={customEndMonth ? customEndMonth.split('-')[0] : ''} onValueChange={(y) => setCustomEndMonth(`${y}-${customEndMonth ? customEndMonth.split('-')[1] : '12'}`)}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        
        <Button
          variant={showUnvalidatedOnly ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1.5 ml-auto"
          onClick={() => setShowUnvalidatedOnly(!showUnvalidatedOnly)}
        >
          <Filter className="h-3 w-3" />
          Não validados
          {totals.unvalidatedCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center">
              {totals.unvalidatedCount}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
      )}

      {/* (Bulk selection bar removed - no delete in this section) */}

      {/* Grouped View */}
      {groupByCategory && groupedTransactions ? (
        <ScrollArea className="h-[400px] border rounded-lg">
          <div className="p-3 space-y-2">
            {groupedTransactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {hasActiveFilters 
                  ? 'Nenhuma transação encontrada com os filtros aplicados'
                  : 'Nenhuma transação para exibir'}
              </div>
            ) : (
              groupedTransactions.map((group) => {
                const isExpanded = expandedCategories.has(group.categoryId);
                return (
                  <Collapsible
                    key={group.categoryId}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(group.categoryId)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={cn(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                        group.categoryId === 'outros' 
                          ? "bg-red-50 hover:bg-red-100 border border-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:border-red-900" 
                          : "bg-muted/50 hover:bg-muted"
                      )}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className={cn(
                              "font-medium text-sm",
                              group.categoryId === 'outros' && "text-red-700 dark:text-red-400 font-bold"
                            )}>{group.categoryName}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.transactions.length} {group.transactions.length === 1 ? 'transação' : 'transações'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(group.total)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {((group.total / totals.filteredTotal) * 100).toFixed(1)}% do total
                          </p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 ml-7 space-y-1">
                        {group.subGroups.map((subGroup) => {
                          const subGroupKey = `${group.categoryId}-${subGroup.storeName}`;
                          const isSubGroupExpanded = expandedSubGroups.has(subGroupKey);
                          const hasMultipleTransactions = subGroup.transactions.length > 1;
                          
                          // If only one transaction, show directly without sub-grouping
                          if (!hasMultipleTransactions) {
                            const t = subGroup.transactions[0];
                            const installmentInfo = parseInstallmentInfo(t.store_name);
                            const recurring = isRecurring(t.store_name);
                            const isInstallment = installmentInfo !== null;
                            const isDeleting = deletingId === t.id;
                            
                            return (
                              <div 
                                key={t.id} 
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-md bg-background border text-xs",
                                  isDeleting && "opacity-50"
                                )}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="shrink-0 w-20">
                                    <span className="font-semibold text-foreground">{formatShortDate(t.transaction_date)}</span>
                                    {(() => { const dd = getDueDate(t); return dd ? <span className="text-[10px] text-muted-foreground ml-1">({formatShortDate(dd)})</span> : null; })()}
                                  </div>
                                  <span className="font-medium truncate" title={t.store_name}>
                                    {t.store_name}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {recurring && (
                                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1 py-0">
                                        <RefreshCcw className="h-2 w-2" />
                                      </Badge>
                                    )}
                                    {isInstallment && (
                                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] px-1 py-0">
                                        {installmentInfo.current}/{installmentInfo.total}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {!t.is_category_confirmed && t.category_id && t.category_id !== 'outros' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                      onClick={() => handleConfirmCategory(t)}
                                      disabled={updatingId === t.id}
                                    >
                                      {updatingId === t.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-3 w-3" />}
                                    </Button>
                                  )}
                                  <span className="font-medium tabular-nums">
                                    {formatCurrency(t.value)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      openEditDialog(t);
                                    }}
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          
                          // Multiple transactions - show as collapsible sub-group
                          return (
                            <Collapsible
                              key={subGroupKey}
                              open={isSubGroupExpanded}
                              onOpenChange={() => toggleSubGroup(subGroupKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-dashed cursor-pointer hover:bg-background transition-colors">
                                  <div className="flex items-center gap-2">
                                    {isSubGroupExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-xs truncate" title={subGroup.storeName}>
                                      {subGroup.storeName}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {subGroup.transactions.length}x
                                    </Badge>
                                  </div>
                                  <span className="font-medium text-xs tabular-nums text-primary">
                                    {formatCurrency(subGroup.total)}
                                  </span>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-1 ml-5 space-y-1">
                                  {subGroup.transactions.map((t) => {
                                    const installmentInfo = parseInstallmentInfo(t.store_name);
                                    const recurring = isRecurring(t.store_name);
                                    const isInstallment = installmentInfo !== null;
                                    const isDeleting = deletingId === t.id;
                                    
                                    return (
                                      <div 
                                        key={t.id} 
                                        className={cn(
                                          "flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs",
                                          isDeleting && "opacity-50"
                                        )}
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="shrink-0 w-20">
                                            <span className="font-semibold text-foreground">{formatShortDate(t.transaction_date)}</span>
                                            {(() => { const dd = getDueDate(t); return dd ? <span className="text-[10px] text-muted-foreground ml-1">({formatShortDate(dd)})</span> : null; })()}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {recurring && (
                                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1 py-0">
                                                <RefreshCcw className="h-2 w-2" />
                                              </Badge>
                                            )}
                                            {isInstallment && (
                                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px] px-1 py-0">
                                                {installmentInfo.current}/{installmentInfo.total}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {!t.is_category_confirmed && t.category_id && t.category_id !== 'outros' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                              onClick={() => handleConfirmCategory(t)}
                                              disabled={updatingId === t.id}
                                            >
                                              {updatingId === t.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-3 w-3" />}
                                            </Button>
                                          )}
                                          <span className="font-medium tabular-nums">
                                            {formatCurrency(t.value)}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-muted-foreground hover:text-primary"
                                            onClick={() => {
                                            openEditDialog(t);
                                            }}
                                          >
                                            <Pencil className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      ) : (
        /* Table View */
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="min-w-[1000px]">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2 w-24"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 font-semibold">
                    Data da Compra
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2"
                  onClick={() => handleSort('storeName')}
                >
                  <div className="flex items-center gap-1">
                    Estabelecimento
                    {getSortIcon('storeName')}
                  </div>
                </TableHead>
                <TableHead className="py-2 px-2 w-56">Categoria</TableHead>
                <TableHead className="py-2 px-1 w-14 text-center">Status</TableHead>
                <TableHead className="text-center py-2 px-1 w-12">Parc.</TableHead>
                <TableHead className="text-center py-2 px-1 w-12">Recor.</TableHead>
                <TableHead className="py-2 px-2 w-10 text-center">Banco</TableHead>
                <TableHead className="py-2 px-1 w-12 text-center">Bandeira</TableHead>
                <TableHead className="py-2 px-1 w-16 text-center">Final</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors py-2 px-2 w-24"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor
                    {getSortIcon('value')}
                  </div>
                </TableHead>
                <TableHead className="text-center py-2 px-1 w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                    {hasActiveFilters 
                      ? 'Nenhuma transação encontrada com os filtros aplicados'
                      : 'Nenhuma transação para exibir'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTransactions.map((t) => {
                  const installmentInfo = parseInstallmentInfo(t.store_name);
                  const isUpdating = updatingId === t.id;
                  const cardInfo = getCardInfo(t.card_id);
                  const dueDate = getDueDate(t);
                  const installmentFromDb = t.installment_current && t.installment_total
                    ? { current: t.installment_current, total: t.installment_total }
                    : installmentInfo;
                  return (
                    <TableRow key={t.id} className="text-xs">
                      <TableCell className="whitespace-nowrap py-1.5 px-2 font-semibold text-foreground">
                        {formatDate(t.transaction_date)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[220px] py-1.5 px-2 group/name">
                        {editingFriendlyNameId === t.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={friendlyNameValue}
                              onChange={(e) => setFriendlyNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveFriendlyName(t);
                                if (e.key === 'Escape') handleCancelFriendlyName();
                              }}
                              className="h-6 text-[11px] min-w-0 flex-1"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveFriendlyName(t)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancelFriendlyName}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer" 
                            onClick={() => handleEditFriendlyName(t)}
                            title={`Clique para editar · Na fatura: ${t.store_name}`}
                          >
                            <div className="truncate flex items-center gap-1">
                              <span>{getDisplayName(t)}</span>
                              <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                            </div>
                            {t.friendly_name && t.friendly_name !== t.store_name && (
                              <div className="text-[9px] text-muted-foreground/50 font-normal truncate flex items-center gap-0.5 mt-0.5">
                                <CreditCard className="h-2 w-2 shrink-0" />
                                {t.store_name.length > 25 ? t.store_name.substring(0, 25) + '…' : t.store_name}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <Select
                            value={t.category_id || 'outros'}
                            onValueChange={(value) => handleCategoryChange(t, value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className={cn(
                              "w-[200px] h-6 text-[10px] border",
                              (!t.category_id || t.category_id === 'outros') 
                                ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 font-bold"
                                : t.is_category_confirmed
                                  ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                                  : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isUpdating && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        {t.is_category_confirmed ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                            <Check className="h-2 w-2 mr-0.5" />
                            Ok
                          </Badge>
                        ) : t.category_id && t.category_id !== 'outros' ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  onClick={() => handleConfirmCategory(t)}
                                  disabled={updatingId === t.id}
                                >
                                  {updatingId === t.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Confirmar categoria</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : t.ai_suggested_category ? (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                            IA
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        {installmentFromDb ? (
                          <span className="font-medium text-[10px]">
                            {installmentFromDb.total}x
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        {t.is_recurring ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        {cardInfo ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center">
                                  {'imageUrl' in cardInfo && cardInfo.imageUrl ? (
                                    <ConnectorLogo imageUrl={cardInfo.imageUrl} connectorName={('connectorName' in cardInfo ? cardInfo.connectorName : cardInfo.name) || ''} size="sm" />
                                  ) : (
                                    <div 
                                      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                                      style={{ backgroundColor: cardInfo.color }}
                                    >
                                      <span className="text-[8px] text-white font-bold">{cardInfo.name.charAt(0)}</span>
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{('connectorName' in cardInfo ? cardInfo.connectorName : null) || cardInfo.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        {cardInfo && 'cardBrand' in cardInfo && cardInfo.cardBrand ? (
                          <CardBrandIcon brand={cardInfo.cardBrand} className="h-4 w-4 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        {cardInfo && 'number' in cardInfo && cardInfo.number ? (
                          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                            •••• {cardInfo.number.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums py-1.5 px-2">
                        {formatCurrency(t.value)}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              openEditDialog(t);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
      )}
      {/* Summary Section */}
      <div className="border-t pt-3 space-y-2">
        {/* Grand total */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium text-foreground">{totals.filteredCount}</span> transações no {periodLabel}
            </p>
            {totals.unvalidatedCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                {totals.unvalidatedCount} transação(ões) com categoria não validada
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Total do período</p>
            <p className="text-base font-bold text-primary">
              {formatCurrency(totals.filteredTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Dialog for Desktop */}
      <Dialog open={showEditSheet} onOpenChange={(open) => {
        if (!open) {
          setEditDialogFriendlyName('');
          setEditDialogOriginalFriendlyName('');
          setEditDialogCategoryId('');
          setEditDialogOriginalCategoryId('');
          setEditDialogSaving(false);
        }
        setShowEditSheet(open);
      }}>
        <DialogContent className="max-w-md rounded-xl" hideCloseButton={false} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Altere a categoria ou nome da transação
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (() => {
            const hasFriendlyNameChange = editDialogFriendlyName !== editDialogOriginalFriendlyName;
            const hasCategoryChange = editDialogCategoryId !== editDialogOriginalCategoryId;
            const hasChanges = hasFriendlyNameChange || hasCategoryChange;

            return (
            <div className="space-y-4">
              {/* Friendly Name (editable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome personalizado</label>
                <Input
                  value={editDialogFriendlyName}
                  onChange={(e) => setEditDialogFriendlyName(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Nome personalizado"
                />
              </div>

              {/* Original invoice name (read-only) */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Nome na fatura
                </label>
                <p className="text-sm text-muted-foreground/80 bg-muted/40 rounded-md px-3 py-1.5">{selectedTransaction.store_name}</p>
              </div>

              {/* Transaction Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Data da Compra</label>
                  <p className="font-medium text-sm">{formatDate(selectedTransaction.transaction_date)}</p>
                </div>
                {(() => { const dd = getDueDate(selectedTransaction); return dd ? (
                <div>
                  <label className="text-xs text-muted-foreground">Competência (Vencimento)</label>
                  <p className="text-sm text-muted-foreground">{formatDate(dd)}</p>
                </div>
                ) : null; })()}
                <div>
                  <label className="text-xs text-muted-foreground">Valor</label>
                  <p className="font-bold text-lg text-primary">{formatCurrency(selectedTransaction.value)}</p>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Categoria</label>
                <Select
                  value={editDialogCategoryId}
                  onValueChange={(value) => setEditDialogCategoryId(value)}
                  disabled={editDialogSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring Badge */}
              {(isRecurring(selectedTransaction.store_name) || selectedTransaction.is_recurring) && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <RefreshCcw className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary">Transação recorrente</span>
                </div>
              )}

              {/* Installment Info */}
              {parseInstallmentInfo(selectedTransaction.store_name) && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-600">
                    Parcela {parseInstallmentInfo(selectedTransaction.store_name)?.current} de {parseInstallmentInfo(selectedTransaction.store_name)?.total}
                  </span>
                </div>
              )}

              {/* Card Info */}
              {selectedTransaction.card_id && getCardInfo(selectedTransaction.card_id) && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getCardInfo(selectedTransaction.card_id)?.color }}
                  />
                  <span className="text-xs">
                    {getCardInfo(selectedTransaction.card_id)?.name}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4">
                {hasFriendlyNameChange ? (
                  <>
                    <Button
                      disabled={editDialogSaving}
                      className="w-full"
                      onClick={async () => {
                        if (!selectedTransaction) return;
                        setEditDialogSaving(true);
                        try {
                          // Save category change if any
                          if (hasCategoryChange) {
                            const category = allCategories.find(c => c.id === editDialogCategoryId);
                            if (category) {
                              await onUpdateCategory(selectedTransaction.id, editDialogCategoryId, category.name);
                            }
                          }
                          // Save friendly name
                          const newName = editDialogFriendlyName.trim();
                          const nameToSave = newName === selectedTransaction.store_name ? '' : newName;
                          if (onUpdateFriendlyName && nameToSave) {
                            await onUpdateFriendlyName(selectedTransaction.id, nameToSave);
                          }
                          // Apply to all via RPC
                          if (nameToSave) {
                            await applyStoreFriendlyNameRule(selectedTransaction.store_name, nameToSave);
                            onFriendlyNameAppliedAll?.();
                          }
                          setShowEditSheet(false);
                        } finally {
                          setEditDialogSaving(false);
                        }
                      }}
                    >
                      {editDialogSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Aplicar para todos
                          <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 bg-primary-foreground/20 text-primary-foreground border-0">
                            Recomendado
                          </Badge>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={editDialogSaving}
                      onClick={async () => {
                        if (!selectedTransaction) return;
                        setEditDialogSaving(true);
                        try {
                          if (hasCategoryChange) {
                            const category = allCategories.find(c => c.id === editDialogCategoryId);
                            if (category) {
                              await onUpdateCategory(selectedTransaction.id, editDialogCategoryId, category.name);
                            }
                          }
                          const newName = editDialogFriendlyName.trim();
                          const nameToSave = newName === selectedTransaction.store_name ? '' : newName;
                          if (onUpdateFriendlyName) {
                            await onUpdateFriendlyName(selectedTransaction.id, nameToSave);
                          }
                          toast.success('Nome atualizado nesta transação.');
                          setShowEditSheet(false);
                        } finally {
                          setEditDialogSaving(false);
                        }
                      }}
                    >
                      Somente esta fatura
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      disabled={editDialogSaving}
                      onClick={() => setShowEditSheet(false)}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowEditSheet(false)}>
                      Fechar
                    </Button>
                    <Button 
                      variant={hasChanges ? "default" : "secondary"}
                      className={`flex-1 ${hasChanges ? 'shadow-md' : ''}`}
                      disabled={!hasChanges || editDialogSaving}
                      onClick={async () => {
                        if (!selectedTransaction || !hasChanges) return;
                        setEditDialogSaving(true);
                        try {
                          if (hasCategoryChange) {
                            const category = allCategories.find(c => c.id === editDialogCategoryId);
                            if (category) {
                              await onUpdateCategory(selectedTransaction.id, editDialogCategoryId, category.name);
                            }
                          }
                          toast.success('Categoria atualizada!');
                          setShowEditSheet(false);
                        } finally {
                          setEditDialogSaving(false);
                        }
                      }}
                    >
                      {editDialogSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <InstallmentEditDialog
        open={!!installmentEditTransaction}
        onOpenChange={(open) => !open && setInstallmentEditTransaction(null)}
        transaction={installmentEditTransaction}
        formatCurrency={formatCurrency}
      />

      {friendlyNameDialogContext && (
        <FriendlyNameConfirmDialog
          open={friendlyNameDialogOpen}
          onOpenChange={setFriendlyNameDialogOpen}
          storeName={friendlyNameDialogContext.storeName}
          friendlyName={friendlyNameDialogContext.friendlyName}
          onApplyThisOnly={handleFriendlyNameApplyThisOnly}
          onApplyAll={handleFriendlyNameApplyAll}
          onCancel={handleFriendlyNameCancel}
        />
      )}
    </div>
  );
}
