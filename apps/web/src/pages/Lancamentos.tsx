import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parseLocalDate, formatDateYMD } from '@/utils/dateUtils';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { TrendingUp, TrendingDown, Plus, Calendar, Trash2, Wallet, CreditCard, Banknote, Pencil, Zap, History, Sparkles, FileText, Camera, ChevronDown, Layers, ShoppingBag, ExternalLink, Clock, Search, Building2, Filter, Link2, AlertCircle, Landmark, CheckCircle2, Receipt, ReceiptText, Type, ArrowUpCircle, ArrowDownCircle, Scale, BarChart2, ChevronRight } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { CategoryAssignmentCard } from '@/components/shared/CategoryAssignmentDialog';
import { ContasListSection } from '@/components/lancamentos/ContasListSection';
import { ContaFormDialog } from '@/components/lancamentos/ContaFormDialog';
import { RecorrentesSection } from '@/components/lancamentos/RecorrentesSection';
import { ConfirmPaymentDialog } from '@/components/lancamentos/ConfirmPaymentDialog';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';
import { MonthSelector } from '@/components/lancamentos/MonthSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import { paymentMethods, expenseCategories, financialInstitutions } from '@/data/defaultData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PaymentMethod } from '@/types/financial';
import { BulkEntryDialog } from '@/components/lancamentos/BulkEntryDialog';
import { HistoricalEntryDialog } from '@/components/lancamentos/HistoricalEntryDialog';
import { ImportIncomeDialog } from '@/components/lancamentos/ImportIncomeDialog';
import { ReceiptCaptureDialog } from '@/components/mobile/ReceiptCaptureDialog';
import { BankSyncButton } from '@/components/sync/BankSyncButton';
import { PluggySyncStatus } from '@/components/sync/PluggySyncStatus';
import { OutdatedConnectionBanner } from '@/components/sync/OutdatedConnectionBanner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, addMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import { useLancamentosRealizados, LancamentoRealizado, LancamentoInput } from '@/hooks/useLancamentosRealizados';
import { ErrorCard } from '@/design-system/components/ErrorCard';
import { useLancamentosSummary } from '@/hooks/useLancamentosSummary';
import { useContasPagarReceber, Conta, ContaInput, ContaTipo } from '@/hooks/useContasPagarReceber';
import { useTransactionSourceMap } from '@/hooks/useTransactionSourceMap';
import { useFinanceMode } from '@/hooks/useFinanceMode';
import { usePurchaseRegistry } from '@/hooks/usePurchaseRegistry';
import { useSeguros } from '@/hooks/useSeguros';
import { useCreditCardBills } from '@/hooks/useCreditCardBills';
import { useBillPaymentReconciliation } from '@/hooks/useBillPaymentReconciliation';
import { WarrantySection, useWarrantyState } from '@/components/shared/WarrantySection';
import { Link, useSearchParams } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LancamentoDetailDialog } from '@/components/lancamentos/LancamentoDetailDialog';
import { MarkAsPaidLancamentoDialog } from '@/components/lancamentos/MarkAsPaidLancamentoDialog';
import { LancamentoFriendlyNameDialog } from '@/components/lancamentos/LancamentoFriendlyNameDialog';
import { applyLancamentoFriendlyNameRule } from '@/utils/lancamentoFriendlyNameRules';
import { cn, formatCurrency } from '@/lib/utils';
import { LancamentoForm } from '@/design-system/components/LancamentoForm';
import { useIsMobile } from '@/hooks/use-mobile';

type LancamentoTipo = 'entrada' | 'saida';

export const Lancamentos: React.FC = () => {
  const { config, updateMonthlyEntry, updateFinancialInstitution } = useFinancial();
  const { isHidden } = useVisibility();
  const { isManual } = useFinanceMode();
  const { user } = useAuth();
  // Month selector state (declarado antes do hook para passar ao useLancamentosRealizados)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const {
    lancamentos,
    loading,
    error: lancamentosError,
    fetchLancamentos,
    addLancamento,
    addMultipleLancamentos,
    updateLancamento,
    updateFriendlyName,
    deleteLancamento,
    softDeleteLancamento,
    markLancamentoPaid,
    markLancamentoPaidWithValues,
    duplicateLancamentoNextMonth,
    page,
    setPage,
    totalCount,
    totalPages,
    pageSize,
  } = useLancamentosRealizados({ paginated: true, mesReferencia: selectedMonth });
  const {
    contas,
    rawContas,
    loading: loadingContas,
    addConta,
    addMultipleContas,
    updateConta,
    deleteConta,
    fetchContas,
    getContaByVinculoCartao,
  } = useContasPagarReceber();
  const { items: purchaseItems, markAsPurchased, getItemsByStatus, addItem: addPurchaseItem } = usePurchaseRegistry();
  const { addSeguro } = useSeguros();
  const { getSourceInfo, sourceMap } = useTransactionSourceMap();
  const { bills } = useCreditCardBills();
  const { getReconciliation, billPaymentIds } = useBillPaymentReconciliation(lancamentos, bills);
  const pendingPurchases = getItemsByStatus('pending');
  const enabledIncomes = (config?.incomeItems ?? []).filter(i => i.enabled);
  const enabledExpenses = (config?.expenseItems ?? []).filter(i => i.enabled);


  const { data: rpcSummary, refetch: refetchSummary } = useLancamentosSummary(selectedMonth);
  const summaryTotals = rpcSummary?.summary ?? (rpcSummary as Record<string, unknown>);
  const totalIncome = (summaryTotals?.total_income as number) ?? 0;
  const totalExpense = (summaryTotals?.total_expense as number) ?? 0;
  const topCategories = ((rpcSummary as { top_categories?: Array<{ category: string; total: number; count?: number; pct?: number }> })?.top_categories ?? rpcSummary?.by_category ?? []) as Array<{ category: string; total: number; count?: number; pct?: number }>;
  const byPaymentMethod = (rpcSummary?.by_payment_method ?? []) as Array<{ method: string; total: number; count: number }>;
  const PAYMENT_LABELS: Record<string, string> = { pix: 'PIX', cartao_credito: 'Cartão de Crédito', debito_auto: 'Débito Automático', boleto: 'Boleto', transferencia: 'Transferência' };
  const CATEGORY_COLORS: Record<string, string> = { 'Contas da Casa': '#3b82f6', 'Alimentação': '#22c55e', 'Saúde': '#ef4444', 'Lazer': '#a855f7', 'Transporte': '#f59e0b', 'Pessoal': '#ec4899', 'Investimentos': '#14b8a6' };
  const getCategoryColor = (c: string) => CATEGORY_COLORS[c] ?? 'var(--primary)';

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all');
  const [markAsPaidItem, setMarkAsPaidItem] = useState<LancamentoRealizado | null>(null);
  const [markAsPaidLoading, setMarkAsPaidLoading] = useState(false);
  const [analiseDialogOpen, setAnaliseDialogOpen] = useState(false);

  // Extract unique banks and account types from sourceMap
  const { availableBanks, availableAccountTypes } = useMemo(() => {
    const bankMap = new Map<string, { imageUrl: string | null; primaryColor: string | null }>();
    const accountTypes = new Set<string>();
    Object.values(sourceMap).forEach(info => {
      if (!bankMap.has(info.institution)) {
        bankMap.set(info.institution, { imageUrl: info.imageUrl, primaryColor: info.primaryColor });
      }
      accountTypes.add(info.accountType);
    });
    const banks = Array.from(bankMap.entries())
      .map(([name, data]) => ({ name, imageUrl: data.imageUrl, primaryColor: data.primaryColor }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      availableBanks: banks,
      availableAccountTypes: Array.from(accountTypes).sort(),
    };
  }, [sourceMap]);

  // Helper: status do lançamento para filtros
  const getLancamentoStatus = useCallback((l: LancamentoRealizado): 'paid' | 'pending' | 'overdue' => {
    if (l.data_pagamento) return 'paid';
    const today = format(new Date(), 'yyyy-MM-dd');
    const venc = l.data_vencimento || l.data_registro?.slice(0, 10) || '';
    if (venc && venc < today) return 'overdue';
    return 'pending';
  }, []);

  // Filter lancamentos by selected month
  const filteredByMonth = useMemo(() => 
    lancamentos.filter(l => l.mes_referencia === selectedMonth),
    [lancamentos, selectedMonth]
  );

  // Apply search + tipo + status + category + bank + account filters
  const filteredLancamentos = useMemo(() => {
    return filteredByMonth.filter(l => {
      if (filterTipo !== 'all' && l.tipo !== filterTipo) return false;
      if (filterStatus !== 'all' && getLancamentoStatus(l) !== filterStatus) return false;
      if (filterCategories.length > 0 && !filterCategories.includes(l.categoria)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.nome.toLowerCase().includes(q) || (l.friendly_name && l.friendly_name.toLowerCase().includes(q));
        const matchesCategory = l.categoria.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }
      if (selectedBank !== 'all') {
        const source = getSourceInfo(l.source_id);
        if (!source || source.institution !== selectedBank) return false;
      }
      if (selectedAccountType !== 'all') {
        const source = getSourceInfo(l.source_id);
        if (!source || source.accountType !== selectedAccountType) return false;
      }
      return true;
    });
  }, [filteredByMonth, filterTipo, filterStatus, filterCategories, searchQuery, selectedBank, selectedAccountType, getSourceInfo, getLancamentoStatus]);

  const uniqueCategoriesForFilter = useMemo(() => {
    const set = new Set<string>();
    filteredByMonth.forEach(l => set.add(l.categoria));
    return Array.from(set).sort();
  }, [filteredByMonth]);
  
  // Derive entradas/saidas from filtered data
  const entradas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.tipo === 'receita')
      .sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro || '').localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro || '')), 
    [filteredLancamentos]
  );
  const saidas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.tipo === 'despesa')
      .sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro || '').localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro || '')), 
    [filteredLancamentos]
  );

  const allLancamentos = useMemo(() => 
    [...filteredLancamentos].sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro || '').localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro || '')),
    [filteredLancamentos]
  );

  const isMobile = useIsMobile();
  const lancamentosGroupedByDate = useMemo(() => {
    const map = new Map<string, LancamentoRealizado[]>();
    allLancamentos.forEach((l) => {
      const dateStr = l.data_pagamento || l.data_vencimento || l.data_registro?.slice(0, 10) || '—';
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(l);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [allLancamentos]);

  // Warranty state
  const warranty = useWarrantyState();
  
  // Friendly name editing state
  const [editingFriendlyNameId, setEditingFriendlyNameId] = useState<string | null>(null);
  const [friendlyNameValue, setFriendlyNameValue] = useState('');
  const [friendlyNameConfirmOpen, setFriendlyNameConfirmOpen] = useState(false);
  const [friendlyNamePending, setFriendlyNamePending] = useState<{ id: string; originalName: string; newName: string } | null>(null);

  // Quick add purchase item state
  const [quickAddPurchaseOpen, setQuickAddPurchaseOpen] = useState(false);
  const [quickPurchaseName, setQuickPurchaseName] = useState('');

  // Contas a Pagar/Receber state
  const [contaDialogOpen, setContaDialogOpen] = useState(false);
  const [contaDialogTipo, setContaDialogTipo] = useState<ContaTipo>('pagar');
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const [defaultTipoCobrancaConta, setDefaultTipoCobrancaConta] = useState<'unica' | 'parcelada' | 'recorrente' | undefined>(undefined);
  const [confirmPaymentConta, setConfirmPaymentConta] = useState<Conta | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [detailItem, setDetailItem] = useState<LancamentoRealizado | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contas filtered
  const contasPagar = useMemo(() => contas.filter(c => c.tipo === 'pagar' && !c.dataPagamento && (c.dataVencimento?.startsWith(selectedMonth) ?? false)), [contas, selectedMonth]);
  const contasReceber = useMemo(() => contas.filter(c => c.tipo === 'receber' && !c.dataPagamento && (c.dataVencimento?.startsWith(selectedMonth) ?? false)), [contas, selectedMonth]);
  const recorrrentes = useMemo(() => rawContas.filter(c => c.recorrente === true), [rawContas]);

  // Sync credit card accounts with financial institutions
  useEffect(() => {
    const syncCreditCardContas = async () => {
      if (!user || loadingContas) return;
      
      // Limpar contas órfãs vinculadas a instituições que não existem mais
      for (const conta of rawContas) {
        if (conta.vinculoCartaoId) {
          const exists = (config?.financialInstitutions ?? []).some(fi => fi.id === conta.vinculoCartaoId);
          if (!exists) {
            await deleteConta(conta.id);
          }
        }
      }
      
      // Sincronizar novos cartões
      const creditCardInstitutions = (config?.financialInstitutions ?? []).filter(fi => fi.hasCreditCard && fi.creditCardDueDay);
      for (const fi of creditCardInstitutions) {
        const existingConta = getContaByVinculoCartao(fi.id);
        if (!existingConta) {
          const institution = financialInstitutions.find(i => i.id === fi.institutionId);
          const cardName = fi.customName || institution?.name || 'Cartão de Crédito';
          const dueDay = fi.creditCardDueDay || 10;
          const today = new Date();
          let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
          if (dueDate < today) dueDate = addMonths(dueDate, 1);
          await addConta({ tipo: 'pagar', nome: `Fatura ${cardName}${fi.creditCardBrand ? ` ${fi.creditCardBrand}` : ''}`, valor: 0, dataVencimento: format(dueDate, 'yyyy-MM-dd'), categoria: 'Cartão de Crédito', formaPagamento: 'boleto', recorrente: true, tipoCobranca: 'recorrente', diaRecorrencia: dueDay, semDataFim: true, vinculoCartaoId: fi.id });
        }
      }
    };
    syncCreditCardContas();
  }, [config?.financialInstitutions, user, loadingContas]);

  const handleOpenContaDialog = (tipo: ContaTipo) => { setDefaultTipoCobrancaConta(undefined); setContaDialogTipo(tipo); setEditingConta(null); setContaDialogOpen(true); };
  const handleEditConta = (conta: Conta) => { setDefaultTipoCobrancaConta(undefined); setEditingConta(conta); setContaDialogTipo(conta.tipo); setContaDialogOpen(true); };
  const handleOpenNewRecorrente = () => { setDefaultTipoCobrancaConta('recorrente'); setContaDialogTipo('pagar'); setEditingConta(null); setContaDialogOpen(true); };
  const handleContaDialogOpenChange = (open: boolean) => { if (!open) setDefaultTipoCobrancaConta(undefined); setContaDialogOpen(open); };
  const handleDeleteConta = async (id: string) => {
    const conta = contas.find(c => c.id === id);
    if (conta?.vinculoCartaoId) { toast.error('Esta conta está vinculada a um cartão de crédito.'); return; }
    await deleteConta(id);
  };

  // Friendly name handlers
  const handleStartEditFriendlyName = (item: LancamentoRealizado) => {
    setEditingFriendlyNameId(item.id);
    setFriendlyNameValue(item.friendly_name || item.nome);
  };

  const handleFriendlyNameSubmit = (item: LancamentoRealizado) => {
    const newName = friendlyNameValue.trim();
    if (!newName || newName === item.nome) {
      // If same as original or empty, clear friendly name
      if (item.friendly_name && newName === item.nome) {
        updateFriendlyName(item.id, '');
      }
      setEditingFriendlyNameId(null);
      return;
    }
    if (newName !== item.friendly_name) {
      setFriendlyNamePending({ id: item.id, originalName: item.nome, newName });
      setFriendlyNameConfirmOpen(true);
    }
    setEditingFriendlyNameId(null);
  };

  const handleFriendlyNameApplyThisOnly = async () => {
    if (!friendlyNamePending) return;
    await updateFriendlyName(friendlyNamePending.id, friendlyNamePending.newName);
    setFriendlyNameConfirmOpen(false);
    setFriendlyNamePending(null);
    toast.success('Nome atualizado neste lançamento.');
  };

  const handleFriendlyNameApplyAll = async () => {
    if (!friendlyNamePending) return;
    const result = await applyLancamentoFriendlyNameRule(friendlyNamePending.originalName, friendlyNamePending.newName);
    if (result.success) {
      await fetchLancamentos();
    }
    setFriendlyNameConfirmOpen(false);
    setFriendlyNamePending(null);
  };

  const handleFriendlyNameCancel = () => {
    setFriendlyNameConfirmOpen(false);
    setFriendlyNamePending(null);
  };

  const handleSaveContaForm = async (data: any) => {
    const { conta: contaData, tipoCobranca, parcelasConfig, diaRecorrencia, dataFimRecorrencia, semDataFim } = data;
    if (!contaData.nome || !contaData.valor || !contaData.categoria) { toast.error('Preencha todos os campos obrigatórios'); return; }
    if (editingConta) {
      if (editingConta.vinculoCartaoId && contaData.diaRecorrencia !== editingConta.diaRecorrencia) {
        updateFinancialInstitution(editingConta.vinculoCartaoId, { creditCardDueDay: contaData.diaRecorrencia || diaRecorrencia });
      }
      await updateConta(editingConta.id, { ...contaData, recorrente: tipoCobranca === 'recorrente', tipoCobranca, diaRecorrencia: tipoCobranca === 'recorrente' ? (contaData.diaRecorrencia || diaRecorrencia) : undefined } as ContaInput);
      toast.success('Conta atualizada');
    } else {
      const parcelasAtivas = parcelasConfig.filter((p: any) => p.ativo);
      if (tipoCobranca === 'parcelada' && parcelasAtivas.length > 0) {
        const grupoId = Date.now().toString();
        const novasContas: ContaInput[] = parcelasAtivas.map((parcela: any, index: number) => ({ tipo: contaData.tipo || 'pagar', nome: `${contaData.nome} (${index + 1}/${parcelasAtivas.length})`, valor: contaData.valor!, dataVencimento: parcela.data, categoria: contaData.categoria!, formaPagamento: contaData.formaPagamento as PaymentMethod, recorrente: false, tipoCobranca: 'parcelada' as const, parcelaAtual: index + 1, totalParcelas: parcelasAtivas.length, grupoParcelamento: grupoId }));
        const result = await addMultipleContas(novasContas);
        if (result.length > 0) toast.success(`${parcelasAtivas.length} parcelas adicionadas`);
      } else {
        const novaConta: ContaInput = { tipo: contaData.tipo || 'pagar', nome: contaData.nome!, valor: contaData.valor!, dataVencimento: contaData.dataVencimento || format(new Date(), 'yyyy-MM-dd'), categoria: contaData.categoria!, formaPagamento: contaData.formaPagamento as PaymentMethod, recorrente: tipoCobranca === 'recorrente', tipoCobranca, diaRecorrencia: tipoCobranca === 'recorrente' ? diaRecorrencia : undefined, dataFimRecorrencia: tipoCobranca === 'recorrente' && !semDataFim ? dataFimRecorrencia : undefined, semDataFim: tipoCobranca === 'recorrente' ? semDataFim : undefined };
        const result = await addConta(novaConta);
        if (result) toast.success('Conta adicionada');
      }
    }
    setContaDialogOpen(false);
  };

  const handleConfirmPaymentSubmit = async (data: { value: number; date: Date; method: PaymentMethod; file: File | null; purchaseItemId: string }) => {
    if (!confirmPaymentConta) return;
    setUploadingComprovante(true);
    try {
      const conta = confirmPaymentConta;
      const dataPagamento = format(data.date, 'yyyy-MM-dd');
      const mesReferencia = format(parseISO(conta.dataVencimento), 'yyyy-MM');
      let comprovantePath: string | null = null;
      if (data.file && user) {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${user.id}/${conta.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error } = await supabase.storage.from('comprovantes-contas').upload(fileName, data.file);
        if (!error) comprovantePath = uploadData.path;
      }
      const lancamentoInput: LancamentoInput = { tipo: conta.tipo === 'pagar' ? 'despesa' : 'receita', categoria: conta.categoria, nome: conta.nome, valor_previsto: conta.valor, valor_realizado: data.value, mes_referencia: mesReferencia, data_vencimento: conta.dataVencimento, data_pagamento: dataPagamento, forma_pagamento: data.method, observacoes: comprovantePath ? `Comprovante: ${comprovantePath}` : undefined };
      const result = await addLancamento(lancamentoInput);
      if (!result) return;
      await updateConta(conta.id, { dataPagamento, valor: data.value, formaPagamento: data.method });
      if (data.purchaseItemId && conta.tipo === 'pagar') await markAsPurchased(data.purchaseItemId, data.value, dataPagamento);
      toast.success(conta.tipo === 'pagar' ? 'Pagamento confirmado e registrado.' : 'Recebimento confirmado e registrado.');
      setConfirmPaymentConta(null);
    } finally { setUploadingComprovante(false); }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [historicalDialogOpen, setHistoricalDialogOpen] = useState(false);
  const [importIncomeDialogOpen, setImportIncomeDialogOpen] = useState(false);
  const [receiptCaptureOpen, setReceiptCaptureOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<'select' | 'method' | 'form'>('select');
  const [lancamentoTipo, setLancamentoTipo] = useState<LancamentoTipo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Handle URL query params for quick actions (e.g., from mobile quick actions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'receita' || action === 'despesa') {
      const tipo: LancamentoTipo = action === 'receita' ? 'entrada' : 'saida';
      setLancamentoTipo(tipo);
      setDialogStep('method');
      setDialogOpen(true);
      // Clear params so it doesn't re-trigger
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const [newEntrada, setNewEntrada] = useState({
    name: '',
    amount: 0,
    date: formatDateYMD(new Date()),
    type: ''
  });

  const [newSaida, setNewSaida] = useState({
    name: '',
    amount: 0,
    date: formatDateYMD(new Date()),
    category: '',
    method: 'credit_card' as PaymentMethod,
    purchaseItemId: '' as string
  });

  const totalEntradas = entradas.reduce((acc, t) => acc + (t.valor_realizado ?? t.valor_previsto ?? 0), 0);
  const totalSaidas = saidas.reduce((acc, t) => acc + (t.valor_realizado ?? t.valor_previsto ?? 0), 0);

  const lastSyncDate = useMemo(() => {
    const synced = lancamentos
      .filter((l: any) => l.source_type === 'pluggy_bank')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return synced.length > 0 ? synced[0].created_at : null;
  }, [lancamentos]);

  const formatCurrency = (value: number | null | undefined) => {
    if (isHidden) return '••••••';
    const safe = value ?? 0;
    return `R$ ${safe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    if (method === 'credit_card' || method === 'debit_card') {
      return <CreditCard className="h-3 w-3" />;
    }
    return <Banknote className="h-3 w-3" />;
  };

  const handleOpenDialog = () => {
    setDialogStep('select');
    setLancamentoTipo(null);
    setDialogOpen(true);
  };

  const handleSelectTipo = (tipo: LancamentoTipo) => {
    setLancamentoTipo(tipo);
    setDialogStep('method');
  };

  const handleSelectMethod = (method: 'manual' | 'import') => {
    if (method === 'import') {
      setDialogOpen(false);
      if (lancamentoTipo === 'entrada') {
        setImportIncomeDialogOpen(true);
      } else {
        setReceiptCaptureOpen(true);
      }
    } else {
      setDialogStep('form');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogStep('select');
    setLancamentoTipo(null);
    setEditingId(null);
    setNewEntrada({ name: '', amount: 0, date: formatDateYMD(new Date()), type: '' });
    setNewSaida({ name: '', amount: 0, date: formatDateYMD(new Date()), category: '', method: 'credit_card', purchaseItemId: '' });
    warranty.resetWarranty();
  };

  const handleEditEntrada = (item: LancamentoRealizado) => {
    setEditingId(item.id);
    setNewEntrada({
      name: item.nome,
      amount: item.valor_realizado ?? item.valor_previsto ?? 0,
      date: item.data_pagamento || item.data_registro || '',
      type: item.categoria
    });
    setLancamentoTipo('entrada');
    setDialogStep('form');
    setDialogOpen(true);
  };

  const handleEditSaida = (item: LancamentoRealizado) => {
    setEditingId(item.id);
    setNewSaida({
      name: item.nome,
      amount: item.valor_realizado ?? item.valor_previsto ?? 0,
      date: item.data_pagamento || item.data_registro || '',
      category: item.categoria,
      method: (item.forma_pagamento || 'credit_card') as PaymentMethod,
      purchaseItemId: ''
    });
    setLancamentoTipo('saida');
    setDialogStep('form');
    setDialogOpen(true);
  };

  const getCurrentMonthReference = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleAddEntrada = async () => {
    const nome = newEntrada.name?.trim() ?? '';
    if (nome.length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    if (!newEntrada.amount || newEntrada.amount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    if (!newEntrada.type) {
      toast.error('Selecione o tipo de receita');
      return;
    }

    if (editingId) {
      await updateLancamento(editingId, {
        nome,
        valor_realizado: newEntrada.amount,
        valor_previsto: newEntrada.amount,
        data_pagamento: newEntrada.date,
        categoria: newEntrada.type,
      });
      refetchSummary();
      handleCloseDialog();
    } else {
      const result = await addLancamento({
        tipo: 'receita',
        categoria: newEntrada.type,
        nome,
        valor_previsto: newEntrada.amount,
        valor_realizado: newEntrada.amount,
        mes_referencia: selectedMonth,
        data_vencimento: newEntrada.date,
        data_pagamento: newEntrada.date,
      });
      if (result) {
        refetchSummary();
        handleCloseDialog();
      }
    }
  };

  const handleAddSaida = async () => {
    const nome = newSaida.name?.trim() ?? '';
    if (nome.length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    if (!newSaida.amount || newSaida.amount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    if (!newSaida.category) {
      toast.error('Selecione a categoria');
      return;
    }

    if (editingId) {
      await updateLancamento(editingId, {
        nome,
        valor_realizado: newSaida.amount,
        valor_previsto: newSaida.amount,
        data_pagamento: newSaida.date,
        categoria: newSaida.category,
        forma_pagamento: newSaida.method,
      });
      refetchSummary();
      handleCloseDialog();
    } else {
      const result = await addLancamento({
        tipo: 'despesa',
        categoria: newSaida.category,
        nome,
        valor_previsto: newSaida.amount,
        valor_realizado: newSaida.amount,
        mes_referencia: selectedMonth,
        data_vencimento: newSaida.date,
        data_pagamento: newSaida.date,
        forma_pagamento: newSaida.method,
      });
      
      if (result) {
        // If linked to a purchase item that is still pending, mark it as purchased
        if (newSaida.purchaseItemId) {
          const purchaseItem = purchaseItems.find(i => i.id === newSaida.purchaseItemId);
          if (purchaseItem && purchaseItem.status === 'pending') {
            await markAsPurchased(newSaida.purchaseItemId, newSaida.amount, newSaida.date);
          }
          
          // Create warranty if enabled
          if (warranty.hasWarranty) {
            const itemName = purchaseItem?.name || newSaida.name;
            try {
              await addSeguro.mutateAsync({
                nome: `Garantia - ${itemName}`,
                tipo: 'garantia_estendida',
                seguradora: warranty.warrantyStore || 'Fabricante',
                premio_mensal: 0,
                premio_anual: 0,
                valor_cobertura: newSaida.amount,
                data_inicio: newSaida.date,
                data_fim: warranty.warrantyEndDate,
                is_warranty: true,
                warranty_extended: warranty.hasExtendedWarranty,
                warranty_extended_months: warranty.hasExtendedWarranty ? warranty.extendedWarrantyMonths : undefined,
                warranty_store: warranty.warrantyStore || undefined,
                observacoes: `Garantia do produto: ${itemName}`,
              });
            } catch (error) {
              console.error('Error creating warranty:', error);
            }
          }
        }
        
        refetchSummary();
        handleCloseDialog();
        toast.success('Saída registrada com sucesso!');
      }
    }
  };

  // Quick add a new purchase item and auto-select it
  const handleQuickAddPurchaseItem = async () => {
    if (!quickPurchaseName.trim()) {
      toast.error('Digite o nome do item');
      return;
    }
    
    const newItem = await addPurchaseItem({
      name: quickPurchaseName.trim(),
      estimated_value: newSaida.amount,
      actual_value: newSaida.amount,
      purchase_date: newSaida.date,
      status: 'purchased',
    });
    
    if (newItem) {
      setNewSaida(prev => ({ ...prev, purchaseItemId: newItem.id }));
      setQuickPurchaseName('');
      setQuickAddPurchaseOpen(false);
      toast.success('Item criado e vinculado à lista de compras!');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null);

  const handleDeleteItem = (id: string, nome: string) => {
    setDeleteConfirm({ id, nome });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await softDeleteLancamento(deleteConfirm.id);
    refetchSummary();
    setDetailDialogOpen(false);
    setDetailItem(null);
    setDeleteConfirm(null);
  };

  const handleBulkEntriesAdded = async (entries: { itemId: string; name: string; value: number; type: 'income' | 'expense'; category?: string }[], referenceMonth: string) => {
    const lancamentosToSave = entries.map(entry => ({
      tipo: entry.type === 'income' ? ('receita' as const) : ('despesa' as const),
      categoria: entry.type === 'income' ? 'Receitas' : (entry.category || 'Outros'),
      nome: entry.name,
      valor_previsto: entry.value,
      valor_realizado: entry.value,
      mes_referencia: referenceMonth,
      data_pagamento: `${referenceMonth}-01`,
    }));

    await addMultipleLancamentos(lancamentosToSave);
  };

  const handleHistoricalEntriesAdded = async (entries: { itemId: string; name: string; value: number; type: 'income' | 'expense'; category?: string; month: string }[]) => {
    const expenseById = new Map((config?.expenseItems ?? []).map(i => [i.id, i]));

    const lancamentosToSave = entries.map(entry => {
      const expense = entry.type === 'expense' ? expenseById.get(entry.itemId) : undefined;
      const expenseCategory = entry.category || expense?.category || 'Outros';
      const expensePaymentMethod = expense?.paymentMethod || null;

      return {
        tipo: entry.type === 'income' ? ('receita' as const) : ('despesa' as const),
        categoria: entry.type === 'income' ? 'Receitas' : expenseCategory,
        nome: entry.name,
        valor_previsto: entry.value,
        valor_realizado: entry.value,
        mes_referencia: entry.month,
        data_pagamento: `${entry.month}-01`,
        forma_pagamento: entry.type === 'expense' ? expensePaymentMethod : null,
      };
    });

    const success = await addMultipleLancamentos(lancamentosToSave);
    if (!success) return;

    // Update monthly entries in planejamento mensal
    entries.forEach(entry => {
      updateMonthlyEntry({
        month: entry.month,
        itemId: entry.itemId,
        type: entry.type,
        value: entry.value,
        isManualOverride: true,
      });
    });

    toast.success(`${entries.length} lançamento(s) histórico(s) salvos!`);
  };

  if (loading && lancamentos.length === 0) {
    return (
      <>
      <AppLayout>
        <PageSkeleton variant="metrics-table" metrics={4} />
      </AppLayout>
      </>
    );
  }

  return (
    <>
    <AppLayout>
      <div className="content-zone py-5 md:py-6 space-y-6">
        {/* Outdated Connection Banner */}
        {!isManual && <OutdatedConnectionBanner />}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            icon={ReceiptText}
            title="Lançamentos"
            subtitle="Gerencie suas entradas e saídas"
            showBackButton={false}
            actions={
              <>
                {!isManual && <BankSyncButton variant="button" />}
                <VisibilityToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="hero" className="gap-2 min-h-[44px] min-w-[44px] touch-manipulation">
                      <Plus className="h-4 w-4" />
                      Novo
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Tipo de lançamento
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleOpenDialog} className="gap-3 cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Individual</span>
                        <span className="text-xs text-muted-foreground">Adicionar um lançamento</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkDialogOpen(true)} className="gap-3 cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Em Massa</span>
                        <span className="text-xs text-muted-foreground">Múltiplos lançamentos rápidos</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHistoricalDialogOpen(true)} className="gap-3 cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <History className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Histórico</span>
                        <span className="text-xs text-muted-foreground">Importar dados de meses anteriores</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Provisionar
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleOpenContaDialog('pagar')} className="gap-3 cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-expense/10 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-expense" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Conta a Pagar</span>
                        <span className="text-xs text-muted-foreground">Provisionar despesa futura</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenContaDialog('receber')} className="gap-3 cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-income/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-income" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Conta a Receber</span>
                        <span className="text-xs text-muted-foreground">Provisionar receita futura</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />
        </div>

        {!isManual && <PluggySyncStatus accountType="BANK" compact />}

        {/* Resumo do mês (RPC) — análise dos lançamentos */}
        {rpcSummary != null && (
          <div className="space-y-4">
            {/* Seção Análise dos lançamentos — abre modal com gráficos */}
            <Card
              className="rounded-[14px] border border-border/80 cursor-pointer transition-colors hover:bg-muted/30 hover:border-primary/40"
              onClick={() => setAnaliseDialogOpen(true)}
            >
              <CardContent className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Análise dos lançamentos</p>
                    <p className="text-sm text-muted-foreground">Top categorias, formas de pagamento, receita vs despesa e despesas por categoria</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>

            {/* Modal: Análise dos lançamentos (gráficos) */}
            <Dialog open={analiseDialogOpen} onOpenChange={setAnaliseDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    Análise dos lançamentos
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {topCategories.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top Categorias</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {topCategories.slice(0, 5).map((row) => {
                          const totalAll = topCategories.reduce((s, i) => s + i.total, 0);
                          const pct = totalAll > 0 ? (row.total / totalAll) * 100 : (row.pct ?? 0);
                          const color = getCategoryColor(row.category);
                          return (
                            <div key={row.category} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="w-full sm:w-32 shrink-0 text-sm font-medium truncate">{row.category}</span>
                              <div className="flex-1 w-full h-6 rounded-md bg-muted overflow-hidden min-w-0">
                                <div className="h-full rounded-md transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
                              </div>
                              <span className="shrink-0 text-sm text-muted-foreground">{formatCurrency(row.total)} ({(row.pct ?? pct).toFixed(1)}%)</span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {byPaymentMethod.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Por Forma de Pagamento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {byPaymentMethod.map((row) => (
                            <span key={row.method} className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-3 py-2 min-h-[36px] text-sm">
                              <span className="font-medium">{PAYMENT_LABELS[row.method] ?? row.method}:</span>
                              <span>{formatCurrency(row.total)} ({row.count})</span>
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="rounded-[14px] border border-border/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Receita vs Despesa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{ name: 'Receitas', valor: totalIncome, fill: 'hsl(142, 71%, 32%)' }, { name: 'Despesas', valor: totalExpense, fill: 'hsl(0, 72%, 51%)' }]} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`)} />
                            <RechartsTooltip formatter={(v: number) => [formatCurrency(v), '']} />
                            <Bar dataKey="valor" name="Valor" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {topCategories.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Despesas por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={topCategories.slice(0, 6).map((row) => ({ name: row.category, value: row.total }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {topCategories.slice(0, 6).map((row) => (
                                  <Cell key={row.category} fill={getCategoryColor(row.category)} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(v: number) => [formatCurrency(v), '']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Bulk Entry Dialog */}
        <BulkEntryDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          onEntriesAdded={handleBulkEntriesAdded}
        />

        {/* Historical Entry Dialog */}
        <HistoricalEntryDialog
          open={historicalDialogOpen}
          onOpenChange={setHistoricalDialogOpen}
          onEntriesAdded={handleHistoricalEntriesAdded}
        />

        {/* Import Income Dialog */}
        <ImportIncomeDialog
          open={importIncomeDialogOpen}
          onOpenChange={setImportIncomeDialogOpen}
          onImportComplete={async (importedEntries) => {
            const lancamentosToSave = importedEntries.map(entry => {
              const incomeItem = enabledIncomes.find(i => i.id === entry.mappedItemId);
              return {
                tipo: 'receita' as const,
                categoria: incomeItem?.name || entry.type,
                nome: entry.name,
                valor_previsto: entry.value,
                valor_realizado: entry.value,
                mes_referencia: getCurrentMonthReference(),
                data_pagamento: formatDateYMD(new Date()),
              };
            });
            await addMultipleLancamentos(lancamentosToSave);
          }}
        />

        {/* Receipt Capture Dialog (for expense import) */}
        <ReceiptCaptureDialog
          open={receiptCaptureOpen}
          onOpenChange={setReceiptCaptureOpen}
        />

        {/* Dialog: centralizado em mobile/tablet; onOpenChange garante fechamento em um clique */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setDialogStep('select');
              setLancamentoTipo(null);
              setEditingId(null);
              setNewEntrada({ name: '', amount: 0, date: formatDateYMD(new Date()), type: '' });
              setNewSaida({ name: '', amount: 0, date: formatDateYMD(new Date()), category: '', method: 'credit_card', purchaseItemId: '' });
              warranty.resetWarranty();
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
            {dialogStep === 'select' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() => handleSelectTipo('entrada')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-income/30 bg-income/5 hover:border-income hover:bg-income/10 transition-all"
                  >
                    <div className="h-12 w-12 rounded-full bg-income/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-income" />
                    </div>
                    <span className="font-semibold text-foreground">Receita</span>
                    <span className="text-xs text-muted-foreground text-center">Salários, vendas, aluguéis e rendimentos recebidos</span>
                  </button>
                  <button
                    onClick={() => handleSelectTipo('saida')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-expense/30 bg-expense/5 hover:border-expense hover:bg-expense/10 transition-all"
                  >
                    <div className="h-12 w-12 rounded-full bg-expense/20 flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-expense" />
                    </div>
                    <span className="font-semibold text-foreground">Despesa</span>
                    <span className="text-xs text-muted-foreground text-center">Contas, compras e pagamentos realizados</span>
                  </button>
                </div>
              </>
            ) : dialogStep === 'method' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {lancamentoTipo === 'entrada' ? (
                      <><TrendingUp className="h-5 w-5 text-income" /> Nova Receita</>
                    ) : (
                      <><TrendingDown className="h-5 w-5 text-expense" /> Nova Despesa</>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <button
                    onClick={() => handleSelectMethod('manual')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      lancamentoTipo === 'entrada' 
                        ? 'border-income/30 bg-income/5 hover:border-income hover:bg-income/10'
                        : 'border-expense/30 bg-expense/5 hover:border-expense hover:bg-expense/10'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      lancamentoTipo === 'entrada' ? 'bg-income/20' : 'bg-expense/20'
                    }`}>
                      <Pencil className={`h-5 w-5 ${lancamentoTipo === 'entrada' ? 'text-income' : 'text-expense'}`} />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block">Inserir Manualmente</span>
                      <span className="text-sm text-muted-foreground">Preencher dados do lançamento</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectMethod('import')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      lancamentoTipo === 'entrada' 
                        ? 'border-income/30 bg-income/5 hover:border-income hover:bg-income/10'
                        : 'border-expense/30 bg-expense/5 hover:border-expense hover:bg-expense/10'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      lancamentoTipo === 'entrada' ? 'bg-income/20' : 'bg-expense/20'
                    }`}>
                      <Sparkles className={`h-5 w-5 ${lancamentoTipo === 'entrada' ? 'text-income' : 'text-expense'}`} />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block">
                        {lancamentoTipo === 'entrada' ? 'Importar com IA' : 'Escanear recibo com IA'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {lancamentoTipo === 'entrada' 
                          ? 'Contracheque ou Declaração IR' 
                          : 'Foto de recibo ou filipeta'}
                      </span>
                    </div>
                  </button>

                  <Button variant="ghost" onClick={() => setDialogStep('select')} className="w-full mt-2">
                    Voltar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {lancamentoTipo === 'entrada' ? (
                      <><TrendingUp className="h-5 w-5 text-income" /> {editingId ? 'Editar Entrada' : 'Registrar Nova Entrada'}</>
                    ) : (
                      <><TrendingDown className="h-5 w-5 text-expense" /> {editingId ? 'Editar Saída' : 'Registrar Nova Saída'}</>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <LancamentoForm
                    tipo={lancamentoTipo === 'entrada' ? 'receita' : 'despesa'}
                    onTipoChange={(t) => setLancamentoTipo(t === 'receita' ? 'entrada' : 'saida')}
                    valor={lancamentoTipo === 'entrada' ? newEntrada.amount : newSaida.amount}
                    onValorChange={(v) => lancamentoTipo === 'entrada' ? setNewEntrada((p) => ({ ...p, amount: v })) : setNewSaida((p) => ({ ...p, amount: v }))}
                    categoria={lancamentoTipo === 'entrada' ? newEntrada.type : newSaida.category}
                    onCategoriaChange={(v) => lancamentoTipo === 'entrada' ? setNewEntrada((p) => ({ ...p, type: v })) : setNewSaida((p) => ({ ...p, category: v }))}
                    categorias={lancamentoTipo === 'entrada' ? enabledIncomes.map((i) => ({ value: i.name, label: i.name })) : expenseCategories.map((c) => ({ value: c.name, label: c.name }))}
                    descricao={lancamentoTipo === 'entrada' ? newEntrada.name : newSaida.name}
                    onDescricaoChange={(v) => lancamentoTipo === 'entrada' ? setNewEntrada((p) => ({ ...p, name: v })) : setNewSaida((p) => ({ ...p, name: v }))}
                    data={lancamentoTipo === 'entrada' ? newEntrada.date : newSaida.date}
                    onDataChange={(v) => lancamentoTipo === 'entrada' ? setNewEntrada((p) => ({ ...p, date: v })) : setNewSaida((p) => ({ ...p, date: v }))}
                    contaLabel={lancamentoTipo === 'saida' ? 'Forma de pagamento' : undefined}
                    contaValue={lancamentoTipo === 'saida' ? newSaida.method : undefined}
                    onContaChange={lancamentoTipo === 'saida' ? (v) => setNewSaida((p) => ({ ...p, method: v as PaymentMethod })) : undefined}
                    contaOptions={lancamentoTipo === 'saida' ? paymentMethods.map((m) => ({ value: m.value, label: m.label })) : []}
                    onSubmit={lancamentoTipo === 'entrada' ? handleAddEntrada : handleAddSaida}
                    onBack={!editingId ? () => setDialogStep('method') : undefined}
                    isEditing={!!editingId}
                    submitLabel={editingId ? 'Salvar alterações' : undefined}
                    childrenSecondary={lancamentoTipo === 'saida' ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                              <ShoppingBag className="h-4 w-4" />
                              Vincular à Lista de Compras
                            </Label>
                            <Link to="/registro-compras" className="text-xs text-primary hover:underline flex items-center gap-1">Ver lista <ExternalLink className="h-3 w-3" /></Link>
                          </div>
                          <div className="flex gap-2">
                            <Select value={newSaida.purchaseItemId || 'none'} onValueChange={(v) => setNewSaida((p) => ({ ...p, purchaseItemId: v === 'none' ? '' : v }))}>
                              <SelectTrigger className="flex-1 rounded-xl border border-border bg-background"><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {pendingPurchases.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>{item.name} - R$ {item.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Popover open={quickAddPurchaseOpen} onOpenChange={setQuickAddPurchaseOpen}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="icon" title="Criar novo item na lista de compras" aria-label="Criar novo item na lista de compras"><Plus className="h-4 w-4" /></Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3" align="end">
                                <div className="space-y-3">
                                  <Label className="text-sm font-medium text-foreground">Adicionar à Lista de Compras</Label>
                                  <p className="text-xs text-muted-foreground">Cria um item já marcado como comprado</p>
                                  <Input placeholder="Nome do item" value={quickPurchaseName} onChange={(e) => setQuickPurchaseName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddPurchaseItem(); } }} className="border-border bg-background" />
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setQuickAddPurchaseOpen(false); setQuickPurchaseName(''); }}>Cancelar</Button>
                                    <Button size="sm" className="flex-1" onClick={handleQuickAddPurchaseItem} disabled={!quickPurchaseName.trim()}>Criar</Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {newSaida.purchaseItemId && (
                            <>
                              <p className="text-xs text-income flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Item será marcado como comprado</p>
                              <WarrantySection {...warranty} />
                            </>
                          )}
                        </div>
                      </>
                    ) : undefined}
                  />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Filtros + conteúdo: mobile = chips + Tabs; desktop = grid sidebar | Tabs. Gap centraliza a borda entre painel e conteúdo. */}
        <div className={cn(isMobile ? 'space-y-4 mb-6' : 'grid grid-cols-[240px_1fr] gap-6 mb-6')}>
        {isMobile ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
              <button
                type="button"
                onClick={() => { setFilterTipo('all'); setFilterCategories([]); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 border',
                  filterTipo === 'all' && filterCategories.length === 0
                    ? 'bg-[hsl(var(--color-brand-700))] border-[hsl(var(--color-brand-700))] text-white hover:bg-[hsl(var(--color-brand-600))]'
                    : 'border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-brand-400))] hover:text-[hsl(var(--color-brand-700))]'
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => { setFilterTipo('receita'); setFilterCategories([]); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 border',
                  filterTipo === 'receita'
                    ? 'bg-[hsl(var(--color-brand-700))] border-[hsl(var(--color-brand-700))] text-white hover:bg-[hsl(var(--color-brand-600))]'
                    : 'border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-brand-400))] hover:text-[hsl(var(--color-brand-700))]'
                )}
              >
                Receitas
              </button>
              <button
                type="button"
                onClick={() => { setFilterTipo('despesa'); setFilterCategories([]); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 border',
                  filterTipo === 'despesa'
                    ? 'bg-[hsl(var(--color-brand-700))] border-[hsl(var(--color-brand-700))] text-white hover:bg-[hsl(var(--color-brand-600))]'
                    : 'border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-brand-400))] hover:text-[hsl(var(--color-brand-700))]'
                )}
              >
                Despesas
              </button>
              {uniqueCategoriesForFilter.map((cat) => {
                const active = filterCategories.length === 1 && filterCategories[0] === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setFilterTipo('all'); setFilterCategories(active ? [] : [cat]); }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 border truncate max-w-[140px]',
                      active
                        ? 'bg-[hsl(var(--color-brand-700))] border-[hsl(var(--color-brand-700))] text-white hover:bg-[hsl(var(--color-brand-600))]'
                        : 'border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-brand-400))] hover:text-[hsl(var(--color-brand-700))]'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 min-h-[44px] w-full touch-manipulation border-border bg-background text-foreground"
              />
            </div>
          </>
        ) : (
            <aside className="w-[240px] shrink-0 bg-card border-r border-border pr-6 p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</Label>
                <Select value={filterTipo} onValueChange={(v: 'all' | 'receita' | 'despesa') => setFilterTipo(v)}>
                  <SelectTrigger className="mt-1.5 w-full border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                <Select value={filterStatus} onValueChange={(v: 'all' | 'paid' | 'pending' | 'overdue') => setFilterStatus(v)}>
                  <SelectTrigger className="mt-1.5 w-full border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="overdue">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1.5 w-full justify-between border-border bg-background text-foreground">
                      <span className="truncate">{filterCategories.length === 0 ? 'Todas' : `${filterCategories.length} selecionada(s)`}</span>
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {uniqueCategoriesForFilter.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted">
                          <Checkbox
                            checked={filterCategories.includes(cat)}
                            onCheckedChange={(checked) =>
                              setFilterCategories((prev) =>
                                checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                              )
                            }
                          />
                          <span className="text-sm truncate text-foreground">{cat}</span>
                        </label>
                      ))}
                    </div>
                    {filterCategories.length > 0 && (
                      <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setFilterCategories([])}>
                        Limpar
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {availableBanks.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Banco</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="mt-1.5 w-full border-border bg-background">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os bancos</SelectItem>
                      {availableBanks.map(bank => (
                        <SelectItem key={bank.name} value={bank.name}>
                          <div className="flex items-center gap-2">
                            <ConnectorLogo imageUrl={bank.imageUrl} primaryColor={bank.primaryColor} connectorName={bank.name} size="sm" />
                            {bank.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {availableAccountTypes.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conta</Label>
                  <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                    <SelectTrigger className="mt-1.5 w-full border-border bg-background">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as contas</SelectItem>
                      {availableAccountTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Busca</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-full border-border bg-background text-foreground text-sm"
                  />
                </div>
              </div>
            </aside>
        )}
        <div className={cn(!isMobile && 'min-w-0 overflow-hidden')}>

        {/* Período — acima das guias para facilitar a UX */}
        <div className="mb-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Período</Label>
          <div className="mt-1.5">
            <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
        </div>

        {/* Tabs - responsivo */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-auto min-h-[44px] py-1 gap-1">
            <TabsTrigger value="geral" className="flex items-center gap-2 group">
              <Layers className="h-4 w-4 shrink-0 text-foreground opacity-90 group-data-[state=active]:opacity-100" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="entradas" className="flex items-center gap-2 group">
              <TrendingUp className="h-4 w-4 shrink-0 text-income group-data-[state=active]:text-foreground" />
              Entradas
            </TabsTrigger>
            <TabsTrigger value="saidas" className="flex items-center gap-2 group">
              <TrendingDown className="h-4 w-4 shrink-0 text-expense group-data-[state=active]:text-foreground" />
              Saídas
            </TabsTrigger>
          </TabsList>

          {/* Geral Tab */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-income-light/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg gradient-income flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Entradas</p>
                      <p className="text-base sm:text-xl font-bold text-income truncate">{formatCurrency(totalEntradas)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-expense-light/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg gradient-expense flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Saídas</p>
                      <p className="text-base sm:text-xl font-bold text-expense truncate">{formatCurrency(totalSaidas)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${totalEntradas - totalSaidas >= 0 ? 'bg-income/10' : 'bg-expense/10'}`}>
                      <Wallet className={`h-5 w-5 ${totalEntradas - totalSaidas >= 0 ? 'text-income' : 'text-expense'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo</p>
                      <p className={`text-base sm:text-xl font-bold truncate ${totalEntradas - totalSaidas >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(totalEntradas - totalSaidas)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                      <Layers className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Transações</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">{totalCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <RecorrentesSection
              recorrrentes={recorrrentes}
              userId={user?.id}
              onOpenNewRecorrente={handleOpenNewRecorrente}
              onEditRecorrente={handleEditConta}
              onDeleteRecorrente={async (id) => {
                const ok = await deleteConta(id);
                if (ok) fetchContas();
                return ok;
              }}
              loading={loadingContas}
            />

            <CategoryAssignmentCard
              title="Atribuir categorias aos lançamentos"
              description="Valide e organize suas receitas e despesas por categoria"
              count={filteredByMonth.filter(l => !l.is_category_confirmed).length}
              defaultTab="conta"
            />

            <CollapsibleModule
              title="Contas a Pagar"
              icon={<TrendingDown className="h-4 w-4 text-expense" />}
              count={contasPagar.length}
              useDialogOnDesktop
            >
              <ContasListSection
                contas={contasPagar}
                tipo="pagar"
                onConfirmPayment={(id) => setConfirmPaymentConta(contas.find(c => c.id === id) || null)}
                onEdit={handleEditConta}
                onDelete={handleDeleteConta}
              />
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs" onClick={() => handleOpenContaDialog('pagar')}>
                <Plus className="h-3.5 w-3.5" /> Nova Conta a Pagar
              </Button>
            </CollapsibleModule>

            <CollapsibleModule
              title="Contas a Receber"
              icon={<TrendingUp className="h-4 w-4 text-income" />}
              count={contasReceber.length}
              useDialogOnDesktop
            >
              <ContasListSection
                contas={contasReceber}
                tipo="receber"
                onConfirmPayment={(id) => setConfirmPaymentConta(contas.find(c => c.id === id) || null)}
                onEdit={handleEditConta}
                onDelete={handleDeleteConta}
              />
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs" onClick={() => handleOpenContaDialog('receber')}>
                <Plus className="h-3.5 w-3.5" /> Nova Conta a Receber
              </Button>
            </CollapsibleModule>

            <CollapsibleModule
              title="Todos os Lançamentos"
              icon={<Layers className="h-4 w-4 text-primary" />}
              count={totalCount}
              useDialogOnDesktop
            >
              {totalCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border mb-2">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    <span className="sm:hidden">p. {page + 1}/{Math.max(1, totalPages)}</span>
                    <span className="hidden sm:inline">Página {page + 1} de {Math.max(1, totalPages)} ({totalCount} registro{totalCount !== 1 ? 's' : ''})</span>
                  </p>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[36px] touch-manipulation border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground px-1 sm:hidden">{page + 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[36px] touch-manipulation border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= Math.max(1, totalPages) - 1}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
              {lancamentosError ? (
                <ErrorCard message="Não foi possível carregar os dados." onRetry={() => fetchLancamentos()} />
              ) : loading ? (
                <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] overflow-hidden">
                  <div className="bg-[hsl(var(--color-surface-sunken))] h-10 border-b border-[hsl(var(--color-border-default))]" />
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3 border-b border-[hsl(var(--color-border-subtle))] last:border-0">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : allLancamentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--color-surface-sunken))] flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-[hsl(var(--color-text-tertiary))]" />
                  </div>
                  <p className="text-[14px] font-medium text-[hsl(var(--color-text-primary))]">
                    Nenhum lançamento encontrado
                  </p>
                  <p className="text-[12px] text-[hsl(var(--color-text-tertiary))] text-center max-w-[220px]">
                    Adicione seu primeiro lançamento ou ajuste os filtros.
                  </p>
                </div>
              ) : isMobile ? (
                <div className="space-y-4">
                  {lancamentosGroupedByDate.map(([dateStr, items]) => (
                    <div key={dateStr}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider py-2">
                        {dateStr === '—' ? 'Sem data' : parseLocalDate(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isEntrada = item.tipo === 'receita';
                          const recon = getReconciliation(item.id);
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'rounded-xl border border-border bg-card p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors',
                                recon?.isBillPayment && 'opacity-60'
                              )}
                              onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary p-2">
                                <Receipt className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground font-medium truncate">{item.friendly_name || item.nome}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.data_pagamento
                                    ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                                    : (item.data_registro ? parseLocalDate(item.data_registro).toLocaleDateString('pt-BR') : '—')}
                                </p>
                              </div>
                              <p className={cn('font-sans font-semibold tabular-nums tracking-tight shrink-0', isEntrada ? 'text-income' : 'text-expense')}>
                                {isEntrada ? '+' : '-'} {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))] shadow-[var(--shadow-sm)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse">
                      <thead>
                        <tr className="bg-[hsl(var(--color-surface-sunken))] border-b border-[hsl(var(--color-border-default))]">
                          <th className="text-[10px] font-semibold uppercase tracking-[0.07em] h-10 px-4 whitespace-nowrap text-left text-[hsl(var(--color-text-tertiary))]">Nome</th>
                          <th className="text-[10px] font-semibold uppercase tracking-[0.07em] h-10 px-4 whitespace-nowrap text-left hidden sm:table-cell text-[hsl(var(--color-text-tertiary))]">Categoria</th>
                          <th className="text-[10px] font-semibold uppercase tracking-[0.07em] h-10 px-4 whitespace-nowrap text-right text-[hsl(var(--color-text-tertiary))]">Valor</th>
                          <th className="text-[10px] font-semibold uppercase tracking-[0.07em] h-10 px-4 whitespace-nowrap text-right text-[hsl(var(--color-text-tertiary))]">Data</th>
                          <th className="w-10 h-10" aria-label="Pago" />
                        </tr>
                      </thead>
                      <tbody>
                        {allLancamentos.map((item) => {
                          const isEntrada = item.tipo === 'receita';
                          const recon = getReconciliation(item.id);
                          const isPaid = !!item.data_pagamento;
                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                'border-b border-[hsl(var(--color-border-subtle))] transition-colors duration-100 hover:bg-[hsl(var(--color-surface-sunken))] last:border-0 cursor-pointer',
                                recon?.isBillPayment && 'opacity-60'
                              )}
                              onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                            >
                              <td className="px-4 py-3 text-[13px] text-[hsl(var(--color-text-primary))]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="font-medium truncate">{item.friendly_name || item.nome}</p>
                                  {recon?.matched && recon.cardName && (
                                    <span className="badge-info inline-flex items-center gap-1 shrink-0">
                                      <Link2 className="h-3 w-3" /> Conciliado
                                    </span>
                                  )}
                                  {recon?.isBillPayment && !recon.matched && (
                                    <span className="badge-warning inline-flex items-center gap-1 shrink-0">
                                      <AlertCircle className="h-3 w-3" /> Pgto. Fatura
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[13px] text-[hsl(var(--color-text-primary))] truncate hidden sm:table-cell">{item.categoria}</td>
                              <td className={cn('px-4 py-3 font-numeric text-[13px] font-semibold tracking-[-0.01em] tabular-nums whitespace-nowrap text-right', isEntrada ? 'text-[hsl(var(--color-income))]' : 'text-[hsl(var(--color-expense))]')}>
                                {isEntrada ? '+ ' : '- '}{formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                              </td>
                              <td className="px-4 py-3 text-[12px] text-[hsl(var(--color-text-secondary))] tabular-nums whitespace-nowrap text-right">
                                {item.data_pagamento
                                  ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                                  : (item.data_registro ? parseLocalDate(item.data_registro).toLocaleDateString('pt-BR') : '—')}
                              </td>
                              <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isPaid}
                                  onCheckedChange={(checked) => { markLancamentoPaid(item.id, checked === true); }}
                                  className="shrink-0"
                                  aria-label={isEntrada ? 'Recebido' : 'Pago'}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CollapsibleModule>
          </TabsContent>

          {/* Entradas Tab */}
          <TabsContent value="entradas" className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="bg-income-light/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg gradient-income flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total do Mês</p>
                      <p className="text-base sm:text-xl font-bold text-income truncate">
                        {formatCurrency(totalEntradas)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Fontes Ativas</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">{enabledIncomes.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 lg:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Transações</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">{entradas.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contas a Receber */}
            <CollapsibleModule
              title="Contas a Receber"
              icon={<TrendingUp className="h-4 w-4 text-income" />}
              count={contasReceber.length}
              useDialogOnDesktop
            >
              <ContasListSection
                contas={contasReceber}
                tipo="receber"
                onConfirmPayment={(id) => setConfirmPaymentConta(contas.find(c => c.id === id) || null)}
                onEdit={handleEditConta}
                onDelete={handleDeleteConta}
              />
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs" onClick={() => handleOpenContaDialog('receber')}>
                <Plus className="h-3.5 w-3.5" /> Nova Conta a Receber
              </Button>
            </CollapsibleModule>

            <CategoryAssignmentCard
              title="Atribuir categorias às receitas"
              description="Valide e organize suas receitas por categoria"
              count={entradas.filter(l => !l.is_category_confirmed).length}
              defaultTab="conta"
            />

            {/* Transactions */}
            <CollapsibleModule
              title="Últimas Entradas"
              icon={<TrendingUp className="h-4 w-4 text-income" />}
              count={entradas.length}
              useDialogOnDesktop
            >
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
              ) : entradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma entrada registrada. Clique em "Novo" para adicionar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="divide-y divide-border min-w-0">
                  {entradas.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 min-h-[44px] cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                      onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 min-h-[24px] bg-income" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.friendly_name || item.nome}
                          </p>
                          <p className="font-bold text-sm text-income whitespace-nowrap shrink-0 text-right tabular-nums">
                            + {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-muted-foreground truncate">{item.categoria}</span>
                            {(() => { const s = getSourceInfo(item.source_id); return s ? (
                              <>
                                <span className="text-xs text-muted-foreground/50">·</span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate rounded px-1 py-0.5" style={{ backgroundColor: s.primaryColor ? `#${s.primaryColor.replace(/^#/, '')}15` : undefined, borderLeft: s.primaryColor ? `2px solid #${s.primaryColor.replace(/^#/, '')}` : undefined }}>
                                  <ConnectorLogo imageUrl={s.imageUrl} primaryColor={s.primaryColor} connectorName={s.institution} size="xs" />
                                  {s.institution}
                                </span>
                              </>
                            ) : null; })()}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-auto sm:ml-0">
                            {item.data_pagamento 
                              ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                              : parseLocalDate(item.data_registro).toLocaleDateString('pt-BR')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </CollapsibleModule>
          </TabsContent>

          {/* Saidas Tab */}
          <TabsContent value="saidas" className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="bg-expense-light/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg gradient-expense flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total do Mês</p>
                      <p className="text-base sm:text-xl font-bold text-expense truncate">
                        {formatCurrency(totalSaidas)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-warning/20 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Categorias Ativas</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">{enabledExpenses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 lg:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Transações</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">{saidas.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contas a Pagar */}
            <CollapsibleModule
              title="Contas a Pagar"
              icon={<TrendingDown className="h-4 w-4 text-expense" />}
              count={contasPagar.length}
              useDialogOnDesktop
            >
              <ContasListSection
                contas={contasPagar}
                tipo="pagar"
                onConfirmPayment={(id) => setConfirmPaymentConta(contas.find(c => c.id === id) || null)}
                onEdit={handleEditConta}
                onDelete={handleDeleteConta}
              />
              <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs" onClick={() => handleOpenContaDialog('pagar')}>
                <Plus className="h-3.5 w-3.5" /> Nova Conta a Pagar
              </Button>
            </CollapsibleModule>

            <CategoryAssignmentCard
              title="Atribuir categorias às despesas"
              description="Valide e organize suas despesas por categoria"
              count={saidas.filter(l => !l.is_category_confirmed).length}
              defaultTab="conta"
            />

            {/* Transactions */}
            <CollapsibleModule
              title="Últimas Saídas"
              icon={<Wallet className="h-4 w-4 text-expense" />}
              count={saidas.length}
              useDialogOnDesktop
            >
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
              ) : saidas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma saída registrada. Clique em "Novo" para adicionar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="divide-y divide-border min-w-0">
                  {saidas.map((item) => {
                    const recon = getReconciliation(item.id);
                    return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 min-h-[44px] cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors ${recon?.isBillPayment ? 'opacity-60' : ''}`}
                      onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 min-h-[24px] bg-expense" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {item.friendly_name || item.nome}
                            </p>
                            {recon?.matched && recon.cardName && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                                <Link2 className="h-3 w-3" />
                                Conciliado
                              </span>
                            )}
                            {recon?.isBillPayment && !recon.matched && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded-full shrink-0">
                                <AlertCircle className="h-3 w-3" />
                                Pgto. Fatura
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-expense whitespace-nowrap shrink-0 text-right tabular-nums">
                            - {formatCurrency(item.valor_realizado ?? item.valor_previsto)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                              {item.categoria}
                            </span>
                            {item.forma_pagamento && (
                              <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground whitespace-nowrap">
                                {getPaymentMethodIcon(item.forma_pagamento)}
                                <span>{getPaymentMethodLabel(item.forma_pagamento)}</span>
                              </span>
                            )}
                            {(() => { const s = getSourceInfo(item.source_id); return s ? (
                              <>
                                <span className="text-xs text-muted-foreground/50">·</span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate rounded px-1 py-0.5" style={{ backgroundColor: s.primaryColor ? `#${s.primaryColor.replace(/^#/, '')}15` : undefined, borderLeft: s.primaryColor ? `2px solid #${s.primaryColor.replace(/^#/, '')}` : undefined }}>
                                  <ConnectorLogo imageUrl={s.imageUrl} primaryColor={s.primaryColor} connectorName={s.institution} size="xs" />
                                  {s.institution}
                                </span>
                              </>
                            ) : null; })()}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-auto sm:ml-0">
                            {item.data_pagamento
                              ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                              : (item.data_registro ? parseLocalDate(item.data_registro).toLocaleDateString('pt-BR') : '—')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </CollapsibleModule>

            {/* By Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Despesas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {paymentMethods.map((method) => {
                    const total = saidas
                      .filter(e => e.forma_pagamento === method.value && !billPaymentIds.has(e.id))
                      .reduce((acc, e) => acc + (e.valor_realizado ?? e.valor_previsto ?? 0), 0);
                    
                    return (
                      <div
                        key={method.value}
                        className="p-4 rounded-lg bg-muted/50 border border-border text-center"
                      >
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2">
                          {method.value.includes('card') ? (
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{method.label}</p>
                        <p className="font-bold text-foreground mt-1">
                          {formatCurrency(total)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
        </div>

      </div>
    </AppLayout>

    {/* Conta Form Dialog */}
    <ContaFormDialog
      open={contaDialogOpen}
      onOpenChange={handleContaDialogOpenChange}
      editingConta={editingConta}
      defaultTipo={contaDialogTipo}
      defaultTipoCobranca={defaultTipoCobrancaConta}
      onSave={handleSaveContaForm}
    />

    {/* Confirm Payment Dialog */}
    <ConfirmPaymentDialog
      conta={confirmPaymentConta}
      open={!!confirmPaymentConta}
      onOpenChange={(open) => { if (!open) setConfirmPaymentConta(null); }}
      onConfirm={handleConfirmPaymentSubmit}
      isUploading={uploadingComprovante}
      pendingPurchases={pendingPurchases}
    />

    <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>"{deleteConfirm?.nome}"</strong>? Esta ação pode ser desfeita na Lixeira.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Friendly Name Confirm Dialog */}
    <LancamentoFriendlyNameDialog
      open={friendlyNameConfirmOpen}
      onOpenChange={setFriendlyNameConfirmOpen}
      originalName={friendlyNamePending?.originalName || ''}
      friendlyName={friendlyNamePending?.newName || ''}
      onApplyThisOnly={handleFriendlyNameApplyThisOnly}
      onApplyAll={handleFriendlyNameApplyAll}
      onCancel={handleFriendlyNameCancel}
    />

    {/* Detail Dialog */}
    <LancamentoDetailDialog
      item={detailItem}
      open={detailDialogOpen}
      onOpenChange={setDetailDialogOpen}
      onEdit={(item) => item.tipo === 'receita' ? handleEditEntrada(item) : handleEditSaida(item)}
      onDelete={handleDeleteItem}
      onMarkPaid={markLancamentoPaid}
      onOpenMarkAsPaid={(item) => { setDetailDialogOpen(false); setMarkAsPaidItem(item); }}
      onDuplicateNextMonth={duplicateLancamentoNextMonth}
      sourceInfo={detailItem ? getSourceInfo(detailItem.source_id) : null}
      reconciliation={detailItem ? getReconciliation(detailItem.id) : null}
    />

    <MarkAsPaidLancamentoDialog
      item={markAsPaidItem}
      open={!!markAsPaidItem}
      onOpenChange={(open) => !open && setMarkAsPaidItem(null)}
      onConfirm={async (params) => {
        if (!markAsPaidItem) return;
        setMarkAsPaidLoading(true);
        try {
          await markLancamentoPaidWithValues(markAsPaidItem.id, params.valorRealizado, params.dataPagamento, params.formaPagamento);
          refetchSummary();
          setMarkAsPaidItem(null);
        } finally {
          setMarkAsPaidLoading(false);
        }
      }}
      isLoading={markAsPaidLoading}
    />



    </>
  );
};

export default Lancamentos;
