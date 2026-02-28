import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { useTour } from '@/contexts/TourContext';
import { User, Users, Pencil, Save, X, Crown, TrendingUp, RotateCcw, HelpCircle, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AddPersonDialog } from '@/components/shared/AddPersonDialog';
import { PersonIncomeDialog } from '@/components/shared/PersonIncomeDialog';
import { AccountTypeMigrationDialog, MigrationOption } from '@/components/shared/AccountTypeMigrationDialog';
import { SharedPerson } from '@/types/financial';
import { cn } from '@/lib/utils';
import { ActiveModulesSection } from './ActiveModulesSection';

export const AccountSettingsTab: React.FC = () => {
  const { config, updateUserProfile, setAccountType, addSharedPerson, removeSharedPerson, updateSharedPerson } = useFinancial();
  const { resetTour, startTour, hasCompletedTour } = useTour();
  const { userProfile } = config;

  // Person income dialog
  const [selectedPerson, setSelectedPerson] = useState<SharedPerson | null>(null);
  const [personIncomeDialogOpen, setPersonIncomeDialogOpen] = useState(false);

  // Edit shared person state
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonData, setEditPersonData] = useState({ name: '', email: '' });

  // Migration dialog state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);

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
    if (type === 'shared') {
      setAccountType('shared');
      return;
    }
    
    if (config.accountType === 'shared' && affectedRecordsInfo.hasAffectedRecords) {
      setMigrationDialogOpen(true);
    } else {
      setAccountType('individual');
    }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Gestão de Conta
          </CardTitle>
          <CardDescription>
            Configure o tipo de conta e gerencie pessoas compartilhadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => handleAccountTypeChange('individual')}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 w-full min-w-0",
                config.accountType === 'individual'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shrink-0",
                config.accountType === 'individual' ? "bg-primary/20" : "bg-muted"
              )}>
                <User className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  config.accountType === 'individual' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Individual</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Contas individuais</p>
              </div>
            </button>

            <button
              onClick={() => handleAccountTypeChange('shared')}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 w-full min-w-0",
                config.accountType === 'shared'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shrink-0",
                config.accountType === 'shared' ? "bg-primary/20" : "bg-muted"
              )}>
                <Users className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  config.accountType === 'shared' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Compartilhado</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Divido com outras pessoas</p>
              </div>
            </button>
          </div>

          {/* Shared People Section */}
          {config.accountType === 'shared' && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground text-sm">Pessoas que compartilham</h4>
                  <p className="text-xs text-muted-foreground">Adicione até 5 pessoas</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {config.sharedWith.length < 5 && (
                    <AddPersonDialog onAddPerson={handleAddPerson} inviterName={inviterName} />
                  )}
                  <span className="text-xs text-muted-foreground mt-1">
                    {config.sharedWith.length}/5
                  </span>
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
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              value={editPersonData.name}
                              onChange={(e) => setEditPersonData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nome"
                              className="h-8 text-sm"
                            />
                            <Input
                              type="email"
                              value={editPersonData.email}
                              onChange={(e) => setEditPersonData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingPersonId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSavePersonEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{person.name}</span>
                              {person.isOwner && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Crown className="h-3 w-3" />
                                  Proprietário
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {person.email && (
                                <p className="text-xs text-muted-foreground">{person.email}</p>
                              )}
                              {(person.incomeItemIds?.length ?? 0) > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 h-5">
                                  <TrendingUp className="h-3 w-3" />
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
                              className="text-xs gap-1.5 h-8"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              Receitas
                            </Button>
                            {!person.isOwner && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEditPerson(person)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSharedPerson(person.id)}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4" />
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
                <p className="text-xs text-muted-foreground italic">
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

      {/* Tour & Ajuda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Ajuda e Tour Guiado
          </CardTitle>
          <CardDescription>
            Reveja o tour guiado para conhecer as funcionalidades do RXFin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => {
              resetTour();
              startTour();
              toast.success('Tour guiado iniciado! Navegue até a página Início para começar.');
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {hasCompletedTour ? 'Refazer Tour Guiado' : 'Iniciar Tour Guiado'}
          </Button>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Legal
          </CardTitle>
          <CardDescription>
            Documentos legais e políticas do RXFin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <Link 
            to="/termos-de-uso" 
            className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm font-medium text-foreground">Termos de Uso</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link 
            to="/politica-privacidade" 
            className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm font-medium text-foreground">Política de Privacidade</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link 
            to="/politica-cookies" 
            className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm font-medium text-foreground">Política de Cookies</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
