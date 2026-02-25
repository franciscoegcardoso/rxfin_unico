import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { CartaoCreditoSection } from '@/components/planejamento/CartaoCreditoSection';
import { CreditCard } from 'lucide-react';

const CartaoCredito: React.FC = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cartão de Crédito"
          description="Gerencie suas faturas e transações de cartão de crédito"
          icon={<CreditCard className="h-5 w-5 text-primary" />}
        />
        <CartaoCreditoSection />
      </div>
    </AppLayout>
  );
};

export default CartaoCredito;
