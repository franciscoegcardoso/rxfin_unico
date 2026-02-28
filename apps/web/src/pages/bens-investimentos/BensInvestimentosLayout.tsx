import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Plus, Trash2, Package, Pencil, Target, AlertTriangle, RotateCcw, Clock, History, PieChart, DollarSign, TrendingUp, Landmark, Shield } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { assetIcons, formatCurrencyBase, VALID_TABS, type BensTab, type AssetDependencies } from './constants';

const BensInvestimentosLayout: React.FC = () => {
  const { config, removeAsset, addAsset, vehicleRecords } = useFinancial();
  const { isHidden } = useVisibility();
  const { deleteContasByVinculoAtivo, getContasByVinculoAtivo, addConta } = useContasPagarReceber();
  const { trashItems, auditLogs, moveToTrash, logDeletion, restoreFromTrash, permanentlyDelete, emptyTrash, getDaysUntilExpiration, loading: trashLoading } = useUserTrash();
  const { seguros } = useSeguros();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine active tab from URL path
  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || 'consolidado';
  const currentTab: BensTab = VALID_TABS.includes(pathSegment as BensTab) ? (pathSegment as BensTab) : 'consolidado';

  // Backward compatibility: redirect ?tab= query params to path-based URLs
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as BensTab)) {
      navigate(`/bens-investimentos/${tabParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Listen for navigate-tab custom events (backward compat with sub-components)
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tab = customEvent.detail;
      if (tab && VALID_TABS.includes(tab)) {
        navigate(`/bens-investimentos/${tab}`);
      }
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, [navigate]);

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

  // Default asset type based on active tab
  const defaultAssetType = currentTab === 'investimentos' ? 'investment' as const : 'property' as const;

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

  const handleTabChange = (value: string) => {
    navigate(`/bens-investimentos/${value}`);
  };

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
        <div className="space-y-6">
          {/* Add Asset Dialog */}
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

          {/* Tab Navigation */}
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="consolidado" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
                <PieChart className="h-4 w-4" />
                <span>Consolidado</span>
              </TabsTrigger>
              <TabsTrigger value="patrimonio" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
                <DollarSign className="h-4 w-4" />
                <span>Patrimônio</span>
              </TabsTrigger>
              <TabsTrigger value="investimentos" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
                <TrendingUp className="h-4 w-4" />
                <span>Investimentos</span>
              </TabsTrigger>
              <TabsTrigger value="credito" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
                <Landmark className="h-4 w-4" />
                <span>Crédito</span>
              </TabsTrigger>
              <TabsTrigger value="seguros" className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm px-1 sm:px-4">
                <Shield className="h-4 w-4" />
                <span>Seguros</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Routed Tab Content */}
          <div className="space-y-6">
            <Outlet />
          </div>
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
