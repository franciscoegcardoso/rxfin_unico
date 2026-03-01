import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { VisibilityToggle } from '@/components/ui/visibility-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHelpSlideDialog } from '@/components/shared/PageHelpSlideDialog';
import { PAGE_HELP_SLIDE_CONTENT } from '@/data/pageHelpSlideContent';

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

  const handleTabChange = (value: string) => {
    navigate(`/planejamento/${value}`);
  };

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

        <Tabs value={currentTab || 'visao-mensal'} onValueChange={handleTabChange} className="mt-5">
          <TabsList>
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </AppLayout>
  );
};

export default PlanejamentoLayout;
