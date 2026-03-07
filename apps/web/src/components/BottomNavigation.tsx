import { useLocation, Link } from 'react-router-dom';
import { Home, Receipt, Calendar, Grid3x3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuickActionsSheet } from '@/components/mobile/QuickActionsSheet';

const LEFT_TABS = [
  { label: 'Início', icon: Home, path: '/inicio' },
  { label: 'Lançamentos', icon: Receipt, path: '/lancamentos' },
];

const RIGHT_TABS = [
  { label: 'Planejamento', icon: Calendar, path: '/planejamento' },
];

const MORE_ITEMS = [
  { label: 'Cartão de Crédito', path: '/cartao-credito' },
  { label: 'Bens e Investimentos', path: '/bens-investimentos' },
  { label: 'Contas a Pagar/Rec.', path: '/contas' },
  { label: 'Metas Mensais', path: '/metas-mensais' },
  { label: 'Fluxo Financeiro', path: '/fluxo-financeiro' },
  { label: 'Simuladores', path: '/simuladores' },
  { label: 'Gestão de Veículos', path: '/gestao-veiculos' },
  { label: 'Sonhos', path: '/sonhos' },
  { label: 'Minha Conta', path: '/minha-conta' },
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
            <Grid3x3 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      <QuickActionsSheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-safe max-h-[70dvh] bg-[hsl(var(--color-surface-raised))]"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-[11px] font-semibold text-[hsl(var(--color-text-tertiary))] uppercase tracking-widest">
              Menu Completo
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto">
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 bg-[hsl(var(--color-surface-sunken))] border border-[hsl(var(--color-border-default))] text-[13px] font-medium text-[hsl(var(--color-text-primary))] hover:border-[hsl(var(--color-brand-400))] hover:bg-[hsl(var(--color-brand-50))] hover:text-[hsl(var(--color-brand-700))] dark:hover:bg-sidebar-accent transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
