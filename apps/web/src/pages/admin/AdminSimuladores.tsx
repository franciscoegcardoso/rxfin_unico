import React, { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Loader2, AlertTriangle, BarChart3 } from 'lucide-react';

const REFRESH_MS = 5 * 60 * 1000;

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
] as const;

interface SimulatorMetrics {
  page_views_total?: number;
  unique_visitors_7d?: number;
  conversions_total?: number;
  completion_rate?: number;
  /** Total de sessões únicas no período (denominador correto para taxa de conclusão) */
  sessions_total?: number;
  top_simulators?: { page?: string; views?: number; sessions?: number; conversions?: number }[];
}

function formatNum(n: number | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number | undefined): string {
  if (n == null) return '—';
  const value = n > 1 ? n / 100 : n;
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export default function AdminSimuladores() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<SimulatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: res, error: err } = await supabase.rpc('get_admin_simulator_metrics', { p_days: days });
      if (err) throw new Error(err.message);
      setData((res as SimulatorMetrics) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar métricas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const t = setInterval(fetch, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetch]);

  const topSimulators = data?.top_simulators ?? [];
  const conversions = data?.conversions_total ?? 0;
  const totalSessions = data?.sessions_total ?? topSimulators.reduce((sum, r) => sum + (r.sessions ?? 0), 0) ?? data?.page_views_total ?? 0;
  const completionRatePct = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Simuladores"
        description="Métricas de uso dos simuladores: visualizações, visitantes e conversões."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" onClick={fetch}>Tentar novamente</Button>
        </div>
      )}

      {loading && !data ? (
        <Skeleton className="h-48 w-full" />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Visualizações totais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatNum(data.page_views_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Visitantes únicos (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatNum(data.unique_visitors_7d)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversões totais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatNum(data.conversions_total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de conclusão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatPct(completionRatePct)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top simuladores
              </CardTitle>
              <CardDescription>
                Páginas com mais views e sessões no período selecionado. Taxa de conversão = conversões/sessões × 100 quando disponível.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topSimulators.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Sessões</TableHead>
                      <TableHead className="text-right">Taxa conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSimulators.map((row, i) => {
                      const sessions = row.sessions ?? 0;
                      const conversions = row.conversions ?? 0;
                      const rate = sessions > 0 ? (conversions / sessions) * 100 : null;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.page ?? '—'}</TableCell>
                          <TableCell className="text-right">{formatNum(row.views)}</TableCell>
                          <TableCell className="text-right">{formatNum(row.sessions)}</TableCell>
                          <TableCell className="text-right">{rate != null ? formatPct(rate) : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
