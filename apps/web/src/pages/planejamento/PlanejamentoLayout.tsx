import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { useBudgetVsActual } from '@/hooks/useBudgetVsActual';
import { cn, formatCurrency } from '@/lib/utils';

const TABS = [
  { id: 'visao-mensal', label: 'Visão Mensal' },
  { id: 'metas', label: 'Metas do Mês' },
  { id: 'analises', label: 'Análises' },
] as const;

const VALID_TABS: string[] = TABS.map(t => t.id);

const PlanejamentoLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { error: budgetError } = useBudgetVsActual(currentMonth);

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  // Redirect index to first tab (navigate estável no RR v6; replace: true = 1 replaceState apenas)
  useEffect(() => {
    if (!currentTab && (location.pathname === '/planejamento' || location.pathname === '/planejamento/')) {
      navigate('/planejamento/visao-mensal', { replace: true });
    }
  }, [currentTab, location.pathname]);

  // Backward compat: redirect ?tab= query params (deps só location.search para evitar reexecuções)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'cartao') {
      navigate('/movimentacoes/cartao-credito', { replace: true });
    } else if (tabParam && VALID_TABS.includes(tabParam)) {
      navigate(`/planejamento/${tabParam}`, { replace: true });
    }
  }, [location.search]);

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full bg-[hsl(var(--color-surface-base))]">
        <div className="content-zone py-5 md:py-6 space-y-5 flex-1">
        <PageHeader
          icon={CalendarCheck}
          title="Planejamento Mensal"
          subtitle="Gerencie seu orçamento e metas do mês"
          showBackButton={false}
          actions={
            <>
              <VisibilityToggle />
              <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.planejamentoMensal} />
            </>
          }
        />
        {budgetError && (
          <div className="rounded-[var(--radius)] border border-[hsl(var(--color-border-default))] bg-[hsl(var(--color-expense-bg))] p-4">
            <p className="text-sm text-[hsl(var(--color-expense))]">{budgetError}</p>
          </div>
        )}

        {/* Navegação de abas por rota — sem Radix Tabs */}
        <div className="bg-[hsl(var(--color-surface-sunken))] border-b border-[hsl(var(--color-border-default))] px-4 md:px-8 mt-2">
          <nav className="flex gap-0">
            {TABS.map(tab => {
              const isActive = currentTab === tab.id || (!currentTab && tab.id === 'visao-mensal');
              return (
                <Link
                  key={tab.id}
                  to={`/planejamento/${tab.id}`}
                  className={cn(
                    'border-b-2 px-4 py-3 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'border-[hsl(var(--color-brand-700))] text-[hsl(var(--color-brand-700))]'
                      : 'border-transparent text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))]'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Outlet />
        </div>
      </div>
    </AppLayout>
  );
};

export default PlanejamentoLayout;
