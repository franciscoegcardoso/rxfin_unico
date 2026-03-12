import React from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { ProfileTab } from '@/components/account/ProfileTab';
import { WorkspaceTab } from '@/components/account/WorkspaceTab';
import { SecurityTab } from '@/components/account/SecurityTab';
import { SubscriptionTab } from '@/components/account/SubscriptionTab';
import PreferenciasTab from '@/pages/minha-conta/PreferenciasTab';
import { MobileHubList, HubItem } from '@/components/shared/MobileHubList';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { User, Briefcase, Shield, Crown, Settings2, ArrowLeft, UserCog } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';

const menuItems = [
  { id: 'perfil', label: 'Perfil', description: 'Suas informações pessoais', icon: User },
  { id: 'workspace', label: 'Workspace', description: 'Módulos e pessoas compartilhadas', icon: Briefcase },
  { id: 'seguranca', label: 'Segurança', description: 'Senha e autenticação', icon: Shield },
  { id: 'assinatura', label: 'Assinatura', description: 'Seu plano e pagamentos', icon: Crown },
  { id: 'preferencias', label: 'Preferências', description: 'Tema e notificações', icon: Settings2 },
];

const MINHA_CONTA_PATH = '/minha-conta';

const MinhaContaContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { hasChanges, clearAll } = useAccountPendingChanges();
  const clearAllRef = React.useRef(clearAll);
  React.useLayoutEffect(() => {
    clearAllRef.current = clearAll;
  }, [clearAll]);

  // Aba atual: sempre derivada da URL (location.search) para não dessincronizar
  const currentTab = React.useMemo(
    () => new URLSearchParams(location.search).get('tab') || '',
    [location.search]
  );
  const tabValue = currentTab || 'perfil';

  // Garantir que a URL tenha ?tab= ao estar em /minha-conta
  React.useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    if (pathname !== MINHA_CONTA_PATH) return;
    const tab = new URLSearchParams(location.search).get('tab');
    if (!tab || tab.trim() === '') {
      setSearchParams({ tab: 'perfil' }, { replace: true });
    }
  }, [location.pathname, setSearchParams]);

  // Ao entrar na rota /minha-conta (primeira vez ou vindo de outra página), limpa estado dirty
  // para não travar navegação.
  const prevPathnameRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const isMinhaConta = pathname === MINHA_CONTA_PATH;
    const justEnteredMinhaConta =
      isMinhaConta && (prevPathnameRef.current === null || prevPathnameRef.current !== pathname);
    if (justEnteredMinhaConta) {
      clearAllRef.current();
    }
    prevPathnameRef.current = pathname;
  }, [location.pathname]);

  // Ao mudar de aba pela URL, limpa dirty da aba anterior para não bloquear navegação.
  const prevTabRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (prevTabRef.current !== null && prevTabRef.current !== tabValue) {
      clearAllRef.current();
    }
    prevTabRef.current = tabValue;
  }, [tabValue]);

  // Troca de aba: sempre permitir (limpar dirty e navegar). Evita usuário preso na aba Perfil.
  const handleTabChange = (value: string) => {
    clearAll();
    setSearchParams({ tab: value }, { replace: true });
  };

  const handleBack = () => {
    clearAll();
    setSearchParams({});
  };

  const currentMenuItem = menuItems.find(item => item.id === tabValue);

  const renderTabContent = () => {
    switch (tabValue) {
      case 'perfil': return <ProfileTab />;
      case 'workspace': return <WorkspaceTab />;
      case 'seguranca': return <SecurityTab />;
      case 'assinatura': return <SubscriptionTab />;
      case 'preferencias': return <PreferenciasTab />;
      default: return <ProfileTab />;
    }
  };

  // Mobile: Show menu list or content with drill-down (drill-down quando há tab na URL)
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

  // Desktop: abas como Links (navegação real) para garantir troca perfil ↔ workspace
  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader
          icon={UserCog}
          title="Minha Conta"
          subtitle="Gerencie seu perfil, workspace e preferências"
          showBackButton={false}
        />

        <div className="space-y-6">
          <nav
            className="inline-flex w-full items-center h-auto p-0 bg-transparent border-b border-border gap-0"
            aria-label="Abas Minha Conta"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = tabValue === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-normal transition-all duration-150",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    "border-b-2 -mb-px rounded-none",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "border-primary text-foreground font-semibold bg-transparent"
                      : "border-transparent"
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {tabValue === 'perfil' && <div className="mt-6"><ProfileTab /></div>}
          {tabValue === 'workspace' && <div className="mt-6"><WorkspaceTab /></div>}
          {tabValue === 'seguranca' && <div className="mt-6"><SecurityTab /></div>}
          {tabValue === 'assinatura' && <div className="mt-6"><SubscriptionTab /></div>}
          {tabValue === 'preferencias' && <div className="mt-6"><PreferenciasTab /></div>}
          {!menuItems.some(m => m.id === tabValue) && <div className="mt-6"><ProfileTab /></div>}
        </div>
      </div>
    </SettingsLayout>
  );
};

const MinhaConta: React.FC = () => {
  return <MinhaContaContent />;
};

export default MinhaConta;
