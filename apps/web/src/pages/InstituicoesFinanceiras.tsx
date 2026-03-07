import React, { useState, useMemo, useCallback } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { financialInstitutions } from '@/data/defaultData';
import { UserFinancialInstitution } from '@/types/financial';
import { Building2, CreditCard, Plus, Landmark, Wallet, TrendingUp, Pencil, Database } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useBankingOverview } from '@/hooks/useBankingOverview';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OpenFinanceSection } from '@/components/openfinance/OpenFinanceSection';
import { InstitutionLogo } from '@/components/shared/InstitutionLogo';
import { InstitutionManageDialog } from '@/components/instituicoes/InstitutionManageDialog';
import { AddInstitutionFlowDialog } from '@/components/instituicoes/AddInstitutionFlowDialog';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useFinanceMode } from '@/hooks/useFinanceMode';
import { FinanceModeSelector } from '@/components/instituicoes/FinanceModeSelector';
import { FinanceModeToggle } from '@/components/instituicoes/FinanceModeToggle';
import { cn } from '@/lib/utils';

const InstituicoesFinanceiras: React.FC = () => {
  const { config, addFinancialInstitution } = useFinancial();
  const { fetchConnections, fetchAccounts, fetchTransactions } = usePluggyConnect();
  const { mode, setMode, isLoading: modeLoading, hasChosen } = useFinanceMode();
  const { data: bankingOverview, isLoading: bankingLoading } = useBankingOverview();
  const navigate = useNavigate();
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);

  const hasBankingInstitutions = (bankingOverview?.institutions?.length ?? 0) > 0;

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<UserFinancialInstitution | null>(null);

  const getInstitutionById = (id: string) => {
    return financialInstitutions.find(i => i.id === id);
  };

  const existingInstitutionIds = useMemo(() => {
    return config.financialInstitutions.map(fi => fi.institutionId);
  }, [config.financialInstitutions]);

  const handleSelectOpenFinance = useCallback(() => {
    // Trigger the PluggyConnectButton click programmatically
    // We'll use a ref approach - find the button and click it
    setTimeout(() => {
      const pluggyBtn = document.querySelector('[data-pluggy-connect-btn]') as HTMLButtonElement;
      if (pluggyBtn) pluggyBtn.click();
    }, 100);
  }, []);

  const handleAddManual = useCallback((data: {
    institutionId: string;
    customName?: string;
    customCode?: string;
    hasCheckingAccount: boolean;
    hasSavingsAccount: boolean;
    hasCreditCard: boolean;
    hasInvestments: boolean;
    creditCardBrand?: string;
    creditCardDueDay?: number | null;
    notes?: string;
  }) => {
    addFinancialInstitution({
      institutionId: data.institutionId,
      customName: data.customName,
      customCode: data.customCode,
      hasCheckingAccount: data.hasCheckingAccount,
      hasSavingsAccount: data.hasSavingsAccount,
      hasCreditCard: data.hasCreditCard,
      hasInvestments: data.hasInvestments,
      creditCardBrand: data.creditCardBrand,
      creditCardDueDay: data.creditCardDueDay,
      notes: data.notes,
    });
  }, [addFinancialInstitution]);

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Building2}
          title="Instituições Financeiras"
          subtitle="Gerencie suas contas e cartões"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {hasChosen && (
                <>
                  <FinanceModeToggle mode={mode} onChangeMode={setMode} />
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/dados-financeiros')}>
                    <Database className="h-4 w-4" />
                    Dados Financeiros
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => setFlowDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Adicionar Instituição
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Banking overview from RPC (Pluggy / Open Finance) */}
        {!bankingLoading && hasBankingInstitutions && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Instituições conectadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankingOverview!.institutions!.map((inst, i) => (
                <Card key={i} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{inst.nome ?? 'Instituição'}</CardTitle>
                        {inst.tipo && <CardDescription>{inst.tipo}</CardDescription>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {inst.saldo != null && <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(inst.saldo)}</p>}
                    {inst.ultima_sync && <p className="text-xs text-muted-foreground">Última sync: {format(new Date(inst.ultima_sync), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button className="gap-2" onClick={() => setFlowDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Conectar nova instituição
            </Button>
          </div>
        )}

        {/* Empty state when no banking data from RPC */}
        {!bankingLoading && !hasBankingInstitutions && hasChosen && mode === 'openfinance' && (
          <Card className="rounded-2xl border border-dashed border-border">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Conecte sua conta bancária para sincronizar automaticamente</p>
              <Button className="mt-4 gap-2" onClick={() => setFlowDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Conectar nova instituição
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mode Selection (first time) */}
        {!hasChosen && !modeLoading && (
          <FinanceModeSelector onSelect={setMode} />
        )}

        {/* Content based on mode */}
        {hasChosen && (
          <>
            {/* Open Finance Section - only in openfinance mode */}
            {mode === 'openfinance' && <OpenFinanceSection />}

            {/* Manual Institutions - only in manual mode */}
            {mode === 'manual' && config.financialInstitutions.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Instituições Cadastradas</h3>
                  <p className="text-xs text-muted-foreground">Instituições adicionadas por você para controle manual</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {config.financialInstitutions.map((userInst) => {
                    const institution = getInstitutionById(userInst.institutionId);
                    const isCustom = userInst.institutionId.startsWith('custom_');
                    const displayName = isCustom ? userInst.customName : institution?.name;
                    const displayCode = isCustom ? userInst.customCode : institution?.code;
                    const displayColor = isCustom ? '#6366f1' : institution?.color || '#6366f1';

                    if (!isCustom && !institution) return null;

                    return (
                      <Card key={userInst.id} className="relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: displayColor }} />
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <InstitutionLogo institutionId={userInst.institutionId} institutionName={displayName} size="md" primaryColor={displayColor} />
                              <div>
                                <CardTitle className="text-base">{displayName}</CardTitle>
                                {displayCode && <CardDescription>Cód. {displayCode}</CardDescription>}
                                {isCustom && !displayCode && <CardDescription>Adicionada manualmente</CardDescription>}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-primary" onClick={() => { setEditingInstitution(userInst); setEditDialogOpen(true); }} aria-label="Editar instituição">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {userInst.hasCheckingAccount && (
                              <Badge variant="secondary" className="text-xs"><Wallet className="h-3 w-3 mr-1" />Conta Corrente</Badge>
                            )}
                            {userInst.hasSavingsAccount && (
                              <Badge variant="secondary" className="text-xs"><Landmark className="h-3 w-3 mr-1" />Poupança</Badge>
                            )}
                            {userInst.hasCreditCard && (
                              <Badge variant="secondary" className="text-xs">
                                <CreditCard className="h-3 w-3 mr-1" />
                                {userInst.creditCardBrand || 'Cartão'}
                                {userInst.creditCardDueDay && <span className="ml-1 text-muted-foreground">• Dia {userInst.creditCardDueDay}</span>}
                              </Badge>
                            )}
                            {userInst.hasInvestments && (
                              <Badge variant="secondary" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" />Investimentos</Badge>
                            )}
                          </div>
                          {userInst.notes && <p className="text-sm text-muted-foreground">{userInst.notes}</p>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state for manual mode */}
            {mode === 'manual' && config.financialInstitutions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-0">
                  <EmptyState
                    icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
                    description="Você ainda não cadastrou nenhuma instituição"
                    actionLabel="Adicionar primeira instituição"
                    onAction={() => setFlowDialogOpen(true)}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Flow Dialog */}
        <AddInstitutionFlowDialog
          open={flowDialogOpen}
          onOpenChange={setFlowDialogOpen}
          onSelectOpenFinance={handleSelectOpenFinance}
          onAddManual={handleAddManual}
          existingInstitutionIds={existingInstitutionIds}
        />

        {/* Edit Institution Dialog */}
        <InstitutionManageDialog
          institution={editingInstitution}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </SettingsLayout>
  );
};

export default InstituicoesFinanceiras;
