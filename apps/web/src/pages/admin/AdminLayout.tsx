import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, FileText, Crown, Mail, Scale, HeartPulse, Rocket, Bell, ShieldCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPendingChangesProvider, useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { AdminPendingChangesBar } from '@/components/admin/AdminPendingChangesBar';
import { AdminSaveConfirmDialog } from '@/components/admin/AdminSaveConfirmDialog';
import { AdminNavigationGuard } from '@/components/admin/AdminNavigationGuard';
import { toast } from 'sonner';

const ADMIN_TABS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'paginas', label: 'Páginas', icon: FileText },
  { id: 'emails', label: 'E-mails', icon: Mail },
  { id: 'legal', label: 'Termos', icon: Scale },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'database-health', label: 'Saúde do Banco', icon: HeartPulse },
] as const;

const VALID_TABS: string[] = ADMIN_TABS.map(t => t.id);

function AdminContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasChanges } = useAdminPendingChanges();

  // Determine active tab from URL path
  const segments = location.pathname.split('/').filter(Boolean);
  // /admin/usuarios/lista → segments = ['admin', 'usuarios', 'lista']
  const tabSegment = segments[1] || '';
  const normalizedTab = tabSegment === 'simuladores' ? 'paginas' : tabSegment;
  const currentTab = VALID_TABS.includes(normalizedTab) ? normalizedTab : '';

  // Redirect index to first tab (navigate estável no RR v6; replace: true = 1 replaceState apenas)
  useEffect(() => {
    if (!currentTab && (location.pathname === '/admin' || location.pathname === '/admin/')) {
      navigate('/admin/usuarios', { replace: true });
    }
  }, [currentTab, location.pathname]);

  // Backward compat: redirect ?tab= and ?subtab= query params (deps só location.search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const subtabParam = params.get('subtab');
    if (tabParam) {
      const normalized = tabParam === 'simuladores' ? 'paginas' : tabParam;
      if (VALID_TABS.includes(normalized)) {
        if (normalized === 'usuarios' && subtabParam) {
          navigate(`/admin/usuarios/${subtabParam}`, { replace: true });
        } else {
          navigate(`/admin/${normalized}`, { replace: true });
        }
      }
    }
  }, [location.search]);

  const handleTabChange = (value: string) => {
    if (hasChanges) {
      toast.warning('Salve ou descarte as alterações pendentes antes de trocar de aba.');
      return;
    }
    navigate(`/admin/${value}`);
  };

  return (
    
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
        <Tabs value={currentTab || 'usuarios'} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-8">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>

      <AdminSaveConfirmDialog />
      <AdminNavigationGuard />
    
  );
}

export default function AdminLayout() {
  return (
    <AdminPendingChangesProvider>
      <AdminContent />
    </AdminPendingChangesProvider>
  );
}
