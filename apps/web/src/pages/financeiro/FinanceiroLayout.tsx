import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, Gift, Crown, Receipt } from 'lucide-react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LucideIcon } from 'lucide-react';

const TABS: { id: string; label: string; icon: LucideIcon; highlight?: boolean }[] = [
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'pagamentos', label: 'Pagamentos', icon: Receipt },
  { id: 'minhas-indicacoes', label: 'Indique & Ganhe', icon: Gift, highlight: true },
];

const VALID_TABS: string[] = TABS.map(t => t.id);

const FinanceiroLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  useEffect(() => {
    if (!currentTab && (location.pathname === '/financeiro' || location.pathname === '/financeiro/')) {
      navigate('/financeiro/planos', { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/financeiro/${value}`);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Wallet}
          title="Financeiro"
          subtitle="Planos, pagamentos e programa de indicações"
        />

        <Tabs value={currentTab || 'planos'} onValueChange={handleTabChange}>
          <TabsList>
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`gap-1.5 ${tab.highlight ? 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' : ''}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </SettingsLayout>
  );
};

export default FinanceiroLayout;
