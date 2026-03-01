import React from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '@/components/account/ProfileTab';
import { WorkspaceTab } from '@/components/account/WorkspaceTab';
import { SecurityTab } from '@/components/account/SecurityTab';
import { SubscriptionTab } from '@/components/account/SubscriptionTab';
import { PreferencesTab } from '@/components/account/PreferencesTab';
import { AccountOverviewTab } from '@/components/account/AccountOverviewTab';
import { MobileHubList, HubItem } from '@/components/shared/MobileHubList';
import { AccountPendingChangesProvider, useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { AccountNavigationGuard } from '@/components/account/AccountNavigationGuard';
import { User, Briefcase, Shield, Crown, Settings2, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

const menuItems = [
  { id: 'visao-geral', label: 'Visão geral', description: 'Resumo da sua conta', icon: LayoutDashboard },
  { id: 'perfil', label: 'Perfil', description: 'Suas informações pessoais', icon: User },
  { id: 'workspace', label: 'Workspace', description: 'Módulos e pessoas compartilhadas', icon: Briefcase },
  { id: 'seguranca', label: 'Segurança', description: 'Senha e autenticação', icon: Shield },
  { id: 'assinatura', label: 'Assinatura', description: 'Seu plano e pagamentos', icon: Crown },
  { id: 'preferencias', label: 'Preferências', description: 'Tema e notificações', icon: Settings2 },
];

const MinhaContaContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || '';
  const isMobile = useIsMobile();
  const { hasChanges, saveAll, clearAll, isSaving } = useAccountPendingChanges();

  const handleTabChange = async (value: string) => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartá-las?');
      if (!confirmed) return;
      clearAll();
    }
    setSearchParams({ tab: value });
  };

  const handleBack = async () => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartá-las?');
      if (!confirmed) return;
      clearAll();
    }
    setSearchParams({});
  };

  const currentMenuItem = menuItems.find(item => item.id === currentTab);

  const renderTabContent = () => {
    switch (currentTab) {
      case 'visao-geral': return <AccountOverviewTab />;
      case 'perfil': return <ProfileTab />;
      case 'workspace': return <WorkspaceTab />;
      case 'seguranca': return <SecurityTab />;
      case 'assinatura': return <SubscriptionTab />;
      case 'preferencias': return <PreferencesTab />;
      default: return <AccountOverviewTab />;
    }
  };

  // Mobile: Show menu list or content with drill-down
  if (isMobile) {
    if (currentTab && currentMenuItem) {
      return (
        <SettingsLayout>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-foreground truncate">
                  {currentMenuItem.label}
                </h1>
                <p className="text-[10px] text-muted-foreground truncate">
                  Minha Conta
                </p>
              </div>
            </div>
            <div>{renderTabContent()}</div>
          </div>
        </SettingsLayout>
      );
    }

    const hubItems: HubItem[] = menuItems.map(item => ({
      id: item.id,
      title: item.label,
      description: item.description,
      icon: item.icon,
      onClick: () => handleTabChange(item.id),
    }));

    return (
      <SettingsLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Minha Conta</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gerencie seu perfil e preferências
            </p>
          </div>
          <MobileHubList items={hubItems} />
        </div>
      </SettingsLayout>
    );
  }

  // Desktop: Traditional tabs layout
  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Minha Conta</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie seu perfil, workspace e preferências
          </p>
        </div>

        <Tabs value={currentTab || 'visao-geral'} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger 
                  key={item.id}
                  value={item.id} 
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="visao-geral" className="mt-6"><AccountOverviewTab /></TabsContent>
          <TabsContent value="perfil" className="mt-6"><ProfileTab /></TabsContent>
          <TabsContent value="workspace" className="mt-6"><WorkspaceTab /></TabsContent>
          <TabsContent value="seguranca" className="mt-6"><SecurityTab /></TabsContent>
          <TabsContent value="assinatura" className="mt-6"><SubscriptionTab /></TabsContent>
          <TabsContent value="preferencias" className="mt-6"><PreferencesTab /></TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
};

const MinhaConta: React.FC = () => {
  return (
    <AccountPendingChangesProvider>
      <AccountNavigationGuard />
      <MinhaContaContent />
    </AccountPendingChangesProvider>
  );
};

export default MinhaConta;
