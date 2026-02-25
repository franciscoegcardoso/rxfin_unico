import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, CreditCard, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number | null) => {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
};

const eventTypeLabels: Record<string, string> = {
  'purchase_approved': 'Pagamento Aprovado',
  'purchase_unapproved': 'Pagamento Não Aprovado',
  'subscription_created': 'Assinatura Criada',
  'subscription_cancelled': 'Assinatura Cancelada',
  'subscription_renewed': 'Assinatura Renovada',
  'subscription_expired': 'Assinatura Expirada',
  'subscription_upgraded': 'Upgrade de Plano',
  'subscription_downgraded': 'Downgrade de Plano',
  'refund': 'Reembolso',
  'chargeback': 'Chargeback',
};

const eventStatusColors: Record<string, string> = {
  'approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'paid': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'cancelled': 'bg-destructive/10 text-destructive border-destructive/20',
  'refunded': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'expired': 'bg-muted text-muted-foreground border-muted',
};

const paymentMethodLabels: Record<string, string> = {
  'credit_card': 'Cartão de Crédito',
  'pix': 'PIX',
  'boleto': 'Boleto',
  'bank_transfer': 'Transferência',
};

const PagamentosTab: React.FC = () => {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['subscription-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">Nenhum pagamento encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Quando você realizar pagamentos de assinatura, eles aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const statusClass = eventStatusColors[event.event_status || ''] || 'bg-muted text-muted-foreground border-muted';
        return (
          <Card key={event.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </p>
                    {event.product_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.product_name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.processed_at), "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                      </span>
                      {event.payment_method && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          {paymentMethodLabels[event.payment_method] || event.payment_method}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {event.amount != null && event.amount > 0 && (
                    <span className="font-semibold text-sm text-foreground">
                      {formatCurrency(event.amount)}
                    </span>
                  )}
                  {event.event_status && (
                    <Badge variant="outline" className={`text-[10px] ${statusClass}`}>
                      {event.event_status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PagamentosTab;
