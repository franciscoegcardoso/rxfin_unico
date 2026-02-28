import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFinancial } from '@/contexts/FinancialContext';
import { useTour } from '@/contexts/TourContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { User, Users, Pencil, Save, X, Crown, TrendingUp, RotateCcw, HelpCircle, FileText, ChevronRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AddPersonDialog } from '@/components/shared/AddPersonDialog';
import { PersonIncomeDialog } from '@/components/shared/PersonIncomeDialog';
import { AccountTypeMigrationDialog, MigrationOption } from '@/components/shared/AccountTypeMigrationDialog';
import { SharedPerson } from '@/types/financial';
import { cn } from '@/lib/utils';
import { ActiveModulesSection } from './ActiveModulesSection';

export const WorkspaceTab: React.FC = () => {
  const { config, updateUserProfile, setAccountType, addSharedPerson, removeSharedPerson, updateSharedPerson } = useFinancial();
  const { resetTour, startTour, hasCompletedTour } = useTour();
  const { settings } = useAppSettings();
  const { registerDirty, unregisterDirty } = useAccountPendingChanges();
  const { userProfile } = config;

  // Person income dialog
  const [selectedPerson, setSelectedPerson] = useState<SharedPerson | null>(null);
  const [personIncomeDialogOpen, setPersonIncomeDialogOpen] = useState(false);

  // Edit shared person state
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonData, setEditPersonData] = useState({ name: '', email: '' });

  // Migration dialog state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);

  // Edit mode for account type
  const [isEditingAccountType, setIsEditingAccountType] = useState(false);
  const [localAccountType, setLocalAccountType] = useState(config.accountType);

  const isSharedAccountEnabled = settings?.shared_account_enabled ?? false;

  // Sync local when not editing
  useEffect(() => {
    if (!isEditingAccountType) setLocalAccountType(config.accountType);
  }, [config.accountType, isEditingAccountType]);

  const hasAccountTypeChange = isEditingAccountType && localAccountType !== config.accountType;

  const doSaveAccountType = useCallback(async () => {
    if (localAccountType === 'individual' && config.accountType === 'shared' && affectedRecordsInfo.hasAffectedRecords) {
      setMigrationDialogOpen(true);
      throw new Error('Migration needed');
    }
    setAccountType(localAccountType);
    setIsEditingAccountType(false);
  }, [localAccountType, config.accountType, setAccountType]);

  const doCancelAccountType = useCallback(() => {
    setLocalAccountType(config.accountType);
    setIsEditingAccountType(false);
  }, [config.accountType]);

  useEffect(() => {
    if (hasAccountTypeChange) {
      registerDirty('workspace', doSaveAccountType, doCancelAccountType);
    } else {
      unregisterDirty('workspace');
    }
  }, [hasAccountTypeChange, doSaveAccountType, doCancelAccountType, registerDirty, unregisterDirty]);

  // Calculate affected records when switching to individual
  const affectedRecordsInfo = useMemo(() => {
    const nonOwnerPeople = config.sharedWith.filter(p => !p.isOwner);
    const nonOwnerIds = new Set(nonOwnerPeople.map(p => p.id));
    
    const affectedIncomeItems = config.incomeItems.filter(
      item => item.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId)
    ).length;
    
    const affectedExpenseItems = config.expenseItems.filter(
      item => item.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId)
    ).length;
    
    const affectedMonthlyEntries = config.monthlyEntries.filter(entry => {
      if (entry.type === 'income') {
        const item = config.incomeItems.find(i => i.id === entry.itemId);
        return item?.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId);
      } else {
        const item = config.expenseItems.find(i => i.id === entry.itemId);
        return item?.responsiblePersonId && nonOwnerIds.has(item.responsiblePersonId);
      }
    }).length;

    return {
      affectedPeople: nonOwnerPeople,
      hasAffectedRecords: affectedIncomeItems > 0 || affectedExpenseItems > 0 || affectedMonthlyEntries > 0,
      counts: {
        incomeItems: affectedIncomeItems,
        expenseItems: affectedExpenseItems,
        monthlyEntries: affectedMonthlyEntries,
      }
    };
  }, [config.sharedWith, config.incomeItems, config.expenseItems, config.monthlyEntries]);

  const handleAccountTypeChange = (type: 'individual' | 'shared') => {
    if (!isSharedAccountEnabled || !isEditingAccountType) return;
    setLocalAccountType(type);
  };

  const handleSaveAccountType = () => {
    if (localAccountType === 'individual' && config.accountType === 'shared' && affectedRecordsInfo.hasAffectedRecords) {
      setMigrationDialogOpen(true);
      return;
    }
    setAccountType(localAccountType);
    setIsEditingAccountType(false);
    unregisterDirty('workspace');
  };

  const handleCancelAccountType = () => {
    doCancelAccountType();
    unregisterDirty('workspace');
  };

  const handleMigrationConfirm = (option: MigrationOption) => {
    const transferToOwner = option === 'transfer_to_me';
    setAccountType('individual', { transferToOwner });
    
    if (option === 'keep_history') {
      toast.success('Conta alterada para individual. Histórico mantido.');
    } else {
      toast.success('Conta alterada para individual. Registros transferidos.');
    }
  };

  const handleMigrationCancel = () => {
    toast.info('Operação cancelada');
  };

  const handleAddPerson = (name: string, email?: string, _defaultIncomeIds?: string[]) => {
    if (config.sharedWith.length < 5) {
      addSharedPerson(name, email);
    }
  };

  const inviterName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Você';

  const handleOpenPersonIncomeDialog = (person: SharedPerson) => {
    setSelectedPerson(person);
    setPersonIncomeDialogOpen(true);
  };

  const handleEditPerson = (person: SharedPerson) => {
    if (!person.isOwner) {
      setEditPersonData({ name: person.name, email: person.email || '' });
      setEditingPersonId(person.id);
    }
  };

  const handleSavePersonEdit = () => {
    if (!editPersonData.name.trim()) {
      toast.error('Informe o nome');
      return;
    }
    if (editingPersonId) {
      updateSharedPerson(editingPersonId, { 
        name: editPersonData.name.trim(), 
        email: editPersonData.email.trim() || undefined 
      });
      setEditingPersonId(null);
      toast.success('Pessoa atualizada');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Modules Section */}
      <ActiveModulesSection />

      {/* Account Type */}
      <Card className={cn(!isSharedAccountEnabled && "opacity-60")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                Gestão de Conta
                {!isSharedAccountEnabled && (
                  <Badge variant="secondary" className="text-[9px] gap-1 bg-muted-foreground/10 text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                    Em breve
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {isSharedAccountEnabled 
                  ? 'Configure o tipo de conta e gerencie pessoas compartilhadas'
                  : 'Esta funcionalidade estará disponível em breve'
                }
              </CardDescription>
            </div>
            {isSharedAccountEnabled && !isEditingAccountType && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingAccountType(true)} className="h-8 text-xs">
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleAccountTypeChange('individual')}
              disabled={!isSharedAccountEnabled || !isEditingAccountType}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 w-full",
                !isSharedAccountEnabled || !isEditingAccountType
                  ? localAccountType === 'individual' ? "border-primary bg-primary/5" : "border-border cursor-not-allowed"
                  : localAccountType === 'individual'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                localAccountType === 'individual' && isSharedAccountEnabled ? "bg-primary/20" : "bg-muted"
              )}>
                <User className={cn(
                  "h-5 w-5",
                  localAccountType === 'individual' && isSharedAccountEnabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-sm text-foreground">Individual</h3>
                <p className="text-[10px] text-muted-foreground">Contas individuais</p>
              </div>
            </button>

            <button
              onClick={() => handleAccountTypeChange('shared')}
              disabled={!isSharedAccountEnabled || !isEditingAccountType}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 w-full",
                !isSharedAccountEnabled || !isEditingAccountType
                  ? localAccountType === 'shared' ? "border-primary bg-primary/5" : "border-border cursor-not-allowed"
                  : localAccountType === 'shared'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                localAccountType === 'shared' && isSharedAccountEnabled ? "bg-primary/20" : "bg-muted"
              )}>
                <Users className={cn(
                  "h-5 w-5",
                  localAccountType === 'shared' && isSharedAccountEnabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-sm text-foreground">Compartilhado</h3>
                <p className="text-[10px] text-muted-foreground">Divido com outras pessoas</p>
              </div>
            </button>
          </div>

          {isEditingAccountType && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancelAccountType} className="flex-1 h-9">
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveAccountType} className="flex-1 h-9">
                <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
              </Button>
            </div>
          )}

          {/* Shared People Section - only show when enabled and shared */}
          {isSharedAccountEnabled && config.accountType === 'shared' && (
            <div className="mt-4 space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm text-foreground">Pessoas que compartilham</h4>
                  <p className="text-[10px] text-muted-foreground">Adicione até 5 pessoas</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {config.sharedWith.length < 5 && (
                    <AddPersonDialog onAddPerson={handleAddPerson} inviterName={inviterName} />
                  )}
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {config.sharedWith.length}/5
                  </Badge>
                </div>
              </div>

              {/* List of People */}
              {config.sharedWith.length > 0 && (
                <div className="space-y-2">
                  {config.sharedWith.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border"
                    >
                      {editingPersonId === person.id && !person.isOwner ? (
                        <>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input
                              value={editPersonData.name}
                              onChange={(e) => setEditPersonData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nome"
                              className="h-8 text-xs"
                            />
                            <Input
                              type="email"
                              value={editPersonData.email}
                              onChange={(e) => setEditPersonData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingPersonId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSavePersonEdit}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs">{person.name}</span>
                              {person.isOwner && (
                                <Badge variant="secondary" className="text-[10px] gap-1 h-5">
                                  <Crown className="h-2.5 w-2.5" />
                                  Proprietário
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {person.email && (
                                <p className="text-[10px] text-muted-foreground">{person.email}</p>
                              )}
                              {(person.incomeItemIds?.length ?? 0) > 0 && (
                                <Badge variant="outline" className="text-[10px] gap-1 h-4">
                                  <TrendingUp className="h-2.5 w-2.5" />
                                  {person.incomeItemIds?.length} receita{(person.incomeItemIds?.length ?? 0) > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPersonIncomeDialog(person)}
                              className="text-[10px] gap-1 h-7 px-2"
                            >
                              <TrendingUp className="h-3 w-3" />
                              Receitas
                            </Button>
                            {!person.isOwner && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditPerson(person)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive"
                                  onClick={() => removeSharedPerson(person.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {config.sharedWith.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">
                  Preencha seu nome na aba Perfil para aparecer aqui automaticamente
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Income Dialog */}
      <PersonIncomeDialog
        person={selectedPerson}
        open={personIncomeDialogOpen}
        onOpenChange={setPersonIncomeDialogOpen}
      />

      {/* Migration Dialog */}
      <AccountTypeMigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        affectedPeople={affectedRecordsInfo.affectedPeople}
        affectedRecordsCount={affectedRecordsInfo.counts}
        onConfirm={handleMigrationConfirm}
        onCancel={handleMigrationCancel}
      />

      {/* Tour & Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            Ajuda e Tour Guiado
          </CardTitle>
          <CardDescription className="text-xs">
            Reveja o tour guiado para conhecer as funcionalidades
          </CardDescription>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              resetTour();
              startTour();
              toast.success('Tour guiado iniciado! Navegue até a página Início para começar.');
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            {hasCompletedTour ? 'Refazer Tour Guiado' : 'Iniciar Tour Guiado'}
          </Button>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Legal
          </CardTitle>
          <CardDescription className="text-xs">
            Documentos legais e políticas
          </CardDescription>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent className="space-y-1">
          <Link 
            to="/termos-de-uso" 
            className="flex items-center justify-between p-2.5 -mx-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs font-medium text-foreground">Termos de Uso</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link 
            to="/politica-privacidade" 
            className="flex items-center justify-between p-2.5 -mx-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs font-medium text-foreground">Política de Privacidade</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link 
            to="/politica-cookies" 
            className="flex items-center justify-between p-2.5 -mx-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs font-medium text-foreground">Política de Cookies</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
