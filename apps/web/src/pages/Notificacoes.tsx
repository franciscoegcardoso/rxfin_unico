import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Bell, BellOff, CreditCard, AlertTriangle, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotificationRow {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  priority?: string;
  created_at?: string;
  action_url?: string | null;
}

interface NotificationsPayload {
  notifications?: NotificationRow[];
  total?: number;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '—';
  }
}

const typeIcons: Record<string, React.ElementType> = {
  admin: Megaphone,
  system: Bell,
  payment: CreditCard,
  expiration: AlertTriangle,
};

const MAX_MESSAGE_LENGTH = 120;

export default function Notificacoes() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.rpc('get_notifications_page', {}).then(({ data: r, error: e }) => {
      setError(e?.message ?? null);
      setData(r);
      setLoading(false);
    });
  }, []);

  const payload = data as NotificationsPayload | null;
  const notifications = payload?.notifications ?? (Array.isArray(data) ? data : []) as NotificationRow[];
  const total = payload?.total ?? notifications.length;
  const isEmpty = notifications.length === 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notificações"
          description="Suas notificações"
          icon={<Bell className="h-5 w-5 text-primary" />}
        />

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Carregando...</span>
          </div>
        )}
        {error && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && isEmpty && (
          <Card className="rounded-[14px] border border-border/80 p-12 text-center">
            <BellOff className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Nenhuma notificação.</p>
          </Card>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Notificações ({total})</h2>
            </div>

            <div className="space-y-2">
              {notifications.map((n) => {
                const id = n.id ?? String(n.title ?? Math.random());
                const Icon = typeIcons[n.type ?? ''] ?? Bell;
                const isExpanded = expandedId === id;
                const msg = n.message ?? '';
                const truncated = msg.length > MAX_MESSAGE_LENGTH && !isExpanded;

                return (
                  <Card
                    key={id}
                    className="rounded-[14px] border border-border/80 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{n.title ?? 'Notificação'}</p>
                          {n.priority && (
                            <Badge variant="secondary" className="text-xs">
                              {n.priority}
                            </Badge>
                          )}
                        </div>
                        <p className={cn('mt-1 text-sm text-muted-foreground', truncated && 'line-clamp-2')}>
                          {truncated ? `${msg.slice(0, MAX_MESSAGE_LENGTH)}…` : msg || '—'}
                        </p>
                        {msg.length > MAX_MESSAGE_LENGTH && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary"
                            onClick={() => setExpandedId(isExpanded ? null : id)}
                          >
                            {isExpanded ? (
                              <>Menos {<ChevronUp className="ml-0.5 inline h-3 w-3" />}</>
                            ) : (
                              <>Ver mais {<ChevronDown className="ml-0.5 inline h-3 w-3" />}</>
                            )}
                          </Button>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground/80">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
