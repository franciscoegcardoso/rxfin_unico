import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  UserPlus, Clock, Compass, CheckCircle, Star,
  AlertTriangle, XCircle, RefreshCw, Search, Pin,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInDays } from 'date-fns';

/* ── Column definitions ── */
const COLUMNS = [
  { status: 'lead',          label: 'Lead',          color: 'hsl(var(--muted-foreground))', bg: 'bg-muted/40',        icon: UserPlus },
  { status: 'trial',         label: 'Trial',         color: 'hsl(210 80% 60%)',             bg: 'bg-blue-50 dark:bg-blue-950/30',   icon: Clock },
  { status: 'onboarding',    label: 'Onboarding',    color: 'hsl(45 93% 47%)',              bg: 'bg-amber-50 dark:bg-amber-950/30', icon: Compass },
  { status: 'ativo',         label: 'Ativo',         color: 'hsl(152 69% 41%)',             bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle },
  { status: 'power_user',    label: 'Power User',    color: 'hsl(271 76% 53%)',             bg: 'bg-purple-50 dark:bg-purple-950/30', icon: Star },
  { status: 'risco',         label: 'Risco',         color: 'hsl(25 95% 53%)',              bg: 'bg-orange-50 dark:bg-orange-950/30', icon: AlertTriangle },
  { status: 'churned',       label: 'Churned',       color: 'hsl(0 84% 60%)',               bg: 'bg-red-50 dark:bg-red-950/30',      icon: XCircle },
  { status: 'reconquistado', label: 'Reconquistado', color: 'hsl(174 72% 40%)',             bg: 'bg-teal-50 dark:bg-teal-950/30',    icon: RefreshCw },
] as const;

interface CrmUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  crm_status: string | null;
  crm_score: number | null;
  crm_tags: string[] | null;
  total_balance: number | null;
  plan_name: string | null;
  plan_slug: string | null;
  days_since_signup: number | null;
  days_since_last_login: number | null;
  login_count_30d: number | null;
  last_note: string | null;
  utm_source: string | null;
  referral_source: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function AdminCRM() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('v_crm_kanban').select('*') as { data: CrmUser[] | null };
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const grouped = useMemo(() => {
    const map: Record<string, CrmUser[]> = {};
    for (const col of COLUMNS) map[col.status] = [];
    for (const u of filtered) {
      const s = u.crm_status ?? 'lead';
      if (!map[s]) map[s] = [];
      map[s].push(u);
    }
    // Sort each bucket by score DESC
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (b.crm_score ?? 0) - (a.crm_score ?? 0));
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <AdminPageHeader
          title="CRM"
          description={`${users.length} usuários no total`}
          actions={
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          }
        />

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {COLUMNS.map(col => {
              const Icon = col.icon;
              const items = grouped[col.status] ?? [];
              return (
                <div key={col.status} className="w-[280px] flex-shrink-0 flex flex-col rounded-xl border border-border bg-card">
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
                    <Icon className="h-4 w-4" style={{ color: col.color }} />
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <Badge variant="secondary" className="ml-auto text-2xs">{items.length}</Badge>
                  </div>

                  {/* Cards */}
                  <ScrollArea className="h-[calc(100vh-260px)]">
                    <div className="p-2 space-y-2">
                      {loading && items.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-8">Carregando…</div>
                      )}
                      {!loading && items.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-8">Nenhum usuário</div>
                      )}
                      {items.map(u => (
                        <UserCard key={u.id} user={u} columnColor={col.color} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── User Card ── */
function UserCard({ user: u, columnColor }: { user: CrmUser; columnColor: string }) {
  const daysSinceLogin = u.days_since_last_login ?? 999;
  const score = u.crm_score ?? 0;

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      {/* Name + pin */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{u.full_name ?? 'Sem nome'}</p>
          <p className="text-2xs text-muted-foreground truncate">{u.email}</p>
        </div>
        {u.last_note && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 cursor-default">📌</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{u.last_note}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Plan + score */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={u.plan_slug === 'free' || !u.plan_name ? 'secondary' : 'success'} className="text-2xs">
          {u.plan_name ?? 'Free'}
        </Badge>
        <Badge variant="outline" className="text-2xs font-mono" style={{ borderColor: columnColor, color: columnColor }}>
          {score}
        </Badge>
        {daysSinceLogin > 14 && (
          <Badge variant="destructive" className="text-2xs">{daysSinceLogin}d sem login</Badge>
        )}
      </div>

      {/* Balance or signup date */}
      <p className="text-2xs text-muted-foreground">
        {(u.total_balance ?? 0) > 0
          ? fmt.format(u.total_balance!)
          : u.created_at
            ? `Cadastro: ${format(new Date(u.created_at), 'dd/MM/yyyy')}`
            : '—'
        }
      </p>

      {/* Tags */}
      {u.crm_tags && u.crm_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(u.crm_tags as string[]).slice(0, 4).map(tag => (
            <span key={tag} className="inline-block rounded-full bg-accent/60 text-accent-foreground text-[10px] px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
