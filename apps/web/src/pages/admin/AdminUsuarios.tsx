import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { UsersTab } from '@/components/admin/UsersTab';
import { AdminInviteUsersTab } from '@/components/admin/AdminInviteUsersTab';
import { SubscriptionEventsTab } from '@/components/admin/SubscriptionEventsTab';
import { Users, UserPlus, CreditCard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';

const USER_SUB_TABS = [
  { id: 'lista', label: 'Lista de Usuários', icon: Users },
  { id: 'cadastro', label: 'Cadastrar Usuários', icon: UserPlus },
  { id: 'assinaturas', label: 'Histórico Guru', icon: CreditCard },
] as const;

export default function AdminUsuarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('subtab') || 'lista';

  const handleSubTabChange = (value: string) => {
    if (value === 'lista') {
      setSearchParams({});
    } else {
      setSearchParams({ subtab: value });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Usuários" description="Gerencie usuários da plataforma" />
      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <TabsList>
          {USER_SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="text-sm px-4">
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
    </div>
  );
}
