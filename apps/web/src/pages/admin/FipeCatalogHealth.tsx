import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, RefreshCw, Loader2, Database, BarChart3, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Activity, FileWarning, Hash,
  Layers, Calendar, Tag, GitMerge
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, Dot
} from 'recharts';

interface HealthSummary {
  status: 'healthy' | 'warning' | 'critical';
  lastRunAt: string;
  lastTriggeredBy: string;
  lastTriggerContext: string | null;
  totalIssues: number;
  correctionsApplied: number;
  checks: {
    anosFaltandoCatalog: number;
    orfaosNoHistorico: number;
    fipeCodesComHifen: number;
    yearIdInconsistentes: number;
    camposNulosCriticos: number;
    anosAbsurdos: number;
    metadadosInconsistentes: number;
  };
  trend: {
    prevRunAt: string | null;
    prevTotalIssues: number;
    prevStatus: string;
    improved: boolean;
  };
  stats: {
    totalLinhasCatalog: number;
    fipeCodesDistintos: number;
    totalHistorico: number;
    totalPrecos: number;
    fipeCodesSemPreco: number;
    coberturaPct: number;
  };
  history: Array<{
    runAt: string;
    status: string;
    issues: number;
    corrected: number;
    triggeredBy: string;
  }>;
}

interface HealthLogRow {
  id: string;
  run_at: string;
  triggered_by: string;
  trigger_context: string | null;
  total_issues: number;
  correcoes_aplicadas: number;
  status: string;
}

const CHECK_META: Record<string, { label: string; description: string; icon: React.ElementType; autoCorrect: boolean }> = {
  anosFaltandoCatalog: { label: 'Anos Faltando no Catálogo', description: 'Anos com preço no histórico mas sem entrada no catálogo', icon: Calendar, autoCorrect: true },
  orfaosNoHistorico: { label: 'Órfãos no Histórico', description: 'fipe_codes no histórico sem entrada no catálogo', icon: FileWarning, autoCorrect: false },
  fipeCodesComHifen: { label: 'Códigos com Hífen', description: 'fipe_codes com formato inválido (ex: "001494-0")', icon: Hash, autoCorrect: true },
  yearIdInconsistentes: { label: 'year_id Inconsistentes', description: 'year_id ≠ "year-fuel_type" esperado', icon: GitMerge, autoCorrect: true },
  camposNulosCriticos: { label: 'Campos Nulos Críticos', description: 'fipe_code / brand_id / model_name nulos', icon: AlertTriangle, autoCorrect: false },
  anosAbsurdos: { label: 'Anos Absurdos', description: 'Anos fora do range 1950-2030', icon: Tag, autoCorrect: false },
  metadadosInconsistentes: { label: 'Metadados Inconsistentes', description: 'Mesmo código com marcas/modelos conflitantes', icon: Layers, autoCorrect: false },
};

const STATUS_CONFIG = {
  healthy: { label: '✅ Saudável', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  warning: { label: '⚠️ Atenção', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  critical: { label: '❌ Crítico', className: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400' },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  post_ingestion: 'Pós-ingestão',
  scheduled: 'Agendado',
};

const PAGE_SIZE = 10;

export default function FipeCatalogHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logRows, setLogRows] = useState<HealthLogRow[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logTotal, setLogTotal] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.rpc('get_fipe_catalog_health_summary');
      if (error) throw error;
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      setData(parsed as HealthSummary);
    } catch (e) {
      console.error('Error fetching health summary:', e);
    }
  }, []);

  const fetchLog = useCallback(async (page: number) => {
    const offset = page * PAGE_SIZE;
    const { data: rows, error, count } = await supabase
      .from('fipe_catalog_health_log')
      .select('*', { count: 'exact' })
      .order('run_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!error) {
      setLogRows((rows ?? []) as HealthLogRow[]);
      setLogTotal(count ?? 0);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchLog(0)]).finally(() => setLoading(false));
  }, [fetchSummary, fetchLog]);

  // Auto-refresh when not healthy
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (data && data.status !== 'healthy') {
      intervalRef.current = setInterval(() => {
        fetchSummary();
        fetchLog(logPage);
      }, 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data?.status, fetchSummary, fetchLog, logPage]);

  const runCheck = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.rpc('run_fipe_catalog_health_check', {
        p_triggered_by: 'manual',
        p_context: null,
        p_autocorrect: true,
      });
      if (error) throw error;
      await new Promise(r => setTimeout(r, 1000));
      await Promise.all([fetchSummary(), fetchLog(0)]);
      setLogPage(0);
      toast.success(
        data?.totalIssues === 0
          ? 'Verificação concluída — 0 problemas encontrados'
          : `${data?.correctionsApplied ?? 0} problemas corrigidos automaticamente`
      );
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setLogPage(newPage);
    fetchLog(newPage);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Não foi possível carregar os dados de saúde do catálogo.</p>
        <Button variant="outline" className="mt-4" onClick={() => { setLoading(true); fetchSummary().finally(() => setLoading(false)); }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[data.status];
  const coverageColor = data.stats.coberturaPct >= 98 ? 'text-emerald-600' : data.stats.coberturaPct >= 90 ? 'text-amber-600' : 'text-red-600';

  // Sparkline data
  const sparkData = [...(data.history ?? [])].reverse().map(h => ({
    date: format(new Date(h.runAt), 'dd/MM'),
    issues: h.issues,
    corrected: h.corrected,
    status: h.status,
    triggeredBy: h.triggeredBy,
    fullDate: format(new Date(h.runAt), "dd/MM/yyyy HH:mm"),
  }));

  const totalLogPages = Math.ceil(logTotal / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fipe-sync')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Saúde do Catálogo FIPE</h1>
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitoramento automático de integridade dos dados
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Última verificação: {format(new Date(data.lastRunAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              {' • '}Disparado por: {TRIGGER_LABELS[data.lastTriggeredBy] ?? data.lastTriggeredBy}
            </p>
          </div>
        </div>
        <Button onClick={runCheck} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Executar Verificação Agora
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total no Catálogo</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{data.stats.totalLinhasCatalog.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">{data.stats.fipeCodesDistintos.toLocaleString('pt-BR')} modelos distintos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Histórico de Preços</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{data.stats.totalHistorico.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">{data.stats.totalPrecos.toLocaleString('pt-BR')} preços reais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Cobertura</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${coverageColor}`}>{data.stats.coberturaPct}%</p>
            <Progress
              value={data.stats.coberturaPct}
              className="h-1.5 mt-1"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Sem Dados</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{data.stats.fipeCodesSemPreco}</p>
            <p className="text-xs text-muted-foreground">modelos sem histórico</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrity checks grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Checks de Integridade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(CHECK_META).map(([key, meta]) => {
            const count = data.checks[key as keyof typeof data.checks] ?? 0;
            const Icon = meta.icon;
            return (
              <Card key={key} className="overflow-hidden">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 rounded-md p-2 ${count === 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <Icon className={`h-4 w-4 ${count === 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <span className={`text-lg font-bold tabular-nums ${count === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    {count > 0 && (
                      <Badge variant="outline" className={`mt-1.5 text-[10px] ${meta.autoCorrect ? 'border-emerald-500/40 text-emerald-600' : 'border-amber-500/40 text-amber-600'}`}>
                        {meta.autoCorrect ? 'AUTO-CORRIGIDO' : 'REQUER ATENÇÃO MANUAL'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sparkline history chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de Verificações</CardTitle>
        </CardHeader>
        <CardContent>
          {sparkData.length <= 1 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Execute mais verificações para ver o histórico
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sparkData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-md p-2 text-xs shadow-md space-y-0.5">
                        <p className="font-medium">{d.fullDate}</p>
                        <p>Issues: <span className="font-bold">{d.issues}</span></p>
                        <p>Correções: {d.corrected}</p>
                        <p>Disparado por: {TRIGGER_LABELS[d.triggeredBy] ?? d.triggeredBy}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="issues"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={({ cx, cy, payload }: any) => {
                    const color = payload.issues === 0 ? '#10b981' : payload.issues <= 3 ? '#f59e0b' : '#ef4444';
                    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed history table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          {logRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro encontrado.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Data/Hora</th>
                      <th className="text-left py-2 font-medium">Disparado por</th>
                      <th className="text-left py-2 font-medium">Contexto</th>
                      <th className="text-right py-2 font-medium">Issues</th>
                      <th className="text-right py-2 font-medium">Correções</th>
                      <th className="text-center py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map(row => {
                      const sCfg = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.warning;
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 tabular-nums">{format(new Date(row.run_at), "dd/MM/yyyy HH:mm")}</td>
                          <td className="py-2">{TRIGGER_LABELS[row.triggered_by] ?? row.triggered_by}</td>
                          <td className="py-2 text-muted-foreground text-xs max-w-[200px] truncate">{row.trigger_context ?? '—'}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{row.total_issues}</td>
                          <td className="py-2 text-right tabular-nums">{row.correcoes_aplicadas}</td>
                          <td className="py-2 text-center">
                            <Badge className={`text-[10px] ${sCfg.className}`}>{sCfg.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalLogPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-muted-foreground">
                    Página {logPage + 1} de {totalLogPages} ({logTotal} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={logPage === 0} onClick={() => handlePageChange(logPage - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={logPage >= totalLogPages - 1} onClick={() => handlePageChange(logPage + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
