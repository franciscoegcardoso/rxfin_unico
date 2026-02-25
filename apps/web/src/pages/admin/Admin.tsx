import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, FileText, ShieldCheck, CreditCard, Crown, Mail, Scale, HeartPulse, Rocket, Bell, UserPlus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UsersTab } from '@/components/admin/UsersTab';
import { AdminInviteUsersTab } from '@/components/admin/AdminInviteUsersTab';
import { PagesTab } from '@/components/admin/PagesTab';
import { PlansTab } from '@/components/admin/PlansTab';
import { SubscriptionEventsTab } from '@/components/admin/SubscriptionEventsTab';
import { EmailCampaignsTab } from '@/components/admin/EmailCampaignsTab';
import { LegalDocumentsTab } from '@/components/admin/LegalDocumentsTab';
import HealthCheck from '@/pages/admin/HealthCheck';
import { DeployTab } from '@/components/admin/DeployTab';
import { NotificationsTab } from '@/components/admin/NotificationsTab';
import { RollbacksTab } from '@/components/admin/RollbacksTab';
import { AdminPendingChangesProvider, useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { AdminPendingChangesBar } from '@/components/admin/AdminPendingChangesBar';
import { AdminSaveConfirmDialog } from '@/components/admin/AdminSaveConfirmDialog';
import { AdminNavigationGuard } from '@/components/admin/AdminNavigationGuard';

const ADMIN_TABS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'paginas', label: 'Páginas', icon: FileText },
  { id: 'emails', label: 'E-mails', icon: Mail },
  { id: 'legal', label: 'Termos', icon: Scale },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'rollbacks', label: 'Rollbacks', icon: RotateCcw },
  { id: 'health', label: 'Health Check', icon: HeartPulse },
] as const;

const USER_SUB_TABS = [
  { id: 'lista', label: 'Lista de Usuários', icon: Users },
  { id: 'cadastro', label: 'Cadastrar Usuários', icon: UserPlus },
  { id: 'assinaturas', label: 'Histórico Guru', icon: CreditCard },
] as const;

type AdminTab = typeof ADMIN_TABS[number]['id'];
type UserSubTab = typeof USER_SUB_TABS[number]['id'];

export default function Admin() {
  return (
    <AdminPendingChangesProvider>
      <AdminContent />
    </AdminPendingChangesProvider>
  );
}

function AdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasChanges } = useAdminPendingChanges();
  
  const tabParam = searchParams.get('tab');
  const subTabParam = searchParams.get('subtab');
  const validTabs = ADMIN_TABS.map(t => t.id);
  const normalizedTab = tabParam === 'simuladores' ? 'paginas' : tabParam;
  const initialTab = validTabs.includes(normalizedTab as AdminTab) ? normalizedTab as AdminTab : 'usuarios';
  const initialSubTab: UserSubTab = subTabParam === 'assinaturas' ? 'assinaturas' : 'lista';
  
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [userSubTab, setUserSubTab] = useState<UserSubTab>(initialSubTab);

  const handleTabChange = (value: string) => {
    if (hasChanges) {
      toast.warning('Salve ou descarte as alterações pendentes antes de trocar de aba.');
      return;
    }
    const tab = value as AdminTab;
    setActiveTab(tab);
    const newParams: Record<string, string> = { tab };
    if (tab === 'usuarios' && userSubTab !== 'lista') {
      newParams.subtab = userSubTab;
    }
    setSearchParams(newParams);
  };

  const handleUserSubTabChange = (value: string) => {
    if (hasChanges) {
      toast.warning('Salve ou descarte as alterações pendentes antes de trocar de aba.');
      return;
    }
    const subTab = value as UserSubTab;
    setUserSubTab(subTab);
    const newParams: Record<string, string> = { tab: 'usuarios' };
    if (subTab !== 'lista') {
      newParams.subtab = subTab;
    }
    setSearchParams(newParams);
  };

  return (
    <AppLayout>
      <AdminPendingChangesBar />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Administração</h1>
            <p className="text-muted-foreground">
              Gerencie usuários, páginas e configurações da plataforma
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-9">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="usuarios" className="mt-6 space-y-4">
            <Tabs value={userSubTab} onValueChange={handleUserSubTabChange}>
              <TabsList>
                {USER_SUB_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="text-sm px-4"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value="lista" className="mt-4">
                <UsersTab />
              </TabsContent>
              <TabsContent value="cadastro" className="mt-4">
                <AdminInviteUsersTab />
              </TabsContent>
              <TabsContent value="assinaturas" className="mt-4">
                <SubscriptionEventsTab />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="planos" className="mt-6"><PlansTab /></TabsContent>
          <TabsContent value="paginas" className="mt-6"><PagesTab /></TabsContent>
          <TabsContent value="emails" className="mt-6"><EmailCampaignsTab /></TabsContent>
          <TabsContent value="legal" className="mt-6"><LegalDocumentsTab /></TabsContent>
          <TabsContent value="notificacoes" className="mt-6"><NotificationsTab /></TabsContent>
          <TabsContent value="deploy" className="mt-6"><DeployTab /></TabsContent>
          <TabsContent value="rollbacks" className="mt-6"><RollbacksTab /></TabsContent>
          <TabsContent value="health" className="mt-6"><HealthCheck /></TabsContent>
        </Tabs>
      </div>

      <AdminSaveConfirmDialog />
      <AdminNavigationGuard />
    </AppLayout>
  );
}
