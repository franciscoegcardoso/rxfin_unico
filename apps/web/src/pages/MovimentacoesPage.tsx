import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Receipt, CreditCard, LayoutDashboard } from 'lucide-react';
import Lancamentos from './Lancamentos';
import CartaoCredito from './CartaoCredito';
import { ConsolidatedView } from '@/components/movimentacoes/ConsolidatedView';
import { cn } from '@/lib/utils';

type Tab = 'visao-geral' | 'extrato' | 'cartao-credito';

interface MovimentacoesPageProps {
  defaultTab?: Tab;
}

export default function MovimentacoesPage({ defaultTab }: MovimentacoesPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = location.pathname === '/movimentacoes' || location.pathname.endsWith('/movimentacoes');
  const activeTab: Tab = isRoot
    ? 'visao-geral'
    : location.pathname.includes('cartao-credito')
      ? 'cartao-credito'
      : location.pathname.includes('extrato')
        ? 'extrato'
        : (defaultTab ?? 'visao-geral');

  const handleTabChange = (tab: Tab) => {
    if (tab === 'visao-geral') {
      navigate('/movimentacoes', { replace: true });
    } else if (tab === 'extrato') {
      navigate('/movimentacoes/extrato', { replace: true });
    } else {
      navigate('/movimentacoes/cartao-credito', { replace: true });
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'extrato', label: 'Extrato de conta', icon: Receipt },
    { id: 'cartao-credito', label: 'Cartão de crédito', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 pt-4 pb-0 border-b border-border bg-background shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              activeTab === id
                ? 'bg-card text-foreground border border-b-0 border-border -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'extrato' ? (
          <Lancamentos embedded />
        ) : activeTab === 'cartao-credito' ? (
          <CartaoCredito embedded />
        ) : (
          <div className="p-4 md:p-6">
            <ConsolidatedView />
          </div>
        )}
      </div>
    </div>
  );
}
