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
  ArrowRight, BarChart3, UserCheck, CreditCard, GitMerge, UserMinus,
} from 'lucide-react';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashMetrics {
  totalUsers: number;
  activePages: number;
  totalPages: number;
  crmLeads: number;
  automationsActive: number;
  aiFeedbackPending: number;
  activeUsers30d: number;
  newActiveUsers30d: number;
  paidActiveUsers30d: number;
  newPaidActiveUsers30d: number;
  migratedUsers30d: number;
  churn30d: number;
}

interface ChartData {
  monthly_active: { month: string; value: number }[];
  new_active_daily: { day: string; value: number }[];
  new_active_weekly: { week: string; value: number }[];
  new_active_monthly: { month: string; value: number }[];
  monthly_churn: { month: string; value: number }[];
  monthly_reactivated: { month: string; value: number }[];
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
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [
          usersSettled,
          pagesActiveSettled,
          pagesTotalSettled,
          automationsSettled,
          aiFeedbackSettled,
          pagesListSettled,
          metrics30dSettled,
          chartDataSettled,
        ] = await Promise.allSettled([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('pages').select('*', { count: 'exact', head: true }).eq('is_active_users', true),
          supabase.from('pages').select('*', { count: 'exact', head: true }),
          supabase.from('crm_automations').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('ai_feedback').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('pages').select('slug, title, path, is_active_users, page_groups(name)').order('order_index'),
          supabase.rpc('get_admin_dashboard_metrics_30d'),
          supabase.rpc('get_admin_dashboard_chart_data'),
        ]);

        const usersRes = usersSettled.status === 'fulfilled' ? usersSettled.value : null;
        const pagesActiveRes = pagesActiveSettled.status === 'fulfilled' ? pagesActiveSettled.value : null;
        const pagesTotalRes = pagesTotalSettled.status === 'fulfilled' ? pagesTotalSettled.value : null;
        const automationsRes = automationsSettled.status === 'fulfilled' ? automationsSettled.value : null;
        const aiFeedbackRes = aiFeedbackSettled.status === 'fulfilled' ? aiFeedbackSettled.value : null;
        const pagesListRes = pagesListSettled.status === 'fulfilled' ? pagesListSettled.value : null;
        const metrics30dRes = metrics30dSettled.status === 'fulfilled' ? metrics30dSettled.value : null;
        const chartDataRes = chartDataSettled.status === 'fulfilled' ? chartDataSettled.value : null;

        const m30Raw = metrics30dRes?.data;
        const m30 = (Array.isArray(m30Raw) ? m30Raw[0] : m30Raw) as Record<string, number> | undefined ?? {};

        setMetrics({
          totalUsers: usersRes?.count ?? 0,
          activePages: pagesActiveRes?.count ?? 0,
          totalPages: pagesTotalRes?.count ?? 0,
          crmLeads: 0,
          automationsActive: automationsRes?.count ?? 0,
          aiFeedbackPending: aiFeedbackRes?.count ?? 0,
          activeUsers30d: m30.active_users_30d ?? 0,
          newActiveUsers30d: m30.new_active_users_30d ?? 0,
          paidActiveUsers30d: m30.paid_active_users_30d ?? 0,
          newPaidActiveUsers30d: m30.new_paid_active_users_30d ?? 0,
          migratedUsers30d: m30.migrated_users_30d ?? 0,
          churn30d: m30.churn_30d ?? 0,
        });

        const chartRaw = chartDataRes?.data;
        setChartData((Array.isArray(chartRaw) ? chartRaw[0] : chartRaw) as ChartData ?? null);

        const pagesRaw = pagesListRes?.data;
        const pagesList = Array.isArray(pagesRaw) ? pagesRaw : [];
        setPages(pagesList as PageSummary[]);
      } catch (err) {
        console.error('Dashboard metrics error:', err);
        setMetrics((prev) => prev ?? {
          totalUsers: 0,
          activePages: 0,
          totalPages: 0,
          crmLeads: 0,
          automationsActive: 0,
          aiFeedbackPending: 0,
          activeUsers30d: 0,
          newActiveUsers30d: 0,
          paidActiveUsers30d: 0,
          newPaidActiveUsers30d: 0,
          migratedUsers30d: 0,
          churn30d: 0,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const engagementCards = metrics ? [
    {
      label: 'Usuários ativos (30d)',
      value: metrics.activeUsers30d,
      sub: `de ${metrics.totalUsers} registrados`,
      icon: UserCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Novos ativos (30d)',
      value: metrics.newActiveUsers30d,
      sub: 'cadastros recentes',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Pagos ativos (30d)',
      value: metrics.paidActiveUsers30d,
      sub: 'com plano pago + login',
      icon: CreditCard,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Novos pagos (30d)',
      value: metrics.newPaidActiveUsers30d,
      sub: 'conversões recentes',
      icon: Crown,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Migrados (30d)',
      value: metrics.migratedUsers30d,
      sub: 'receita + despesa + inst. + 2 logins',
      icon: GitMerge,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
    },
    {
      label: 'Churn (30d)',
      value: metrics.churn30d,
      sub: 'planos que ficaram inativos',
      icon: UserMinus,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ] : [];

  const operationalCards = metrics ? [
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
      label: 'Feedbacks IA pendentes',
      value: metrics.aiFeedbackPending,
      sub: 'aguardando revisão',
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

  const pagesByGroup = pages.reduce<Record<string, PageSummary[]>>((acc, p) => {
    const pg = p.page_groups;
    const groupName = Array.isArray(pg) ? pg[0]?.name : (pg as { name?: string } | null)?.name;
    const g = groupName || 'Outros';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const MetricCardGrid = ({ cards, title, icon: Icon }: { cards: Array<{ label: string; value: string | number; sub: string; icon: React.ElementType; color: string; bg: string; href?: string }>; title: string; icon: React.ElementType }) => (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(m => {
          const Wrapper = ('href' in m && m.href) ? Link : 'div';
          const wrapperProps = ('href' in m && m.href) ? { to: m.href as string } : {};
          return (
            <Wrapper key={m.label} {...(wrapperProps as any)}>
              <Card className={cn('h-full transition-colors', ('href' in m && m.href) && 'hover:border-primary/30 cursor-pointer')}>
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
            </Wrapper>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Painel Admin"
        description={`Visão geral · ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}`}
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><CardContent className="py-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <MetricCardGrid cards={engagementCards} title="Engajamento — Últimos 30 dias" icon={TrendingUp} />
          <AdminDashboardCharts data={chartData} loading={loading} />
          <MetricCardGrid cards={operationalCards} title="Operacional" icon={BarChart3} />
        </>
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
