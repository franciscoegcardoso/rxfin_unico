import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const eventTypeConfig: Record<string, { label: string; className: string }> = {
  purchase: { label: 'Compra', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  purchase_approved: { label: 'Compra', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  renewal: { label: 'Renovação', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  subscription_renewed: { label: 'Renovação', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  cancellation: { label: 'Cancelamento', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
  subscription_cancelled: { label: 'Cancelamento', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
  upgrade: { label: 'Upgrade', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
  subscription_upgraded: { label: 'Upgrade', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto',
  bank_transfer: 'Transferência',
};

export default function HistoricoPagamentos() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['subscription-events-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-6">
          <h1 className="text-xl font-semibold">Histórico de Pagamentos</h1>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Histórico de Pagamentos</h1>

        {!events || events.length === 0 ? (
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Nenhum pagamento registrado</p>
              <Link to="/planos">
                <Button variant="outline" size="sm" className="mt-4">
                  Ver planos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => {
                  const config = eventTypeConfig[ev.event_type] ?? {
                    label: ev.event_type,
                    className: 'bg-muted text-muted-foreground border-muted',
                  };
                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="text-sm">
                        {format(new Date(ev.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('rounded-full text-xs', config.className)}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{ev.role_after ?? ev.product_name ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {ev.amount != null ? formatCurrency(ev.amount / 100) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {paymentMethodLabels[ev.payment_method ?? ''] ?? ev.payment_method ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}
