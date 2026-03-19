import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Receipt, Calendar, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { QuickActionsSheet } from '@/components/mobile/QuickActionsSheet';
import { MoreMenuSheet } from '@/components/mobile/MoreMenuSheet';

const LEFT_TABS = [
  { label: 'Início', icon: Home, path: '/inicio' },
  { label: 'Movimentações', icon: Receipt, path: '/movimentacoes' },
];

const RIGHT_TABS = [
  { label: 'Planejamento', icon: Calendar, path: '/planejamento' },
];

const ALL_TAB_PATHS = [...LEFT_TABS.map((t) => t.path), ...RIGHT_TABS.map((t) => t.path)];

function NavTab({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors duration-150',
        isActive ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      {isActive && (
        <span
          className="absolute top-1 w-1 h-1 rounded-full bg-primary"
          aria-hidden
        />
      )}
      <Icon
        className={cn('h-5 w-5', isActive && 'fill-primary/20')}
        strokeWidth={isActive ? 2.5 : 1.75}
        aria-hidden
      />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    const activeTab = ALL_TAB_PATHS.find(
      (path) => location.pathname === path || location.pathname.startsWith(path + '/')
    );
    if (activeTab) {
      try {
        sessionStorage.setItem(`tab_last_${activeTab}`, location.pathname);
      } catch {}
    }
  }, [location.pathname]);

  const handleTabClick = (tabPath: string) => {
    const isCurrentTab = location.pathname === tabPath || location.pathname.startsWith(tabPath + '/');
    if (isCurrentTab) {
      navigate(tabPath);
    } else {
      try {
        const lastRoute = sessionStorage.getItem(`tab_last_${tabPath}`);
        navigate(lastRoute ?? tabPath);
      } catch {
        navigate(tabPath);
      }
    }
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16 px-2">
          {LEFT_TABS.map((tab) => (
            <NavTab
              key={tab.path}
              icon={tab.icon}
              label={tab.label}
              isActive={isActive(tab.path)}
              onClick={() => handleTabClick(tab.path)}
            />
          ))}

          <div className="flex-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setQuickActionsOpen(true)}
              className="relative flex flex-col items-center justify-center gap-0.5"
              aria-label="Ações rápidas: receita, despesa, veículo, dividir conta, RX Split"
            >
              <div className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-primary">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
            </button>
          </div>

          {RIGHT_TABS.map((tab) => (
            <NavTab
              key={tab.path}
              icon={tab.icon}
              label={tab.label}
              isActive={isActive(tab.path)}
              onClick={() => handleTabClick(tab.path)}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors duration-150 text-muted-foreground"
            aria-label="Abrir menu completo"
          >
            <List className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      <QuickActionsSheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
