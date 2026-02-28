import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parseLocalDate, formatDateYMD } from '@/utils/dateUtils';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { TrendingUp, TrendingDown, Plus, Calendar, Trash2, Wallet, CreditCard, Banknote, Pencil, Zap, History, Sparkles, FileText, Camera, ChevronDown, Layers, ShoppingBag, ExternalLink, Clock, Search, Building2, Filter, Link2, AlertCircle, Landmark, CheckCircle2, Receipt, Type } from 'lucide-react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { CollapsibleModule } from '@/components/shared/CollapsibleModule';
import { CategoryAssignmentCard } from '@/components/shared/CategoryAssignmentDialog';
import { ContasListSection } from '@/components/lancamentos/ContasListSection';
import { ContaFormDialog } from '@/components/lancamentos/ContaFormDialog';
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

import { useLancamentosRealizados, LancamentoRealizado, LancamentoInput } from '@/hooks/useLancamentosRealizados';
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
import { LancamentoFriendlyNameDialog } from '@/components/lancamentos/LancamentoFriendlyNameDialog';
import { applyLancamentoFriendlyNameRule } from '@/utils/lancamentoFriendlyNameRules';

type LancamentoTipo = 'entrada' | 'saida';

export const Lancamentos: React.FC = () => {
  const { config, updateMonthlyEntry, updateFinancialInstitution } = useFinancial();
  const { isHidden } = useVisibility();
  const { isManual } = useFinanceMode();
  const { user } = useAuth();
  const { 
    lancamentos, 
    loading,
    fetchLancamentos,
    addLancamento,
    addMultipleLancamentos, 
    updateLancamento,
    updateFriendlyName,
    deleteLancamento,
  } = useLancamentosRealizados();
  const {
    contas,
    rawContas,
    loading: loadingContas,
    addConta,
    addMultipleContas,
    updateConta,
    deleteConta,
    getContaByVinculoCartao,
  } = useContasPagarReceber();
  const { items: purchaseItems, markAsPurchased, getItemsByStatus, addItem: addPurchaseItem } = usePurchaseRegistry();
  const { addSeguro } = useSeguros();
  const { getSourceInfo, sourceMap } = useTransactionSourceMap();
  const { bills } = useCreditCardBills();
  const { getReconciliation, billPaymentIds } = useBillPaymentReconciliation(lancamentos, bills);
  const pendingPurchases = getItemsByStatus('pending');
  const enabledIncomes = config.incomeItems.filter(i => i.enabled);
  const enabledExpenses = config.expenseItems.filter(i => i.enabled);

  // Month selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all');

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

  // Filter lancamentos by selected month
  const filteredByMonth = useMemo(() => 
    lancamentos.filter(l => l.mes_referencia === selectedMonth),
    [lancamentos, selectedMonth]
  );

  // Apply search + bank + account filters
  const filteredLancamentos = useMemo(() => {
    return filteredByMonth.filter(l => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.nome.toLowerCase().includes(q) || (l.friendly_name && l.friendly_name.toLowerCase().includes(q));
        const matchesCategory = l.categoria.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }
      // Bank filter
      if (selectedBank !== 'all') {
        const source = getSourceInfo(l.source_id);
        if (!source || source.institution !== selectedBank) return false;
      }
      // Account type filter
      if (selectedAccountType !== 'all') {
        const source = getSourceInfo(l.source_id);
        if (!source || source.accountType !== selectedAccountType) return false;
      }
      return true;
    });
  }, [filteredByMonth, searchQuery, selectedBank, selectedAccountType, getSourceInfo]);
  
  // Derive entradas/saidas from filtered data
  const entradas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.tipo === 'receita')
      .sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro).localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro)), 
    [filteredLancamentos]
  );
  const saidas = useMemo(() => 
    filteredLancamentos
      .filter(l => l.tipo === 'despesa')
      .sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro).localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro)), 
    [filteredLancamentos]
  );

  const allLancamentos = useMemo(() => 
    [...filteredLancamentos].sort((a, b) => (b.data_pagamento || b.data_vencimento || b.data_registro).localeCompare(a.data_pagamento || a.data_vencimento || a.data_registro)),
    [filteredLancamentos]
  );

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
  const [confirmPaymentConta, setConfirmPaymentConta] = useState<Conta | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [detailItem, setDetailItem] = useState<LancamentoRealizado | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contas filtered
  const contasPagar = useMemo(() => contas.filter(c => c.tipo === 'pagar' && !c.dataPagamento && c.dataVencimento.startsWith(selectedMonth)), [contas, selectedMonth]);
  const contasReceber = useMemo(() => contas.filter(c => c.tipo === 'receber' && !c.dataPagamento && c.dataVencimento.startsWith(selectedMonth)), [contas, selectedMonth]);

  // Sync credit card accounts with financial institutions
  useEffect(() => {
    const syncCreditCardContas = async () => {
      if (!user || loadingContas) return;
      
      // Limpar contas órfãs vinculadas a instituições que não existem mais
      for (const conta of rawContas) {
        if (conta.vinculoCartaoId) {
          const exists = config.financialInstitutions.some(fi => fi.id === conta.vinculoCartaoId);
          if (!exists) {
            await deleteConta(conta.id);
          }
        }
      }
      
      // Sincronizar novos cartões
      const creditCardInstitutions = config.financialInstitutions.filter(fi => fi.hasCreditCard && fi.creditCardDueDay);
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
  }, [config.financialInstitutions, user, loadingContas]);

  const handleOpenContaDialog = (tipo: ContaTipo) => { setContaDialogTipo(tipo); setEditingConta(null); setContaDialogOpen(true); };
  const handleEditConta = (conta: Conta) => { setEditingConta(conta); setContaDialogTipo(conta.tipo); setContaDialogOpen(true); };
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

  const totalEntradas = entradas.reduce((acc, t) => acc + t.valor_realizado, 0);
  const totalSaidas = saidas.reduce((acc, t) => acc + t.valor_realizado, 0);

  const lastSyncDate = useMemo(() => {
    const synced = lancamentos
      .filter((l: any) => l.source_type === 'pluggy_bank')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return synced.length > 0 ? synced[0].created_at : null;
  }, [lancamentos]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
      amount: item.valor_realizado,
      date: item.data_pagamento || item.data_registro,
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
      amount: item.valor_realizado,
      date: item.data_pagamento || item.data_registro,
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
    if (!newEntrada.name || !newEntrada.amount || !newEntrada.type) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingId) {
      await updateLancamento(editingId, {
        nome: newEntrada.name,
        valor_realizado: newEntrada.amount,
        valor_previsto: newEntrada.amount,
        data_pagamento: newEntrada.date,
        categoria: newEntrada.type,
      });
      handleCloseDialog();
    } else {
      const result = await addLancamento({
        tipo: 'receita',
        categoria: newEntrada.type,
        nome: newEntrada.name,
        valor_previsto: newEntrada.amount,
        valor_realizado: newEntrada.amount,
        mes_referencia: getCurrentMonthReference(),
        data_pagamento: newEntrada.date,
      });
      if (result) {
        handleCloseDialog();
        toast.success('Entrada registrada com sucesso!');
      }
    }
  };

  const handleAddSaida = async () => {
    if (!newSaida.name || !newSaida.amount || !newSaida.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingId) {
      await updateLancamento(editingId, {
        nome: newSaida.name,
        valor_realizado: newSaida.amount,
        valor_previsto: newSaida.amount,
        data_pagamento: newSaida.date,
        categoria: newSaida.category,
        forma_pagamento: newSaida.method,
      });
      handleCloseDialog();
    } else {
      const result = await addLancamento({
        tipo: 'despesa',
        categoria: newSaida.category,
        nome: newSaida.name,
        valor_previsto: newSaida.amount,
        valor_realizado: newSaida.amount,
        mes_referencia: getCurrentMonthReference(),
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
    await deleteLancamento(deleteConfirm.id);
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
    const expenseById = new Map(config.expenseItems.map(i => [i.id, i]));

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
      <div className="space-y-6">
        {/* Outdated Connection Banner */}
        {!isManual && <OutdatedConnectionBanner />}

        {/* Header */}
        <PageHeader
          title="Lançamentos"
          description="Gerencie suas entradas e saídas"
          icon={<Receipt className="h-5 w-5 text-primary" />}
        >
          {!isManual && <BankSyncButton variant="button" />}
          <VisibilityToggle />
          {/* Single Add Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="hero" className="gap-2">
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
        </PageHeader>

        {!isManual && <PluggySyncStatus accountType="BANK" compact />}

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

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-md">
            {dialogStep === 'select' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-4">
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
            ) : lancamentoTipo === 'entrada' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-income" />
                    {editingId ? 'Editar Entrada' : 'Registrar Nova Entrada'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Descrição</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Salário, Freelance..."
                      value={newEntrada.name}
                      onChange={(e) => setNewEntrada(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <CurrencyInput
                      value={newEntrada.amount}
                      onChange={(value) => setNewEntrada(prev => ({ ...prev, amount: value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Receita</Label>
                    <Select
                      value={newEntrada.type}
                      onValueChange={(value) => setNewEntrada(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {enabledIncomes.map((income) => (
                          <SelectItem key={income.id} value={income.name}>
                            {income.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newEntrada.date}
                      onChange={(e) => setNewEntrada(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    {!editingId && (
                      <Button variant="outline" onClick={() => setDialogStep('method')} className="flex-1">
                        Voltar
                      </Button>
                    )}
                    <Button onClick={handleAddEntrada} className={`${editingId ? 'w-full' : 'flex-1'} bg-income hover:bg-income/90`}>
                      {editingId ? 'Salvar Alterações' : 'Registrar Entrada'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-expense" />
                    {editingId ? 'Editar Saída' : 'Registrar Nova Saída'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Descrição</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Aluguel, Supermercado..."
                      value={newSaida.name}
                      onChange={(e) => setNewSaida(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <CurrencyInput
                      value={newSaida.amount}
                      onChange={(value) => setNewSaida(prev => ({ ...prev, amount: value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={newSaida.category}
                      onValueChange={(value) => setNewSaida(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Forma de Pagamento</Label>
                    <Select
                      value={newSaida.method}
                      onValueChange={(value) => setNewSaida(prev => ({ ...prev, method: value as PaymentMethod }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newSaida.date}
                      onChange={(e) => setNewSaida(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  
                  {/* Purchase Registry Link */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="purchaseItem" className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        Vincular à Lista de Compras
                      </Label>
                      <Link 
                        to="/registro-compras" 
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Ver lista <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={newSaida.purchaseItemId || "none"}
                        onValueChange={(value) => setNewSaida(prev => ({ ...prev, purchaseItemId: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Nenhum (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {pendingPurchases.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - R$ {item.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Popover open={quickAddPurchaseOpen} onOpenChange={setQuickAddPurchaseOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            title="Criar novo item na lista de compras"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="end">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Adicionar à Lista de Compras</Label>
                              <p className="text-xs text-muted-foreground">
                                Cria um item já marcado como comprado
                              </p>
                            </div>
                            <Input
                              placeholder="Nome do item (ex: iPhone 15)"
                              value={quickPurchaseName}
                              onChange={(e) => setQuickPurchaseName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddPurchaseItem();
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => {
                                  setQuickAddPurchaseOpen(false);
                                  setQuickPurchaseName('');
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={handleQuickAddPurchaseItem}
                                disabled={!quickPurchaseName.trim()}
                              >
                                Criar
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {newSaida.purchaseItemId && (
                      <>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          Item será marcado como comprado
                        </p>
                        <WarrantySection {...warranty} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!editingId && (
                      <Button variant="outline" onClick={() => setDialogStep('method')} className="flex-1">
                        Voltar
                      </Button>
                    )}
                    <Button onClick={handleAddSaida} className={`${editingId ? 'w-full' : 'flex-1'} bg-expense hover:bg-expense/90`}>
                      {editingId ? 'Salvar Alterações' : 'Registrar Saída'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Month Selector */}
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lançamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {availableBanks.length > 0 && (
          <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <div className="flex items-center gap-2">
                  {selectedBank !== 'all' ? (
                    (() => {
                      const bank = availableBanks.find(b => b.name === selectedBank);
                      return bank ? (
                        <ConnectorLogo imageUrl={bank.imageUrl} primaryColor={bank.primaryColor} connectorName={bank.name} size="sm" />
                      ) : <Building2 className="h-4 w-4 text-muted-foreground" />;
                    })()
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  <SelectValue placeholder="Banco" />
                </div>
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
          )}
          {availableAccountTypes.length > 0 && (
          <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <div className="flex items-center gap-2">
                  {selectedAccountType === 'Cartão de Crédito' ? (
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  ) : selectedAccountType !== 'all' ? (
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  )}
                  <SelectValue placeholder="Tipo de conta" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {availableAccountTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {type === 'Cartão de Crédito' ? (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                      )}
                      {type}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="geral" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="entradas" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Entradas
            </TabsTrigger>
            <TabsTrigger value="saidas" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
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
                      <p className="text-base sm:text-xl font-bold text-foreground">{allLancamentos.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
              count={allLancamentos.length}
              useDialogOnDesktop
            >
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
              ) : allLancamentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum lançamento registrado. Clique em "Novo" para adicionar.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {allLancamentos.map((item) => {
                    const isEntrada = item.tipo === 'receita';
                    const source = getSourceInfo(item.source_id);
                    const recon = getReconciliation(item.id);
                    return (
                      <div key={item.id} 
                        className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors ${recon?.isBillPayment ? 'opacity-60' : ''}`}
                        onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                      >
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${isEntrada ? 'bg-income' : 'bg-expense'}`} />
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
                            <p className={`font-bold text-sm whitespace-nowrap ${isEntrada ? 'text-income' : 'text-expense'}`}>
                              {isEntrada ? '+ ' : '- '}{formatCurrency(item.valor_realizado)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs text-muted-foreground truncate">{item.categoria}</span>
                              {source && (
                                <>
                                  <span className="text-xs text-muted-foreground/50">·</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate rounded px-1 py-0.5" style={{ backgroundColor: source.primaryColor ? `#${source.primaryColor.replace(/^#/, '')}15` : undefined, borderLeft: source.primaryColor ? `2px solid #${source.primaryColor.replace(/^#/, '')}` : undefined }}>
                                    <ConnectorLogo imageUrl={source.imageUrl} primaryColor={source.primaryColor} connectorName={source.institution} size="xs" />
                                    {source.institution}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.data_pagamento
                                ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                                : parseLocalDate(item.data_registro).toLocaleDateString('pt-BR')
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <div className="divide-y divide-border">
                  {entradas.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                      onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 bg-income" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.friendly_name || item.nome}
                          </p>
                          <p className="font-bold text-sm text-income whitespace-nowrap">
                            + {formatCurrency(item.valor_realizado)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                <div className="divide-y divide-border">
                  {saidas.map((item) => {
                    const recon = getReconciliation(item.id);
                    return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors ${recon?.isBillPayment ? 'opacity-60' : ''}`}
                      onClick={() => { setDetailItem(item); setDetailDialogOpen(true); }}
                    >
                      <div className="w-1 self-stretch rounded-full shrink-0 bg-expense" />
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
                          <p className="font-bold text-sm text-expense whitespace-nowrap">
                            - {formatCurrency(item.valor_realizado)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[100px]">
                              {item.categoria}
                            </span>
                            {item.forma_pagamento && (
                              <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground whitespace-nowrap">
                                {getPaymentMethodIcon(item.forma_pagamento)}
                                <span className="hidden sm:inline">{getPaymentMethodLabel(item.forma_pagamento)}</span>
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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {item.data_pagamento
                              ? parseLocalDate(item.data_pagamento).toLocaleDateString('pt-BR')
                              : parseLocalDate(item.data_registro).toLocaleDateString('pt-BR')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
                      .reduce((acc, e) => acc + e.valor_realizado, 0);
                    
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
    </AppLayout>

    {/* Conta Form Dialog */}
    <ContaFormDialog
      open={contaDialogOpen}
      onOpenChange={setContaDialogOpen}
      editingConta={editingConta}
      defaultTipo={contaDialogTipo}
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
            Tem certeza que deseja excluir <strong>"{deleteConfirm?.nome}"</strong>? Esta ação não pode ser desfeita e o lançamento será removido permanentemente.
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
      sourceInfo={detailItem ? getSourceInfo(detailItem.source_id) : null}
      reconciliation={detailItem ? getReconciliation(detailItem.id) : null}
    />



    </>
  );
};

export default Lancamentos;
