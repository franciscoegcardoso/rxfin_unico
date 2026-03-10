import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Database,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Lock,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PoolHealth {
  max_connections: number;
  total_connections: number;
  usage_pct: number;
  by_state: Record<string, number>;
  collected_at: string;
}

interface BlockingRow {
  blocked_pid: number;
  blocking_pid: number;
  wait_duration_seconds: number;
  blocked_state: string;
  blocked_query_preview: string;
  blocking_state: string;
  blocking_query_preview: string;
  blocked_usename: string;
  blocking_usename: string;
  blocked_application_name: string;
  blocked_client_addr: string | null;
}

const POOL_WARN_PCT = 70;
const POOL_CRITICAL_PCT = 90;

const MIGRATION_HINT = 'As funções de monitoramento ainda não existem no banco. Execute a migração no Supabase (SQL Editor ou `supabase db push`): supabase/migrations/20260226100000_database_health_dashboard.sql';

function isFunctionNotFoundError(message: string): boolean {
  return /could not find the function|function.*not found|schema cache/i.test(message);
}

export default function DatabaseHealthDashboard() {
  const [poolHealth, setPoolHealth] = useState<PoolHealth | null>(null);
  const [blocking, setBlocking] = useState<BlockingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [thresholdSeconds, setThresholdSeconds] = useState(5);

  const fetchHealth = async () => {
    setLoading(true);
    setPoolError(null);
    setBlockingError(null);
    try {
      const [poolRes, blockingRes] = await Promise.all([
        supabase.rpc('get_connection_pool_health'),
        supabase.rpc('get_long_blocking_activity', { p_threshold_seconds: thresholdSeconds }),
      ]);

      if (poolRes.error) {
        setPoolHealth(null);
        setPoolError(poolRes.error.message);
      } else {
        setPoolHealth(poolRes.data as PoolHealth);
      }

      if (blockingRes.error) {
        setBlocking([]);
        setBlockingError(blockingRes.error.message);
      } else {
        setBlocking((blockingRes.data as BlockingRow[]) ?? []);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados';
      setPoolError(msg);
      setBlockingError(msg);
      setPoolHealth(null);
      setBlocking([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [thresholdSeconds]);

  const poolStatus =
    poolHealth == null
      ? 'loading'
      : poolHealth.usage_pct >= POOL_CRITICAL_PCT
        ? 'critical'
        : poolHealth.usage_pct >= POOL_WARN_PCT
          ? 'warning'
          : 'ok';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Saúde do Banco"
        description="Monitoramento de conexões (pool) e bloqueios longos. Acompanhe quando estiver perto do limite de conexões."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Bloqueios há mais de
          <select
            value={thresholdSeconds}
            onChange={(e) => setThresholdSeconds(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value={3}>3 s</option>
            <option value={5}>5 s</option>
            <option value={10}>10 s</option>
            <option value={30}>30 s</option>
          </select>
          segundos
        </label>
      </div>

      {/* Pool de conexões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Uso do pool de conexões
          </CardTitle>
          <CardDescription>
            Total de conexões ativas no banco vs. limite máximo. Fique atento quando passar de 70%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !poolHealth && !poolError ? (
            <Skeleton className="h-24 w-full" />
          ) : poolError ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{poolError}</span>
              </div>
              {isFunctionNotFoundError(poolError) && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {MIGRATION_HINT}
                </p>
              )}
            </div>
          ) : poolHealth ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{poolHealth.total_connections}</span>
                  <span className="text-muted-foreground">/ {poolHealth.max_connections} conexões</span>
                </div>
                <Badge
                  variant={poolStatus === 'critical' ? 'destructive' : poolStatus === 'warning' ? 'secondary' : 'default'}
                  className={cn(
                    poolStatus === 'ok' && 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  {poolStatus === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {poolStatus === 'warning' && poolStatus !== 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {poolStatus === 'ok' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {poolHealth.usage_pct}% uso
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                {poolHealth.by_state &&
                  Object.entries(poolHealth.by_state).map(([state, count]) => (
                    <span
                      key={state}
                      className="text-sm rounded-md bg-muted px-2 py-1"
                    >
                      <span className="font-medium">{state || 'null'}</span>: {count}
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Coletado em: {poolHealth.collected_at ? new Date(poolHealth.collected_at).toLocaleString('pt-BR') : '-'}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Bloqueios longos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Bloqueios longos
          </CardTitle>
          <CardDescription>
            Sessões que estão esperando em lock há mais de {thresholdSeconds} segundos. Valores altos podem indicar contenção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && blocking.length === 0 && !blockingError ? (
            <Skeleton className="h-32 w-full" />
          ) : blockingError ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-destructive text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{blockingError}</span>
              </div>
              {isFunctionNotFoundError(blockingError) && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {MIGRATION_HINT}
                </p>
              )}
            </div>
          ) : blocking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhum bloqueio longo no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Bloqueado (PID)</th>
                    <th className="text-left py-2 px-2 font-medium">Bloqueador (PID)</th>
                    <th className="text-left py-2 px-2 font-medium">Espera (s)</th>
                    <th className="text-left py-2 px-2 font-medium">Usuário bloqueado</th>
                    <th className="text-left py-2 px-2 font-medium">Query bloqueada (preview)</th>
                    <th className="text-left py-2 px-2 font-medium">Query bloqueadora (preview)</th>
                  </tr>
                </thead>
                <tbody>
                  {blocking.map((row) => (
                    <tr key={row.blocked_pid} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-mono">{row.blocked_pid}</td>
                      <td className="py-2 px-2 font-mono">{row.blocking_pid}</td>
                      <td className="py-2 px-2 font-mono text-amber-600 dark:text-amber-400">{row.wait_duration_seconds}</td>
                      <td className="py-2 px-2">{row.blocked_usename}</td>
                      <td className="py-2 px-2 max-w-[200px] truncate" title={row.blocked_query_preview}>
                        {row.blocked_query_preview || '-'}
                      </td>
                      <td className="py-2 px-2 max-w-[200px] truncate" title={row.blocking_query_preview}>
                        {row.blocking_query_preview || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo rápido */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• <strong>Pool:</strong> Acima de {POOL_WARN_PCT}% exibe aviso; acima de {POOL_CRITICAL_PCT}% exibe crítico.</p>
          <p>• <strong>Bloqueios:</strong> Sessões que esperam em lock além do tempo escolhido. Revise queries longas ou transações não finalizadas.</p>
          <p>• Dados vêm das funções <code className="bg-muted px-1 rounded">get_connection_pool_health()</code> e <code className="bg-muted px-1 rounded">get_long_blocking_activity()</code> no Supabase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
