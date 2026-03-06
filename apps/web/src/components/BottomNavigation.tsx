import { useLocation, Link } from 'react-router-dom';
import { Home, Receipt, CreditCard, Calendar, Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const MAIN_TABS = [
  { label: 'Início', icon: Home, path: '/inicio' },
  { label: 'Lançamentos', icon: Receipt, path: '/lancamentos' },
  { label: 'Cartões', icon: CreditCard, path: '/cartao-credito' },
  { label: 'Planejamento', icon: Calendar, path: '/planejamento' },
];

const MORE_ITEMS = [
  { label: 'Bens e Investimentos', path: '/bens-investimentos' },
  { label: 'Contas a Pagar/Rec.', path: '/contas' },
  { label: 'Metas Mensais', path: '/metas-mensais' },
  { label: 'Fluxo Financeiro', path: '/fluxo-financeiro' },
  { label: 'Simuladores', path: '/simuladores' },
  { label: 'Gestão de Veículos', path: '/gestao-veiculos' },
  { label: 'Sonhos', path: '/sonhos' },
  { label: 'Minha Conta', path: '/minha-conta' },
];

export function BottomNavigation() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-surface-raised))]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16 items-stretch">
          {MAIN_TABS.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              location.pathname.startsWith(tab.path + '/');
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors duration-150',
                  isActive
                    ? 'text-[hsl(var(--color-brand-700))]'
                    : 'text-[hsl(var(--color-text-tertiary))]'
                )}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-b-full bg-[hsl(var(--color-brand-700))]"
                    aria-hidden
                  />
                )}
                <tab.icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden
                />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors duration-150 text-[hsl(var(--color-text-tertiary))] border-none bg-transparent"
            aria-label="Abrir menu completo"
          >
            <Grid3x3 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

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
