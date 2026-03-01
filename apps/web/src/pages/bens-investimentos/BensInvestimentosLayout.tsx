import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Building2, Plus, Trash2, Package, Pencil, Target, AlertTriangle, RotateCcw, Clock, History, TrendingUp, Landmark, Shield, Car, MinusCircle, ChevronRight, Home, Target as TargetIcon, LayoutDashboard } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useContasPagarReceber } from '@/hooks/useContasPagarReceber';
import { useUserTrash } from '@/hooks/useUserTrash';
import { useSeguros } from '@/hooks/useSeguros';
import { BensInvestimentosContext } from '@/contexts/BensInvestimentosContext';
import { Asset, AssetType, InvestmentType } from '@/types/financial';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddAssetDialog } from '@/components/bens/AddAssetDialog';
import { SeguroDialog } from '@/components/seguros/SeguroDialog';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { assetIcons, formatCurrencyBase, type AssetDependencies } from './constants';
import { usePatrimonioOverview } from '@/hooks/usePatrimonioOverview';

const BensInvestimentosLayout: React.FC = () => {
  const { config, removeAsset, addAsset, vehicleRecords } = useFinancial();
  const { data: patrimonioData, error: patrimonioError } = usePatrimonioOverview();
  const { isHidden } = useVisibility();
  const { deleteContasByVinculoAtivo, getContasByVinculoAtivo, addConta } = useContasPagarReceber();
  const { trashItems, auditLogs, moveToTrash, logDeletion, restoreFromTrash, permanentlyDelete, emptyTrash, getDaysUntilExpiration, loading: trashLoading } = useUserTrash();
  const { seguros } = useSeguros();

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const tabFromUrl = ['overview', 'imoveis', 'investimentos', 'financiamentos', 'seguros', 'metas'].includes(pathSegment) ? pathSegment : 'overview';

  const [currentTab, setCurrentTab] = useState<string>(() => tabFromUrl);
  useEffect(() => {
    setCurrentTab((prev) => (pathSegment && ['overview', 'imoveis', 'investimentos', 'financiamentos', 'seguros', 'metas'].includes(pathSegment) ? pathSegment : prev));
  }, [pathSegment]);
  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (tabParam && ['overview', 'imoveis', 'investimentos', 'financiamentos', 'seguros', 'metas'].includes(tabParam)) {
      setCurrentTab(tabParam);
    }
  }, [tabParam]);

  const formatCurrency = useCallback((value: number) => isHidden ? '••••••' : formatCurrencyBase(value), [isHidden]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [forceDeleteConfirmed, setForceDeleteConfirmed] = useState(false);
  const [assetDependencies, setAssetDependencies] = useState<AssetDependencies | null>(null);

  // Seguro state
  const [seguroDialogOpen, setSeguroDialogOpen] = useState(false);
  const [seguroAssetId, setSeguroAssetId] = useState<string | undefined>(undefined);

  // Trash/Audit state
  const [trashSheetOpen, setTrashSheetOpen] = useState(false);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

  const defaultAssetType: AssetType = currentTab === 'investimentos' ? 'investment' : 'property';
  const assets = patrimonioData?.assets ?? [];
  const imoveis = assets.filter((a: { type?: string }) => a.type === 'imovel');
  const investimentosList = assets.filter((a: { type?: string }) => a.type === 'investimento');
  const financiamentosList = patrimonioData?.financiamentos ?? [];
  const consorciosList = patrimonioData?.consorcios ?? [];
  const segurosList = patrimonioData?.seguros ?? [];
  const goalsList = patrimonioData?.goals ?? [];
  const netWorth = patrimonioData?.net_worth;

  // --- Context callbacks ---
  const handleOpenAddDialog = useCallback((institutionId?: string, investmentType?: InvestmentType) => {
    setEditingAsset(null);
    setIsDialogOpen(true);
  }, []);

  const handleEditAsset = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsDialogOpen(true);
  }, []);

  const hasActiveInsurance = useCallback((assetId: string) => {
    return seguros?.some(s =>
      s.asset_id === assetId &&
      new Date(s.data_fim) >= new Date()
    ) ?? false;
  }, [seguros]);

  const handleAddSeguro = useCallback((assetId: string) => {
    setSeguroAssetId(assetId);
    setSeguroDialogOpen(true);
  }, []);

  const checkAssetDependencies = useCallback((assetId: string): AssetDependencies => {
    const asset = config.assets.find(a => a.id === assetId);
    if (!asset) {
      return { hasDependencies: false, vehicleRecords: 0, linkedExpenses: 0, linkedIncome: false, monthlyEntries: 0, assetName: '', assetType: 'property' };
    }
    const vehicleRecordCount = vehicleRecords.filter(r => r.vehicleId === assetId).length;
    const linkedExpenseCount = asset.linkedExpenses?.length || 0;
    const hasLinkedIncome = !!(asset.rentalIncomeId && config.incomeItems.find(i => i.id === asset.rentalIncomeId));
    let monthlyEntryCount = 0;
    const linkedExpenseIds = asset.linkedExpenses?.map(le => le.expenseId) || [];
    config.monthlyEntries.forEach(entry => {
      if (linkedExpenseIds.includes(entry.itemId)) monthlyEntryCount++;
      if (asset.rentalIncomeId && entry.itemId === asset.rentalIncomeId) monthlyEntryCount++;
    });
    const hasDependencies = vehicleRecordCount > 0 || linkedExpenseCount > 0 || hasLinkedIncome || monthlyEntryCount > 0;
    return { hasDependencies, vehicleRecords: vehicleRecordCount, linkedExpenses: linkedExpenseCount, linkedIncome: hasLinkedIncome, monthlyEntries: monthlyEntryCount, assetName: asset.name, assetType: asset.type };
  }, [config.assets, config.incomeItems, config.monthlyEntries, vehicleRecords]);

  const handleDeleteAsset = useCallback((assetId: string) => {
    const dependencies = checkAssetDependencies(assetId);
    setAssetDependencies(dependencies);
    setAssetToDelete(assetId);
    setForceDeleteConfirmed(false);
    setDeleteConfirmOpen(true);
  }, [checkAssetDependencies]);

  const confirmDeleteAsset = async () => {
    if (assetToDelete && assetDependencies && !assetDependencies.hasDependencies) {
      const asset = config.assets.find(a => a.id === assetToDelete);
      if (asset) {
        await moveToTrash(assetToDelete, asset.type, asset as Record<string, any>, [], 'user_delete');
        await logDeletion('soft_delete', asset.type, assetToDelete, asset.name, { value: asset.value }, 0);
      }
      removeAsset(assetToDelete);
      toast.success('Item movido para a lixeira');
      setAssetToDelete(null);
      setAssetDependencies(null);
    }
    setDeleteConfirmOpen(false);
  };

  const confirmForceDeleteAsset = async () => {
    if (!assetToDelete || !forceDeleteConfirmed) return;
    try {
      const asset = config.assets.find(a => a.id === assetToDelete);
      const linkedContas = getContasByVinculoAtivo(assetToDelete);
      const linkedContasCount = linkedContas.length;
      if (asset) {
        await moveToTrash(assetToDelete, asset.type, asset as Record<string, any>, linkedContas as Record<string, any>[], 'force_delete');
        await logDeletion('force_delete', asset.type, assetToDelete, asset.name, { value: asset.value, dependencies: assetDependencies, linkedContasDeleted: linkedContasCount }, linkedContasCount);
      }
      if (linkedContasCount > 0) await deleteContasByVinculoAtivo(assetToDelete);
      removeAsset(assetToDelete);
      toast.success('Item movido para lixeira com registros vinculados');
    } catch (error) {
      console.error('Error during force delete:', error);
      toast.error('Erro ao excluir item');
    } finally {
      setAssetToDelete(null);
      setAssetDependencies(null);
      setForceDeleteConfirmed(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleEditAssetFromDialog = () => {
    if (assetToDelete) {
      const asset = config.assets.find(a => a.id === assetToDelete);
      if (asset) {
        setEditingAsset(asset);
        setIsDialogOpen(true);
      }
    }
    setDeleteConfirmOpen(false);
    setAssetToDelete(null);
    setAssetDependencies(null);
    setForceDeleteConfirmed(false);
  };

  const handleRestoreFromTrash = async (trashId: string) => {
    const restored = await restoreFromTrash(trashId);
    if (restored) {
      addAsset(restored.asset_data as Asset);
      if (restored.linked_data && Array.isArray(restored.linked_data) && restored.linked_data.length > 0) {
        for (const conta of restored.linked_data) {
          const contaInput = conta as any;
          if (contaInput.tipo && contaInput.nome && contaInput.valor !== undefined && contaInput.dataVencimento && contaInput.categoria) {
            await addConta({
              tipo: contaInput.tipo,
              nome: contaInput.nome,
              valor: contaInput.valor,
              dataVencimento: contaInput.dataVencimento,
              categoria: contaInput.categoria,
              formaPagamento: contaInput.formaPagamento,
              observacoes: contaInput.observacoes,
              recorrente: contaInput.recorrente,
              tipoCobranca: contaInput.tipoCobranca,
              diaRecorrencia: contaInput.diaRecorrencia,
              dataFimRecorrencia: contaInput.dataFimRecorrencia,
              semDataFim: contaInput.semDataFim,
              vinculoAtivoId: contaInput.vinculoAtivoId,
            });
          }
        }
      }
      toast.success('Item restaurado com sucesso');
    }
  };

  const handleTabChange = (value: string) => setCurrentTab(value);

  // Context value
  const contextValue = useMemo(() => ({
    handleOpenAddDialog,
    handleEditAsset,
    handleDeleteAsset,
    handleAddSeguro,
    hasActiveInsurance,
    formatCurrency,
  }), [handleOpenAddDialog, handleEditAsset, handleDeleteAsset, handleAddSeguro, hasActiveInsurance, formatCurrency]);

  return (
    <BensInvestimentosContext.Provider value={contextValue}>
      <AppLayout>
        <div className="space-y-4">
          <PageHeader
            title="Bens e Direitos"
            description="Gerencie seu patrimônio, consórcios e financiamentos"
            icon={<Building2 className="h-5 w-5 text-primary" />}
          >
            <VisibilityToggle />
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.bensInvestimentos} />

            {/* Trash Sheet */}
            <Sheet open={trashSheetOpen} onOpenChange={setTrashSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Trash2 className="h-4 w-4" />
                  {trashItems.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {trashItems.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Lixeira
                  </SheetTitle>
                  <SheetDescription>
                    Itens excluídos nos últimos 30 dias. Restaure ou exclua permanentemente.
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                  {trashLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : trashItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>A lixeira está vazia</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trashItems.map((item) => {
                        const daysLeft = getDaysUntilExpiration(item.expires_at);
                        return (
                          <Card key={item.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {assetIcons[item.asset_type as AssetType] || <Package className="h-4 w-4" />}
                                  <span className="font-medium truncate">
                                    {item.asset_data.name || 'Item sem nome'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}</span>
                                </div>
                                {item.linked_data && item.linked_data.length > 0 && (
                                  <div className="text-xs text-amber-600 mt-1">
                                    + {item.linked_data.length} registro(s) vinculado(s)
                                  </div>
                                )}
                                <div className="text-sm font-medium mt-1">
                                  {formatCurrency(item.asset_data.value || 0)}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleRestoreFromTrash(item.id)} className="gap-1">
                                  <RotateCcw className="h-3 w-3" />
                                  Restaurar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive" className="gap-1">
                                      <Trash2 className="h-3 w-3" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O item será removido permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => permanentlyDelete(item.id)}>
                                        Excluir permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                      {trashItems.length > 0 && (
                        <Button variant="destructive" className="w-full mt-4" onClick={emptyTrash}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Esvaziar Lixeira
                        </Button>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Audit Log Sheet */}
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Exclusões
                  </SheetTitle>
                  <SheetDescription>
                    Registro completo de todas as exclusões de bens
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma exclusão registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <Card key={log.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {assetIcons[log.entity_type as AssetType] || <Package className="h-4 w-4" />}
                                <span className="font-medium truncate">{log.entity_name}</span>
                                <Badge variant={log.action === 'force_delete' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {log.action === 'force_delete' ? 'Forçado' : 'Normal'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                              {log.linked_records_deleted > 0 && (
                                <div className="text-xs text-amber-600 mt-1">
                                  {log.linked_records_deleted} registro(s) vinculado(s) também excluído(s)
                                </div>
                              )}
                              {log.details?.value && (
                                <div className="text-sm font-medium mt-1">
                                  {formatCurrency(log.details.value)}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </PageHeader>

          {patrimonioError && (
            <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{patrimonioError}</p>
            </Card>
          )}
          {netWorth != null && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-[100px]">
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Ativos</p>
                    <p className="text-sm font-semibold text-green-600 truncate">{formatCurrency(netWorth.total_assets)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Car className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Veículos</p>
                    <p className="text-sm font-semibold truncate">{formatCurrency(netWorth.total_vehicles)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <MinusCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Dívidas</p>
                    <p className="text-sm font-semibold text-red-600 truncate">{formatCurrency(netWorth.total_debt)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Patrimônio Líquido</p>
                    <p className="text-sm font-semibold text-green-600 truncate">{formatCurrency(netWorth.total_assets + netWorth.total_vehicles - netWorth.total_debt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <AddAssetDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            editingAsset={editingAsset}
            defaultType={defaultAssetType}
          />

          <PageHeader
            title="Bens e Direitos"
            description="Gerencie seu patrimônio, consórcios e financiamentos"
            icon={<Building2 className="h-5 w-5 text-primary" />}
          >
            <VisibilityToggle />
            <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.bensInvestimentos} />

            {/* Trash Sheet */}
            <Sheet open={trashSheetOpen} onOpenChange={setTrashSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Trash2 className="h-4 w-4" />
                  {trashItems.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {trashItems.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Lixeira
                  </SheetTitle>
                  <SheetDescription>
                    Itens excluídos nos últimos 30 dias. Restaure ou exclua permanentemente.
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                  {trashLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : trashItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>A lixeira está vazia</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trashItems.map((item) => {
                        const daysLeft = getDaysUntilExpiration(item.expires_at);
                        return (
                          <Card key={item.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {assetIcons[item.asset_type as AssetType] || <Package className="h-4 w-4" />}
                                  <span className="font-medium truncate">
                                    {item.asset_data.name || 'Item sem nome'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}</span>
                                </div>
                                {item.linked_data && item.linked_data.length > 0 && (
                                  <div className="text-xs text-amber-600 mt-1">
                                    + {item.linked_data.length} registro(s) vinculado(s)
                                  </div>
                                )}
                                <div className="text-sm font-medium mt-1">
                                  {formatCurrency(item.asset_data.value || 0)}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleRestoreFromTrash(item.id)} className="gap-1">
                                  <RotateCcw className="h-3 w-3" />
                                  Restaurar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive" className="gap-1">
                                      <Trash2 className="h-3 w-3" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O item será removido permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => permanentlyDelete(item.id)}>
                                        Excluir permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                      {trashItems.length > 0 && (
                        <Button variant="destructive" className="w-full mt-4" onClick={emptyTrash}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Esvaziar Lixeira
                        </Button>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Audit Log Sheet */}
            <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Exclusões
                  </SheetTitle>
                  <SheetDescription>
                    Registro completo de todas as exclusões de bens
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma exclusão registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <Card key={log.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {assetIcons[log.entity_type as AssetType] || <Package className="h-4 w-4" />}
                                <span className="font-medium truncate">{log.entity_name}</span>
                                <Badge variant={log.action === 'force_delete' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {log.action === 'force_delete' ? 'Forçado' : 'Normal'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                              {log.linked_records_deleted > 0 && (
                                <div className="text-xs text-amber-600 mt-1">
                                  {log.linked_records_deleted} registro(s) vinculado(s) também excluído(s)
                                </div>
                              )}
                              {log.details?.value && (
                                <div className="text-sm font-medium mt-1">
                                  {formatCurrency(log.details.value)}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </PageHeader>

          {/* Tab Navigation — 6 abas com conteúdo da RPC */}
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto flex-wrap">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xs:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="imoveis" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <Home className="h-3.5 w-3.5 shrink-0" />
                <span>Imóveis</span>
              </TabsTrigger>
              <TabsTrigger value="investimentos" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span>Investimentos</span>
              </TabsTrigger>
              <TabsTrigger value="financiamentos" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <Landmark className="h-3.5 w-3.5 shrink-0" />
                <span>Financiamentos</span>
              </TabsTrigger>
              <TabsTrigger value="seguros" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Seguros</span>
              </TabsTrigger>
              <TabsTrigger value="metas" className="flex items-center gap-1.5 text-[10px] sm:text-sm px-2 sm:px-3 py-2">
                <TargetIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Metas</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {currentTab === 'overview' && (
                <div className="space-y-4">
                  {imoveis.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2"><Home className="h-4 w-4" /> Imóveis</h3>
                        <Button variant="ghost" size="sm" className="text-primary h-auto py-1 gap-1" onClick={() => setCurrentTab('imoveis')}>Ver todos <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {imoveis.slice(0, 4).map((a: { name?: string; current_value?: number }, i: number) => (
                          <li key={i} className="flex justify-between gap-2"><span className="truncate">{a.name ?? '—'}</span><span className="font-medium shrink-0">{formatCurrency(a.current_value ?? 0)}</span></li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {investimentosList.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Investimentos</h3>
                        <Button variant="ghost" size="sm" className="text-primary h-auto py-1 gap-1" onClick={() => setCurrentTab('investimentos')}>Ver todos <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {investimentosList.slice(0, 4).map((a: { name?: string; current_value?: number }, i: number) => (
                          <li key={i} className="flex justify-between gap-2"><span className="truncate">{a.name ?? '—'}</span><span className="font-medium shrink-0">{formatCurrency(a.current_value ?? 0)}</span></li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {(financiamentosList.length > 0 || consorciosList.length > 0) && (
                    <Card className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4" /> Financiamentos</h3>
                        <Button variant="ghost" size="sm" className="text-primary h-auto py-1 gap-1" onClick={() => setCurrentTab('financiamentos')}>Ver todos <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {financiamentosList.slice(0, 3).map((f: { nome?: string; saldo_devedor?: number; progress_pct?: number }, i: number) => (
                          <li key={i} className="flex justify-between gap-2"><span className="truncate">{f.nome ?? '—'}</span><span className="shrink-0">{formatCurrency(f.saldo_devedor ?? 0)} · {(f.progress_pct ?? 0)}%</span></li>
                        ))}
                        {consorciosList.slice(0, 2).map((c: { nome?: string }, i: number) => (
                          <li key={`c-${i}`} className="flex justify-between gap-2"><span className="truncate">{c.nome ?? '—'}</span></li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {segurosList.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Seguros</h3>
                        <Button variant="ghost" size="sm" className="text-primary h-auto py-1 gap-1" onClick={() => setCurrentTab('seguros')}>Ver todos <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{segurosList.filter((s: { is_active?: boolean }) => s.is_active).length} ativos · {segurosList.filter((s: { is_active?: boolean }) => !s.is_active).length} vencidos</p>
                    </Card>
                  )}
                  {goalsList.length > 0 && (
                    <Card className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold flex items-center gap-2"><TargetIcon className="h-4 w-4" /> Metas</h3>
                        <Button variant="ghost" size="sm" className="text-primary h-auto py-1 gap-1" onClick={() => setCurrentTab('metas')}>Ver todos <ChevronRight className="h-3 w-3" /></Button>
                      </div>
                      <div className="space-y-2">
                        {goalsList.slice(0, 4).map((g: { name?: string; pct?: number }, i: number) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-0.5"><span className="truncate">{g.name}</span><span>{g.pct ?? 0}%</span></div>
                            <Progress value={g.pct ?? 0} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {imoveis.length === 0 && investimentosList.length === 0 && financiamentosList.length === 0 && consorciosList.length === 0 && segurosList.length === 0 && goalsList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de patrimônio no momento.</p>
                  )}
                </div>
              )}

              {currentTab === 'imoveis' && (
                <div className="space-y-4">
                  {imoveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum imóvel cadastrado.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {imoveis.map((a: { name?: string; current_value?: number; purchase_value?: number; appreciation_pct?: number; is_rental?: boolean; rental_value?: number; monthly_cost?: number }, i: number) => {
                        const roi = a.is_rental && (a.rental_value ?? 0) > 0 && (a.current_value ?? 0) > 0
                          ? ((a.rental_value! * 12) / a.current_value! * 100).toFixed(1)
                          : null;
                        return (
                          <Card key={i} className="rounded-[14px] border border-border/80 overflow-hidden">
                            <CardContent className="p-4">
                              <p className="font-bold truncate">{a.name ?? '—'}</p>
                              <p className="mt-2 text-lg font-semibold text-primary">{formatCurrency(a.current_value ?? 0)}</p>
                              {a.purchase_value != null && <p className="text-xs text-muted-foreground">Compra: {formatCurrency(a.purchase_value)}</p>}
                              {a.appreciation_pct != null && <Badge className="mt-1 bg-green-600 text-xs">+{a.appreciation_pct}% valorização</Badge>}
                              {a.is_rental && a.rental_value != null && <p className="mt-2 text-sm text-green-600">Renda: {formatCurrency(a.rental_value)}/mês</p>}
                              {(a.monthly_cost ?? 0) > 0 && <p className="text-sm text-muted-foreground">Custo: {formatCurrency(a.monthly_cost!)}/mês</p>}
                              {roi != null && <p className="text-xs text-muted-foreground mt-1">ROI: {roi}% a.a.</p>}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {currentTab === 'investimentos' && (
                <div className="space-y-4">
                  {investimentosList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum investimento cadastrado.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {investimentosList.map((a: { name?: string; current_value?: number; purchase_value?: number; appreciation_pct?: number }, i: number) => (
                        <Card key={i} className="rounded-[14px] border border-border/80 overflow-hidden">
                          <CardContent className="p-4">
                            <p className="font-bold truncate">{a.name ?? '—'}</p>
                            <p className="mt-2 text-lg font-semibold text-primary">{formatCurrency(a.current_value ?? 0)}</p>
                            {a.purchase_value != null && <p className="text-xs text-muted-foreground">Compra: {formatCurrency(a.purchase_value)}</p>}
                            {a.appreciation_pct != null && <Badge className="mt-1 bg-green-600 text-xs">+{a.appreciation_pct}%</Badge>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentTab === 'financiamentos' && (
                <div className="space-y-4">
                  {financiamentosList.map((fin: { nome?: string; instituicao?: string; saldo_devedor?: number; valor_parcela?: number; parcelas_pagas?: number; prazo_total?: number; progress_pct?: number; taxa_juros?: number }, i: number) => (
                    <Card key={i} className="rounded-[14px] border border-border/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">{fin.nome ?? '—'}</p>
                        {fin.instituicao && <Badge variant="outline" className="text-xs">{fin.instituicao}</Badge>}
                      </div>
                      <p className="mt-2 font-semibold">Saldo devedor: {formatCurrency(fin.saldo_devedor ?? 0)}</p>
                      <p className="text-sm text-muted-foreground">Parcela: {formatCurrency(fin.valor_parcela ?? 0)}/mês</p>
                      {fin.taxa_juros != null && <p className="text-xs text-muted-foreground">Taxa: {fin.taxa_juros}% a.m.</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={fin.progress_pct ?? 0} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">{fin.parcelas_pagas ?? 0} de {fin.prazo_total ?? 0} parcelas ({(fin.progress_pct ?? 0)}%)</span>
                      </div>
                    </Card>
                  ))}
                  {consorciosList.map((c: { nome?: string; administradora?: string; valor_carta?: number; valor_parcela?: number; parcelas_pagas?: number; prazo_total?: number; contemplado?: boolean; grupo?: number; cota?: number }, i: number) => (
                    <Card key={`c-${i}`} className="rounded-[14px] border border-border/80 p-4 bg-muted/20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">{c.nome ?? '—'}</p>
                        <Badge variant={c.contemplado ? 'default' : 'secondary'} className={cn('text-xs', c.contemplado && 'bg-green-600')}>{c.contemplado ? 'Contemplado' : 'Não contemplado'}</Badge>
                      </div>
                      {c.administradora && <p className="text-xs text-muted-foreground mt-1">Administradora: {c.administradora}</p>}
                      <p className="mt-2 font-semibold">Carta: {formatCurrency(c.valor_carta ?? 0)}</p>
                      <p className="text-sm text-muted-foreground">Parcela: {formatCurrency(c.valor_parcela ?? 0)}/mês</p>
                      <p className="text-xs text-muted-foreground">{c.parcelas_pagas ?? 0} de {c.prazo_total ?? 0} · {c.grupo != null && c.cota != null && `Grupo ${c.grupo} Cota ${c.cota}`}</p>
                    </Card>
                  ))}
                  {financiamentosList.length === 0 && consorciosList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum financiamento ou consórcio.</p>
                  )}
                </div>
              )}

              {currentTab === 'seguros' && (
                <div className="space-y-4">
                  {segurosList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum seguro cadastrado.</p>
                  ) : (
                    segurosList.map((seg: { nome?: string; tipo?: string; seguradora?: string; premio_mensal?: number; valor_cobertura?: number; franquia?: number; data_inicio?: string; data_fim?: string; is_active?: boolean }, i: number) => (
                      <Card key={i} className={cn('rounded-[14px] border p-4', !seg.is_active && 'border-destructive/30 bg-destructive/5')}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">{seg.nome ?? '—'}</p>
                          <Badge variant="secondary" className="text-xs">{seg.tipo ?? '—'}</Badge>
                          <Badge variant={seg.is_active ? 'default' : 'destructive'} className={cn('text-xs', seg.is_active && 'bg-green-600')}>{seg.is_active ? 'Ativo' : 'VENCIDO'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{seg.seguradora}</p>
                        <p className="text-sm mt-1">Prêmio: {formatCurrency(seg.premio_mensal ?? 0)}/mês · Cobertura: {formatCurrency(seg.valor_cobertura ?? 0)}</p>
                        {seg.franquia != null && <p className="text-xs text-muted-foreground">Franquia: {formatCurrency(seg.franquia)}</p>}
                        {seg.data_inicio && seg.data_fim && <p className="text-xs text-muted-foreground">Vigência: {format(new Date(seg.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(seg.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</p>}
                        {!seg.is_active && <div className="mt-2 py-2 px-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-medium">Renovar seguro</div>}
                      </Card>
                    ))
                  )}
                </div>
              )}

              {currentTab === 'metas' && (
                <div className="space-y-4">
                  {goalsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma meta cadastrada.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {goalsList.map((g: { name?: string; icon?: string; target?: number; current?: number; pct?: number; deadline?: string }, i: number) => {
                        const pct = g.pct ?? 0;
                        const barColor = pct > 50 ? 'bg-green-600' : pct > 25 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500';
                        const deadlineStr = g.deadline ? format(new Date(g.deadline), 'dd/MM/yyyy', { locale: ptBR }) : null;
                        const now = new Date();
                        const dead = g.deadline ? new Date(g.deadline) : null;
                        const monthsLeft = dead ? Math.max(0, (dead.getFullYear() - now.getFullYear()) * 12 + (dead.getMonth() - now.getMonth())) : null;
                        return (
                          <Card key={i} className="rounded-[14px] border border-border/80 overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                {g.icon && <span className="text-xl">{g.icon}</span>}
                                <p className="font-bold">{g.name ?? '—'}</p>
                              </div>
                              <Progress value={Math.min(100, pct)} className={cn('mt-3 h-3', barColor)} />
                              <p className="mt-2 text-sm font-medium">{formatCurrency(g.current ?? 0)} de {formatCurrency(g.target ?? 0)} · {pct}%</p>
                              {deadlineStr && <p className="text-xs text-muted-foreground mt-1">Prazo: {deadlineStr}{monthsLeft != null && ` · Faltam ${monthsLeft} meses`}</p>}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {/* Confirmation Dialog for Asset Deletion */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) {
            setAssetToDelete(null);
            setAssetDependencies(null);
          }
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {assetDependencies?.hasDependencies ? (
                  <>
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Exclusão não permitida
                  </>
                ) : (
                  'Confirmar exclusão'
                )}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  {assetDependencies?.hasDependencies ? (
                    <>
                      <p>
                        O item <strong>"{assetDependencies.assetName}"</strong> possui registros vinculados e não pode ser excluído diretamente.
                      </p>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium text-foreground">Dependências encontradas:</p>
                        <ul className="text-sm space-y-1">
                          {assetDependencies.vehicleRecords > 0 && (
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {assetDependencies.vehicleRecords} registro(s) de veículo na Gestão de Veículos
                            </li>
                          )}
                          {assetDependencies.linkedExpenses > 0 && (
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {assetDependencies.linkedExpenses} despesa(s) vinculada(s) ao planejamento
                            </li>
                          )}
                          {assetDependencies.linkedIncome && (
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Receita de aluguel vinculada
                            </li>
                          )}
                          {assetDependencies.monthlyEntries > 0 && (
                            <li className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {assetDependencies.monthlyEntries} lançamento(s) mensal(is)
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary mb-2">💡 Recomendação</p>
                        <p className="text-sm text-muted-foreground">
                          {assetDependencies.assetType === 'vehicle' ? (
                            <>Em vez de excluir, considere <strong>marcar o veículo como vendido</strong>. Isso preserva todo o histórico de registros e permite análises futuras de custo total de propriedade.</>
                          ) : assetDependencies.assetType === 'property' ? (
                            <>Em vez de excluir, considere <strong>marcar o imóvel como vendido</strong>. Isso mantém o histórico de receitas e despesas para fins de análise patrimonial.</>
                          ) : (
                            <>Para manter a integridade dos dados, primeiro remova ou desvincule todos os registros associados, ou considere <strong>inativar</strong> este item em vez de excluí-lo.</>
                          )}
                        </p>
                      </div>
                      <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-destructive">Exclusão Forçada</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ao forçar a exclusão, todos os dados vinculados (contas a pagar/receber, receitas de aluguel) serão <strong>permanentemente excluídos</strong>. Isso pode afetar seu planejamento financeiro.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="force-delete"
                            checked={forceDeleteConfirmed}
                            onCheckedChange={(checked) => setForceDeleteConfirmed(checked === true)}
                          />
                          <label htmlFor="force-delete" className="text-sm text-muted-foreground cursor-pointer select-none">
                            Estou ciente e quero forçar a exclusão
                          </label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              {assetDependencies?.hasDependencies ? (
                <>
                  <AlertDialogCancel className="sm:flex-1">Fechar</AlertDialogCancel>
                  <Button onClick={handleEditAssetFromDialog} variant="outline" className="sm:flex-1 gap-2">
                    <Pencil className="h-4 w-4" />
                    {assetDependencies.assetType === 'vehicle' || assetDependencies.assetType === 'property'
                      ? 'Marcar como Vendido'
                      : 'Editar Item'}
                  </Button>
                  <Button onClick={confirmForceDeleteAsset} disabled={!forceDeleteConfirmed} variant="destructive" className="sm:flex-1 gap-2">
                    <Trash2 className="h-4 w-4" />
                    Excluir Mesmo Assim
                  </Button>
                </>
              ) : (
                <>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteAsset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Seguro Dialog */}
        <SeguroDialog
          open={seguroDialogOpen}
          onOpenChange={setSeguroDialogOpen}
          preSelectedAssetId={seguroAssetId}
        />
      </AppLayout>
    </BensInvestimentosContext.Provider>
  );
};

export default BensInvestimentosLayout;
