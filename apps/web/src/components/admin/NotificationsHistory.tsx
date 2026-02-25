import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Bell, Megaphone, CreditCard, AlertTriangle, Gift, Shield, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationStat {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_user_id: string | null;
  action_url: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
  target_label: string;
  read_count: number;
  total_targets: number;
}

const typeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', icon: Megaphone },
  system: { label: 'Sistema', icon: Bell },
  payment: { label: 'Pagamento', icon: CreditCard },
  expiration: { label: 'Vencimento', icon: AlertTriangle },
  gift: { label: 'Presente', icon: Gift },
  insurance: { label: 'Seguro', icon: Shield },
  budget: { label: 'Orçamento', icon: Wallet },
};

const priorityBadge: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-destructive/10 text-destructive',
};

export const NotificationsHistory: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications-history', typeFilter, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_notifications_with_stats', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_type_filter: typeFilter === 'all' ? null : typeFilter,
      });
      if (error) throw error;
      return (data as unknown as NotificationStat[]) ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Notificações
          </CardTitle>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="payment">Pagamento</SelectItem>
              <SelectItem value="expiration">Vencimento</SelectItem>
              <SelectItem value="gift">Presente</SelectItem>
              <SelectItem value="insurance">Seguro</SelectItem>
              <SelectItem value="budget">Orçamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma notificação encontrada</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium">Título</th>
                    <th className="py-2 pr-4 font-medium">Tipo</th>
                    <th className="py-2 pr-4 font-medium">Prioridade</th>
                    <th className="py-2 pr-4 font-medium">Destinatários</th>
                    <th className="py-2 pr-4 font-medium">Lidas</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => {
                    const typeInfo = typeLabels[n.type] || typeLabels.system;
                    const TypeIcon = typeInfo.icon;
                    return (
                      <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                          {format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="py-2.5 pr-4 max-w-[200px] truncate font-medium">{n.title}</td>
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-1.5">
                            <TypeIcon className="h-3.5 w-3.5" />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="secondary" className={priorityBadge[n.priority]}>
                            {n.priority === 'low' ? 'Baixa' : n.priority === 'normal' ? 'Normal' : n.priority === 'high' ? 'Alta' : 'Urgente'}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground max-w-[150px] truncate">
                          {n.target_label}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-muted-foreground">
                            {n.read_count}/{n.total_targets}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">Página {page + 1}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={notifications.length < pageSize}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
