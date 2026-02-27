import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, UserPlus, CreditCard, Compass } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { toast } from 'sonner';

const USER_SUB_TABS = [
  { id: 'lista', label: 'Lista de Usuários', icon: Users },
  { id: 'onboarding', label: 'Onboarding', icon: Compass },
  { id: 'cadastro', label: 'Cadastrar Usuários', icon: UserPlus },
  { id: 'assinaturas', label: 'Histórico Guru', icon: CreditCard },
] as const;

const VALID_SUB_TABS: string[] = USER_SUB_TABS.map(t => t.id);

const AdminUsuariosLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasChanges } = useAdminPendingChanges();

  const segments = location.pathname.split('/').filter(Boolean);
  // /admin/usuarios/lista → segments = ['admin', 'usuarios', 'lista']
  const subTabSegment = segments[2] || '';
  const currentSubTab = VALID_SUB_TABS.includes(subTabSegment) ? subTabSegment : '';

  // Redirect index to first sub-tab
  useEffect(() => {
    if (!currentSubTab) {
      navigate('/admin/usuarios/lista', { replace: true });
    }
  }, [currentSubTab, navigate]);

  const handleSubTabChange = (value: string) => {
    if (hasChanges) {
      toast.warning('Salve ou descarte as alterações pendentes antes de trocar de aba.');
      return;
    }
    navigate(`/admin/usuarios/${value}`);
  };

  return (
    <div className="space-y-4">
      <Tabs value={currentSubTab || 'lista'} onValueChange={handleSubTabChange}>
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
      </Tabs>

      <Outlet />
    </div>
  );
};

export default AdminUsuariosLayout;
