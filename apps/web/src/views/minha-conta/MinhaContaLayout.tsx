import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileHubList, HubItem } from '@/components/shared/MobileHubList';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { User, Briefcase, Shield, Crown, Settings2, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

const MENU_ITEMS = [
  { id: 'perfil', label: 'Perfil', description: 'Suas informações pessoais', icon: User },
  { id: 'workspace', label: 'Workspace', description: 'Módulos e pessoas compartilhadas', icon: Briefcase },
  { id: 'seguranca', label: 'Segurança', description: 'Senha e autenticação', icon: Shield },
  { id: 'assinatura', label: 'Assinatura', description: 'Seu plano e pagamentos', icon: Crown },
  { id: 'preferencias', label: 'Preferências', description: 'Tema e notificações', icon: Settings2 },
] as const;

type MinhaContaTab = typeof MENU_ITEMS[number]['id'];
const VALID_TABS: string[] = MENU_ITEMS.map(i => i.id);

const MinhaContaContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasChanges, clearAll } = useAccountPendingChanges();

  const isIndex = location.pathname === '/minha-conta' || location.pathname === '/minha-conta/';
  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  // Desktop: redirect index to first tab
  useEffect(() => {
    if (isIndex && !isMobile) {
      navigate('/minha-conta/perfil', { replace: true });
    }
  }, [isIndex, isMobile, navigate]);

  // Backward compat: redirect ?tab= query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) {
      navigate(`/minha-conta/${tabParam}`, { replace: true });
    }
  }, [location.search, navigate]);

  const handleTabChange = async (value: string) => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartá-las?');
      if (!confirmed) return;
      clearAll();
    }
    navigate(`/minha-conta/${value}`);
  };

  const handleBack = async () => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartá-las?');
      if (!confirmed) return;
      clearAll();
    }
    navigate('/minha-conta');
  };

  // Mobile: hub list
  if (isMobile && isIndex) {
    const hubItems: HubItem[] = MENU_ITEMS.map(item => ({
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

  // Mobile: drill-down
  if (isMobile && currentTab) {
    const currentMenuItem = MENU_ITEMS.find(i => i.id === currentTab);
    return (
      <SettingsLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 shrink-0 min-h-[44px] min-w-[44px]" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">
                {currentMenuItem?.label}
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">Minha Conta</p>
            </div>
          </div>
          <div><Outlet /></div>
        </div>
      </SettingsLayout>
    );
  }

  // Desktop: tabs layout
  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Minha Conta</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie seu perfil, workspace e preferências
          </p>
        </div>

        <Tabs value={currentTab || 'perfil'} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.id} value={item.id}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </SettingsLayout>
  );
};

const MinhaContaLayout: React.FC = () => {
  return <MinhaContaContent />;
};

export default MinhaContaLayout;
