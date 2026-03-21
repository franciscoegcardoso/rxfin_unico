import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { useBudgetVsActual } from '@/hooks/useBudgetVsActual';
import { cn, formatCurrency } from '@/lib/utils';

const TABS = [
  { id: '' as const, label: 'Visão Mensal' },
  { id: 'metas' as const, label: 'Metas do Mês' },
  { id: 'analises' as const, label: 'Análises' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const pathAfterBase = (tabId: TabId) =>
  tabId === '' ? '/planejamento-mensal' : `/planejamento-mensal/${tabId}`;

const PlanejamentoLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { error: budgetError } = useBudgetVsActual(currentMonth);

  const isIndexPath =
    location.pathname === '/planejamento-mensal' ||
    location.pathname === '/planejamento-mensal/';

  const currentTab: TabId = location.pathname.endsWith('/metas')
    ? 'metas'
    : location.pathname.endsWith('/analises')
      ? 'analises'
      : isIndexPath
        ? ''
        : '';

  // Backward compat: redirect ?tab= query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'cartao') {
      navigate('/movimentacoes/cartao-credito', { replace: true });
    } else if (tabParam === 'visao-mensal') {
      navigate('/planejamento-mensal', { replace: true });
    } else if (tabParam === 'metas' || tabParam === 'analises') {
      navigate(`/planejamento-mensal/${tabParam}`, { replace: true });
    }
  }, [location.search, navigate]);

  return (
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

          <div className="bg-[hsl(var(--color-surface-sunken))] border-b border-[hsl(var(--color-border-default))] px-4 md:px-8 mt-2">
            <nav className="flex gap-0">
              {TABS.map((tab) => {
                const isActive =
                  tab.id === '' ? currentTab === '' && isIndexPath : currentTab === tab.id;
                return (
                  <Link
                    key={tab.id || 'index'}
                    to={pathAfterBase(tab.id)}
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
  );
};

export default PlanejamentoLayout;
