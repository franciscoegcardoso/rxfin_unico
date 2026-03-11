import React, { useState, useMemo } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, UserCog } from 'lucide-react';
import { useAdminRoles, type AdminUser, type AdminRole, type RoleChangeEntry } from '@/hooks/useAdminRoles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner',
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

const ROLE_ICONS: Record<AdminRole, string> = {
  owner: '👑',
  super_admin: '🛡',
  admin: '⚙️',
  user: '👤',
};

const ROLE_BADGE_CLASS: Record<AdminRole, string> = {
  owner: 'bg-indigo-900/80 text-indigo-100',
  super_admin: 'bg-indigo-600/80 text-white',
  admin: 'bg-blue-600/80 text-white',
  user: 'bg-muted text-muted-foreground',
};

function getInitials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AdminRolesPage() {
  const { user } = useAuth();
  const { admins, loading, error, reload, setRole, fetchHistory, isOwner } = useAdminRoles();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<RoleChangeEntry[]>([]);
  const [alterOpen, setAlterOpen] = useState(false);
  const [alterTarget, setAlterTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'super_admin' | 'owner'>('admin');
  const [reason, setReason] = useState('');
  const [confirmPromotionOpen, setConfirmPromotionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  type SortField = 'name' | 'email' | 'role' | 'created_at' | 'last_change';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedAdmins = useMemo(() => {
    let list = admins;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.full_name ?? '').toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          ROLE_LABELS[a.role].toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email);
          break;
        case 'email':
          cmp = a.email.localeCompare(b.email);
          break;
        case 'role': {
          const order: AdminRole[] = ['user', 'admin', 'super_admin', 'owner'];
          cmp = order.indexOf(a.role) - order.indexOf(b.role);
          break;
        }
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'last_change': {
          const at = a.last_change ? new Date(a.last_change.changed_at).getTime() : 0;
          const bt = b.last_change ? new Date(b.last_change.changed_at).getTime() : 0;
          cmp = at - bt;
          break;
        }
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [admins, searchQuery, sortField, sortDir]);

  const cycleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const openAlter = (target: AdminUser) => {
    setAlterTarget(target);
    const opts = (target.role === 'owner'
      ? (['user', 'admin', 'super_admin', 'owner'] as const)
      : (['admin', 'super_admin', 'owner'] as const)
    ).filter((r) => r !== target.role);
    setNewRole((opts[0] ?? 'admin') as 'user' | 'admin' | 'super_admin' | 'owner');
    setReason('');
    setAlterOpen(true);
  };

  const openHistory = () => {
    setHistoryOpen(true);
    setHistoryList([]);
    fetchHistory().then(setHistoryList);
  };

  const handleConfirmRole = async () => {
    if (!alterTarget || !reason.trim() || reason.trim().length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres.');
      return;
    }
    const isPromotionToOwner = newRole === 'owner';
    const isDemotion = newRole === 'user';
    if (isPromotionToOwner || isDemotion) {
      setConfirmPromotionOpen(true);
      return;
    }
    await doSetRole();
  };

  const doSetRole = async () => {
    if (!alterTarget || !reason.trim() || reason.trim().length < 10) return;
    setSubmitting(true);
    const ok = await setRole({
      targetUserId: alterTarget.id,
      newRole,
      reason: reason.trim(),
    });
    setSubmitting(false);
    setConfirmPromotionOpen(false);
    if (ok) {
      toast.success(`Role de ${alterTarget.full_name || alterTarget.email} alterado para ${ROLE_LABELS[newRole]} com sucesso.`);
      setAlterOpen(false);
      setAlterTarget(null);
      setReason('');
      reload();
    }
  };

  const roleOptions: Array<'user' | 'admin' | 'super_admin' | 'owner'> = alterTarget
    ? (alterTarget.role === 'owner'
        ? (['user', 'admin', 'super_admin', 'owner'] as const)
        : (['admin', 'super_admin', 'owner'] as const)
      ).filter((r) => r !== alterTarget.role) as Array<'user' | 'admin' | 'super_admin' | 'owner'>
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Ações nesta página são permanentes e auditadas. Alterações de role afetam o acesso ao sistema imediatamente.
          Todos os eventos são registrados com motivo e timestamp.
        </p>
      </div>

      <AdminPageHeader
        title="Gestão de Roles"
        description="Gerencie os níveis de acesso dos administradores do RXFin."
        actions={
          isOwner ? (
            <Button variant="outline" size="sm" onClick={openHistory} className="gap-1.5">
              <FileText className="h-4 w-4" />
              Histórico
            </Button>
          ) : undefined
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && admins.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, e-mail ou role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-sm mb-4"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => cycleSort('name')}
                    >
                      Usuário
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => cycleSort('role')}
                    >
                      Role
                      <SortIcon field="role" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => cycleSort('created_at')}
                    >
                      Cadastro
                      <SortIcon field="created_at" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => cycleSort('last_change')}
                    >
                      Última alteração
                      <SortIcon field="last_change" />
                    </button>
                  </TableHead>
                  {isOwner && <TableHead className="w-[120px] text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 6 : 5} className="text-center text-muted-foreground py-8">
                      {searchQuery.trim() ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum usuário admin cadastrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedAdmins.map((admin) => {
                    const isSelf = user?.id === admin.id;
                    const canAlter = isOwner && !isSelf;
                    return (
                      <TableRow key={admin.id} className={isSelf ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {getInitials(admin.full_name, admin.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{admin.full_name || admin.email}</p>
                              <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', ROLE_BADGE_CLASS[admin.role])}>
                            {ROLE_ICONS[admin.role]} {ROLE_LABELS[admin.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.is_active ? 'default' : 'secondary'} className="text-xs">
                            {admin.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(admin.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[180px]">
                          {admin.last_change ? (
                            <span title={`${admin.last_change.old_role} → ${admin.last_change.new_role}`}>
                              {format(new Date(admin.last_change.changed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right">
                            {canAlter ? (
                              <Button variant="outline" size="sm" onClick={() => openAlter(admin)} className="gap-1.5">
                                <UserCog className="h-3.5 w-3.5" />
                                Alterar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Você</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal Alterar Role */}
      <Dialog open={alterOpen} onOpenChange={(open) => !open && (setAlterOpen(false), setAlterTarget(null), setReason(''))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
          </DialogHeader>
          {alterTarget && (
            <div className="space-y-4">
              <div>
                <Label>Usuário</Label>
                <p className="text-sm font-medium">{alterTarget.full_name || alterTarget.email}</p>
                <p className="text-xs text-muted-foreground">{alterTarget.email}</p>
              </div>
              <div>
                <Label>Role atual</Label>
                <Badge className={cn('mt-1', ROLE_BADGE_CLASS[alterTarget.role])}>
                  {ROLE_ICONS[alterTarget.role]} {ROLE_LABELS[alterTarget.role]}
                </Badge>
              </div>
              <div>
                <Label>Novo role</Label>
                <Select
                  value={roleOptions.includes(newRole) ? newRole : (roleOptions[0] ?? 'admin')}
                  onValueChange={(v) => setNewRole(v as 'user' | 'admin' | 'super_admin' | 'owner')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_ICONS[r]} {ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motivo (obrigatório, mínimo 10 caracteres)</Label>
                <Textarea
                  placeholder="Descreva o motivo da alteração para auditoria."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAlterOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleConfirmRole}
                  disabled={!reason.trim() || reason.trim().length < 10 || submitting}
                >
                  {submitting ? 'Salvando...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog confirmação promoção/rebaixamento */}
      <AlertDialog open={confirmPromotionOpen} onOpenChange={setConfirmPromotionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>
              {newRole === 'owner'
                ? 'Esta ação concede acesso máximo ao sistema. Confirme que deseja continuar.'
                : 'Esta ação rebaixa o usuário para acesso apenas ao produto. Confirme que deseja continuar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doSetRole} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de alterações de role</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {historyList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração de role registrada.</p>
            ) : (
              historyList.map((entry) => (
                <div key={entry.id} className="flex flex-wrap gap-2 rounded border p-2 text-sm">
                  <span className="font-medium">{entry.target_email}</span>
                  <span className="text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{entry.old_role}</Badge>
                    {' → '}
                    <Badge variant="outline" className="text-xs">{entry.new_role}</Badge>
                  </span>
                  {entry.reason && <p className="text-xs text-muted-foreground w-full">{entry.reason}</p>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
