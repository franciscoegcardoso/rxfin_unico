import React, { useState, useMemo } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useArchitectureHealth } from '@/hooks/useArchitectureHealth';
import type { ArchitectureHealthSnapshot } from '@/hooks/useArchitectureHealth';
import {
  ARCHITECTURE_PHASES,
  CURSOR_PROMPTS,
  getArchChecklistCompleted,
  toggleArchChecklistItem,
} from '@/components/admin/architecture/architectureData';
import { ArchHealthGauge } from '@/components/admin/architecture/ArchHealthGauge';
import { ArchMetricCard } from '@/components/admin/architecture/ArchMetricCard';
import { ArchPhaseAccordion } from '@/components/admin/architecture/ArchPhaseAccordion';
import { ArchCursorModal } from '@/components/admin/architecture/ArchCursorModal';
import { ArchIssueRow } from '@/components/admin/architecture/ArchIssueRow';
import {
  Database,
  Table2,
  ShieldCheck,
  AlertCircle,
  Layers,
  Activity,
  RefreshCw as RefreshIcon,
  FileWarning,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFipeAdminSummary } from '@/hooks/useFipeAdminSummary';
import { FipeStatusBanner } from '@/components/admin/fipe/FipeStatusBanner';
import { FipeCatalogMetrics } from '@/components/admin/fipe/FipeCatalogMetrics';
import { FipeHealthChecks } from '@/components/admin/fipe/FipeHealthChecks';
import { FipeRunnerHistory } from '@/components/admin/fipe/FipeRunnerHistory';
import { FipeCronTable } from '@/components/admin/fipe/FipeCronTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

function computeScore(snap: ArchitectureHealthSnapshot | null): number {
  if (!snap) return 0;
  const rls = snap.rls.coverage_pct ?? 0;
  const totalFunc = snap.security.unsafe_functions?.total_functions ?? 1;
  const unsafe = snap.security.unsafe_functions?.unsafe_count ?? 0;
  const safeFuncPct = totalFunc ? ((totalFunc - unsafe) / totalFunc) * 100 : 100;
  const permPolicies = snap.security.permissive_policies_count ?? 0;
  const permScore = permPolicies === 0 ? 100 : Math.max(0, 100 - permPolicies * 10);
  const syncErrors = snap.data.sync_errors_24h ?? 0;
  const syncScore = syncErrors === 0 ? 100 : Math.max(0, 100 - syncErrors * 5);
  const alertPenalty = ((snap.ops?.open_alerts ?? 0) + (snap.ops?.open_incidents ?? 0)) * 5;
  const opsScore = Math.max(0, 100 - alertPenalty);
  return (
    rls * 0.30 +
    safeFuncPct * 0.20 +
    permScore * 0.15 +
    syncScore * 0.20 +
    opsScore * 0.15
  );
}

function buildIssues(snap: ArchitectureHealthSnapshot | null): { severity: 'critical' | 'high' | 'medium' | 'low'; description: string; phaseId?: string }[] {
  if (!snap) return [];
  const issues: { severity: 'critical' | 'high' | 'medium' | 'low'; description: string; phaseId?: string }[] = [];
  if ((snap.data.sync_errors_24h ?? 0) > 0) {
    issues.push({ severity: 'high', description: `${snap.data.sync_errors_24h} erros de sync nas últimas 24h`, phaseId: 'phase0' });
  }
  if ((snap.security.permissive_policies_count ?? 0) > 0) {
    issues.push({ severity: 'high', description: `${snap.security.permissive_policies_count} policies RLS permissivas (WITH CHECK = true)`, phaseId: 'phase0' });
  }
  const unsafe = snap.security.unsafe_functions?.unsafe_count ?? 0;
  if (unsafe > 0) {
    issues.push({ severity: 'medium', description: `${unsafe} funções sem SET search_path (risco de escalation)`, phaseId: 'phase0' });
  }
  if ((snap.data.jobs_pending ?? 0) > 100) {
    issues.push({ severity: 'medium', description: `${snap.data.jobs_pending} jobs pendentes na fila`, phaseId: 'phase1' });
  }
  if ((snap.ops?.open_incidents ?? 0) > 0) {
    issues.push({
      severity: 'high',
      description: `${snap.ops!.open_incidents} incidente(s) aberto(s) no incident_log`,
      phaseId: 'phase0',
    });
  }
  if ((snap.ops?.pending_deletions ?? 0) > 0) {
    issues.push({
      severity: 'medium',
      description: `${snap.ops!.pending_deletions} exclusão(ões) LGPD aguardando execução`,
      phaseId: 'phase0',
    });
  }
  if ((snap.ops?.open_alerts ?? 0) > 0) {
    issues.push({
      severity: 'medium',
      description: `${snap.ops!.open_alerts} alerta(s) de sistema não resolvido(s)`,
      phaseId: 'phase0',
    });
  }
  return issues;
}

const PERMISSIVE_POLICIES_EXAMPLE = [
  { table: 'leads', risk: 'Exposição de dados de leads', fix: 'Definir WITH CHECK restritivo por tenant' },
  { table: 'conversion_events', risk: 'Inserção cross-tenant', fix: 'Adicionar CHECK (tenant_id = auth.uid())' },
  { table: 'page_views', risk: 'Leitura de analytics de outros usuários', fix: 'Garantir USING (user_id = auth.uid())' },
];

const SECURITY_DEFINER_VIEWS = [
  'credit_card_transactions_v', 'onboarding_control_funnel',
  'lancamentos_realizados_v', 'sync_jobs_v', 'v_crm_kanban', 'notification_settings_v',
  'v_db_health_summary', 'pluggy_transactions_v', 'notification_user_settings_v',
  'onboarding_funnel', 'notification_preferences_v',
];

export default function AdminArchitecturePage() {
  const { data: snapshot, loading, error, lastRefresh, refresh } = useArchitectureHealth(30_000);
  const { data: fipeSummary, loading: fipeLoading, error: fipeError, refresh: fipeRefresh } = useFipeAdminSummary();
  const [completedIds, setCompletedIds] = useState<string[]>(() => getArchChecklistCompleted());
  const [cursorModal, setCursorModal] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });
  const [activeTab, setActiveTab] = useState('status');

  const score = useMemo(() => computeScore(snapshot), [snapshot]);
  const issues = useMemo(() => buildIssues(snapshot), [snapshot]);

  const handleToggleItem = (id: string) => {
    setCompletedIds(toggleArchChecklistItem(id));
  };

  const handleOpenCursor = (itemId: string) => {
    setCursorModal({ open: true, itemId });
  };

  const securityItems = ARCHITECTURE_PHASES.flatMap((p) => p.items.filter((i) => i.area === 'Segurança'));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Arquitetura"
        description="Saúde da arquitetura de dados, checklist de execução e segurança."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshIcon className="h-4 w-4 mr-2" />}
          Atualizar
        </Button>
        {lastRefresh && (
          <span className="text-xs text-muted-foreground">
            Atualizado às {format(lastRefresh, 'HH:mm', { locale: ptBR })}
          </span>
        )}
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="saude">Saúde Atual</TabsTrigger>
          <TabsTrigger value="plano">Plano de Execução</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="lgpd">LGPD</TabsTrigger>
          <TabsTrigger value="fipe">FIPE</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6 mt-4">
          {loading && !snapshot ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ArchMetricCard icon={Activity} value={snapshot?.ops?.sync_ok_24h ?? '—'} label="Syncs OK (24h)" sublabel="Pluggy" />
                <ArchMetricCard icon={AlertTriangle} value={snapshot?.data?.sync_errors_24h ?? '—'} label="Erros sync (24h)" sublabel="Alvo: 0" />
                <ArchMetricCard icon={AlertCircle} value={snapshot?.ops?.open_alerts ?? '—'} label="Alertas abertos" />
                <ArchMetricCard icon={AlertTriangle} value={snapshot?.ops?.open_incidents ?? '—'} label="Incidentes abertos" />
                <ArchMetricCard icon={RefreshIcon} value={snapshot?.ops?.active_sync_locks ?? '—'} label="Sync locks ativos" />
                <ArchMetricCard icon={Activity} value={snapshot?.ops?.ai_sessions_24h ?? '—'} label="Sessões AI (24h)" />
                <ArchMetricCard icon={Database} value={snapshot?.ops?.active_crons ?? '—'} label="Crons ativos" />
                <ArchMetricCard icon={ShieldCheck} value={snapshot?.ops?.rate_limited_fns ?? '—'} label="Funções com rate limit" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Serviços</CardTitle>
                    <CardDescription>
                      {snapshot?.services?.filter((s) => s.status === 'ok').length ?? 0}/
                      {snapshot?.services?.length ?? 0} operacionais
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(snapshot?.services ?? []).map((s) => (
                      <div key={s.service} className="flex items-center justify-between py-1 text-sm border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              s.status === 'ok' ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                          />
                          <span className="font-mono text-xs">{s.service.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.latency_ms !== null && (
                            <span className="text-xs text-muted-foreground">{s.latency_ms}ms</span>
                          )}
                          <span
                            className={`text-xs font-medium ${
                              s.status === 'ok' ? 'text-green-600' : s.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Syncs Pluggy — últimas 24h</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(snapshot?.sync_chart ?? []).length > 0 ? (
                      <>
                        <div className="flex gap-[2px] items-end h-14">
                          {(snapshot?.sync_chart ?? []).map((p, i) => {
                            const maxOk = Math.max(...(snapshot?.sync_chart ?? []).map((x) => x.ok), 1);
                            const h = Math.max(4, (p.ok / maxOk) * 56);
                            return (
                              <div
                                key={i}
                                title={`${p.hour}: ${p.ok} ok, ${p.errors} erros`}
                                className={`flex-1 rounded-sm ${p.errors > 0 ? 'bg-red-400' : 'bg-green-500'}`}
                                style={{ height: `${h}px`, opacity: 0.75 }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
                            OK: {snapshot?.ops?.sync_ok_24h ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />
                            Erros: {snapshot?.data?.sync_errors_24h ?? 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum sync nas últimas 24h.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crons críticos</CardTitle>
                  <CardDescription>{snapshot?.crons?.length ?? 0} monitorados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                    {(snapshot?.crons ?? []).map((c, i) => (
                      <div key={c.jobname} className={`flex items-center gap-2 p-2 text-xs border-b ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            c.last_status === 'succeeded' ? 'bg-green-500' : c.last_status === null ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono truncate">{c.jobname}</div>
                          <div className="text-muted-foreground">
                            {c.minutes_ago === 0
                              ? 'agora'
                              : c.minutes_ago === -1
                                ? 'nunca rodou'
                                : c.minutes_ago < 60
                                  ? `${c.minutes_ago}m atrás`
                                  : `${Math.floor(c.minutes_ago / 60)}h atrás`}
                            {' · '}
                            {c.schedule}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="saude" className="space-y-6 mt-4">
          {loading && !snapshot ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-8">
                <ArchHealthGauge value={score} label="Score geral" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ArchMetricCard icon={Table2} value={snapshot?.rls?.total_tables ?? '—'} label="Tabelas totais" />
                  <ArchMetricCard icon={ShieldCheck} value={`${snapshot?.rls?.coverage_pct ?? 0}%`} label="RLS coverage" />
                  <ArchMetricCard icon={FileWarning} value={snapshot?.security?.total_policies ?? '—'} label="Policies" />
                  <ArchMetricCard icon={AlertCircle} value={snapshot?.security?.unsafe_functions?.unsafe_count ?? '—'} label="Funções unsafe" />
                  <ArchMetricCard icon={Layers} value={snapshot?.performance?.total_indexes ?? '—'} label="Índices" />
                  <ArchMetricCard icon={Activity} value={snapshot?.data?.transactions_total ?? '—'} label="Transações" />
                  <ArchMetricCard icon={AlertTriangle} value={snapshot?.data?.sync_errors_24h ?? '—'} label="Erros sync 24h" sublabel="Alvo: 0" />
                  <ArchMetricCard icon={RefreshIcon} value={snapshot?.data?.jobs_pending ?? '—'} label="Jobs pendentes" />
                </div>
              </div>
              {snapshot?.ops && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ArchMetricCard icon={Activity} value={snapshot.ops.sync_ok_24h} label="Syncs OK (24h)" />
                  <ArchMetricCard icon={AlertCircle} value={snapshot.ops.open_alerts} label="Alertas abertos" />
                  <ArchMetricCard icon={AlertTriangle} value={snapshot.ops.open_incidents} label="Incidentes" />
                  <ArchMetricCard icon={RefreshIcon} value={snapshot.ops.active_crons} label="Crons ativos" />
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Problemas detectados</CardTitle>
                  <CardDescription>Itens que exigem ação no plano de execução.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum problema crítico detectado.</p>
                  ) : (
                    issues.map((issue, i) => (
                      <ArchIssueRow
                        key={i}
                        severity={issue.severity}
                        description={issue.description}
                        onViewAction={issue.phaseId ? () => setActiveTab('plano') : undefined}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="plano" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ARCHITECTURE_PHASES.map((phase) => {
              const done = phase.items.filter((i) => completedIds.includes(i.id)).length;
              const total = phase.items.length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <Card key={phase.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phase.color }} />
                      <span className="font-medium text-sm">{phase.label}</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{pct}%</p>
                    <p className="text-xs text-muted-foreground">{done}/{total} · {phase.deadline}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="space-y-4">
            {ARCHITECTURE_PHASES.map((phase, idx) => (
              <ArchPhaseAccordion
                key={phase.id}
                phase={phase}
                completedIds={completedIds}
                onToggleItem={handleToggleItem}
                onOpenCursor={handleOpenCursor}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">RLS Coverage</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ArchHealthGauge value={snapshot?.rls?.coverage_pct ?? 0} size={140} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funções seguras</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {snapshot?.security?.unsafe_functions && (
                  <ArchHealthGauge
                    value={
                      snapshot.security.unsafe_functions.total_functions
                        ? ((snapshot.security.unsafe_functions.total_functions - snapshot.security.unsafe_functions.unsafe_count) /
                            snapshot.security.unsafe_functions.total_functions) * 100
                        : 100
                    }
                    label="% com search_path"
                    size={140}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Policies permissivas (risco)</CardTitle>
              <CardDescription>Tabelas com WITH CHECK = true — revisar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Tabela</th>
                      <th className="text-left p-3 font-medium">Risco</th>
                      <th className="text-left p-3 font-medium">Fix recomendado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIVE_POLICIES_EXAMPLE.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">{row.table}</td>
                        <td className="p-3">{row.risk}</td>
                        <td className="p-3 text-muted-foreground">{row.fix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Views SECURITY DEFINER (12)</CardTitle>
              <CardDescription>Migrar para SECURITY INVOKER.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SECURITY_DEFINER_VIEWS.map((name) => (
                  <code key={name} className="text-xs bg-muted px-2 py-1 rounded">
                    {name}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Checklist segurança rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {securityItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1 text-sm">
                  <span className={completedIds.includes(item.id) ? 'text-green-600' : ''}>
                    {completedIds.includes(item.id) ? '✓' : '○'} {item.text}
                  </span>
                  <span className="text-xs text-muted-foreground">({item.priority})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ArchMetricCard icon={Layers} value={snapshot?.performance?.total_indexes ?? '—'} label="Total índices" />
            <ArchMetricCard icon={AlertCircle} value="324" label="Índices não usados" sublabel="A remover (Fase 1)" />
            <ArchMetricCard icon={Database} value="60" label="max_connections" sublabel="PgBouncer" />
            <ArchMetricCard icon={Table2} value={snapshot?.data?.transaction_partitions ?? '—'} label="Partições" />
            <ArchMetricCard icon={RefreshIcon} value={snapshot?.data?.jobs_pending ?? '—'} label="Jobs pendentes" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Índices críticos (principais tabelas)</CardTitle>
              <CardDescription>transactions, pluggy_transactions, credit_card_bills.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Tabela</th>
                      <th className="text-left p-3 font-medium">Índice</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="p-3 font-mono">transactions</td><td className="p-3">idx_txn_v2_user_date</td></tr>
                    <tr className="border-b"><td className="p-3 font-mono">pluggy_transactions</td><td className="p-3">pluggy_transaction_id, user_id</td></tr>
                    <tr className="border-b"><td className="p-3 font-mono">credit_card_bills</td><td className="p-3">user_id, due_date</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Partições mensais (transactions)</CardTitle>
              <CardDescription>2024–2028.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <div key={y} className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <span
                        key={`${y}-${m}`}
                        className="w-5 h-5 rounded bg-primary/20 border border-primary/40 text-[10px] flex items-center justify-center"
                        title={`${y}-${String(m).padStart(2, '0')}`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lgpd" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ArchMetricCard icon={ShieldCheck} value={snapshot?.ops?.pending_deletions ?? 0} label="Exclusões pendentes" sublabel="cooling-off 30 dias" />
            <ArchMetricCard icon={Database} value="18" label="Políticas de retenção" sublabel="data_retention_policies" />
            <ArchMetricCard icon={Table2} value="3" label="Documentos legais" sublabel="terms · privacy · cookies" />
            <ArchMetricCard icon={Activity} value="0" label="Consentimentos ativos" sublabel="user_consents" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Direitos do titular — Art. 18 LGPD</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: 'Exportação de dados', rpc: 'export_user_personal_data()', done: true },
                  { label: 'Exclusão self-service', rpc: 'request_account_deletion()', done: true },
                  { label: 'Cancelar exclusão', rpc: 'cancel_account_deletion()', done: true },
                  { label: 'Cooling-off 30 dias', rpc: 'account_deletion_requests', done: true },
                  { label: 'Consentimento rastreado', rpc: 'user_consents', done: true },
                  { label: 'Audit de exclusões', rpc: 'deletion_audit_log', done: true },
                  { label: 'Execução automática', rpc: 'lgpd-execute-scheduled-deletions', done: true },
                  { label: 'delete-own-account → LGPD RPC', rpc: 'integrar Edge Function', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2 py-1 text-sm border-b last:border-0">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.done ? 'bg-green-500' : 'bg-yellow-400'}`} />
                    <div className="flex-1">
                      <div className={item.done ? '' : 'text-muted-foreground'}>{item.label}</div>
                      <code className="text-xs text-muted-foreground">{item.rpc}</code>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fluxo de exclusão self-service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: 1, label: 'Usuário solicita exclusão', detail: 'request_account_deletion() · frontend', color: 'bg-blue-500' },
                  { step: 2, label: 'Registro com cooling-off', detail: 'account_deletion_requests · 30 dias', color: 'bg-purple-500' },
                  { step: 3, label: 'Usuário pode cancelar', detail: 'cancel_account_deletion() · até vencer', color: 'bg-green-500' },
                  { step: 4, label: 'Cron diário 02h verifica', detail: 'lgpd-execute-scheduled-deletions', color: 'bg-yellow-500' },
                  { step: 5, label: 'admin_delete_user() executa', detail: 'soft-delete + anonimização + audit_trail', color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className={`w-5 h-5 rounded-full ${item.color} bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className="text-xs font-medium">{item.step}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.detail}</div>
                    </div>
                  </div>
                ))}

                <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400">Pendente de integração</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                    A Edge Function <code>delete-own-account</code> precisa observar <code>account_deletion_requests</code> e acionar <code>admin_delete_user()</code>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Políticas de retenção de dados</CardTitle>
              <CardDescription>18 tipos de dados com base legal definida.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border text-sm overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Tipo de dado</th>
                      <th className="text-left p-3 font-medium">Retenção</th>
                      <th className="text-left p-3 font-medium">Base legal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { type: 'transactions', days: 3650, basis: 'Obrigação legal (fiscal)' },
                      { type: 'audit_trail', days: 3650, basis: 'Obrigação legal' },
                      { type: 'user_consents', days: 3650, basis: 'Obrigação legal' },
                      { type: 'pluggy_connections', days: 3650, basis: 'Contrato' },
                      { type: 'ai_chat_messages', days: 365, basis: 'Legítimo interesse' },
                      { type: 'rebalancing_suggestions', days: 365, basis: 'Legítimo interesse' },
                      { type: 'analytics_events', days: 90, basis: 'Legítimo interesse' },
                      { type: 'pluggy_sync_logs', days: 90, basis: 'Legítimo interesse' },
                      { type: 'monte_carlo_result', days: 90, basis: 'Legítimo interesse' },
                      { type: 'service_health_log', days: 30, basis: 'Legítimo interesse' },
                    ].map((row) => (
                      <tr key={row.type} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">{row.type}</td>
                        <td className="p-3 text-xs">{row.days >= 3650 ? '10 anos' : row.days >= 365 ? `${row.days / 365} ano(s)` : `${row.days} dias`}</td>
                        <td className="p-3 text-xs text-muted-foreground">{row.basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fipe" className="space-y-6 mt-4">
          {fipeLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
          )}
          {fipeError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{fipeError}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => fipeRefresh()}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          )}
          {!fipeLoading && !fipeError && fipeSummary && (
            <>
              <FipeStatusBanner data={fipeSummary} />
              <div>
                <h3 className="text-sm font-medium mb-3">Métricas do catálogo</h3>
                <FipeCatalogMetrics data={fipeSummary} />
              </div>
              <FipeHealthChecks data={fipeSummary} />
              <div>
                <h3 className="text-sm font-medium mb-3">Histórico de runs (Runner + Phase 3)</h3>
                <FipeRunnerHistory data={fipeSummary} />
              </div>
              <FipeCronTable data={fipeSummary} />
              <Collapsible defaultOpen={fipeSummary.scale_jobs?.total > 0}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                  Scale Jobs
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {fipeSummary.scale_jobs?.total === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      Nenhum job de escala ativo — ingestão concluída.
                    </p>
                  ) : (
                    <div className="rounded-md border mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b"><td className="p-3">Pending</td><td className="p-3 tabular-nums">{fipeSummary.scale_jobs?.pending ?? 0}</td></tr>
                          <tr className="border-b"><td className="p-3">Running</td><td className="p-3 tabular-nums">{fipeSummary.scale_jobs?.running ?? 0}</td></tr>
                          <tr className="border-b"><td className="p-3">Done</td><td className="p-3 tabular-nums">{fipeSummary.scale_jobs?.done ?? 0}</td></tr>
                          <tr className="border-b"><td className="p-3">Error</td><td className="p-3 tabular-nums">{fipeSummary.scale_jobs?.error ?? 0}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </TabsContent>
      </Tabs>

      <ArchCursorModal
        open={cursorModal.open}
        onOpenChange={(open) => setCursorModal({ open, itemId: open ? cursorModal.itemId : null })}
        title="Prompt Cursor"
        content={cursorModal.itemId ? (CURSOR_PROMPTS[cursorModal.itemId] ?? '') : ''}
      />
    </div>
  );
}
