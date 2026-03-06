import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Clock,
  Target,
  PieChart,
  Settings,
  User,
  Sparkles,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmptyNotificacoes } from '@/design-system/components/empty-states';
import { ErrorCard } from '@/design-system/components/ErrorCard';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'unread' | 'read';
type CategoryFilter =
  | 'all'
  | 'vencimento'
  | 'meta'
  | 'orcamento'
  | 'sistema'
  | 'admin'
  | 'ai';

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  category: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
  total_count?: number;
}

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'vencimento', label: 'Vencimento' },
  { value: 'meta', label: 'Meta' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'admin', label: 'Admin' },
  { value: 'ai', label: 'IA' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
];

const CATEGORY_LABELS: Record<string, string> = {
  vencimento: 'Vencimento',
  meta: 'Meta',
  orcamento: 'Orçamento',
  sistema: 'Sistema',
  admin: 'Admin',
  ai: 'IA',
};

const categoryIcons: Record<string, React.ElementType> = {
  vencimento: Clock,
  meta: Target,
  orcamento: PieChart,
  sistema: Settings,
  admin: User,
  ai: Sparkles,
};

function getCategoryIcon(category: string | null): React.ElementType {
  if (!category) return Bell;
  return categoryIcons[(category || '').toLowerCase()] ?? Bell;
}

function getPriorityVariant(priority: string): 'destructive' | 'warning' | 'secondary' {
  const p = (priority || '').toLowerCase();
  if (p === 'alta') return 'destructive';
  if (p === 'media') return 'warning';
  return 'secondary';
}

function relativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '—';
  }
}

function absoluteDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
}

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<NotificationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const fetchUnreadCount = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('get_unread_notification_count');
    if (e) return;
    setUnreadCount(typeof data === 'number' ? data : Number(data) ?? 0);
  }, []);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const { data, error: e } = await supabase.rpc('get_notifications_page', {
        p_page: pageNum,
        p_limit: PAGE_SIZE,
      });
      if (e) {
        setError(e.message);
        return;
      }
      setError(null);
      const raw = Array.isArray(data) ? data : (data as { rows?: NotificationRow[] })?.rows ?? [];
      const rows = (raw as NotificationRow[]).map((r) => ({
        ...r,
        read_at: r.read_at ?? null,
        category: r.category ?? null,
      }));
      const total =
        (rows[0] as NotificationRow & { total_count?: number })?.total_count ??
        (data as { total_count?: number })?.total_count ??
        (append ? undefined : rows.length);
      if (append) {
        setList((prev) => [...prev, ...rows]);
        if (total != null) setTotalCount(total);
      } else {
        setList(rows);
        setTotalCount(total ?? rows.length);
      }
    },
    [list.length]
  );

  const loadInitial = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    await Promise.all([fetchPage(1, false), fetchUnreadCount()]);
    setPage(1);
    setLoading(false);
  }, [user?.id, fetchPage, fetchUnreadCount]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [page, fetchPage]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const markRead = useCallback(async (id: string) => {
    const { error: e } = await supabase.rpc('mark_notification_read', {
      p_notification_id: id,
    });
    if (e) return;
    setList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const { error: e } = await supabase.rpc('mark_all_notifications_read');
    if (e) return;
    setList((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  const filteredList = useMemo(() => {
    return list.filter((n) => {
      if (statusFilter === 'unread' && n.read_at != null) return false;
      if (statusFilter === 'read' && n.read_at == null) return false;
      if (categoryFilter !== 'all') {
        const cat = (n.category || '').toLowerCase();
        if (cat !== categoryFilter) return false;
      }
      return true;
    });
  }, [list, statusFilter, categoryFilter]);

  const hasMore = list.length < totalCount && list.length > 0;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <PageHeader
            title="Notificações"
            description="Central de notificações"
            icon={<Bell className="h-5 w-5 text-primary" />}
            children={
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {unreadCount} não lidas
                  </Badge>
                )}
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllRead}>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            }
          />

          {/* Filtros */}
          {!loading && list.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={statusFilter === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={categoryFilter === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategoryFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <ErrorCard message="Não foi possível carregar os dados." onRetry={() => loadInitial()} />
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="rounded-[14px] border border-border/80 p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && list.length === 0 && (
            <EmptyNotificacoes />
          )}

          {!loading && !error && list.length > 0 && filteredList.length === 0 && (
            <Card className="rounded-[14px] border border-border/80 p-8 text-center">
              <p className="text-muted-foreground">Nenhuma notificação com este filtro</p>
            </Card>
          )}

          {!loading && !error && filteredList.length > 0 && (
            <div className="space-y-3">
              {filteredList.map((n) => {
                const isUnread = n.read_at == null;
                const Icon = getCategoryIcon(n.category);
                const priorityVariant = getPriorityVariant(n.priority);
                const categoryLabel = CATEGORY_LABELS[(n.category || '').toLowerCase()] ?? n.category ?? '—';

                return (
                  <Card
                    key={n.id}
                    className={cn(
                      'rounded-[14px] border transition-colors cursor-pointer hover:bg-muted/30',
                      isUnread
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-border/80'
                    )}
                    onClick={() => isUnread && markRead(n.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Bolinha + ícone */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread ? (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
                          ) : (
                            <span className="w-2 shrink-0" aria-hidden />
                          )}
                          <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            isUnread ? 'bg-primary/10' : 'bg-muted'
                          )}>
                            <Icon className={cn(
                              'h-5 w-5',
                              isUnread ? 'text-primary' : 'text-muted-foreground'
                            )} />
                          </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                'text-sm',
                                isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                              )}
                            >
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                nova
                              </span>
                            )}
                            <Badge variant={priorityVariant} className="text-xs">
                              {n.priority || '—'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabel}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {n.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground/80">
                                  {relativeDate(n.created_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{absoluteDate(n.created_at)}</p>
                              </TooltipContent>
                            </Tooltip>
                            {n.action_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(n.id);
                                  navigate(n.action_url!);
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver detalhes
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
