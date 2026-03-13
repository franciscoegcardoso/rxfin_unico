import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { InvestimentosPluggy } from './InvestimentosPluggy';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePluggyInvestments } from '@/hooks/usePluggyInvestments';
import { 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Car, 
  Wallet, 
  PiggyBank,
  CreditCard,
  Home,
  Landmark,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const ASSET_COLORS = {
  property: 'hsl(142, 76%, 36%)',
  vehicle: 'hsl(170, 85%, 40%)',
  investment: 'hsl(85, 65%, 45%)',
  pluggy_investments: 'hsl(250, 65%, 55%)',
  pluggy_accounts: 'hsl(210, 70%, 50%)',
  other: 'hsl(200, 70%, 45%)',
};

const LIABILITY_COLORS = {
  financiamentos: 'hsl(0, 72%, 51%)',
  consorcios: 'hsl(25, 95%, 53%)',
};

export const BalancoPatrimonialSection: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useFinancial();
  const { formatValue } = useVisibility();
  const isMobile = useIsMobile();
  
  const formatMoney = (value: number): string => formatValue(value);

  // Pluggy data
  const { totalBalance: pluggyInvestmentsTotal, allInvestments: pluggyInvestments } = usePluggyInvestments();

  const { data: pluggyAccounts = [] } = useQuery({
    queryKey: ['pluggy-accounts-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pluggy_accounts')
        .select('id, name, type, balance')
        .is('deleted_at', null)
        .in('type', ['BANK', 'SAVINGS']);
      if (error) throw error;
      return data || [];
    },
  });

  const pluggyAccountsTotal = useMemo(() => {
    return pluggyAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [pluggyAccounts]);

  const { data: financiamentos = [] } = useQuery({
    queryKey: ['financiamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financiamentos')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: consorcios = [] } = useQuery({
    queryKey: ['consorcios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consorcios')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const assetsByType = useMemo(() => {
    const grouped: Record<string, { label: string; value: number; count: number; icon: any }> = {
      property: { label: 'Imóveis', value: 0, count: 0, icon: Building2 },
      vehicle: { label: 'Veículos', value: 0, count: 0, icon: Car },
      investment: { label: 'Investimentos', value: 0, count: 0, icon: PiggyBank },
      other: { label: 'Outros', value: 0, count: 0, icon: Wallet },
    };

    config.assets.forEach(asset => {
      if (grouped[asset.type as keyof typeof grouped]) {
        grouped[asset.type as keyof typeof grouped].value += asset.value;
        grouped[asset.type as keyof typeof grouped].count += 1;
      }
    });

    // Add Pluggy data as separate categories
    if (pluggyInvestmentsTotal > 0) {
      grouped['pluggy_investments'] = {
        label: 'Investimentos (Open Finance)',
        value: pluggyInvestmentsTotal,
        count: pluggyInvestments.length,
        icon: TrendingUp,
      };
    }

    if (pluggyAccountsTotal > 0) {
      grouped['pluggy_accounts'] = {
        label: 'Contas Bancárias (Open Finance)',
        value: pluggyAccountsTotal,
        count: pluggyAccounts.length,
        icon: Wallet,
      };
    }

    return grouped;
  }, [config.assets, pluggyInvestmentsTotal, pluggyInvestments.length, pluggyAccountsTotal, pluggyAccounts.length]);

  const totalAssets = useMemo(() => {
    return Object.values(assetsByType).reduce((sum, type) => sum + type.value, 0);
  }, [assetsByType]);

  const manualAssetCount = config.assets.length;
  const totalAssetCount = manualAssetCount + pluggyInvestments.length + pluggyAccounts.length;

  const liabilities = useMemo(() => {
    const financiamentoTotal = financiamentos.reduce((sum, f) => sum + Number(f.saldo_devedor || 0), 0);
    
    const consorcioTotal = consorcios.reduce((sum, c) => {
      const parcelasRestantes = c.prazo_total - c.parcelas_pagas;
      const saldoDevedor = parcelasRestantes * Number(c.valor_parcela_atual || 0);
      return sum + saldoDevedor;
    }, 0);

    return {
      financiamentos: { label: 'Financiamentos', value: financiamentoTotal, count: financiamentos.length },
      consorcios: { label: 'Consórcios', value: consorcioTotal, count: consorcios.length },
    };
  }, [financiamentos, consorcios]);

  const totalLiabilities = useMemo(() => {
    return liabilities.financiamentos.value + liabilities.consorcios.value;
  }, [liabilities]);

  const netWorth = totalAssets - totalLiabilities;
  const liquidityRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) : totalAssets > 0 ? Infinity : 0;

  const assetChartData = Object.entries(assetsByType)
    .filter(([_, data]) => data.value > 0)
    .map(([key, data]) => ({
      name: data.label,
      value: data.value,
      color: ASSET_COLORS[key as keyof typeof ASSET_COLORS] || 'hsl(200, 70%, 45%)',
    }));

  const liabilityChartData = Object.entries(liabilities)
    .filter(([_, data]) => data.value > 0)
    .map(([key, data]) => ({
      name: data.label,
      value: data.value,
      color: LIABILITY_COLORS[key as keyof typeof LIABILITY_COLORS],
    }));

  const balanceComparisonData = [
    { name: 'Ativos', value: totalAssets, fill: 'hsl(160, 84%, 39%)' },
    { name: 'Passivos', value: totalLiabilities, fill: 'hsl(0, 72%, 51%)' },
    { name: 'Patrimônio Líquido', value: Math.abs(netWorth), fill: netWorth >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Total de Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className="text-lg font-bold text-green-600">{formatMoney(totalAssets)}</p>
            <p className="text-xs text-muted-foreground">
              {totalAssetCount} {totalAssetCount === 1 ? 'ativo' : 'ativos'}
              {(pluggyInvestments.length > 0 || pluggyAccounts.length > 0) && (
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">Open Finance</Badge>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Total de Passivos
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className="text-lg font-bold text-red-600">{formatMoney(totalLiabilities)}</p>
            <p className="text-xs text-muted-foreground">
              {financiamentos.length + consorcios.length} {financiamentos.length + consorcios.length === 1 ? 'dívida' : 'dívidas'}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${netWorth >= 0 ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              Patrimônio Líquido
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="flex items-center gap-1.5">
              {netWorth > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : netWorth < 0 ? (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(netWorth)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Solvência: {liquidityRatio === Infinity ? '∞' : formatPercent(liquidityRatio * 100)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets Breakdown */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Composição dos Ativos
            </CardTitle>
            <CardDescription className="text-xs">Distribuição por categoria</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {assetChartData.length > 0 ? (
              <div className="h-[260px] sm:h-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      cx="50%"
                      cy={isMobile ? "40%" : "50%"}
                      innerRadius={isMobile ? 35 : 45}
                      outerRadius={isMobile ? 60 : 75}
                      paddingAngle={2}
                      dataKey="value"
                      label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={isMobile ? false : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                      fontSize={11}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {assetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    {isMobile && (
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry: any) => {
                          const item = assetChartData.find(d => d.name === value);
                          const percent = item ? ((item.value / totalAssets) * 100).toFixed(0) : 0;
                          return <span className="text-xs">{value} ({percent}%)</span>;
                        }}
                        wrapperStyle={{ fontSize: '11px' }}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div 
                  className="absolute pointer-events-none flex flex-col items-center justify-center"
                  style={{
                    top: isMobile ? '40%' : '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-xs sm:text-sm font-semibold text-green-600">{formatMoney(totalAssets)}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum ativo"
                actionLabel="Adicionar primeiro ativo"
                onAction={() => navigate('/bens-investimentos')}
                className="py-8"
              />
            )}
          </CardContent>
        </Card>

        {/* Liabilities Breakdown */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Composição dos Passivos
            </CardTitle>
            <CardDescription className="text-xs">Distribuição por tipo</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {liabilityChartData.length > 0 ? (
              <div className="h-[260px] sm:h-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liabilityChartData}
                      cx="50%"
                      cy={isMobile ? "40%" : "50%"}
                      innerRadius={isMobile ? 35 : 45}
                      outerRadius={isMobile ? 60 : 75}
                      paddingAngle={2}
                      dataKey="value"
                      label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={isMobile ? false : { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                      fontSize={11}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {liabilityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatMoney(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    {isMobile && (
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry: any) => {
                          const item = liabilityChartData.find(d => d.name === value);
                          const percent = item ? ((item.value / totalLiabilities) * 100).toFixed(0) : 0;
                          return <span className="text-xs">{value} ({percent}%)</span>;
                        }}
                        wrapperStyle={{ fontSize: '11px' }}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div 
                  className="absolute pointer-events-none flex flex-col items-center justify-center"
                  style={{
                    top: isMobile ? '40%' : '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-xs sm:text-sm font-semibold text-red-600">{formatMoney(totalLiabilities)}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<CreditCard className="h-6 w-6 text-muted-foreground" />}
                description="Nenhuma dívida cadastrada — Parabéns! 🎉"
                actionLabel="Adicionar primeiro crédito"
                onAction={() => navigate('/bens-investimentos/credito')}
                className="py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" />
            Visão Geral do Balanço
          </CardTitle>
          <CardDescription className="text-xs">Comparativo ativos vs passivos vs patrimônio</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceComparisonData} layout="vertical">
                <CartesianGrid {...premiumGrid} horizontal={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatMoney(value)} 
                  {...premiumXAxis}
                  tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100} 
                  {...premiumYAxis}
                  tick={{ fontSize: 12, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={premiumTooltipStyle.contentStyle}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets Detail */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Detalhamento dos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {Object.entries(assetsByType).map(([key, data]) => {
              const Icon = data.icon;
              const items = config.assets.filter(a => a.type === key);
              if (items.length === 0) return null;

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{data.label}</span>
                      <span className="text-xs text-muted-foreground">({data.count})</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatMoney(data.value)}</span>
                  </div>
                  <div className="ml-5 space-y-0.5">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span>{formatMoney(item.value)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              );
            })}

            {/* Investimentos Open Finance */}
            <InvestimentosPluggy />

            {config.assets.length === 0 && pluggyInvestmentsTotal === 0 && (
              <EmptyState description="Você ainda não cadastrou nenhum ativo" actionLabel="Adicionar primeiro ativo" onAction={() => navigate('/bens-investimentos')} className="py-4" />
            )}
          </CardContent>
        </Card>

        {/* Liabilities Detail */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Detalhamento dos Passivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {/* Financiamentos */}
            {financiamentos.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Financiamentos</span>
                    <span className="text-xs text-muted-foreground">({financiamentos.length})</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatMoney(liabilities.financiamentos.value)}</span>
                </div>
                <div className="ml-5 space-y-0.5">
                  {financiamentos.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{f.nome}</span>
                      <span>{formatMoney(Number(f.saldo_devedor))}</span>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Consórcios */}
            {consorcios.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Consórcios</span>
                    <span className="text-xs text-muted-foreground">({consorcios.length})</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatMoney(liabilities.consorcios.value)}</span>
                </div>
                <div className="ml-5 space-y-0.5">
                  {consorcios.map(c => {
                    const parcelasRestantes = c.prazo_total - c.parcelas_pagas;
                    const saldoDevedor = parcelasRestantes * Number(c.valor_parcela_atual);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground">{c.nome}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({parcelasRestantes} parcelas)
                          </span>
                        </div>
                        <span>{formatMoney(saldoDevedor)}</span>
                      </div>
                    );
                  })}
                </div>
                <Separator />
              </div>
            )}

            {financiamentos.length === 0 && consorcios.length === 0 && (
              <EmptyState description="Nenhuma dívida cadastrada" actionLabel="Adicionar primeiro crédito" onAction={() => navigate('/bens-investimentos/credito')} className="py-4" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-primary" />
            Indicadores de Saúde Financeira
          </CardTitle>
          <CardDescription className="text-xs">Métricas para avaliar sua situação patrimonial</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Índice de Endividamento</p>
              <p className="text-lg font-bold">
                {totalAssets > 0 ? formatPercent((totalLiabilities / totalAssets) * 100) : '0%'}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalAssets > 0 && (totalLiabilities / totalAssets) < 0.3 
                  ? '✓ Baixo endividamento' 
                  : totalAssets > 0 && (totalLiabilities / totalAssets) < 0.6
                  ? '⚠ Moderado'
                  : totalLiabilities > 0
                  ? '⚠ Alto'
                  : '✓ Sem dívidas'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cobertura Patrimonial</p>
              <p className="text-lg font-bold">
                {totalLiabilities > 0 
                  ? `${(totalAssets / totalLiabilities).toFixed(2)}x`
                  : totalAssets > 0 ? '∞' : '0x'}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalLiabilities > 0 && totalAssets >= totalLiabilities
                  ? '✓ Ativos cobrem dívidas'
                  : totalLiabilities > 0
                  ? '⚠ Dívidas > ativos'
                  : '✓ Sem dívidas'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Concentração de Ativos</p>
              <p className="text-lg font-bold">
                {(() => {
                  const maxType = Object.entries(assetsByType)
                    .filter(([_, d]) => d.value > 0)
                    .sort((a, b) => b[1].value - a[1].value)[0];
                  if (!maxType || totalAssets === 0) return 'N/A';
                  return formatPercent((maxType[1].value / totalAssets) * 100);
                })()}
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const maxType = Object.entries(assetsByType)
                    .filter(([_, d]) => d.value > 0)
                    .sort((a, b) => b[1].value - a[1].value)[0];
                  if (!maxType) return 'Sem ativos';
                  return `Maior: ${maxType[1].label}`;
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
