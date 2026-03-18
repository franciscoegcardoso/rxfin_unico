import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AlertCircle, FileText, Landmark, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { usePassivosHeader } from '@/hooks/usePassivosHeader';

const PassivosPage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const VALID_TABS = useMemo(() => ['dividas', 'financiamentos', 'consorcios'] as const, []);
  const rawTab = pathname.split('/').filter(Boolean).pop();
  const currentTab = VALID_TABS.includes(rawTab as any)
    ? (rawTab as (typeof VALID_TABS)[number])
    : 'dividas';

  const { data: header, isLoading, error } = usePassivosHeader();

  useEffect(() => {
    if (!rawTab) return;
    if (!VALID_TABS.includes(rawTab as any)) {
      navigate('/passivos/dividas', { replace: true });
    }
  }, [navigate, rawTab, VALID_TABS]);

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Passivos</h1>
          <p className="text-sm text-muted-foreground mt-1">Dívidas, financiamentos e obrigações financeiras</p>
        </div>
        <RXFinLoadingSpinner message="Carregando..." height="h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Passivos</h1>
          <p className="text-sm text-muted-foreground mt-1">Dívidas, financiamentos e obrigações financeiras</p>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Não foi possível carregar</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Passivos</h1>
        <p className="text-sm text-muted-foreground mt-1">Dívidas, financiamentos e obrigações financeiras</p>
      </div>

      <div className="space-y-6">
        {/* Summary (mesmo padrão visual que Bens e Investimentos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <HeaderMetricCard
            label="Dívidas"
            value={formatMoney(header?.total_dividas ?? 0)}
            variant="negative"
            icon={<FileText className="h-4 w-4" />}
          />
          <HeaderMetricCard
            label="Financiamentos"
            value={formatMoney(header?.total_financiamentos ?? 0)}
            variant="blue"
            icon={<Landmark className="h-4 w-4" />}
          />
          <HeaderMetricCard
            label="Consórcios"
            value={formatMoney(header?.total_consorcios ?? 0)}
            variant="neutral"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <HeaderMetricCard
            label="Parcela Mensal"
            value={formatMoney(header?.parcela_mensal_total ?? 0)}
            variant="amber"
            icon={<span className="text-sm">R$</span>}
          />
        </div>

        <p className="text-[10px] text-muted-foreground -mt-2">
          {header?.dividas_count ?? 0} dívidas · {header?.financiamentos_count ?? 0} financiamentos · {header?.consorcios_count ?? 0} consórcio(s)
        </p>

        {/* Tabs orientadas por rota */}
        <Tabs value={currentTab} onValueChange={(val) => navigate(`/passivos/${val}`)}>
          <TabsList>
            <TabsTrigger value="dividas" className="gap-2">
              <FileText className="h-4 w-4" />
              Dívidas
              {typeof header?.dividas_count === 'number' && (
                <Badge variant="outline" className="ml-1">
                  {header.dividas_count}
                </Badge>
              )}
              {header?.has_overdue && (header?.overdue_count ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {header.overdue_count}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="financiamentos" className="gap-2">
              <Landmark className="h-4 w-4" />
              Financiamentos
              {typeof header?.financiamentos_count === 'number' && (
                <Badge variant="outline" className="ml-1">
                  {header.financiamentos_count}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="consorcios" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Consórcios
              {typeof header?.consorcios_count === 'number' && (
                <Badge variant="outline" className="ml-1">
                  {header.consorcios_count}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Conteudo vem via sub-rotas */}
          <Outlet />
        </Tabs>
      </div>
    </div>
  );
};

export default PassivosPage;
