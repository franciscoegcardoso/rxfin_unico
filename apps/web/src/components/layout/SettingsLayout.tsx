import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { PageTransition } from './PageTransition';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserCog, Settings, Landmark, Crown, Receipt, Tag, Scale, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackLink } from '@/components/shared/BackLink';
import { SecureConnectionBadge } from '@/components/shared/SecureConnectionBadge';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsMenuItems = [
  { icon: UserCog, label: 'Minha Conta', path: '/minha-conta' },
  { icon: Settings, label: 'Parâmetros', path: '/parametros' },
  { icon: Landmark, label: 'Instituições Financeiras', path: '/instituicoes-financeiras' },
  { icon: Scale, label: 'Configurações Fiscais', path: '/configuracoes-fiscais' },
  { icon: Wallet, label: 'Financeiro', path: '/financeiro/planos' },
];

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // On mobile, use the regular layout with bottom nav
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background w-full max-w-full overflow-x-hidden flex flex-col">
        <TopNavbar />
        <main className="w-full max-w-full px-4 py-6 overflow-x-hidden flex-1 pt-16 pb-20">
          <BackLink to="/configuracoes-hub" label="Configurações" className="mb-4" />
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <div className="flex pt-14">
        {/* Settings Sidebar */}
        <aside className="w-56 border-r bg-muted/30 min-h-[calc(100vh-3.5rem)] p-4 shrink-0 flex flex-col">
          <div className="mb-3 px-3">
            <h2 className="text-sm font-semibold text-foreground">Configurações</h2>
          </div>
          <nav className="space-y-0.5">
            {settingsMenuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path.startsWith('/financeiro') && location.pathname.startsWith('/financeiro'));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto pt-6 px-3">
            <SecureConnectionBadge />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-full xl:max-w-[95%] 2xl:max-w-[1800px]">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
};
