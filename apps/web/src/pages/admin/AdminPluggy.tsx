import React, { useMemo, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPluggyDetail, maskEmail, type AdminPluggyDetail } from '@/hooks/admin/useAdminPluggyDetail';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Loader2, Link2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFmt = new Intl.NumberFormat('pt-BR');

function StatusBadges({ u }: { u: AdminPluggyDetail['per_user'][0] }) {
  if (u.has_login_error) return <Badge variant="destructive">Login error</Badge>;
  if (!u.has_insights) return <Badge className="bg-amber-500 hover:bg-amber-500">Sem insights</Badge>;
  if (u.consent_expiring) return <Badge className="bg-yellow-500/90 hover:bg-yellow-500/90 text-black">Consent</Badge>;
  return <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>;
}

function LastSyncCell({ hoursAgo }: { hoursAgo: number | null }) {
  if (hoursAgo == null) return <span className="text-muted-foreground">—</span>;
  const color = hoursAgo < 8 ? 'text-emerald-600' : hoursAgo < 24 ? 'text-amber-600' : 'text-destructive';
  return <span className={color}>{hoursAgo < 24 ? `há ${hoursAgo}h` : `há ${Math.round(hoursAgo)}h`}</span>;
}

export default function AdminPluggy() {
  const { data, isLoading, error, refetch } = useAdminPluggyDetail();
  const [syncingInvestments, setSyncingInvestments] = useState(false);
  const [runningInsights, setRunningInsights] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sortedPerUser = useMemo(() => {
    const list = data?.per_user ?? [];
    return [...list].sort((a, b) => (b.last_sync_ago_h ?? 999) - (a.last_sync_ago_h ?? 999));
  }, [data?.per_user]);

  const recentSyncs20 = useMemo(() => (data?.recent_syncs ?? []).slice(0, 20), [data?.recent_syncs]);
  const cronsSorted = useMemo(
    () => [...(data?.crons ?? [])].sort((a, b) => a.jobname.localeCompare(b.jobname)),
    [data?.crons],
  );

  const handleSyncInvestments = async () => {
    setSyncingInvestments(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('pluggy-sync', {
        body: { action: 'sync-investments' },
      });
      if (fnError) throw fnError;
      toast.success(fnData?.message ?? 'Sincronização de investimentos acionada.');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar investimentos');
    } finally {
      setSyncingInvestments(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleRunInsights = async () => {
    setRunningInsights(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('process-insights', {
        body: { action: 'sync-all-users' },
      });
      if (fnError) throw fnError;
      toast.success('Insights acionados.');
      refetch();
    } catch (e) {
      toast.info('Acionar via cron ou verifique permissões.');
    } finally {
      setRunningInsights(false);
    }
  };

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    toast.success('user_id copiado');
  };

  const sys = data?.system;
  const dq = sys?.data_quality;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AdminPageHeader
          title="Open Finance"
          description="Pluggy: conexões, dados e sincronizações."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncInvestments}
            disabled={syncingInvestments}
          >
            {syncingInvestments ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Link2 className="h-4 w-4 mr-1.5" />}
            Sincronizar investimentos
          </Button>
          <Button variant="outline" size="sm" onClick={handleRunInsights} disabled={runningInsights}>
            {runningInsights ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Rodar insights agora
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Seção 1 — Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))
        ) : sys ? (
          <>
            <Card className={cn((sys.connections?.login_errors ?? 0) > 0 && 'border-destructive/50 bg-destructive/5')}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Conexões ativas</p>
                <p className="text-xl font-semibold">{sys.connections?.updated ?? 0}</p>
              </CardContent>
            </Card>
            <Card className={cn((sys.connections?.login_errors ?? 0) > 0 && 'border-destructive/50 bg-destructive/5')}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Login errors</p>
                <p className="text-xl font-semibold">{sys.connections?.login_errors ?? 0}</p>
              </CardContent>
            </Card>
            <Card className={cn((sys.connections?.stale_over_24h ?? 0) > 0 && 'border-amber-500/50 bg-amber-500/5')}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Stale &gt;24h</p>
                <p className="text-xl font-semibold">{sys.connections?.stale_over_24h ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Consent expiring</p>
                <p className="text-xl font-semibold">{sys.connections?.consent_expiring ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Transações</p>
                <p className="text-xl font-semibold">{numberFmt.format(dq?.transactions ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Investimentos</p>
                <p className="text-xl font-semibold">{numberFmt.format(dq?.investments ?? 0)}</p>
                {(dq?.suspect_zero ?? 0) > 0 && (
                  <Badge className="mt-1 bg-amber-500/90 text-[10px]">{(dq?.suspect_zero)} saldo zero suspeito</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Recorrentes</p>
                <p className="text-xl font-semibold">{numberFmt.format(dq?.recurring ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Insights hoje</p>
                <p className="text-xl font-semibold">{numberFmt.format(dq?.insights_today ?? 0)}</p>
              </CardContent>
            </Card>
            {(dq?.overdue_loans ?? 0) > 0 && (
              <Card className="col-span-2 border-destructive/50 bg-destructive/5">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground">Empréstimos em atraso</p>
                  <p className="text-xl font-semibold text-destructive">{(dq?.overdue_loans)}</p>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>

      {/* Seção 2 — Por usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Por usuário</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Conexões</TableHead>
                  <TableHead>Última sync</TableHead>
                  <TableHead>Investimentos</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Recorrentes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPerUser.map((u) => (
                  <TableRow
                    key={u.user_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => copyUserId(u.user_id)}
                  >
                    <TableCell className="font-medium">{maskEmail(u.email)}</TableCell>
                    <TableCell>
                      <span className={cn(Number(u.connections) > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                        {u.connections}
                      </span>
                      {Number(u.connections) > 0 ? (
                        <Badge variant="secondary" className="ml-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell><LastSyncCell hoursAgo={u.last_sync_ago_h} /></TableCell>
                    <TableCell>{u.investments}</TableCell>
                    <TableCell className="text-right text-emerald-600 tabular-nums">{currencyFmt.format(u.total_inv_balance ?? 0)}</TableCell>
                    <TableCell>{u.recurring}</TableCell>
                    <TableCell><StatusBadges u={u} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && sortedPerUser.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário com dados Pluggy.</p>
          )}
        </CardContent>
      </Card>

      {/* Seção 3 — Últimas 20 sincronizações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas sincronizações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ul className="space-y-2">
              {recentSyncs20.map((s, i) => (
                <li key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium min-w-[120px] truncate">{s.connector_name}</span>
                  <span className="text-xs text-muted-foreground truncate">{maskEmail((data?.per_user?.find(p => p.user_id === s.user_id)?.email) ?? s.user_id)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {s.last_sync_at ? formatDistanceToNow(new Date(s.last_sync_at), { addSuffix: true, locale: ptBR }) : '—'}
                  </span>
                  <Badge
                    variant={s.status === 'UPDATED' ? 'default' : s.status === 'LOGIN_ERROR' ? 'destructive' : 'secondary'}
                    className={s.status === 'UPDATED' ? 'bg-emerald-600' : ''}
                  >
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && recentSyncs20.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sync recente.</p>
          )}
        </CardContent>
      </Card>

      {/* Seção 4 — Crons */}
      <Card>
        <CardHeader>
          <CardTitle>Crons ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cronsSorted.map((c) => (
                <TableRow key={c.jobname}>
                  <TableCell className="font-medium">{c.jobname}</TableCell>
                  <TableCell className="text-muted-foreground">{c.schedule}</TableCell>
                  <TableCell>
                    {c.active ? (
                      <Badge className="bg-emerald-600">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
