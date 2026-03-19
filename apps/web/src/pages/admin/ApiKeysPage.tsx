import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  KeyRound,
  Plus,
  Clipboard,
  ExternalLink,
  Pencil,
  Ban,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useApiCredentials } from '@/hooks/useApiCredentials';
import type {
  ApiCredential,
  ApiCredentialCategory,
  ApiCredentialEnvironment,
  ApiKeyAuditEntry,
} from '@/types/apiCredentials';
import { CredentialFormModal } from '@/components/admin/api-credentials/CredentialFormModal';
import { RotateCredentialModal } from '@/components/admin/api-credentials/RotateCredentialModal';
import { EdgeFunctionSecretsSection } from '@/components/admin/EdgeFunctionSecretsSection';
import { WebhooksSection } from '@/components/admin/WebhooksSection';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER: ApiCredentialCategory[] = [
  'open_finance',
  'ai',
  'market_data',
  'infra',
  'automation',
  'communication',
  'mobile',
];

const CATEGORY_SECTION_LABEL: Record<ApiCredentialCategory, string> = {
  open_finance: '🔑 Open Finance',
  ai: '🤖 Inteligência Artificial',
  market_data: '📈 Dados de Mercado',
  infra: '🔐 Infraestrutura',
  automation: '⚙️ Automação',
  communication: '✉️ Comunicação',
  mobile: '📱 Mobile',
};

const REVEAL_MS = 30_000;

function auditActionBadgeClass(action: ApiKeyAuditEntry['action']): string {
  switch (action) {
    case 'create':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
    case 'update':
      return 'bg-muted text-muted-foreground border-border';
    case 'reveal':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
    case 'rotate':
      return 'bg-orange-500/15 text-orange-800 dark:text-orange-400 border-orange-500/30';
    case 'revoke':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    default:
      return 'bg-muted';
  }
}

function formatAuditDetails(entry: ApiKeyAuditEntry): string {
  const m = entry.metadata || {};
  const parts: string[] = [];
  if (m.field != null) parts.push(`campo: ${String(m.field)}`);
  if (m.action != null) parts.push(String(m.action));
  if (m.message != null) parts.push(String(m.message));
  if (m.rotated === true || String(m.type).includes('rotate')) parts.push('chave rotacionada');
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

export default function ApiKeysPage() {
  const {
    credentials,
    isLoading,
    vaultSecrets,
    isLoadingVault,
    webhookSummary,
    isLoadingWebhooks,
    upsert,
    reveal,
    rotate,
    revoke,
    auditLog,
    fetchAuditLog,
  } = useApiCredentials();

  const [tab, setTab] = useState('credentials');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ApiCredential | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<ApiCredential | null>(null);
  const [rotateSubmitting, setRotateSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiCredential | null>(null);
  const [auditFilterId, setAuditFilterId] = useState<string>('all');

  /** `${id}:key` | `${id}:secret` -> value until hidden */
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const revealTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearReveal = useCallback((slot: string) => {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    const t = revealTimers.current[slot];
    if (t) clearTimeout(t);
    delete revealTimers.current[slot];
  }, []);

  const scheduleHide = useCallback(
    (slot: string) => {
      if (revealTimers.current[slot]) clearTimeout(revealTimers.current[slot]);
      revealTimers.current[slot] = setTimeout(() => clearReveal(slot), REVEAL_MS);
    },
    [clearReveal]
  );

  useEffect(() => {
    return () => {
      Object.values(revealTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (tab !== 'audit') return;
    void fetchAuditLog(auditFilterId === 'all' ? undefined : auditFilterId).catch((e) => {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar auditoria');
    });
  }, [tab, auditFilterId, fetchAuditLog]);

  const byCategory = useMemo(() => {
    const map = new Map<ApiCredentialCategory, ApiCredential[]>();
    CATEGORY_ORDER.forEach((c) => map.set(c, []));
    credentials.forEach((cred) => {
      const list = map.get(cred.category) ?? [];
      list.push(cred);
      map.set(cred.category, list);
    });
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return map;
  }, [credentials]);

  const handleReveal = async (c: ApiCredential, field: 'key' | 'secret') => {
    const slot = `${c.id}:${field}`;
    try {
      const value = await reveal(c.id, field);
      setRevealed((prev) => ({ ...prev, [slot]: value }));
      scheduleHide(slot);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const low = msg.toLowerCase();
      if (
        low.includes('rate') ||
        low.includes('limite') ||
        low.includes('too many') ||
        low.includes('429')
      ) {
        toast.error('Limite de revelações atingido. Aguarde antes de tentar novamente.');
      } else {
        toast.error(msg || 'Não foi possível revelar o valor.');
      }
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success('Copiado'));
  };

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: ApiCredential) => {
    setFormMode('edit');
    setEditing(c);
    setFormOpen(true);
  };

  const onFormSubmit = async (values: {
    name: string;
    service: string;
    category: ApiCredentialCategory;
    environment: ApiCredentialEnvironment;
    key_value: string;
    secret_value: string;
    endpoint_url: string;
    description: string;
    expires_at: string;
  }) => {
    if (formMode === 'create' && !values.key_value.trim()) {
      toast.error('Key value é obrigatório ao criar.');
      return;
    }
    setFormSubmitting(true);
    try {
      await upsert({
        id: editing?.id,
        name: values.name,
        service: values.service,
        category: values.category,
        environment: values.environment,
        key_value: values.key_value,
        secret_value: values.secret_value || undefined,
        endpoint_url: values.endpoint_url || null,
        description: values.description || null,
        expires_at: values.expires_at
          ? new Date(values.expires_at + 'T12:00:00').toISOString()
          : null,
      });
      toast.success(formMode === 'create' ? 'Credencial criada.' : 'Credencial atualizada.');
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setFormSubmitting(false);
    }
  };

  const onRotateSubmit = async (newKey: string, newSecret: string) => {
    if (!rotateTarget) return;
    if (!rotateTarget.has_secret && !newKey) {
      toast.error('Informe a nova key.');
      return;
    }
    if (rotateTarget.has_secret && !newKey && !newSecret) {
      toast.error('Informe nova key e/ou novo secret.');
      return;
    }
    setRotateSubmitting(true);
    try {
      await rotate(rotateTarget.id, {
        new_key_value: newKey || undefined,
        new_secret_value: newSecret || undefined,
      });
      toast.success('Chave rotacionada com sucesso');
      setRotateOpen(false);
      setRotateTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao rotacionar');
    } finally {
      setRotateSubmitting(false);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revoke(revokeTarget.id);
      toast.success('Credencial revogada.');
      setRevokeTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao revogar');
    }
  };

  const envBadge = (env: string) => {
    if (env === 'production')
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (env === 'sandbox')
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const statusBadge = (status: string) => {
    if (status === 'active')
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (status === 'inactive') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };

  const renderCredentialCard = (c: ApiCredential) => {
    const keySlot = `${c.id}:key`;
    const secSlot = `${c.id}:secret`;
    const showKey = revealed[keySlot];
    const showSec = revealed[secSlot];
    const expiredSoon =
      c.expires_at && differenceInDays(new Date(c.expires_at), new Date()) < 30;
    const daysToExp = c.expires_at
      ? differenceInDays(new Date(c.expires_at), new Date())
      : null;

    return (
      <Card
        key={c.id}
        className={cn(
          'border-border bg-card transition-opacity',
          c.status === 'revoked' && 'opacity-60'
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', envBadge(c.environment))}>
                  {c.environment}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', statusBadge(c.status))}>
                  {c.status === 'active' ? 'Ativa' : c.status === 'inactive' ? 'Inativa' : 'Revogada'}
                </Badge>
              </div>
              {c.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              )}
              {c.endpoint_url && (
                <a
                  href={c.endpoint_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  {c.endpoint_url.length > 48 ? `${c.endpoint_url.slice(0, 48)}…` : c.endpoint_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                {c.last_rotated_at
                  ? `Última rotação: ${formatDistanceToNow(new Date(c.last_rotated_at), { locale: ptBR, addSuffix: true })}`
                  : 'Nunca rotacionada'}
              </p>
              {c.expires_at && (
                <p
                  className={cn(
                    'text-xs',
                    expiredSoon ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}
                >
                  Expira em:{' '}
                  {daysToExp != null && daysToExp >= 0
                    ? `${daysToExp} dia(s) (${format(new Date(c.expires_at), 'dd/MM/yyyy', { locale: ptBR })})`
                    : format(new Date(c.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {(showKey || showSec) && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              {showKey && (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={showKey}
                    className="font-mono text-xs h-9 bg-zinc-900 text-emerald-400 border-zinc-700"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={() => handleCopy(showKey)}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {showSec && (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={showSec}
                    className="font-mono text-xs h-9 bg-zinc-900 text-emerald-400 border-zinc-700"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={() => handleCopy(showSec)}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-[10px] text-amber-600 dark:text-amber-500">
                Valor oculto automaticamente em 30 segundos
              </p>
            </div>
          )}

          {!showKey && !showSec && (
            <div className="font-mono text-xs text-muted-foreground">••••••••••</div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={c.status === 'revoked'}
              onClick={() => handleReveal(c, 'key')}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Revelar Key
            </Button>
            {c.has_secret && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={c.status === 'revoked'}
                onClick={() => handleReveal(c, 'secret')}
              >
                Revelar Secret
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={c.status === 'revoked'}
              onClick={() => {
                setRotateTarget(c);
                setRotateOpen(true);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Rotacionar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={c.status === 'revoked'}
              onClick={() => openEdit(c)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-destructive border-destructive/50 hover:bg-destructive/10"
              disabled={c.status === 'revoked'}
              onClick={() => setRevokeTarget(c)}
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              Revogar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="API Keys & Credenciais"
        description="Gestão centralizada via Supabase (RPC). Valores sensíveis nunca aparecem na listagem."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Credencial
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <Card className="border-dashed border-border bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <KeyRound className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma credencial cadastrada</p>
                <Button onClick={openCreate}>Adicionar primeira credencial</Button>
              </CardContent>
            </Card>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={CATEGORY_ORDER.filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0).slice(
                0,
                3
              )}
              className="w-full space-y-2"
            >
              {CATEGORY_ORDER.map((cat) => {
                const items = byCategory.get(cat) ?? [];
                return (
                  <AccordionItem
                    key={cat}
                    value={cat}
                    className="border border-border rounded-lg bg-card px-2 data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="px-2 py-3 hover:no-underline text-foreground">
                      <span className="font-semibold text-sm">{CATEGORY_SECTION_LABEL[cat]}</span>
                      <Badge variant="secondary" className="ml-2 font-normal">
                        {items.length}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-0 space-y-3">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Nenhuma credencial nesta categoria.</p>
                      ) : (
                        items.map(renderCredentialCard)
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          <EdgeFunctionSecretsSection data={vaultSecrets} isLoading={isLoadingVault} />
          <WebhooksSection data={webhookSummary} isLoading={isLoadingWebhooks} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <LabelInline>Filtrar por credencial</LabelInline>
            <Select value={auditFilterId} onValueChange={setAuditFilterId}>
              <SelectTrigger className="w-[280px] bg-background border-border">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {credentials.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void fetchAuditLog(auditFilterId === 'all' ? undefined : auditFilterId).catch((e) =>
                  toast.error(e instanceof Error ? e.message : 'Erro')
                )
              }
            >
              Atualizar
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Credencial</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Nenhum registro de auditoria.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...auditLog]
                    .sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    .map((entry) => (
                      <TableRow key={entry.id} className="border-border">
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                              auditActionBadgeClass(entry.action)
                            )}
                          >
                            {entry.action}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{entry.credential_name}</TableCell>
                        <TableCell className="text-sm">{entry.service}</TableCell>
                        <TableCell className="text-sm">{entry.environment}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                          {formatAuditDetails(entry)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <CredentialFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editing}
        onSubmit={onFormSubmit}
        submitting={formSubmitting}
      />

      <RotateCredentialModal
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        credential={rotateTarget}
        onRotate={onRotateSubmit}
        submitting={rotateSubmitting}
      />

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar credencial</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita. A credencial ficará com status revogado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmRevoke()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LabelInline({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground">{children}</span>;
}
