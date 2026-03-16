import { useLocation, Link } from 'react-router-dom';
import { Home, Receipt, Calendar, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { QuickActionsSheet } from '@/components/mobile/QuickActionsSheet';
import { MoreMenuSheet } from '@/components/mobile/MoreMenuSheet';

const LEFT_TABS = [
  { label: 'Início', icon: Home, path: '/inicio' },
  { label: 'Movimentações', icon: Receipt, path: '/movimentacoes' },
];

const RIGHT_TABS = [
  { label: 'Planejamento', icon: Calendar, path: '/planejamento' },
];

function NavTab({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
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
    </Link>
  );
}

export function BottomNavigation() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16 px-2">
          {/* Esquerda: Início, Lançamentos */}
          {LEFT_TABS.map((tab) => (
            <NavTab
              key={tab.path}
              to={tab.path}
              icon={tab.icon}
              label={tab.label}
              isActive={isActive(tab.path)}
            />
          ))}

          {/* Centro: FAB (+) — atalho rápido */}
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

          {/* Direita: Planejamento, Mais */}
          {RIGHT_TABS.map((tab) => (
            <NavTab
              key={tab.path}
              to={tab.path}
              icon={tab.icon}
              label={tab.label}
              isActive={isActive(tab.path)}
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
