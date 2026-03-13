import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

const REFRESH_MS = 5 * 60 * 1000; // 5 min
const STALE_MV_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2h

interface PartitionRow {
  partition_name?: string;
  period?: string;
  partition_month?: string;
}

interface MvRow {
  mv_name?: string;
  last_refreshed_at?: string;
  triggered_by?: string;
}

export function AdminInfraStatusBar() {
  const [partitions, setPartitions] = useState<PartitionRow[]>([]);
  const [mvs, setMvs] = useState<MvRow[]>([]);
  const [failedJobs, setFailedJobs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const since24h = new Date(Date.now() - 86400000).toISOString();

      const [partRes, mvRes, jobsRes] = await Promise.all([
        (supabase as any).from('v_partition_health').select('partition_name, period, partition_month').order('partition_name'),
        (supabase as any).from('mv_refresh_log').select('mv_name, last_refreshed_at, triggered_by').order('last_refreshed_at', { ascending: false }).limit(50),
        (supabase as any).from('jobs_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('finished_at', since24h),
      ]);

      if (partRes.error) throw new Error(partRes.error.message || 'v_partition_health');
      if (mvRes.error) throw new Error(mvRes.error.message || 'mv_refresh_log');
      // jobs_queue can fail (table might not exist)
      const partData = (partRes.data ?? []) as PartitionRow[];
      const mvData = (mvRes.data ?? []) as MvRow[];
      const jobsCount = jobsRes.error ? 0 : (jobsRes.count ?? 0);

      setPartitions(partData);
      setMvs(mvData);
      setFailedJobs(jobsCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar status');
      setPartitions([]);
      setMvs([]);
      setFailedJobs(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetch]);

  if (loading && partitions.length === 0 && mvs.length === 0) return null;

  const hasFuturePartition = partitions.some((p) => (p.period ?? '').toLowerCase() === 'future');
  const partitionAlert = !hasFuturePartition && partitions.length > 0;
  const partitionCount = partitions.length;

  const now = Date.now();
  const staleMvs = mvs.filter((m) => {
    const at = m.last_refreshed_at ? new Date(m.last_refreshed_at).getTime() : 0;
    return now - at > STALE_MV_THRESHOLD_MS;
  });
  const staleCount = staleMvs.length;
  const mvStatus = staleCount === 0 ? 'ok' : staleCount === 1 ? 'warn' : 'error';
  const jobsAlert = failedJobs > 0;

  const hasAlert = partitionAlert || mvStatus !== 'ok' || jobsAlert;
  // Barra só aparece quando há algum alerta (se tudo verde, não exibir)
  if (!hasAlert && !error) return null;

  const partitionLabel = partitionAlert
    ? 'ALERTA: sem partição futura'
    : `${partitionCount} ativas`;
  const mvLabel =
    mvStatus === 'ok'
      ? 'todas frescas'
      : staleCount === 1
        ? '1 desatualizada'
        : `${staleCount} desatualizadas (>2h)`;
  const jobsLabel = failedJobs > 0 ? `${failedJobs} falhas (24h)` : 'OK';

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'border-b border-border px-4 flex items-center justify-between text-xs h-8 transition-colors',
          hasAlert ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-muted/50 text-muted-foreground'
        )}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2 w-2 rounded-full', partitionAlert ? 'bg-red-500' : 'bg-green-500')} />
            <strong>Partições:</strong> {partitionLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                mvStatus === 'error' ? 'bg-red-500' : mvStatus === 'warn' ? 'bg-amber-500' : 'bg-green-500'
              )}
            />
            <strong>MVs:</strong> {mvLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2 w-2 rounded-full', jobsAlert ? 'bg-red-500' : 'bg-green-500')} />
            <strong>Jobs:</strong> {jobsLabel}
          </span>
          {error && (
            <span className="text-destructive font-medium">{error}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="p-1 rounded hover:bg-muted"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {expanded && (
        <div className="absolute left-0 right-0 top-full border-b border-border bg-card shadow-md z-10 p-4 text-xs space-y-2 max-h-48 overflow-y-auto">
          <p className="font-medium">Detalhes (atualizado a cada 5 min)</p>
          {staleMvs.length > 0 && (
            <div>
              <p className="text-amber-600 dark:text-amber-400 font-medium">MVs desatualizadas (&gt;2h):</p>
              <ul className="list-disc list-inside mt-1">
                {staleMvs.slice(0, 10).map((m, i) => (
                  <li key={i}>
                    {m.mv_name} — {m.last_refreshed_at ? formatDistanceToNow(new Date(m.last_refreshed_at), { addSuffix: true, locale: ptBR }) : '—'}
                  </li>
                ))}
                {staleMvs.length > 10 && <li>… e mais {staleMvs.length - 10}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
