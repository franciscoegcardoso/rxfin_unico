import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Crown, FileText, Brain, Kanban, Zap,
  TrendingUp, Activity, Clock, CheckCircle, AlertTriangle,
  ArrowRight, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashMetrics {
  totalUsers: number;
  newUsersLast7d: number;
  activePages: number;
  totalPages: number;
  crmLeads: number;
  automationsActive: number;
  aiSessionsLast7d: number;
  aiFeedbackPending: number;
}

interface PageSummary {
  slug: string;
  title: string;
  path: string;
  is_active_users: boolean;
  page_groups: { name: string } | null;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashMetrics | null>(null);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sevenDaysAgo = subDays(new Date(), 7).toISOString();

        const [
          usersRes,
          newUsersRes,
          pagesActiveRes,
          pagesTotalRes,
          leadsRes,
          automationsRes,
          aiSessionsRes,
          aiFeedbackRes,
          pagesListRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
          supabase.from('pages').select('*', { count: 'exact', head: true }).eq('is_active_users', true),
          supabase.from('pages').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('crm_status', 'lead'),
          supabase.from('crm_automations').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('ai_chat_sessions').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
          supabase.from('ai_feedback').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('pages').select('slug, title, path, is_active_users, page_groups(name)').order('order_index'),
        ]);

        setMetrics({
          totalUsers: usersRes.count ?? 0,
          newUsersLast7d: newUsersRes.count ?? 0,
          activePages: pagesActiveRes.count ?? 0,
          totalPages: pagesTotalRes.count ?? 0,
          crmLeads: leadsRes.count ?? 0,
          automationsActive: automationsRes.count ?? 0,
          aiSessionsLast7d: aiSessionsRes.count ?? 0,
          aiFeedbackPending: aiFeedbackRes.count ?? 0,
        });

        setPages((pagesListRes.data ?? []) as PageSummary[]);
      } catch (err) {
        console.error('Dashboard metrics error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metricCards = metrics ? [
    {
      label: 'Usuários totais',
      value: metrics.totalUsers,
      sub: `+${metrics.newUsersLast7d} últimos 7d`,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/admin/usuarios',
    },
    {
      label: 'Leads CRM',
      value: metrics.crmLeads,
      sub: 'aguardando conversão',
      icon: Kanban,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      href: '/admin/crm',
    },
    {
      label: 'Automações ativas',
      value: metrics.automationsActive,
      sub: 'réguas em execução',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      href: '/admin/crm/automations',
    },
    {
      label: 'Sessões IA (7d)',
      value: metrics.aiSessionsLast7d,
      sub: `${metrics.aiFeedbackPending} feedbacks pendentes`,
      icon: Brain,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      href: '/admin/ai-metrics',
    },
    {
      label: 'Páginas ativas',
      value: `${metrics.activePages}/${metrics.totalPages}`,
      sub: 'registradas no sistema',
      icon: FileText,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      href: '/admin/paginas',
    },
  ] : [];

  const quickLinks = [
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
    { label: 'CRM', href: '/admin/crm', icon: Kanban },
    { label: 'Automações', href: '/admin/crm/automations', icon: Zap },
    { label: 'Páginas', href: '/admin/paginas', icon: FileText },
    { label: 'Métricas IA', href: '/admin/ai-metrics', icon: Brain },
    { label: 'Health Check', href: '/admin/health', icon: Activity },
  ];

  // Group pages by group_name
  const pagesByGroup = pages.reduce<Record<string, PageSummary[]>>((acc, p) => {
    const g = p.page_groups?.name || 'Outros';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Painel Admin"
        description={`Visão geral · ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}`}
      />

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}><CardContent className="py-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metricCards.map(m => (
            <Link key={m.label} to={m.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', m.bg)}>
                      <m.icon className={cn('h-4 w-4', m.color)} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <p className="text-[11px] text-muted-foreground">{m.sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Access */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Acesso rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {quickLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-center"
              >
                <link.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pages Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Páginas do Sistema
            </CardTitle>
            <Link to="/admin/paginas" className="text-xs text-primary hover:underline flex items-center gap-1">
              Gerenciar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(pagesByGroup).map(([group, groupPages]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupPages.map(p => (
                    <Badge
                      key={p.slug}
                      variant={p.is_active_users ? 'outline' : 'secondary'}
                      className={cn(
                        'text-[11px] font-normal',
                        p.is_active_users
                          ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                          : 'opacity-50',
                      )}
                    >
                      {p.is_active_users ? (
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 mr-1" />
                      )}
                      {p.title}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
