import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'visao-mensal', label: 'Visão Mensal' },
  { id: 'metas', label: 'Metas do Mês' },
  { id: 'analises', label: 'Análises' },
] as const;

const VALID_TABS: string[] = TABS.map(t => t.id);

const PlanejamentoLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  // Redirect index to first tab
  useEffect(() => {
    if (!currentTab && (location.pathname === '/planejamento' || location.pathname === '/planejamento/')) {
      navigate('/planejamento/visao-mensal', { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  // Backward compat: redirect ?tab= query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'cartao') {
      navigate('/cartao-credito', { replace: true });
    } else if (tabParam && VALID_TABS.includes(tabParam)) {
      navigate(`/planejamento/${tabParam}`, { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Planejamento Mensal"
          description="Consolidado mensal de receitas e despesas"
          icon={<Calculator className="h-5 w-5 text-primary" />}
        >
          <VisibilityToggle />
          <PageHelpSlideDialog content={PAGE_HELP_SLIDE_CONTENT.planejamentoMensal} />
        </PageHeader>

        {/* Navegação de abas por rota — sem Radix Tabs (legado: views/ não usado pela rota atual) */}
        <div className="bg-[hsl(var(--color-surface-sunken))] border-b border-[hsl(var(--color-border-default))] px-4 md:px-8 mt-5">
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
    </AppLayout>
  );
};

export default PlanejamentoLayout;
