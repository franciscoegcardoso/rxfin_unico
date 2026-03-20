import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFinancial } from '@/contexts/FinancialContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useCreditos } from '@/hooks/useCreditos';
import { useSeguros } from '@/hooks/useSeguros';
import { usePluggyInvestments } from '@/hooks/usePluggyInvestments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetTypes, patrimonioAssetTypes, investmentTypes } from '@/data/defaultData';
import { Asset, AssetType, InvestmentType } from '@/types/financial';
import { 
  Building2, 
  Car, 
  TrendingUp, 
  Package,
  TrendingDown,
  Target,
  Landmark,
  PieChart,
  Wallet,
  AlertTriangle,
  Shield,
  Plus,
  Scale,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { BalancoPatrimonialSection } from './BalancoPatrimonialSection';
import { useOverviewSummary } from '@/hooks/useOverviewSummary';
import { NetWorthHero, HealthScoreCard, ModuleSummaryCard, SparklineCard, NavChips } from '@/components/shared/overview';

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ConsolidatedSectionProps {
  onNavigate?: (tab: string) => void;
}

export const ConsolidatedSection: React.FC<ConsolidatedSectionProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: overview, isLoading: overviewLoading } = useOverviewSummary();
  const { config } = useFinancial();
  const { isHidden } = useVisibility();
  const { consorcios, financiamentos } = useCreditos();
  const { seguros } = useSeguros();
  const { totalBalance: pluggyInvestmentsTotal } = usePluggyInvestments();
  const { data: pluggyAccounts = [] } = useQuery({
    queryKey: ['pluggy-accounts-balance-consolidated'],
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
  const [balancoOpen, setBalancoOpen] = useState(false);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const assetIcons: Record<AssetType, React.ReactNode> = {
    property: <Building2 className="h-4 w-4" />,
    vehicle: <Car className="h-4 w-4" />,
    company: <Landmark className="h-4 w-4" />,
    investment: <TrendingUp className="h-4 w-4" />,
    valuable_objects: <Package className="h-4 w-4" />,
    intellectual_property: <Package className="h-4 w-4" />,
    licenses_software: <Package className="h-4 w-4" />,
    rights: <TrendingUp className="h-4 w-4" />,
    obligations: <TrendingDown className="h-4 w-4" />,
    other: <Package className="h-4 w-4" />,
  };

  // Separar patrimônio e investimentos
  const patrimonioAssets = useMemo(() => {
    return config.assets.filter(asset => asset.type !== 'investment');
  }, [config.assets]);

  const investmentAssets = useMemo(() => {
    return config.assets.filter(asset => asset.type === 'investment');
  }, [config.assets]);

  // Calcular totais (apenas ativos não vendidos)
  const totalPatrimonio = useMemo(() => {
    return patrimonioAssets
      .filter(asset => !asset.isSold)
      .reduce((sum, asset) => {
        // Obrigações são negativas
        if (asset.type === 'obligations') {
          return sum - asset.value;
        }
        return sum + asset.value;
      }, 0);
  }, [patrimonioAssets]);

  const totalInvestimentosManuais = useMemo(() => {
    return investmentAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [investmentAssets]);

  // Saldo Open Finance (contas bancárias)
  const pluggyAccountsTotal = useMemo(() => {
    return pluggyAccounts
      .filter(a => a.type === 'BANK' || a.type === 'SAVINGS')
      .reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [pluggyAccounts]);

  // Total de investimentos = manual + Pluggy investments + Pluggy bank accounts
  const totalInvestimentos = totalInvestimentosManuais + pluggyInvestmentsTotal + pluggyAccountsTotal;

  // Totais de consórcios
  const totalConsorcios = useMemo(() => {
    return consorcios.reduce((sum, c) => {
      const valorPago = c.parcelas_pagas * c.valor_parcela_atual;
      return sum + valorPago;
    }, 0);
  }, [consorcios]);

  const creditoConsorcios = useMemo(() => {
    return consorcios.reduce((sum, c) => sum + c.valor_carta, 0);
  }, [consorcios]);

  // Totais de financiamentos
  const totalFinanciamentos = useMemo(() => {
    return financiamentos.reduce((sum, f) => {
      const parcelasRestantes = f.prazo_total - f.parcelas_pagas;
      const valorRestante = parcelasRestantes * f.valor_parcela_atual;
      return sum + valorRestante;
    }, 0);
  }, [financiamentos]);

  const valorBensFinanciados = useMemo(() => {
    return financiamentos.reduce((sum, f) => sum + f.valor_bem, 0);
  }, [financiamentos]);

  // Patrimônio líquido total
  const patrimonioLiquido = totalPatrimonio + totalInvestimentos + totalConsorcios - totalFinanciamentos;

  // Totais por tipo de patrimônio
  const totalsByPatrimonioType = useMemo(() => {
    const totals: Record<string, number> = {};
    patrimonioAssets.forEach(asset => {
      const key = asset.type;
      if (!totals[key]) totals[key] = 0;
      totals[key] += asset.value;
    });
    return totals;
  }, [patrimonioAssets]);

  // Totais por tipo de investimento
  const totalsByInvestmentType = useMemo(() => {
    const totals: Record<string, number> = {};
    investmentAssets.forEach(asset => {
      const type = asset.investmentType || 'outros';
      if (!totals[type]) totals[type] = 0;
      totals[type] += asset.value;
    });
    return totals;
  }, [investmentAssets]);

  // Total geral para calcular porcentagens
  const totalGeral = Math.abs(totalPatrimonio) + totalInvestimentos + totalConsorcios + totalFinanciamentos;

  // Bens que podem ter seguro mas não têm (imóveis e veículos ativos)
  const assetsWithoutInsurance = useMemo(() => {
    const insurableTypes = ['property', 'vehicle'];
    const insurableAssets = patrimonioAssets.filter(
      asset => insurableTypes.includes(asset.type) && !asset.isSold
    );
    
    // Verificar quais têm seguro vinculado
    return insurableAssets.filter(asset => {
      const hasInsurance = seguros.some(
        s => s.asset_id === asset.id && new Date(s.data_fim) >= new Date()
      );
      return !hasInsurance;
    });
  }, [patrimonioAssets, seguros]);

  const navChips = useMemo(
    () => [
      {
        id: 'passivos',
        label: 'Passivos',
        sublabel: overview?.has_overdue ? `${overview.overdue_count} vencida(s)` : 'Dívidas e financiamentos',
        icon: TrendingDown,
        color: 'bg-red-50 dark:bg-red-950/30',
        textColor: 'text-red-700 dark:text-red-400',
        borderColor: 'border border-red-200 dark:border-red-800',
        path: '/passivos',
      },
      {
        id: 'movimentacoes',
        label: 'Movimentações',
        sublabel: 'Extrato e cartão',
        icon: Receipt,
        color: 'bg-purple-50 dark:bg-purple-950/30',
        textColor: 'text-purple-700 dark:text-purple-400',
        borderColor: 'border border-purple-200 dark:border-purple-800',
        path: '/movimentacoes',
      },
    ],
    [overview?.has_overdue, overview?.overdue_count]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4 mb-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <NetWorthHero
              netWorth={(overview?.total_assets ?? 0) - (overview?.total_debt ?? 0)}
              totalAssets={overview?.total_assets ?? 0}
              totalDebt={overview?.total_debt ?? 0}
              monthlyDeltaPct={overview?.net_worth_delta_pct ?? null}
              isLoading={overviewLoading}
            />
          </div>
          <HealthScoreCard
            score={overview?.health_score ?? null}
            classification={overview?.health_classification ?? null}
            isLoading={overviewLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModuleSummaryCard
            title="Passivos"
            subtitle="Dívidas, financiamentos e consórcios"
            value={isHidden ? '••••••' : formatCurrencyBRL(overview?.total_debt ?? 0)}
            valueVariant="negative"
            icon={TrendingDown}
            iconColor="text-red-500"
            badge={overview?.has_overdue ? `${overview.overdue_count} vencida(s)` : undefined}
            onClick={() => navigate('/passivos')}
            isLoading={overviewLoading}
          />
          <ModuleSummaryCard
            title="Movimentações"
            subtitle={`Saldo ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}`}
            value={isHidden ? '••••••' : formatCurrencyBRL(overview?.month_balance ?? 0)}
            valueVariant={(overview?.month_balance ?? 0) >= 0 ? 'positive' : 'negative'}
            icon={Receipt}
            iconColor="text-purple-500"
            onClick={() => navigate('/movimentacoes')}
            isLoading={overviewLoading}
          />
        </div>

        <SparklineCard data={overview?.sparkline ?? []} isLoading={overviewLoading} />

        <NavChips chips={navChips} currentPath={location.pathname} />

        <div className="border-t border-border/50 pt-4" />
      </div>

      {/* Resumo Consolidado */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Visão Consolidada do Patrimônio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              onClick={() => onNavigate?.('patrimonio')}
              className="text-center p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground">Patrimônio</p>
              <p className="text-base sm:text-xl font-bold text-foreground truncate">{formatCurrency(totalPatrimonio)}</p>
            </button>
            <button
              onClick={() => onNavigate?.('investimentos')}
              className="text-center p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground">Investimentos</p>
              <p className="text-base sm:text-xl font-bold text-income truncate">{formatCurrency(totalInvestimentos)}</p>
            </button>
            <button
              onClick={() => onNavigate?.('credito')}
              className="text-center p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground">Consórcios</p>
              <p className="text-base sm:text-xl font-bold text-amber-600 truncate">{formatCurrency(totalConsorcios)}</p>
            </button>
            <button
              onClick={() => onNavigate?.('credito')}
              className="text-center p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground">Financiamentos</p>
              <p className="text-base sm:text-xl font-bold text-expense truncate">{formatCurrency(totalFinanciamentos)}</p>
            </button>
            <div className="col-span-2 lg:col-span-1 text-center p-3 bg-primary/20 rounded-lg border-2 border-primary/30">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Patrimônio Líquido</p>
              <p className={cn(
                "text-base sm:text-xl font-bold truncate",
                patrimonioLiquido >= 0 ? "text-primary" : "text-expense"
              )}>
                {formatCurrency(patrimonioLiquido)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de bens sem proteção */}
      {assetsWithoutInsurance.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    {assetsWithoutInsurance.length} bem(ns) sem proteção
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {assetsWithoutInsurance.map(a => a.name).join(', ')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => navigate('/seguros')}
              >
                <Shield className="h-3.5 w-3.5 mr-1" />
                Adicionar Seguro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patrimônio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Patrimônio por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patrimonioAssetTypes.map(type => {
              const total = totalsByPatrimonioType[type.value] || 0;
              if (total === 0) return null;
              const percentage = totalGeral > 0 ? (total / totalGeral) * 100 : 0;
              const count = patrimonioAssets.filter(a => a.type === type.value && !a.isSold).length;

              return (
                <div key={type.value} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {assetIcons[type.value as AssetType]}
                      <span className="text-sm font-medium">{type.label}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-semibold",
                        type.value === 'obligations' ? "text-expense" : "text-foreground"
                      )}>
                        {type.value === 'obligations' ? '-' : ''}{formatCurrency(total)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            {Object.keys(totalsByPatrimonioType).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum bem cadastrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Investimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investimentos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {investmentTypes.map(type => {
              const total = totalsByInvestmentType[type.value] || 0;
              if (total === 0) return null;
              const percentage = totalInvestimentos > 0 ? (total / totalInvestimentos) * 100 : 0;
              const count = investmentAssets.filter(a => a.investmentType === type.value && !a.isSold).length;

              return (
                <div key={type.value} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(total)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            {Object.keys(totalsByInvestmentType).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum investimento cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consórcios e Financiamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consórcios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Consórcios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consorcios.length === 0 ? (
              <EmptyState
                icon={<Target className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum consórcio"
                actionLabel="Adicionar primeiro consórcio"
                onAction={() => navigate('/bens-investimentos/credito')}
                className="py-6"
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total em Cartas</p>
                    <p className="text-lg font-bold">{formatCurrency(creditoConsorcios)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Já Pago</p>
                    <p className="text-lg font-bold text-income">{formatCurrency(totalConsorcios)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {consorcios.map(c => {
                    const progresso = (c.parcelas_pagas / c.prazo_total) * 100;
                    return (
                      <div key={c.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{c.nome}</span>
                          <Badge variant={c.contemplado ? "default" : "secondary"}>
                            {c.contemplado ? "Contemplado" : "Não contemplado"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Parcela {c.parcelas_pagas}/{c.prazo_total}</span>
                          <span>{formatCurrency(c.valor_carta)}</span>
                        </div>
                        <Progress value={progresso} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financiamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Financiamentos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financiamentos.length === 0 ? (
              <EmptyState
                icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
                description="Você ainda não cadastrou nenhum financiamento"
                actionLabel="Adicionar primeiro financiamento"
                onAction={() => navigate('/bens-investimentos/credito')}
                className="py-6"
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Valor dos Bens</p>
                    <p className="text-lg font-bold">{formatCurrency(valorBensFinanciados)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Saldo Devedor</p>
                    <p className="text-lg font-bold text-expense">{formatCurrency(totalFinanciamentos)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {financiamentos.map(f => {
                    const progresso = (f.parcelas_pagas / f.prazo_total) * 100;
                    return (
                      <div key={f.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{f.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {f.sistema_amortizacao.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Parcela {f.parcelas_pagas}/{f.prazo_total}</span>
                          <span>{formatCurrency(f.saldo_devedor)}</span>
                        </div>
                        <Progress value={progresso} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Observações */}
      {(totalFinanciamentos > totalPatrimonio + totalInvestimentos) && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700">Atenção ao endividamento</p>
                <p className="text-sm text-amber-600">
                  O saldo devedor de financiamentos supera o valor total de patrimônio e bens. 
                  Considere revisar seu planejamento financeiro.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Botão Balanço Patrimonial */}
      <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setBalancoOpen(true)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Balanço Patrimonial</p>
                <p className="text-sm text-muted-foreground">Visão detalhada de ativos, passivos e patrimônio líquido</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); setBalancoOpen(true); }}>
              <Scale className="h-4 w-4" />
              Abrir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Balanço Patrimonial */}
      <Dialog open={balancoOpen} onOpenChange={setBalancoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Balanço Patrimonial
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <BalancoPatrimonialSection />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
