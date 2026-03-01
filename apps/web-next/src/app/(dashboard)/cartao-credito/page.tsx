'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function CartaoCreditoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartão de Crédito"
        description="Gerencie suas faturas e transações de cartão de crédito"
        icon={<CreditCard className="h-5 w-5 text-primary" />}
      />
      {/* CartaoCreditoSection será integrado quando dependências (cartao/, openfinance/, useCreditCardBills, etc.) forem portadas */}
      <Card className="rounded-[14px] border border-border/80 p-8">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Seção de faturas e transações em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
