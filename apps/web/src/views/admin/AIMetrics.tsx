import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCcw, AlertTriangle, CheckCircle, Zap, Target, BarChart3, Brain } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { AI_MODELS } from '@/lib/ai-models';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
const EXCHANGE_RATE = 5.10;

interface Metrics {
  taxa_ativacao_pct: number;
  novos_total: number;
  ativados_total: number;
  formatos: { formato: string; count: number }[];
  feedbacks_pending: number;
  feedbacks_sla_vencido: number;
  feedbacks_resolved_month: number;
  total_sessions: number;
  avg_tokens_per_session: number;
  sessions_over_80pct: number;
  total_tokens: number;
}

export default function AIMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [period, setPeriod] = useState('30');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    try {
      const { data, error } = await supabase.rpc('get_ai_mvp_metrics', {
        p_start_date: startDate.toISOString().split('T')[0],
      });

      console.log('ai-metrics data:', data, 'error:', error);

      if (error) {
        console.error('Erro ao buscar métricas:', error);
        return;
      }

      const d = data as any;
      const ns = d?.north_star_raio_x_d1 || {};
      const fb = d?.feedback_governanca || {};
      const ct = d?.custo_tokens || {};
      const fmts = d?.raio_x_formatos;

      setMetrics({
        taxa_ativacao_pct: ns.taxa_ativacao_pct ?? 0,
        novos_total: ns.total_novos_usuarios ?? 0,
        ativados_total: ns.ativaram_raio_x_d1 ?? 0,
        formatos: Array.isArray(fmts) ? fmts.map((f: any) => ({ formato: f.formato, count: f.total })) : [],
        feedbacks_pending: fb.pendentes_revisao ?? 0,
        feedbacks_sla_vencido: fb.sla_vencido ?? 0,
        feedbacks_resolved_month: fb.resolvidos ?? 0,
        total_sessions: ct.total_sessoes ?? 0,
        avg_tokens_per_session: ct.media_tokens_por_sessao ?? 0,
        sessions_over_80pct: ct.sessoes_acima_limite ?? 0,
        total_tokens: (ct.media_tokens_por_sessao ?? 0) * (ct.total_sessoes ?? 0),
      });
    } catch (err) {
      console.error('Failed to fetch AI metrics:', err);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 300000); // 5 min
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const totalTokensEstimado = metrics?.total_tokens ?? 0;
  const custoUSD = totalTokensEstimado * 0.00000069;
  const estimatedCostBRL = isNaN(custoUSD * EXCHANGE_RATE) ? 0 : custoUSD * EXCHANGE_RATE;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Métricas do RXFin AI MVP"
        description="Acompanhe ativação, feedbacks e custos de token"
        actions={
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      {/* Section 1: North Star */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="h-5 w-5" />
            <span className="text-sm opacity-80">% de novos usuários que viram o Raio-X até D+1</span>
          </div>
          <p className="font-sans font-bold tracking-tight leading-none tabular-nums text-[40px] md:text-[48px]">{metrics?.taxa_ativacao_pct ?? 0}%</p>
          <p className="text-sm opacity-70 mt-2">
            {metrics?.ativados_total ?? 0} de {metrics?.novos_total ?? 0} novos usuários ativaram o Raio-X
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 2: Formats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Formatos do Raio-X
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.formatos && metrics.formatos.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.formatos}
                    dataKey="count"
                    nameKey="formato"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ formato, count }) => `${formato}: ${count}`}
                  >
                    {metrics.formatos.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Governance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Governança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold">{metrics?.feedbacks_pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                {(metrics?.feedbacks_pending ?? 0) > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">Ação requerida</Badge>
                )}
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-destructive">{metrics?.feedbacks_sla_vencido ?? 0}</p>
                <p className="text-xs text-muted-foreground">SLA vencido</p>
                {(metrics?.feedbacks_sla_vencido ?? 0) > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs animate-pulse">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Urgente
                  </Badge>
                )}
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{metrics?.feedbacks_resolved_month ?? 0}</p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
            <Link to="/admin/ai-feedback">
              <Button variant="outline" size="sm" className="w-full mt-2">
                Ver todos os feedbacks
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Uso de tokens (custo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{metrics?.total_sessions ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total de sessões</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{metrics?.avg_tokens_per_session ?? 0}</p>
              <p className="text-xs text-muted-foreground">Média tokens/sessão</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{metrics?.sessions_over_80pct ?? 0}</p>
              <p className="text-xs text-muted-foreground">Sessões &gt; 80% limite</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold">{isNaN(estimatedCostBRL) ? 'R$ 0,00' : `R$ ${estimatedCostBRL.toFixed(2).replace('.', ',')}`}</p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Model Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" /> Modelos por Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Planos</TableHead>
                <TableHead>Limite Tokens</TableHead>
                <TableHead>Custo (1M input)</TableHead>
                <TableHead>Custo (1M output)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AI_MODELS.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.id}</TableCell>
                  <TableCell>{m.provider}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {m.planSlugs.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{m.tokenLimit.toLocaleString('pt-BR')}</TableCell>
                  <TableCell>US$ {m.costPer1MInput.toFixed(2)}</TableCell>
                  <TableCell>US$ {m.costPer1MOutput.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Última atualização: {lastUpdated.toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
