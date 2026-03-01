import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Wallet, Gift, Crown, Receipt, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialReport } from '@/hooks/useFinancialReport';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CATEGORY_COLORS: Record<string, string> = {
  'Contas da Casa': '#3b82f6', 'Alimentação': '#22c55e', 'Saúde': '#ef4444', 'Lazer': '#a855f7',
  'Transporte': '#f59e0b', 'Pessoal': '#ec4899', 'Investimentos': '#14b8a6',
};

const TABS: { id: string; label: string; icon: LucideIcon; highlight?: boolean }[] = [
  { id: 'planos', label: 'Planos', icon: Crown },
  { id: 'pagamentos', label: 'Pagamentos', icon: Receipt },
  { id: 'minhas-indicacoes', label: 'Indique & Ganhe', icon: Gift, highlight: true },
];

const VALID_TABS: string[] = TABS.map(t => t.id);

const FinanceiroLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const startMonth = format(new Date(now.getFullYear(), now.getMonth() - 2, 1), 'yyyy-MM');
  const { data: reportData, loading: reportLoading, error: reportError } = useFinancialReport(startMonth, currentMonth);

  const pathSegment = location.pathname.split('/').filter(Boolean).pop() || '';
  const currentTab = VALID_TABS.includes(pathSegment) ? pathSegment : '';

  useEffect(() => {
    if (!currentTab && (location.pathname === '/financeiro' || location.pathname === '/financeiro/')) {
      navigate('/financeiro/planos', { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/financeiro/${value}`);
  };

  const totais = reportData?.totais;
  const mensal = reportData?.mensal ?? [];
  const categoriasDespesa = reportData?.categorias_despesa ?? [];
  const totalCat = categoriasDespesa.reduce((s, c) => s + c.total, 0);
  const formatMes = (mes: string) => {
    const [y, m] = mes.split('-').map(Number);
    return `${MONTHS_SHORT[m - 1] ?? m} ${y}`;
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <PageHeader
          title="Financeiro"
          description="Planos, pagamentos e programa de indicações"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />

        {/* Relatório Financeiro */}
        {reportError && (
          <Card className="rounded-[14px] border-destructive/50 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{reportError}</p>
          </Card>
        )}
        {reportLoading && <p className="text-muted-foreground">Carregando relatório...</p>}
        {!reportLoading && !reportError && reportData && totais && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Receitas totais</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(totais.receitas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Despesas totais</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(totais.despesas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', totais.saldo >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
                    <Wallet className={cn('h-5 w-5', totais.saldo >= 0 ? 'text-green-600' : 'text-red-600')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saldo total</p>
                    <p className={cn('text-lg font-semibold', totais.saldo >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(totais.saldo)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[14px] border border-border/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Média mensal despesas</p>
                    <p className="text-lg font-semibold">{formatCurrency(totais.media_mensal_despesas)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {mensal.length > 0 && (
              <Card className="rounded-[14px] border border-border/80 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mensal</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-3 text-left font-medium">Mês</th>
                          <th className="px-4 py-3 text-right font-medium">Receitas</th>
                          <th className="px-4 py-3 text-right font-medium">Despesas</th>
                          <th className="px-4 py-3 text-right font-medium">Saldo</th>
                          <th className="px-4 py-3 text-right font-medium">Lançamentos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mensal.map((row) => (
                          <tr key={row.mes} className="border-b last:border-0">
                            <td className="px-4 py-3">{formatMes(row.mes)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.receitas)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.despesas)}</td>
                            <td className={cn('px-4 py-3 text-right font-medium', row.saldo >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(row.saldo)}</td>
                            <td className="px-4 py-3 text-right">{row.total_lancamentos ?? '—'}</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/20 font-semibold">
                          <td className="px-4 py-3">Totais</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(totais.receitas)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(totais.despesas)}</td>
                          <td className={cn('px-4 py-3 text-right', totais.saldo >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(totais.saldo)}</td>
                          <td className="px-4 py-3 text-right">{totais.total_lancamentos ?? '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            {categoriasDespesa.length > 0 && (
              <Card className="rounded-[14px] border border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Despesas por categoria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoriasDespesa.map((row) => {
                    const pct = totalCat > 0 ? (row.total / totalCat) * 100 : (row.percentual ?? 0);
                    const color = CATEGORY_COLORS[row.categoria] ?? 'var(--primary)';
                    return (
                      <div key={row.categoria} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-sm font-medium truncate">{row.categoria}</span>
                        <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden min-w-0">
                          <div className="h-full rounded-md transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">{formatCurrency(row.total)} ({(row.percentual ?? pct).toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            {reportData.gerado_em && (
              <p className="text-xs text-muted-foreground">
                Relatório gerado em {format(new Date(reportData.gerado_em), 'dd/MM/yyyy')} às {format(new Date(reportData.gerado_em), 'HH:mm')}
              </p>
            )}
          </div>
        )}

        <Tabs value={currentTab || 'planos'} onValueChange={handleTabChange}>
          <TabsList>
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`gap-1.5 ${tab.highlight ? 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' : ''}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </SettingsLayout>
  );
};

export default FinanceiroLayout;
