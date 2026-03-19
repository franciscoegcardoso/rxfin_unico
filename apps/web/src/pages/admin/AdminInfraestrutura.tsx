import React, { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Loader2, AlertTriangle, Server, Database } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrapingQueueHealthCard } from '@/components/admin/ScrapingQueueHealthCard';

const REFRESH_MS = 5 * 60 * 1000;
const STALE_GREEN_MS = 30 * 60 * 1000;
const STALE_YELLOW_MS = 2 * 60 * 60 * 1000;

interface PartitionRow {
  partition_name: string;
  bound?: string;
  table_size?: string;
  total_size?: string;
  size_bytes?: number;
  size_class?: string;
  partition_month?: string;
  period?: string;
}

interface MvRow {
  mv_name: string;
  last_refreshed_at: string | null;
  triggered_by?: string | null;
  duration_ms?: number | null;
}

function formatBytes(n: number | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' B';
}

export default function AdminInfraestrutura() {
  const [partitions, setPartitions] = useState<PartitionRow[]>([]);
  const [mvs, setMvs] = useState<MvRow[]>([]);
  const [loadingPartitions, setLoadingPartitions] = useState(true);
  const [loadingMvs, setLoadingMvs] = useState(true);
  const [partitionsError, setPartitionsError] = useState<string | null>(null);
  const [mvsError, setMvsError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterSizeClass, setFilterSizeClass] = useState<string>('all');
  const [createPartitionsOpen, setCreatePartitionsOpen] = useState(false);
  const [creatingPartitions, setCreatingPartitions] = useState(false);
  const [refreshingMv, setRefreshingMv] = useState<string | null>(null);

  const fetchPartitions = useCallback(async () => {
    setLoadingPartitions(true);
    setPartitionsError(null);
    try {
      const { data, error } = await (supabase as any)
        .from('v_partition_health')
        .select('partition_name, bound, table_size, total_size, size_bytes, size_class, partition_month, period')
        .order('partition_name');
      if (error) throw new Error(error.message);
      setPartitions((data ?? []) as PartitionRow[]);
    } catch (e) {
      setPartitionsError(e instanceof Error ? e.message : 'Erro ao carregar partições');
      setPartitions([]);
    } finally {
      setLoadingPartitions(false);
    }
  }, []);

  const fetchMvs = useCallback(async () => {
    setLoadingMvs(true);
    setMvsError(null);
    try {
      const { data, error } = await (supabase as any)
        .from('mv_refresh_log')
        .select('mv_name, last_refreshed_at, triggered_by, duration_ms')
        .order('last_refreshed_at', { ascending: false });
      if (error) throw new Error(error.message);
      setMvs((data ?? []) as MvRow[]);
    } catch (e) {
      setMvsError(e instanceof Error ? e.message : 'Erro ao carregar MVs');
      setMvs([]);
    } finally {
      setLoadingMvs(false);
    }
  }, []);

  useEffect(() => {
    fetchPartitions();
  }, [fetchPartitions]);
  useEffect(() => {
    fetchMvs();
  }, [fetchMvs]);

  useEffect(() => {
    const t = setInterval(() => {
      fetchPartitions();
      fetchMvs();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchPartitions, fetchMvs]);

  const filteredPartitions = partitions.filter((p) => {
    if (filterPeriod !== 'all' && (p.period ?? '') !== filterPeriod) return false;
    if (filterSizeClass !== 'all' && (p.size_class ?? '') !== filterSizeClass) return false;
    return true;
  });

  const periodOptions = Array.from(new Set(partitions.map((p) => p.period).filter(Boolean))) as string[];
  const sizeClassOptions = Array.from(new Set(partitions.map((p) => p.size_class).filter(Boolean))) as string[];

  const totalSizeBytes = filteredPartitions.reduce((sum, p) => sum + (Number(p.size_bytes) || 0), 0);

  const handleCreatePartitions = async () => {
    setCreatingPartitions(true);
    try {
      const { error } = await supabase.rpc('maintain_transaction_partitions', {
        p_months_ahead: 6,
        p_dry_run: false,
      });
      if (error) throw new Error(error.message);
      toast.success('Partições futuras criadas.');
      setCreatePartitionsOpen(false);
      fetchPartitions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar partições');
    } finally {
      setCreatingPartitions(false);
    }
  };

  const handleRefreshMv = async (mvName: string) => {
    setRefreshingMv(mvName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isFipe = /fipe/i.test(mvName);
      if (isFipe) {
        const { error } = await supabase.rpc('refresh_fipe_mvs');
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.rpc('refresh_user_mvs', {
          p_user_id: user?.id ?? null,
          p_trigger: 'manual',
          p_min_age: '0',
        });
        if (error) throw new Error(error.message);
      }
      toast.success(`Refresh de ${mvName} solicitado.`);
      fetchMvs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar MV');
    } finally {
      setRefreshingMv(null);
    }
  };

  const getMvStaleness = (lastRefreshed: string | null): 'green' | 'yellow' | 'red' => {
    if (!lastRefreshed) return 'red';
    const age = Date.now() - new Date(lastRefreshed).getTime();
    if (age < STALE_GREEN_MS) return 'green';
    if (age < STALE_YELLOW_MS) return 'yellow';
    return 'red';
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Infraestrutura"
        description="Partições de transactions e staleness das materialized views."
      />

      {/* Health — Scraping queue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ScrapingQueueHealthCard />
      </div>

      {/* Painel 1 — Partições */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Partições de Transactions
          </CardTitle>
          <CardDescription>
            Estado das partições da tabela de transações. Filtre por período e tamanho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                {periodOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSizeClass} onValueChange={setFilterSizeClass}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Todas as classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as classes</SelectItem>
                {sizeClassOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchPartitions} disabled={loadingPartitions}>
              {loadingPartitions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreatePartitionsOpen(true)}
              disabled={loadingPartitions}
            >
              Criar partições futuras
            </Button>
          </div>

          {partitionsError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {partitionsError}
              <Button variant="ghost" size="sm" onClick={fetchPartitions}>Tentar novamente</Button>
            </div>
          )}

          {loadingPartitions && partitions.length === 0 ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partition</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Bound</TableHead>
                      <TableHead>Table size</TableHead>
                      <TableHead>Size class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartitions.map((row) => (
                      <TableRow key={row.partition_name}>
                        <TableCell className="font-mono text-xs">{row.partition_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              row.period === 'future' && 'border-green-500 text-green-700 dark:text-green-400',
                              row.period === 'current' && 'border-blue-500 text-blue-700 dark:text-blue-400',
                              row.period === 'past' && 'border-muted-foreground/50'
                            )}
                          >
                            {row.period ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{row.bound ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.table_size ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{row.size_class ?? '—'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">
                        Total: {filteredPartitions.length} partição(ões)
                      </TableCell>
                      <TableCell className="font-medium">{formatBytes(totalSizeBytes)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Painel 2 — MVs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Staleness das Materialized Views
          </CardTitle>
          <CardDescription>
            Último refresh e opção de forçar atualização. Verde &lt;30min, amarelo 30min–2h, vermelho &gt;2h.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMvs} disabled={loadingMvs}>
              {loadingMvs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>

          {mvsError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {mvsError}
              <Button variant="ghost" size="sm" onClick={fetchMvs}>Tentar novamente</Button>
            </div>
          )}

          {loadingMvs && mvs.length === 0 ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mvs.map((mv) => {
                const staleness = getMvStaleness(mv.last_refreshed_at);
                return (
                  <Card key={mv.mv_name} className={cn(
                    'border-l-4',
                    staleness === 'green' && 'border-l-green-500',
                    staleness === 'yellow' && 'border-l-amber-500',
                    staleness === 'red' && 'border-l-red-500'
                  )}>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium text-sm font-mono">{mv.mv_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Último refresh: {mv.last_refreshed_at
                          ? formatDistanceToNow(new Date(mv.last_refreshed_at), { addSuffix: true, locale: ptBR })
                          : '—'}
                      </p>
                      {mv.triggered_by && (
                        <Badge variant="outline" className="text-xs">
                          {mv.triggered_by}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        disabled={refreshingMv === mv.mv_name}
                        onClick={() => handleRefreshMv(mv.mv_name)}
                      >
                        {refreshingMv === mv.mv_name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Forçar refresh'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={createPartitionsOpen} onOpenChange={setCreatePartitionsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar partições futuras?</AlertDialogTitle>
            <AlertDialogDescription>
              Será chamada a RPC maintain_transaction_partitions com 6 meses à frente. Confirme para executar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreatePartitions} disabled={creatingPartitions}>
              {creatingPartitions ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
