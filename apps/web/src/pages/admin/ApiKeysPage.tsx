import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { KeyRound, Plus, Clipboard, Eye, Pencil, Trash2, FileText, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useApiCredentials, type ApiCredential, type CreateCredentialPayload, type UpdateCredentialPayload, type ApiCredentialStatus, type ConnectivityResult, type AuditLogEntry, type ExpirationSummary, type SecurityLogEntry, type SecurityLogEventType } from '@/hooks/useApiCredentials';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SERVICES = ['pluggy', 'supabase', 'fipe', 'n8n', 'google', 'vercel', 'resend', 'openai', 'other'];
const CATEGORIES = ['banking', 'payments', 'infrastructure', 'external_api'];
const ENVIRONMENTS = ['production', 'staging', 'development'];
const STATUSES: ApiCredentialStatus[] = ['active', 'inactive', 'expired', 'testing'];

const SERVICE_ICONS: Record<string, string> = {
  pluggy: '🏦',
  supabase: '⚡',
  fipe: '🚗',
  n8n: '🔄',
  google: '🔵',
  vercel: '▲',
  resend: '📧',
  openai: '🤖',
  other: '🔑',
};

const CATEGORY_LABELS: Record<string, string> = {
  banking: 'Banking',
  payments: 'Pagamentos',
  infrastructure: 'Infraestrutura',
  external_api: 'APIs Externas',
};

const ENV_LABELS: Record<string, string> = {
  production: 'Produção',
  staging: 'Staging',
  development: 'Development',
};

const STATUS_LABELS: Record<ApiCredentialStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  expired: 'Expirado',
  testing: 'Teste',
};

function maskValue(val: string | undefined | null): string {
  if (!val || val.length < 12) return '••••••••';
  return `${val.slice(0, 4)}••••••••${val.slice(-4)}`;
}

const REVEAL_DURATION_SEC = 30;

const INACTIVITY_WARNING_MS = 12 * 60 * 1000;

export default function ApiKeysPage() {
  const navigate = useNavigate();
  const {
    credentials,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    reveal,
    fetchAudit,
    fetchAuditByCredential,
    testConnectivity,
    fetchExpirationSummary,
    fetchSecurityLog,
  } = useApiCredentials({
    onSessionExpired: () => {
      toast.warning('Sessão expirada por inatividade. Recarregue a página.');
      navigate('/login', { replace: true });
    },
  });

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      inactivityTimerRef.current = setTimeout(() => {
        toast.warning('⚠️ Sua sessão expirará em 3 minutos por inatividade.');
      }, INACTIVITY_WARNING_MS);
    };
    resetTimer();
    document.addEventListener('click', resetTimer);
    document.addEventListener('keydown', resetTimer);
    return () => {
      document.removeEventListener('click', resetTimer);
      document.removeEventListener('keydown', resetTimer);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, []);

  const [envFilter, setEnvFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCredential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiCredential | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<{ action: string; credential_name: string; service: string; environment: string; ip?: string; created_at: string }[]>([]);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedValue, setRevealedValue] = useState<{ key_value: string; secret_value?: string } | null>(null);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formService, setFormService] = useState('pluggy');
  const [formCategory, setFormCategory] = useState('banking');
  const [formEnvironment, setFormEnvironment] = useState('production');
  const [formStatus, setFormStatus] = useState<ApiCredentialStatus>('active');
  const [formKeyValue, setFormKeyValue] = useState('');
  const [formSecretValue, setFormSecretValue] = useState('');
  const [formEndpointUrl, setFormEndpointUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const [testResults, setTestResults] = useState<Record<string, { result: ConnectivityResult; expiresAt: number } | null>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expirationSummary, setExpirationSummary] = useState<ExpirationSummary | null>(null);
  const [expirationFilter, setExpirationFilter] = useState<'all' | 'expired' | 'expiring_1d' | 'expiring_7d' | 'expiring_30d'>('all');
  const [historyCredential, setHistoryCredential] = useState<ApiCredential | null>(null);
  const [credentialHistory, setCredentialHistory] = useState<AuditLogEntry[]>([]);
  const [securityLogOpen, setSecurityLogOpen] = useState(false);
  const [securityLog, setSecurityLog] = useState<SecurityLogEntry[]>([]);

  const filtered = useMemo(() => {
    let list = credentials.filter((c) => {
      if (envFilter !== 'all' && c.environment !== envFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
      if (searchName.trim() && !c.name.toLowerCase().includes(searchName.trim().toLowerCase())) return false;
      return true;
    });
    if (expirationFilter !== 'all' && expirationSummary) {
      const ids = expirationSummary[expirationFilter].map((x) => x.id);
      list = list.filter((c) => ids.includes(c.id));
    }
    return list;
  }, [credentials, envFilter, statusFilter, serviceFilter, searchName, expirationFilter, expirationSummary]);

  const byService = useMemo(() => {
    const map: Record<string, ApiCredential[]> = {};
    filtered.forEach((c) => {
      if (!map[c.service]) map[c.service] = [];
      map[c.service].push(c);
    });
    return map;
  }, [filtered]);

  useEffect(() => {
    if (!loading && !error) {
      fetchExpirationSummary().then(setExpirationSummary);
    }
  }, [loading, error, fetchExpirationSummary]);

  useEffect(() => {
    const now = Date.now();
    const toRemove = Object.entries(testResults).filter(([, v]) => v && v.expiresAt <= now);
    if (toRemove.length) {
      setTestResults((prev) => {
        const next = { ...prev };
        toRemove.forEach(([id]) => delete next[id]);
        return next;
      });
    }
    const t = setTimeout(() => {
      setTestResults((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([id, v]) => {
          if (v && v.expiresAt <= Date.now()) delete next[id];
        });
        return Object.keys(next).length ? next : {};
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [testResults]);

  const hasCriticalExpiration = useMemo(() => {
    if (!expirationSummary) return false;
    const n = expirationSummary.expired.length + expirationSummary.expiring_1d.length + expirationSummary.expiring_7d.length + expirationSummary.expiring_30d.length;
    return n > 0;
  }, [expirationSummary]);

  const handleTestConnectivity = async (c: ApiCredential) => {
    setTestingId(c.id);
    const out = await testConnectivity(c.id);
    setTestingId(null);
    if ('noEndpoint' in out && out.noEndpoint) {
      toast.error('Endpoint não configurado para esta credencial.');
      return;
    }
    if ('error' in out) {
      toast.error(out.error ?? 'Erro ao testar conectividade.');
      return;
    }
    setTestResults((prev) => ({
      ...prev,
      [c.id]: { result: out.result, expiresAt: Date.now() + 10 * 1000 },
    }));
  };

  const openHistoryModal = (c: ApiCredential) => {
    setHistoryCredential(c);
    setCredentialHistory([]);
    fetchAuditByCredential(c.id).then(setCredentialHistory);
  };

  const securityEventLabel = (eventType: SecurityLogEventType): string => {
    const labels: Record<SecurityLogEventType, string> = {
      unauthorized_access: 'Acesso não autorizado',
      forbidden_role: 'Role insuficiente',
      rate_limit_exceeded: 'Rate limit excedido',
      invalid_action: 'Ação inválida',
      session_expired: 'Sessão expirada',
      penetration_test: 'Teste de penetração',
    };
    return labels[eventType] ?? eventType;
  };

  const securityEventIcon = (eventType: SecurityLogEventType): string => {
    const icons: Record<SecurityLogEventType, string> = {
      unauthorized_access: '🚫',
      forbidden_role: '🔴',
      rate_limit_exceeded: '⏱',
      invalid_action: '❓',
      session_expired: '💤',
      penetration_test: '🧪',
    };
    return icons[eventType] ?? '•';
  };

  const isSecurityEventCritical = (eventType: SecurityLogEventType): boolean =>
    eventType === 'unauthorized_access' || eventType === 'forbidden_role';

  const openSecurityLog = () => {
    setSecurityLogOpen(true);
    setSecurityLog([]);
    fetchSecurityLog(50).then(setSecurityLog);
  };

  const actionIcon = (action: string): string => {
    const a = action?.toLowerCase() ?? '';
    if (a.includes('criad') || a.includes('created')) return '➕';
    if (a.includes('atualiz') || a.includes('updated')) return '✏️';
    if (a.includes('delet') || a.includes('deleted')) return '🗑';
    if (a.includes('revelad') || a.includes('revealed')) return '👁';
    if (a.includes('copiad') || a.includes('copied')) return '📋';
    if (a.includes('testad') || a.includes('tested')) return '🧪';
    return '•';
  };

  useEffect(() => {
    if (revealedId && revealSecondsLeft > 0) {
      const t = setTimeout(() => setRevealSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
    if (revealSecondsLeft === 0 && revealedId) {
      setRevealedId(null);
      setRevealedValue(null);
    }
  }, [revealedId, revealSecondsLeft]);

  const handleReveal = async (c: ApiCredential) => {
    const result = await reveal(c.id);
    if (result && 'rateLimited' in result && result.rateLimited) {
      const resetsAt = new Date(result.resetsAt);
      const now = new Date();
      const minLeft = Math.max(0, Math.ceil((resetsAt.getTime() - now.getTime()) / 60000));
      const timeStr = format(resetsAt, 'HH:mm', { locale: ptBR });
      toast.error(`🔒 Limite atingido. Liberado às ${timeStr} (${minLeft} min restantes)`);
      return;
    }
    if (result && 'key_value' in result) {
      setRevealedId(c.id);
      setRevealedValue(result);
      setRevealSecondsLeft(REVEAL_DURATION_SEC);
    } else {
      toast.error('Limite atingido: máx. 3 reveals por hora');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const openAudit = async () => {
    setAuditOpen(true);
    const log = await fetchAudit();
    setAuditLog(log);
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormService('pluggy');
    setFormCategory('banking');
    setFormEnvironment('production');
    setFormStatus('active');
    setFormKeyValue('');
    setFormSecretValue('');
    setFormEndpointUrl('');
    setFormDescription('');
    setFormExpiresAt('');
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formKeyValue.trim()) {
      toast.error('Nome e chave API são obrigatórios.');
      return;
    }
    const payload: CreateCredentialPayload = {
      name: formName.trim(),
      service: formService,
      category: formCategory,
      environment: formEnvironment,
      key_value: formKeyValue.trim(),
      secret_value: formSecretValue.trim() || undefined,
      endpoint_url: formEndpointUrl.trim() || undefined,
      description: formDescription.trim() || undefined,
      expires_at: formExpiresAt || undefined,
      status: formStatus,
    };
    setFormSubmitting(true);
    const ok = await create(payload);
    setFormSubmitting(false);
    if (ok) {
      toast.success('Credencial criada.');
      setCreateOpen(false);
      resetCreateForm();
    } else {
      toast.error('Erro ao criar credencial.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const payload: UpdateCredentialPayload = {
      name: formName.trim(),
      service: formService,
      category: formCategory,
      environment: formEnvironment,
      secret_value: formSecretValue.trim() || undefined,
      endpoint_url: formEndpointUrl.trim() || undefined,
      description: formDescription.trim() || undefined,
      expires_at: formExpiresAt || undefined,
      status: formStatus,
    };
    if (formKeyValue.trim()) payload.key_value = formKeyValue.trim();
    setFormSubmitting(true);
    const ok = await update(editing.id, payload);
    setFormSubmitting(false);
    if (ok) {
      toast.success('Credencial atualizada.');
      setEditing(null);
    } else {
      toast.error('Erro ao atualizar.');
    }
  };

  const openCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const openEdit = (c: ApiCredential) => {
    setEditing(c);
    setFormName(c.name);
    setFormService(c.service);
    setFormCategory(c.category);
    setFormEnvironment(c.environment);
    setFormStatus(c.status);
    setFormKeyValue('');
    setFormSecretValue('');
    setFormEndpointUrl(c.endpoint_url ?? '');
    setFormDescription(c.description ?? '');
    setFormExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : '');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await remove(deleteTarget.id);
    if (ok) {
      toast.success('Credencial removida.');
      setDeleteTarget(null);
    } else {
      toast.error('Erro ao remover.');
    }
  };

  const statusBadgeVariant = (status: ApiCredentialStatus) => {
    if (status === 'active') return 'default';
    if (status === 'expired') return 'destructive';
    if (status === 'testing') return 'secondary';
    return 'outline';
  };

  const envBadgeClass = (env: string) => {
    if (env === 'production') return 'bg-indigo-500/10 text-indigo-600';
    if (env === 'staging') return 'bg-amber-500/10 text-amber-600';
    return 'bg-green-500/10 text-green-600';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="API Keys"
        description="Gerencie credenciais e chaves de API por serviço e ambiente"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasCriticalExpiration && expirationSummary && (
              <>
                {expirationSummary.expired.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                    onClick={() => setExpirationFilter('expired')}
                  >
                    🔴 {expirationSummary.expired.length} expirada{expirationSummary.expired.length !== 1 ? 's' : ''}
                  </Button>
                )}
                {expirationSummary.expiring_1d.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                    onClick={() => setExpirationFilter('expiring_1d')}
                  >
                    🔴 {expirationSummary.expiring_1d.length} expira hoje
                  </Button>
                )}
                {expirationSummary.expiring_7d.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950"
                    onClick={() => setExpirationFilter('expiring_7d')}
                  >
                    🟡 {expirationSummary.expiring_7d.length} em 7 dias
                  </Button>
                )}
                {expirationSummary.expiring_30d.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                    onClick={() => setExpirationFilter('expiring_30d')}
                  >
                    🔵 {expirationSummary.expiring_30d.length} em 30 dias
                  </Button>
                )}
                {expirationFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setExpirationFilter('all')}>
                    Todos
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" size="sm" onClick={openSecurityLog} className="gap-1.5">
              🛡 Segurança
            </Button>
            <Button variant="outline" size="sm" onClick={openAudit} className="gap-1.5">
              <FileText className="h-4 w-4" />
              Audit Log
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Credencial
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="max-w-xs"
        />
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Ambiente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ENVIRONMENTS.map((e) => (
              <SelectItem key={e} value={e}>{ENV_LABELS[e]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {SERVICES.map((s) => (
              <SelectItem key={s} value={s}>{SERVICE_ICONS[s] ?? '🔑'} {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byService).map(([service, items]) => (
            <Card key={service}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{SERVICE_ICONS[service] ?? '🔑'}</span>
                  <span className="capitalize">{service}</span>
                  <Badge variant="secondary" className="font-normal">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((c) => {
                  const isRevealed = revealedId === c.id;
                  const val = isRevealed ? revealedValue : null;
                  const displayKey = val ? val.key_value : maskValue(c.key_masked ?? undefined);
                  const displaySecret = val?.secret_value;
                  const testResult = testResults[c.id];
                  const showTestResult = testResult && testResult.expiresAt > Date.now();
                  const res = testResult?.result;
                  const isTesting = testingId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[c.category] ?? c.category} • {ENV_LABELS[c.environment] ?? c.environment}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant={statusBadgeVariant(c.status)} className="text-xs">
                            {STATUS_LABELS[c.status]}
                          </Badge>
                          <Badge className={cn('text-xs', envBadgeClass(c.environment))}>
                            {ENV_LABELS[c.environment]}
                          </Badge>
                          {c.expires_at && (
                            <span className="text-xs text-muted-foreground">
                              Expira: {format(new Date(c.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {c.endpoint_url && (
                          <p className="text-xs text-muted-foreground mt-1 truncate" title={c.endpoint_url}>
                            {c.endpoint_url}
                          </p>
                        )}
                        {showTestResult && res && (
                          <p className={cn(
                            'text-xs mt-1',
                            res.reachable ? 'text-green-600' : res.status_code ? 'text-amber-600' : 'text-destructive'
                          )}>
                            {res.reachable && (
                              <>✅ Acessível · {res.latency_ms != null ? `${res.latency_ms}ms` : ''} · {res.status_code != null ? `HTTP ${res.status_code}` : ''}</>
                            )}
                            {!res.reachable && res.status_code != null && (
                              <>⚠️ HTTP {res.status_code} · {res.latency_ms != null ? `${res.latency_ms}ms` : ''}</>
                            )}
                            {!res.reachable && res.status_code == null && (
                              <>❌ Inacessível · {res.error ?? 'Erro'}</>
                            )}
                          </p>
                        )}
                        <div className="mt-2 font-mono text-xs text-muted-foreground break-all">
                          Key: {displayKey}
                          {displaySecret != null && displaySecret !== '' && (
                            <> • Secret: {displaySecret}</>
                          )}
                        </div>
                        {isRevealed && revealSecondsLeft > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Ocultar em {revealSecondsLeft}s
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => openHistoryModal(c)}
                          className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Clock className="h-3 w-3" />
                          Ver histórico
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.endpoint_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => handleTestConnectivity(c)}
                            disabled={isTesting}
                            title="Testar conectividade"
                          >
                            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '🧪'}
                            {isTesting ? 'Testando...' : 'Testar'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReveal(c)}
                          title="Revelar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(val?.key_value ?? c.key_masked ?? '', c.id)}
                          title="Copiar chave"
                        >
                          {copiedId === c.id ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <Clipboard className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(c)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma credencial encontrada.
            </p>
          )}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Credencial</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Ex: Pluggy Produção" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serviço</Label>
                <Select value={formService} onValueChange={setFormService}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s} value={s}>{SERVICE_ICONS[s]} {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ambiente</Label>
                <Select value={formEnvironment} onValueChange={setFormEnvironment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e} value={e}>{ENV_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as ApiCredentialStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Chave API *</Label>
              <Input type="password" value={formKeyValue} onChange={(e) => setFormKeyValue(e.target.value)} required placeholder="••••••••" />
            </div>
            <div>
              <Label>Secret (opcional)</Label>
              <Input type="password" value={formSecretValue} onChange={(e) => setFormSecretValue(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label>Endpoint URL (opcional)</Label>
              <Input value={formEndpointUrl} onChange={(e) => setFormEndpointUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Uso desta credencial" />
            </div>
            <div>
              <Label>Data de expiração (opcional)</Label>
              <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? 'Salvando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Credencial</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serviço</Label>
                  <Select value={formService} onValueChange={setFormService}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICES.map((s) => (
                        <SelectItem key={s} value={s}>{SERVICE_ICONS[s]} {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ambiente</Label>
                  <Select value={formEnvironment} onValueChange={setFormEnvironment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e} value={e}>{ENV_LABELS[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v as ApiCredentialStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Nova chave (deixe vazio para manter)</Label>
                <Input type="password" value={formKeyValue} onChange={(e) => setFormKeyValue(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <Label>Secret (opcional)</Label>
                <Input type="password" value={formSecretValue} onChange={(e) => setFormSecretValue(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <Label>Endpoint URL (opcional)</Label>
                <Input value={formEndpointUrl} onChange={(e) => setFormEndpointUrl(e.target.value)} />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div>
                <Label>Data de expiração (opcional)</Label>
                <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir credencial</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Log modal */}
      <Dialog open={securityLogOpen} onOpenChange={setSecurityLogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log de Segurança</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {securityLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento de segurança registrado.</p>
            ) : (
              securityLog.map((entry) => {
                const critical = isSecurityEventCritical(entry.event_type);
                const detailMsg = entry.details && (entry.details['action'] ?? entry.details['message']);
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex flex-wrap gap-2 rounded border p-2 text-sm',
                      critical && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                    )}
                  >
                    <span className="shrink-0">{securityEventIcon(entry.event_type)}</span>
                    <span className="font-medium">{securityEventLabel(entry.event_type)}</span>
                    {entry.ip_address && (
                      <span className="text-muted-foreground text-xs">{entry.ip_address}</span>
                    )}
                    <span className="text-muted-foreground ml-auto">
                      {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                    {detailMsg != null && (
                      <p className="text-xs text-muted-foreground w-full mt-0.5">
                        {String(detailMsg)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit modal */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro.</p>
            ) : (
              auditLog.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
                  <Badge variant="outline">{entry.action}</Badge>
                  <span className="font-medium">{entry.credential_name}</span>
                  <span className="text-muted-foreground">{entry.service} • {entry.environment}</span>
                  {entry.ip && <span className="text-muted-foreground">{entry.ip}</span>}
                  <span className="text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Histórico por credencial */}
      <Dialog open={!!historyCredential} onOpenChange={(open) => !open && setHistoryCredential(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {historyCredential?.name ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {credentialHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação registrada para esta credencial.</p>
            ) : (
              [...credentialHistory]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((entry, i) => (
                  <div key={i} className="flex flex-wrap gap-2 rounded border p-2 text-sm">
                    <span className="shrink-0">{actionIcon(entry.action)}</span>
                    <span className="font-medium">{entry.action}</span>
                    {entry.metadata?.fields_updated?.length ? (
                      <span className="text-muted-foreground text-xs">
                        ({entry.metadata.fields_updated.join(', ')})
                      </span>
                    ) : null}
                    <span className="text-muted-foreground ml-auto">
                      {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {entry.ip && (
                      <span className="text-muted-foreground text-xs w-full">{entry.ip}</span>
                    )}
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
