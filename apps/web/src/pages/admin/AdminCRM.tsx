import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  UserPlus, Clock, Compass, CheckCircle, Star,
  AlertTriangle, XCircle, RefreshCw, Search,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

/* ── Column definitions ── */
const COLUMNS = [
  { status: 'lead',          label: 'Lead',          color: 'hsl(var(--muted-foreground))', icon: UserPlus },
  { status: 'trial',         label: 'Trial',         color: 'hsl(210 80% 60%)',             icon: Clock },
  { status: 'onboarding',    label: 'Onboarding',    color: 'hsl(45 93% 47%)',              icon: Compass },
  { status: 'ativo',         label: 'Ativo',         color: 'hsl(152 69% 41%)',             icon: CheckCircle },
  { status: 'power_user',    label: 'Power User',    color: 'hsl(271 76% 53%)',             icon: Star },
  { status: 'risco',         label: 'Risco',         color: 'hsl(25 95% 53%)',              icon: AlertTriangle },
  { status: 'churned',       label: 'Churned',       color: 'hsl(0 84% 60%)',               icon: XCircle },
  { status: 'reconquistado', label: 'Reconquistado', color: 'hsl(174 72% 40%)',             icon: RefreshCw },
] as const;

const COLUMN_LABEL: Record<string, string> = {};
for (const c of COLUMNS) COLUMN_LABEL[c.status] = c.label;

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (b.crm_score ?? 0) - (a.crm_score ?? 0));
    }
    return map;
  }, [filtered]);

  const activeUser = useMemo(() => users.find(u => u.id === activeId) ?? null, [users, activeId]);

  /* ── DnD handlers ── */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    // over id is a column status
    if (overId && COLUMN_LABEL[overId]) {
      setOverColumnId(overId);
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const userId = active.id as string;
    const newStatus = over.id as string;

    // Only accept drops on columns
    if (!COLUMN_LABEL[newStatus]) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    const oldStatus = user.crm_status ?? 'lead';
    if (oldStatus === newStatus) return;

    // Optimistic update
    const snapshot = [...users];
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, crm_status: newStatus } : u));

    const { error } = await supabase
      .from('profiles')
      .update({ crm_status: newStatus } as any)
      .eq('id', userId);

    if (error) {
      setUsers(snapshot);
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Status de ${user.full_name ?? 'usuário'} atualizado para ${COLUMN_LABEL[newStatus]}` });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumnId(null);
  };

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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {COLUMNS.map(col => {
                const items = grouped[col.status] ?? [];
                return (
                  <KanbanColumn
                    key={col.status}
                    column={col}
                    items={items}
                    loading={loading}
                    isOver={overColumnId === col.status}
                    activeId={activeId}
                  />
                );
              })}
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
    </div>
  );
}

/* ── Droppable Column ── */
function KanbanColumn({
  column,
  items,
  loading,
  isOver,
  activeId,
}: {
  column: typeof COLUMNS[number];
  items: CrmUser[];
  loading: boolean;
  isOver: boolean;
  activeId: string | null;
}) {
  const { setNodeRef, isOver: directOver } = useDroppable({ id: column.status });
  const Icon = column.icon;
  const highlighted = isOver || directOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-[280px] flex-shrink-0 flex flex-col rounded-xl border bg-card transition-all duration-200',
        highlighted
          ? 'border-primary/60 ring-2 ring-primary/20 bg-primary/5'
          : 'border-border'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <Icon className="h-4 w-4" style={{ color: column.color }} />
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-2xs">{items.length}</Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="p-2 space-y-2">
          {loading && items.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">Carregando…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              {highlighted ? 'Soltar aqui' : 'Nenhum usuário'}
            </div>
          )}
          {items.map(u => (
            <DraggableCard key={u.id} user={u} columnColor={column.color} isDragging={u.id === activeId} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Draggable Card Wrapper ── */
function DraggableCard({ user, columnColor, isDragging }: { user: CrmUser; columnColor: string; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: user.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    transition: isDragging ? 'opacity 150ms' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <UserCardContent user={user} columnColor={columnColor} />
    </div>
  );
}

/* ── Card Content (shared between real + overlay) ── */
function UserCardContent({ user: u, columnColor, isDragOverlay }: { user: CrmUser; columnColor: string; isDragOverlay?: boolean }) {
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
            <TooltipTrigger asChild>
              <span className="shrink-0 cursor-default">📌</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{u.last_note}</TooltipContent>
          </Tooltip>
        )}
      </div>

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

      <p className="text-2xs text-muted-foreground">
        {(u.total_balance ?? 0) > 0
          ? fmt.format(u.total_balance!)
          : u.created_at
            ? `Cadastro: ${format(new Date(u.created_at), 'dd/MM/yyyy')}`
            : '—'
        }
      </p>

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
