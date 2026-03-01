import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus, Clock, Compass, CheckCircle, Star,
  AlertTriangle, XCircle, RefreshCw, Search, Eye,
  Users, TrendingUp, UserCheck, ShieldAlert, Percent, DollarSign,
  Filter, ChevronDown, X, ArrowUpDown, CalendarIcon, Zap,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CrmUserDetailSheet } from '@/components/admin/CrmUserDetailSheet';

/* ── Column definitions ── */
const COLUMNS = [
  { status: 'lead',          label: 'Lead',          color: 'hsl(var(--muted-foreground))', icon: UserPlus },
  { status: 'trial',         label: 'Trial',         color: 'hsl(210 80% 60%)',             icon: Clock },
  { status: 'onboarding',    label: 'Onboarding',    color: 'hsl(45 93% 47%)',              icon: Compass },
  { status: 'ativo',         label: 'Ativo',         color: 'hsl(152 69% 41%)',             icon: CheckCircle },
  { status: 'migrado',       label: 'Migrado',       color: 'hsl(199 89% 48%)',             icon: TrendingUp },
  { status: 'power_user',    label: 'Power User',    color: 'hsl(271 76% 53%)',             icon: Star },
  { status: 'risco',         label: 'Risco',         color: 'hsl(25 95% 53%)',              icon: AlertTriangle },
  { status: 'churned',       label: 'Churned',       color: 'hsl(0 84% 60%)',               icon: XCircle },
  { status: 'reconquistado', label: 'Reconquistado', color: 'hsl(174 72% 40%)',             icon: RefreshCw },
] as const;

const COLUMN_LABEL: Record<string, string> = {};
for (const c of COLUMNS) COLUMN_LABEL[c.status] = c.label;

type SortKey = 'score' | 'created_at' | 'last_login_at' | 'total_balance';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'created_at', label: 'Cadastro' },
  { value: 'last_login_at', label: 'Último login' },
  { value: 'total_balance', label: 'Saldo' },
];

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

const currFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/* ── UTM mapping ── */
function mapOrigin(utm: string | null): string {
  if (!utm) return 'Direto';
  const l = utm.toLowerCase();
  if (l.includes('google')) return 'Google Ads';
  if (l.includes('facebook') || l.includes('instagram') || l.includes('meta')) return 'Meta Ads';
  if (l.includes('organic') || l === 'organico') return 'Orgânico';
  if (l.includes('referral') || l.includes('indicacao')) return 'Referral';
  return 'Direto';
}

const ORIGIN_OPTIONS = ['Google Ads', 'Meta Ads', 'Orgânico', 'Referral', 'Direto'];

export default function AdminCRM() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<CrmUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnSort, setColumnSort] = useState<Record<string, SortKey>>({});
  const { toast } = useToast();

  // Filters
  const [filterPlans, setFilterPlans] = useState<string[]>([]);
  const [filterOrigins, setFilterOrigins] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('v_crm_kanban').select('*') as { data: CrmUser[] | null };
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Derived data ── */
  const allPlans = useMemo(() => [...new Set(users.map(u => u.plan_name ?? 'Free'))].sort(), [users]);
  const allTags = useMemo(() => {
    const s = new Set<string>();
    users.forEach(u => (u.crm_tags ?? []).forEach(t => s.add(t)));
    return [...s].sort();
  }, [users]);

  const hasActiveFilters = filterPlans.length > 0 || filterOrigins.length > 0 || scoreRange[0] > 0 || scoreRange[1] < 100 || !!dateFrom || !!dateTo || filterTags.length > 0;

  const clearFilters = () => {
    setFilterPlans([]); setFilterOrigins([]); setScoreRange([0, 100]);
    setDateFrom(undefined); setDateTo(undefined); setFilterTags([]);
    setSearch('');
  };

  const filtered = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u => (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
    }
    if (filterPlans.length > 0) result = result.filter(u => filterPlans.includes(u.plan_name ?? 'Free'));
    if (filterOrigins.length > 0) result = result.filter(u => filterOrigins.includes(mapOrigin(u.utm_source)));
    if (scoreRange[0] > 0 || scoreRange[1] < 100) result = result.filter(u => { const s = u.crm_score ?? 0; return s >= scoreRange[0] && s <= scoreRange[1]; });
    if (dateFrom) result = result.filter(u => u.created_at && new Date(u.created_at) >= dateFrom);
    if (dateTo) result = result.filter(u => u.created_at && new Date(u.created_at) <= dateTo);
    if (filterTags.length > 0) result = result.filter(u => filterTags.some(t => (u.crm_tags ?? []).includes(t)));
    return result;
  }, [users, search, filterPlans, filterOrigins, scoreRange, dateFrom, dateTo, filterTags]);

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const total = users.length;
    const avgScore = total > 0 ? Math.round(users.reduce((a, u) => a + (u.crm_score ?? 0), 0) / total) : 0;
    const now = new Date();
    const newUsers = users.filter(u => u.created_at && differenceInDays(now, new Date(u.created_at)) <= 7).length;
    const atRisk = users.filter(u => u.crm_status === 'risco').length;
    const churned = users.filter(u => u.crm_status === 'churned').length;
    const churnRate = total > 0 ? ((churned / total) * 100).toFixed(1) : '0.0';
    // MRR estimate: count paid plans (very rough)
    const paidUsers = users.filter(u => u.plan_slug && u.plan_slug !== 'free');
    const mrr = paidUsers.length * 29; // rough estimate
    return { total, avgScore, newUsers, atRisk, churnRate, mrr };
  }, [users]);

  const sortItems = useCallback((items: CrmUser[], colStatus: string): CrmUser[] => {
    const key = columnSort[colStatus] ?? 'score';
    return [...items].sort((a, b) => {
      switch (key) {
        case 'score': return (b.crm_score ?? 0) - (a.crm_score ?? 0);
        case 'created_at': return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        case 'last_login_at': return new Date(b.last_login_at ?? 0).getTime() - new Date(a.last_login_at ?? 0).getTime();
        case 'total_balance': return (b.total_balance ?? 0) - (a.total_balance ?? 0);
        default: return 0;
      }
    });
  }, [columnSort]);

  const grouped = useMemo(() => {
    const map: Record<string, CrmUser[]> = {};
    for (const col of COLUMNS) map[col.status] = [];
    for (const u of filtered) {
      const s = u.crm_status ?? 'lead';
      if (!map[s]) map[s] = [];
      map[s].push(u);
    }
    for (const k of Object.keys(map)) {
      map[k] = sortItems(map[k], k);
    }
    return map;
  }, [filtered, sortItems]);

  const activeUser = useMemo(() => users.find(u => u.id === activeId) ?? null, [users, activeId]);

  /* ── Status change ── */
  const handleStatusChange = useCallback(async (userId: string, newStatus: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const oldStatus = user.crm_status ?? 'lead';
    if (oldStatus === newStatus) return;
    const snapshot = [...users];
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, crm_status: newStatus } : u));
    setSelectedUser(prev => prev?.id === userId ? { ...prev, crm_status: newStatus } : prev);
    const { error } = await supabase.from('profiles').update({ crm_status: newStatus } as any).eq('id', userId);
    if (error) {
      setUsers(snapshot);
      setSelectedUser(prev => prev?.id === userId ? { ...prev, crm_status: oldStatus } : prev);
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Status de ${user.full_name ?? 'usuário'} atualizado para ${COLUMN_LABEL[newStatus]}` });
    }
  }, [users, toast]);

  const handleTagsChange = useCallback(async (userId: string, newTags: string[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, crm_tags: newTags } : u));
    setSelectedUser(prev => prev?.id === userId ? { ...prev, crm_tags: newTags } : prev);
    const { error } = await supabase.from('profiles').update({ crm_tags: newTags } as any).eq('id', userId);
    if (error) { toast({ title: 'Erro ao atualizar tags', variant: 'destructive' }); fetchData(); }
  }, [toast, fetchData]);

  /* ── DnD ── */
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragOver = (e: DragOverEvent) => { const id = e.over?.id as string | undefined; setOverColumnId(id && COLUMN_LABEL[id] ? id : null); };
  const handleDragEnd = async (e: DragEndEvent) => { setActiveId(null); setOverColumnId(null); if (!e.over || !COLUMN_LABEL[e.over.id as string]) return; await handleStatusChange(e.active.id as string, e.over.id as string); };
  const handleDragCancel = () => { setActiveId(null); setOverColumnId(null); };

  const openDetail = (u: CrmUser) => { setSelectedUser(u); setSheetOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-4">
        <AdminPageHeader
          title="CRM"
          description={`Exibindo ${filtered.length} de ${users.length} usuários`}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/crm/automations"><Zap className="h-3.5 w-3.5 mr-1.5" />Automações</Link>
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          }
        />

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={Users} label="Total" value={String(metrics.total)} />
          <MetricCard icon={TrendingUp} label="Score Médio" value={String(metrics.avgScore)} />
          <MetricCard icon={UserCheck} label="Novos (7d)" value={String(metrics.newUsers)} badgeVariant="success" />
          <MetricCard icon={ShieldAlert} label="Em Risco" value={String(metrics.atRisk)} badgeVariant={metrics.atRisk > 0 ? 'destructive' : undefined} />
          <MetricCard icon={Percent} label="Churn Rate" value={`${metrics.churnRate}%`} />
          <MetricCard icon={DollarSign} label="MRR Est." value={currFmt.format(metrics.mrr)} />
        </div>

        {/* ── Filters ── */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />Filtros
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', filtersOpen && 'rotate-180')} />
                {hasActiveFilters && <Badge variant="default" className="text-2xs ml-1 h-4 px-1">ativo</Badge>}
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground gap-1">
                <X className="h-3 w-3" />Limpar filtros
              </Button>
            )}
          </div>
          <CollapsibleContent className="mt-3">
            <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Plan filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Plano</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      {filterPlans.length > 0 ? `${filterPlans.length} selecionados` : 'Todos'}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover z-50">
                    {allPlans.map(p => (
                      <DropdownMenuCheckboxItem key={p} checked={filterPlans.includes(p)} onCheckedChange={c => setFilterPlans(c ? [...filterPlans, p] : filterPlans.filter(x => x !== p))}>
                        {p}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Origin filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Origem</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      {filterOrigins.length > 0 ? `${filterOrigins.length} selecionados` : 'Todas'}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover z-50">
                    {ORIGIN_OPTIONS.map(o => (
                      <DropdownMenuCheckboxItem key={o} checked={filterOrigins.includes(o)} onCheckedChange={c => setFilterOrigins(c ? [...filterOrigins, o] : filterOrigins.filter(x => x !== o))}>
                        {o}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Score range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Score: {scoreRange[0]}–{scoreRange[1]}</label>
                <Slider min={0} max={100} step={5} value={scoreRange} onValueChange={v => setScoreRange(v as [number, number])} className="mt-2" />
              </div>

              {/* Tags filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      {filterTags.length > 0 ? `${filterTags.length} selecionadas` : 'Todas'}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover z-50 max-h-48 overflow-y-auto">
                    {allTags.map(t => (
                      <DropdownMenuCheckboxItem key={t} checked={filterTags.includes(t)} onCheckedChange={c => setFilterTags(c ? [...filterTags, t] : filterTags.filter(x => x !== t))}>
                        {t}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {allTags.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma tag</div>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Date range */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Data de cadastro</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1.5" />
                        {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'De'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1.5" />
                        {dateTo ? format(dateTo, 'dd/MM/yy') : 'Até'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Kanban ── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.status}
                  column={col}
                  items={grouped[col.status] ?? []}
                  loading={loading}
                  isOver={overColumnId === col.status}
                  activeId={activeId}
                  onOpenDetail={openDetail}
                  sortKey={columnSort[col.status] ?? 'score'}
                  onSortChange={k => setColumnSort(prev => ({ ...prev, [col.status]: k }))}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeUser ? (
              <div className="w-[264px] rotate-2 scale-105">
                <UserCardContent user={activeUser} columnColor="hsl(var(--primary))" isDragOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CrmUserDetailSheet user={selectedUser} open={sheetOpen} onOpenChange={setSheetOpen} onStatusChange={handleStatusChange} onTagsChange={handleTagsChange} />
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ icon: Icon, label, value, badgeVariant }: { icon: React.ElementType; label: string; value: string; badgeVariant?: 'success' | 'destructive' }) {
  return (
    <Card className="border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', badgeVariant === 'destructive' ? 'bg-destructive/10' : badgeVariant === 'success' ? 'bg-emerald-500/10' : 'bg-primary/10')}>
          <Icon className={cn('h-4 w-4', badgeVariant === 'destructive' ? 'text-destructive' : badgeVariant === 'success' ? 'text-emerald-600' : 'text-primary')} />
        </div>
        <div className="min-w-0">
          <p className="text-2xs text-muted-foreground">{label}</p>
          <p className="text-base font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Droppable Column ── */
function KanbanColumn({ column, items, loading, isOver, activeId, onOpenDetail, sortKey, onSortChange }: {
  column: typeof COLUMNS[number]; items: CrmUser[]; loading: boolean; isOver: boolean; activeId: string | null;
  onOpenDetail: (u: CrmUser) => void; sortKey: SortKey; onSortChange: (k: SortKey) => void;
}) {
  const { setNodeRef, isOver: directOver } = useDroppable({ id: column.status });
  const Icon = column.icon;
  const highlighted = isOver || directOver;

  return (
    <div ref={setNodeRef} className={cn(
      'w-[280px] flex-shrink-0 flex flex-col rounded-xl border bg-card transition-all duration-200',
      highlighted ? 'border-primary/60 ring-2 ring-primary/20 bg-primary/5' : 'border-border'
    )}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Icon className="h-4 w-4" style={{ color: column.color }} />
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <Badge variant="secondary" className="text-2xs">{items.length}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            {SORT_OPTIONS.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => onSortChange(o.value)} className={cn(sortKey === o.value && 'font-semibold text-primary')}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="p-2 space-y-2">
          {loading && items.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">Carregando…</div>}
          {!loading && items.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">{highlighted ? 'Soltar aqui' : 'Nenhum usuário'}</div>}
          {items.map(u => <DraggableCard key={u.id} user={u} columnColor={column.color} isDragging={u.id === activeId} onOpenDetail={onOpenDetail} />)}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Draggable Card Wrapper ── */
function DraggableCard({ user, columnColor, isDragging, onOpenDetail }: { user: CrmUser; columnColor: string; isDragging: boolean; onOpenDetail: (u: CrmUser) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: user.id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    transition: isDragging ? 'opacity 150ms' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <UserCardContent user={user} columnColor={columnColor} onOpenDetail={() => onOpenDetail(user)} />
    </div>
  );
}

/* ── Card Content ── */
function UserCardContent({ user: u, columnColor, isDragOverlay, onOpenDetail }: { user: CrmUser; columnColor: string; isDragOverlay?: boolean; onOpenDetail?: () => void }) {
  const daysSinceLogin = u.days_since_last_login ?? 999;
  const score = u.crm_score ?? 0;
  return (
    <div className={cn(
      'rounded-lg border border-border bg-background p-3 space-y-2 transition-shadow cursor-grab',
      isDragOverlay ? 'shadow-xl ring-2 ring-primary/30' : 'shadow-sm hover:shadow-md'
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{u.full_name ?? 'Sem nome'}</p>
          <p className="text-2xs text-muted-foreground truncate">{u.email}</p>
        </div>
        {u.last_note && (
          <Tooltip>
            <TooltipTrigger asChild><span className="shrink-0 cursor-default">📌</span></TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{u.last_note}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={u.plan_slug === 'free' || !u.plan_name ? 'secondary' : 'success'} className="text-2xs">{u.plan_name ?? 'Free'}</Badge>
        <Badge variant="outline" className="text-2xs font-mono" style={{ borderColor: columnColor, color: columnColor }}>{score}</Badge>
        {daysSinceLogin > 14 && <Badge variant="destructive" className="text-2xs">{daysSinceLogin}d sem login</Badge>}
      </div>
      <p className="text-2xs text-muted-foreground">
        {(u.total_balance ?? 0) > 0 ? currFmt.format(u.total_balance!) : u.created_at ? `Cadastro: ${format(new Date(u.created_at), 'dd/MM/yyyy')}` : '—'}
      </p>
      {u.crm_tags && u.crm_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(u.crm_tags as string[]).slice(0, 4).map(tag => (
            <span key={tag} className="inline-block rounded-full bg-accent/60 text-accent-foreground text-[10px] px-1.5 py-0.5">{tag}</span>
          ))}
        </div>
      )}
      {onOpenDetail && !isDragOverlay && (
        <Button variant="ghost" size="sm" className="w-full h-6 text-2xs text-muted-foreground hover:text-foreground mt-1" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onOpenDetail(); }}>
          <Eye className="h-3 w-3 mr-1" />Ver Detalhes
        </Button>
      )}
    </div>
  );
}
