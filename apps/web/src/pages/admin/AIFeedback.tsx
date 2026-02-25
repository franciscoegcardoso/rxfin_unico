import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Feedback {
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
}

export default function AIFeedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveItem, setResolveItem] = useState<Feedback | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    let query = supabase
      .from('ai_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setFeedbacks((data as Feedback[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from('ai_feedback')
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    toast.success(`Status atualizado para ${status}`);
    fetchFeedbacks();
  };

  const resolveAndUnblock = async () => {
    if (!resolveItem) return;
    await supabase
      .from('ai_feedback')
      .update({
        status: 'resolved',
        resolution_note: resolutionNote,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', resolveItem.id);

    // Unblock any topic blocks related to this feedback
    await supabase
      .from('ai_topic_blocks')
      .update({
        is_active: false,
        unblocked_at: new Date().toISOString(),
        unblocked_by: user?.id,
      })
      .eq('feedback_id', resolveItem.id);

    toast.success('Feedback resolvido e tópicos desbloqueados.');
    setResolveItem(null);
    setResolutionNote('');
    fetchFeedbacks();
  };

  const isOverdue = (deadline: string) => new Date(deadline) < new Date();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Governança IA — Feedbacks"
        description="Gerencie feedbacks e tópicos bloqueados da IA"
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="reviewing">Em revisão</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="dismissed">Dispensados</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell className="text-sm font-mono">{fb.user_id.slice(0, 8)}...</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {fb.user_comment || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        fb.status === 'pending' ? 'destructive'
                        : fb.status === 'reviewing' ? 'secondary'
                        : fb.status === 'resolved' ? 'default'
                        : 'outline'
                      }
                    >
                      {fb.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isOverdue(fb.sla_deadline) && fb.status === 'pending' ? (
                      <Badge variant="destructive" className="animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Vencido
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {new Date(fb.sla_deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {fb.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(fb.id, 'reviewing')}>
                          <Eye className="h-3 w-3 mr-1" /> Revisar
                        </Button>
                      )}
                      {(fb.status === 'pending' || fb.status === 'reviewing') && (
                        <>
                          <Button size="sm" variant="default" onClick={() => setResolveItem(fb)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(fb.id, 'dismissed')}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {feedbacks.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum feedback encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveItem} onOpenChange={() => setResolveItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver feedback</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Nota de resolução..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveItem(null)}>Cancelar</Button>
            <Button onClick={resolveAndUnblock}>Resolver e desbloquear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
