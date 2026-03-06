import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Loader2,
  RefreshCw,
  History,
  RotateCcw,
} from 'lucide-react';
import { ConnectorLogo } from './ConnectorLogo';
import { SyncStatusBadge } from './SyncStatusBadge';
import { usePluggyConnect } from '@/hooks/usePluggyConnect';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SyncJob {
  id: string;
  item_id: string;
  status: string;
  action: string;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

interface SyncLog {
  id: string;
  item_id: string;
  accounts_synced: number;
  transactions_synced: number;
  duration_ms: number;
  error: string | null;
  created_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca sincronizado';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(diffMs / 86400000);
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDateTimeBR(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const jobStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Sincronizando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  done: { label: 'Concluído', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  error: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/** Returns remaining cooldown ms, or 0 if cooldown expired */
function getCooldownRemaining(lastSyncAt: string | null): number {
  if (!lastSyncAt) return 0;
  const elapsed = Date.now() - new Date(lastSyncAt).getTime();
  return Math.max(0, COOLDOWN_MS - elapsed);
}

/** Checks if last_sync_at is from today (BRT timezone approximation) */
function isSyncedToday(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return false;
  const now = new Date();
  const last = new Date(lastSyncAt);
  return now.toDateString() === last.toDateString();
}

function formatCooldownText(remainingMs: number, syncedToday: boolean): string {
  if (syncedToday && remainingMs <= 0) {
    return 'Os dados já estão sincronizados com a última atualização da Pluggy.';
  }
  if (remainingMs <= 0) return '';
  const mins = Math.ceil(remainingMs / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `Aguarde ${h}h${m > 0 ? `${m}min` : ''} para sincronizar novamente`;
  }
  return `Aguarde ${mins} min para sincronizar novamente`;
}

export const ConnectionStatusSection: React.FC = () => {
  const { connections, fetchConnections, triggerSync } = usePluggyConnect();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [triggeringItems, setTriggeringItems] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('pluggy_sync_jobs_v')
      .select('id, item_id, status, action, error_message, created_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setJobs(data as SyncJob[]);
  }, []);

  const fetchLogs = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await supabase
      .from('pluggy_sync_logs')
      .select('id, item_id, accounts_synced, transactions_synced, duration_ms, error, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setLogs(data as SyncLog[]);
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchJobs();
    fetchLogs();
  }, [fetchConnections, fetchJobs, fetchLogs]);

  // Tick every 30s to update cooldown timers
  useEffect(() => {
    const hasCooldown = connections.some(c => getCooldownRemaining(c.last_sync_at) > 0);
    if (!hasCooldown) return;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [connections]);

  // Poll for active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'running');
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      fetchJobs();
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs, fetchLogs]);

  const handleTriggerSync = useCallback(async (itemId: string) => {
    // Client-side cooldown check
    const conn = connections.find(c => c.item_id === itemId);
    const remaining = getCooldownRemaining(conn?.last_sync_at ?? null);
    if (remaining > 0) {
      const syncedToday = isSyncedToday(conn?.last_sync_at ?? null);
      toast({
        title: 'Sincronização indisponível',
        description: formatCooldownText(remaining, syncedToday),
      });
      return;
    }

    setTriggeringItems(prev => new Set(prev).add(itemId));
    try {
      await triggerSync(itemId);
      toast({ title: 'Sincronização solicitada', description: 'Os dados aparecerão em instantes.' });
      setTimeout(() => {
        fetchJobs();
        fetchConnections();
      }, 1500);
    } catch (err: any) {
      if (err?.cooldown) {
        toast({
          title: 'Sincronização indisponível',
          description: err.message || 'Esta conta foi atualizada recentemente.',
        });
      } else {
        toast({ title: 'Erro', description: 'Não foi possível iniciar a sincronização.', variant: 'destructive' });
      }
    } finally {
      setTriggeringItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [triggerSync, toast, fetchJobs]);

  const getLatestJob = useCallback((itemId: string): SyncJob | null => {
    return jobs.find(j => j.item_id === itemId) || null;
  }, [jobs]);

  const getLogsForItem = useCallback((itemId: string): SyncLog[] => {
    return logs.filter(l => l.item_id === itemId);
  }, [logs]);

  const errorJobs = jobs.filter(j => j.status === 'error');

  if (connections.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Status das Conexões</h3>
        <p className="text-xs text-muted-foreground">Monitoramento em tempo real das sincronizações Open Finance</p>
      </div>

      {/* Error Alert */}
      {errorJobs.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {errorJobs.length === 1 ? '1 sincronização com erro' : `${errorJobs.length} sincronizações com erro`}
                </p>
                {errorJobs.slice(0, 3).map(job => {
                  const conn = connections.find(c => c.item_id === job.item_id);
                  return (
                    <div key={job.id} className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{conn?.connector_name || 'Desconhecido'}</span>
                        {job.error_message && ` — ${job.error_message}`}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 shrink-0"
                        onClick={() => handleTriggerSync(job.item_id)}
                        disabled={triggeringItems.has(job.item_id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Tentar novamente
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections List */}
      <div className="space-y-2">
        {connections.map(conn => {
          const latestJob = getLatestJob(conn.item_id);
          const itemLogs = getLogsForItem(conn.item_id);
          const isTriggering = triggeringItems.has(conn.item_id);
          const jobConf = latestJob ? jobStatusConfig[latestJob.status] || jobStatusConfig.pending : null;
          const cooldownRemaining = getCooldownRemaining(conn.last_sync_at);
          const syncedToday = isSyncedToday(conn.last_sync_at);
          const isOnCooldown = cooldownRemaining > 0 || syncedToday;
          const cooldownText = isOnCooldown ? formatCooldownText(cooldownRemaining, syncedToday) : '';

          return (
            <Collapsible key={conn.id}>
              <Card>
                <div className="flex items-center justify-between p-3 gap-3">
                  {/* Left: Logo + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ConnectorLogo
                      imageUrl={conn.connector_image_url}
                      primaryColor={conn.connector_primary_color}
                      connectorName={conn.connector_name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conn.connector_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {timeAgo(conn.last_sync_at)}
                      </p>
                    </div>
                  </div>

                  {/* Center: Status badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={conn.status === 'LOGIN_ERROR' || conn.status === 'OUTDATED' ? 'destructive' : 'success'}
                      className="text-[10px] gap-1"
                    >
                      {conn.status === 'LOGIN_ERROR' ? 'Erro Login' : conn.status === 'OUTDATED' ? 'Expirada' : 'Conectado'}
                    </Badge>
                    {jobConf && (
                      <Badge variant={jobConf.variant} className="text-[10px] gap-1">
                        {jobConf.icon}
                        {jobConf.label}
                      </Badge>
                    )}
                    <SyncStatusBadge
                      itemId={conn.item_id}
                      onSyncComplete={() => {
                        fetchJobs();
                        fetchLogs();
                        fetchConnections();
                      }}
                    />
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => handleTriggerSync(conn.item_id)}
                              disabled={isTriggering || isOnCooldown || latestJob?.status === 'running' || latestJob?.status === 'pending'}
                            >
                              {isTriggering ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isOnCooldown ? (
                                <Clock className="h-3.5 w-3.5" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              {isOnCooldown && cooldownRemaining > 0
                                ? `${Math.ceil(cooldownRemaining / 60000)} min`
                                : isOnCooldown
                                  ? 'Atualizado'
                                  : 'Atualizar agora'}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isOnCooldown && cooldownText && (
                          <TooltipContent side="bottom" className="max-w-[240px] text-center">
                            <p className="text-xs">{cooldownText}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px]" aria-label="Abrir opções de conexão">
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <Separator />
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      Histórico de sincronizações (últimos 7 dias)
                    </div>
                    {itemLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhuma sincronização registrada.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {itemLogs.map(log => (
                          <div key={log.id} className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              {log.error ? (
                                <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-income shrink-0" />
                              )}
                              <span className="text-muted-foreground">{formatDateTimeBR(log.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              {log.error ? (
                                <span className="text-destructive truncate max-w-[180px]">{log.error}</span>
                              ) : (
                                <>
                                  <span>{log.accounts_synced} contas</span>
                                  <span>{log.transactions_synced} transações</span>
                                </>
                              )}
                              <span>{formatDuration(log.duration_ms)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
