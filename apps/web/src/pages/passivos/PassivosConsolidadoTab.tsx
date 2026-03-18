import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  FileText,
  Landmark,
  TrendingUp,
  LayoutDashboard,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { usePassivosConsolidado } from '@/hooks/usePassivosConsolidado';

const formatMoney = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PassivosConsolidadoTab: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePassivosConsolidado();

  const refetch = () => window.location.reload();

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 py-6">
        <RXFinLoadingSpinner message="Carregando visão geral..." height="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Não foi possível carregar a visão geral</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={refetch}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals ?? {
    total_passivos: 0,
    total_dividas: 0,
    total_financiamentos: 0,
    total_consorcios: 0,
    parcela_mensal_total: 0,
  };
  const alerts = data?.alerts ?? { has_overdue: false, overdue_count: 0 };
  const distribution = data?.distribution ?? [];
  const topDividas = data?.top_dividas_pluggy ?? [];
  const topFinanciamentos = data?.top_financiamentos ?? [];
  const topConsorcios = data?.top_consorcios ?? [];

  if (totals.total_passivos === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="p-8 text-center space-y-6">
          <p className="text-muted-foreground">Não há passivos cadastrados.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => navigate('/passivos/dividas')} className="gap-2">
              <FileText className="h-4 w-4" />
              Dívidas
            </Button>
            <Button variant="outline" onClick={() => navigate('/passivos/financiamentos')} className="gap-2">
              <Landmark className="h-4 w-4" />
              Financiamentos
            </Button>
            <Button variant="outline" onClick={() => navigate('/passivos/consorcios')} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Consórcios
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalForPct = totals.total_passivos || 1;

  return (
    <div className="space-y-6 py-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <HeaderMetricCard
          label="Total em Passivos"
          value={formatMoney(totals.total_passivos)}
          variant="negative"
          icon={<LayoutDashboard className="h-4 w-4" />}
        />
        <HeaderMetricCard
          label="Dívidas"
          value={formatMoney(totals.total_dividas)}
          variant="negative"
          icon={<FileText className="h-4 w-4" />}
        />
        <HeaderMetricCard
          label="Financiamentos"
          value={formatMoney(totals.total_financiamentos)}
          variant="blue"
          icon={<Landmark className="h-4 w-4" />}
        />
        <HeaderMetricCard
          label="Consórcios"
          value={formatMoney(totals.total_consorcios)}
          variant="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Alerta inadimplência */}
      {alerts.has_overdue && alerts.overdue_count > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-destructive">
                Você tem {alerts.overdue_count} dívida(s) em atraso
              </span>
            </div>
            <Button variant="destructive" size="sm" onClick={() => navigate('/passivos/dividas')}>
              Ver dívidas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Parcela mensal total */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Parcela mensal total</span>
          </div>
          <span className="font-semibold text-foreground">{formatMoney(totals.parcela_mensal_total)}</span>
        </CardContent>
      </Card>

      {/* Distribuição por categoria */}
      {distribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold">Distribuição por categoria</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {distribution.map((item) => {
              const pct = totalForPct > 0 ? (item.value / totalForPct) * 100 : 0;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => navigate(`/passivos/${item.slug}`)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm">{item.category}</span>
                    <span className="text-sm tabular-nums">{formatMoney(item.value)}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% do total</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Top Dívidas */}
      {topDividas.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold">Maiores Dívidas</h3>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/passivos/dividas')}>
              Ver todos <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDividas.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-lg border border-border bg-card space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{d.product_name}</span>
                  {d.is_overdue && (
                    <Badge variant="destructive" className="text-xs shrink-0">Em atraso</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatMoney(d.outstanding_balance)}</span>
                  {d.cet_annual_pct != null && <span>CET {d.cet_annual_pct.toFixed(1)}% a.a.</span>}
                </div>
                <Progress value={Math.min(100, d.progress_pct ?? 0)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Financiamentos */}
      {topFinanciamentos.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold">Financiamentos</h3>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/passivos/financiamentos')}>
              Ver todos <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFinanciamentos.map((f) => (
              <div key={f.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                <div className="font-medium text-sm">{f.nome}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.instituicao}</span>
                  <span>{formatMoney(f.saldo_devedor)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Parcela {formatMoney(f.valor_parcela)} · {f.parcelas_restantes} restantes
                </div>
                <Progress value={Math.min(100, f.progress_pct ?? 0)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Consórcios */}
      {topConsorcios.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-semibold">Consórcios</h3>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/passivos/consorcios')}>
              Ver todos <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topConsorcios.map((c) => (
              <div key={c.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{c.nome}</span>
                  <Badge variant={c.contemplado ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {c.contemplado ? 'Contemplado' : 'Aguardando'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c.administradora}</span>
                  <span>{formatMoney(c.valor_carta)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Parcela {formatMoney(c.valor_parcela)} · {c.parcelas_restantes} restantes
                </div>
                <Progress value={Math.min(100, c.progress_pct ?? 0)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PassivosConsolidadoTab;
