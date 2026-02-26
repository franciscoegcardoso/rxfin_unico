import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, CheckCircle, Eye, XCircle, MoreHorizontal, Clock, Loader2,
  MessageSquareWarning, Timer, ShieldCheck, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface FeedbackRow {
  id: string;
  user_id: string;
  message_id: string | null;
  session_id: string | null;
  feedback_type: string;
  user_comment: string | null;
  status: string;
  sla_deadline: string;
  resolution_note: string | null;
  blocked_topic: string | null;
  created_at: string;
  reviewed_at: string | null;
  // joined
  full_name: string | null;
  email: string | null;
  message_content: string | null;
}

// ── Helpers ──────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `há ${days}d`;
}

function slaRemaining(deadline: string): { label: string; overdue: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { label: 'Vencido', overdue: true };
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return { label: `${Math.ceil(diff / 60000)}min restantes`, overdue: false };
  return { label: `${hours}h restantes`, overdue: false };
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'default' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'destructive' },
  reviewing: { label: 'Em revisão', variant: 'secondary' },
  resolved: { label: 'Resolvido', variant: 'default' },
  dismissed: { label: 'Dispensado', variant: 'outline' },
};

// ── Component ────────────────────────────────────────────
export default function AIFeedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [slaOverdueOnly, setSlaOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolveItem, setResolveItem] = useState<FeedbackRow | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [unblockTopic, setUnblockTopic] = useState(true);
  const [dismissItem, setDismissItem] = useState<FeedbackRow | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch ──────────────────────────────────────────────
  const fetchFeedbacks = async () => {
    setLoading(true);

    // Fetch feedbacks
    let query = supabase
      .from('ai_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: fbData } = await query;
    const fbs = (fbData || []) as any[];

    if (fbs.length === 0) {
      setFeedbacks([]);
      setLoading(false);
      return;
    }

    // Batch fetch profiles
    const userIds = [...new Set(fbs.map(f => f.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Batch fetch messages
    const msgIds = fbs.map(f => f.message_id).filter(Boolean);
    let messageMap = new Map<string, string>();
    if (msgIds.length > 0) {
      const { data: msgs } = await supabase
        .from('ai_chat_messages')
        .select('id, content')
        .in('id', msgIds);
      messageMap = new Map((msgs || []).map(m => [m.id, m.content]));
    }

    const rows: FeedbackRow[] = fbs.map(fb => {
      const profile = profileMap.get(fb.user_id);
      return {
        ...fb,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        message_content: fb.message_id ? (messageMap.get(fb.message_id) || null) : null,
      };
    });

    // Sort: overdue pending → pending → reviewing → rest
    rows.sort((a, b) => {
      const priority = (f: FeedbackRow) => {
        if (f.status === 'pending' && new Date(f.sla_deadline) < new Date()) return 0;
        if (f.status === 'pending') return 1;
        if (f.status === 'reviewing') return 2;
        return 3;
      };
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFeedbacks(rows);
    setLoading(false);
  };

  useEffect(() => { fetchFeedbacks(); }, [statusFilter]);

  // ── Filtered list ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = feedbacks;
    if (slaOverdueOnly) {
      list = list.filter(f => f.status === 'pending' && new Date(f.sla_deadline) < new Date());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        (f.full_name?.toLowerCase().includes(q)) ||
        (f.email?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [feedbacks, slaOverdueOnly, searchQuery]);

  // ── Summary stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const pending = feedbacks.filter(f => f.status === 'pending').length;
    const overdue = feedbacks.filter(f => f.status === 'pending' && new Date(f.sla_deadline) < now).length;

    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const resolvedThisMonth = feedbacks.filter(f =>
      f.status === 'resolved' && f.reviewed_at?.startsWith(thisMonth)
    ).length;

    const resolved = feedbacks.filter(f => f.status === 'resolved' && f.reviewed_at);
    let avgHours = 0;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((sum, f) => {
        return sum + (new Date(f.reviewed_at!).getTime() - new Date(f.created_at).getTime());
      }, 0);
      avgHours = Math.round(totalMs / resolved.length / 3600000);
    }

    return { pending, overdue, resolvedThisMonth, avgHours };
  }, [feedbacks]);

  // ── Actions ────────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from('ai_feedback')
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    toast.success(`Status atualizado para ${STATUS_CONFIG[status]?.label || status}`);
    fetchFeedbacks();
  };

  const resolveAndUnblock = async () => {
    if (!resolveItem || !resolutionNote.trim()) {
      toast.error('Nota de resolução é obrigatória');
      return;
    }

    await supabase
      .from('ai_feedback')
      .update({
        status: 'resolved',
        resolution_note: resolutionNote,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', resolveItem.id);

    if (unblockTopic) {
      await supabase
        .from('ai_topic_blocks')
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id,
        })
        .eq('feedback_id', resolveItem.id)
        .eq('is_active', true);
    }

    toast.success('Feedback resolvido.');
    setResolveItem(null);
    setResolutionNote('');
    setUnblockTopic(true);
    fetchFeedbacks();
  };

  const confirmDismiss = async () => {
    if (!dismissItem) return;
    await updateStatus(dismissItem.id, 'dismissed');
    setDismissItem(null);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Governança IA — Feedbacks"
        description="Gerencie feedbacks de erro reportados pelos usuários"
        actions={
          <Badge variant={stats.pending > 0 ? 'destructive' : 'secondary'}>
            {stats.pending} pendente{stats.pending !== 1 ? 's' : ''}
          </Badge>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquareWarning className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.overdue > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <Timer className={`h-5 w-5 ${stats.overdue > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">SLA vencido</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.resolvedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Resolvidos (mês)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.avgHours}h</p>
              <p className="text-xs text-muted-foreground">Tempo médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="reviewing">Em revisão</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="dismissed">Dispensados</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="sla-overdue" checked={slaOverdueOnly} onCheckedChange={setSlaOverdueOnly} />
          <Label htmlFor="sla-overdue" className="text-sm cursor-pointer">SLA vencido</Label>
        </div>

        <Input
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-52"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Mensagem com erro</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((fb) => {
                  const sla = slaRemaining(fb.sla_deadline);
                  const sc = STATUS_CONFIG[fb.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={fb.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                            {(fb.full_name?.[0] || fb.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{fb.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground truncate">{fb.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">
                          {fb.message_content
                            ? (fb.message_content.length > 100 ? fb.message_content.slice(0, 100) + '…' : fb.message_content)
                            : '—'}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <p className="text-xs truncate">{fb.user_comment || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {sla.overdue && fb.status === 'pending' ? (
                          <Badge variant="destructive" className="animate-pulse text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> Vencido
                          </Badge>
                        ) : fb.status === 'pending' || fb.status === 'reviewing' ? (
                          <span className="text-xs text-muted-foreground">{sla.label}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {relativeTime(fb.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {fb.status === 'pending' && (
                              <DropdownMenuItem onClick={() => updateStatus(fb.id, 'reviewing')}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> Iniciar revisão
                              </DropdownMenuItem>
                            )}
                            {(fb.status === 'pending' || fb.status === 'reviewing') && (
                              <>
                                <DropdownMenuItem onClick={() => setResolveItem(fb)}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-2" /> Resolver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDismissItem(fb)}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-2" /> Dispensar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Nenhum feedback encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveItem} onOpenChange={() => setResolveItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nota de resolução *</Label>
              <Textarea
                placeholder="Descreva a resolução..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="unblock"
                checked={unblockTopic}
                onCheckedChange={(v) => setUnblockTopic(v === true)}
              />
              <Label htmlFor="unblock" className="text-sm cursor-pointer">
                Desbloquear tópico para o usuário
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveItem(null)}>Cancelar</Button>
            <Button onClick={resolveAndUnblock} disabled={!resolutionNote.trim()}>
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Confirmation */}
      <AlertDialog open={!!dismissItem} onOpenChange={() => setDismissItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar este feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              O feedback será marcado como dispensado e não aparecerá mais nos pendentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDismiss} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Dispensar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
