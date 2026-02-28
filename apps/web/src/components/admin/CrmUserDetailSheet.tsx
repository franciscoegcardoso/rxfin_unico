import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight, StickyNote, Mail, Phone, Calendar, CheckSquare, Settings,
  ChevronDown, Pin, PinOff, Plus, X, Wallet, Link2, LogIn, CalendarDays,
  AlertTriangle, Send, ListTodo,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'trial', label: 'Trial' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'power_user', label: 'Power User' },
  { value: 'risco', label: 'Risco' },
  { value: 'churned', label: 'Churned' },
  { value: 'reconquistado', label: 'Reconquistado' },
];

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  status_change: { icon: ArrowRight, className: 'text-primary' },
  note:          { icon: StickyNote, className: 'text-amber-500' },
  email_sent:    { icon: Mail, className: 'text-blue-500' },
  call:          { icon: Phone, className: 'text-green-500' },
  meeting:       { icon: Calendar, className: 'text-purple-500' },
  task:          { icon: CheckSquare, className: 'text-teal-500' },
  system:        { icon: Settings, className: 'text-muted-foreground' },
};

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
  // Extra fields that may exist in view
  utm_medium?: string | null;
  utm_campaign?: string | null;
  ad_click_id?: string | null;
  num_accounts?: number | null;
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  performed_by: string | null;
  metadata: any;
}

interface Note {
  id: string;
  content: string;
  is_pinned: boolean | null;
  created_at: string;
  created_by: string;
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function relativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
}

interface CrmUserDetailSheetProps {
  user: CrmUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (userId: string, newStatus: string) => void;
  onTagsChange: (userId: string, newTags: string[]) => void;
}

export function CrmUserDetailSheet({ user, open, onOpenChange, onStatusChange, onTagsChange }: CrmUserDetailSheetProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const userId = user?.id;
  const adminId = authUser?.id;

  const fetchDetails = useCallback(async () => {
    if (!userId) return;
    setLoadingActivities(true);
    const [actRes, noteRes] = await Promise.all([
      supabase
        .from('crm_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('crm_notes')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);
    setActivities((actRes.data as Activity[]) ?? []);
    setNotes((noteRes.data as Note[]) ?? []);
    setLoadingActivities(false);
  }, [userId]);

  useEffect(() => {
    if (open && userId) fetchDetails();
  }, [open, userId, fetchDetails]);

  if (!user) return null;

  const score = user.crm_score ?? 0;
  const tags = (user.crm_tags ?? []) as string[];

  /* ── Actions ── */
  const handleAddNote = async () => {
    if (!newNote.trim() || !adminId || !userId) return;
    setSavingNote(true);
    const { error } = await supabase.from('crm_notes').insert({
      user_id: userId,
      content: newNote.trim(),
      created_by: adminId,
    } as any);

    if (!error) {
      // Also add activity
      await supabase.from('crm_activities').insert({
        user_id: userId,
        activity_type: 'note',
        title: 'Nota adicionada',
        description: newNote.trim().slice(0, 120),
        performed_by: adminId,
      } as any);
      setNewNote('');
      fetchDetails();
      toast({ title: 'Nota adicionada' });
    } else {
      toast({ title: 'Erro ao salvar nota', variant: 'destructive' });
    }
    setSavingNote(false);
  };

  const handleTogglePin = async (note: Note) => {
    await supabase
      .from('crm_notes')
      .update({ is_pinned: !note.is_pinned } as any)
      .eq('id', note.id);
    fetchDetails();
  };

  const handleAddTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    const updated = [...tags, t];
    onTagsChange(user.id, updated);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(user.id, tags.filter(t => t !== tag));
  };

  const handleAddTask = async () => {
    if (!adminId || !userId) return;
    await supabase.from('crm_activities').insert({
      user_id: userId,
      activity_type: 'task',
      title: 'Tarefa criada',
      performed_by: adminId,
    } as any);
    fetchDetails();
    toast({ title: 'Tarefa adicionada à timeline' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* ── 1. HEADER ── */}
            <SheetHeader className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <SheetTitle className="text-lg truncate">{user.full_name ?? 'Sem nome'}</SheetTitle>
                  <SheetDescription className="truncate">{user.email}</SheetDescription>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={user.plan_slug === 'free' || !user.plan_name ? 'secondary' : 'success'}>
                  {user.plan_name ?? 'Free'}
                </Badge>

                {/* Status dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      {STATUSES.find(s => s.value === (user.crm_status ?? 'lead'))?.label ?? user.crm_status}
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {STATUSES.map(s => (
                      <DropdownMenuItem key={s.value} onClick={() => onStatusChange(user.id, s.value)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Score bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score</span>
                  <span className="font-mono font-semibold text-foreground">{score}/100</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-2xs gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Nova tag…"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    className="h-7 text-xs"
                  />
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleAddTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <Separator />

            {/* ── 2. MÉTRICAS ── */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={Wallet} label="Saldo Total" value={(user.total_balance ?? 0) > 0 ? fmt.format(user.total_balance!) : 'R$ 0'} />
              <MetricCard icon={Link2} label="Contas Conectadas" value={String((user as any).num_accounts ?? 0)} />
              <MetricCard icon={LogIn} label="Logins (30d)" value={String(user.login_count_30d ?? 0)} />
              <MetricCard icon={CalendarDays} label="Dias desde cadastro" value={String(user.days_since_signup ?? '—')} />
            </div>

            {/* ── 3. ORIGEM ── */}
            {user.utm_source && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {user.utm_source?.toLowerCase().includes('google') ? '🔍' : user.utm_source?.toLowerCase().includes('meta') || user.utm_source?.toLowerCase().includes('facebook') ? '📘' : '🌐'}
                    Origem
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Fonte:</span> <span className="font-medium">{user.utm_source}</span></div>
                    {(user as any).utm_medium && <div><span className="text-muted-foreground">Meio:</span> <span className="font-medium">{(user as any).utm_medium}</span></div>}
                    {(user as any).utm_campaign && <div className="col-span-2"><span className="text-muted-foreground">Campanha:</span> <span className="font-medium">{(user as any).utm_campaign}</span></div>}
                    {(user as any).ad_click_id && <div className="col-span-2"><span className="text-muted-foreground">Click ID:</span> <span className="font-mono text-2xs">{String((user as any).ad_click_id).slice(0, 24)}…</span></div>}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* ── 4. TIMELINE ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Atividades</h3>
              {loadingActivities ? (
                <p className="text-xs text-muted-foreground">Carregando…</p>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                <div className="relative space-y-0">
                  {activities.map((a, i) => {
                    const cfg = ACTIVITY_ICONS[a.activity_type] ?? ACTIVITY_ICONS.system;
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="flex gap-3 pb-4">
                        {/* Vertical line */}
                        <div className="flex flex-col items-center">
                          <div className={cn('h-6 w-6 rounded-full flex items-center justify-center bg-muted shrink-0', cfg.className)}>
                            <Icon className="h-3 w-3" />
                          </div>
                          {i < activities.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-xs font-medium text-foreground">{a.title}</p>
                          {a.description && <p className="text-2xs text-muted-foreground mt-0.5">{a.description}</p>}
                          <p className="text-2xs text-muted-foreground mt-1">{relativeTime(a.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* ── 5. NOTAS ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Notas</h3>
              {notes.map(n => (
                <div key={n.id} className={cn('rounded-lg border p-3 text-xs space-y-1', n.is_pinned ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : 'border-border')}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                    <button onClick={() => handleTogglePin(n)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      {n.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-2xs text-muted-foreground">{relativeTime(n.created_at)}</p>
                </div>
              ))}
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicionar nota…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
                <Button size="sm" disabled={!newNote.trim() || savingNote} onClick={handleAddNote}>
                  {savingNote ? 'Salvando…' : 'Salvar nota'}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── FOOTER ── */}
        <div className="border-t border-border p-4 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${user.email ?? ''}`}><Mail className="mr-1.5 h-3.5 w-3.5" />Enviar Email</a>
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddTask}>
            <ListTodo className="mr-1.5 h-3.5 w-3.5" />Adicionar Tarefa
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onStatusChange(user.id, 'risco')}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Marcar Risco
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-2xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
