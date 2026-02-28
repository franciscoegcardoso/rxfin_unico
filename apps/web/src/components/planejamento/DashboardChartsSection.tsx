import React from 'react';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCompactCurrency as formatCompactCurrencyUtil } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpandableChartButton } from '@/components/charts/ExpandableChartButton';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { premiumGrid, premiumXAxis, premiumYAxis, premiumTooltipStyle } from '@/components/charts/premiumChartTheme';
import { CalendarRange, Calendar } from 'lucide-react';

const mockMonthlyData = [
  { month: 'Jan', receitas: 8500, despesas: 6200 },
  { month: 'Fev', receitas: 8500, despesas: 5800 },
  { month: 'Mar', receitas: 9200, despesas: 6500 },
  { month: 'Abr', receitas: 8500, despesas: 7100 },
  { month: 'Mai', receitas: 8500, despesas: 6000 },
  { month: 'Jun', receitas: 10500, despesas: 6800 },
];


const mockMonthlyPlanData = [
  { categoria: 'Moradia', planejado: 2800, realizado: 2500 },
  { categoria: 'Alimentação', planejado: 1500, realizado: 1200 },
  { categoria: 'Transporte', planejado: 1000, realizado: 800 },
  { categoria: 'Saúde', planejado: 800, realizado: 600 },
  { categoria: 'Lazer', planejado: 600, realizado: 500 },
];

const mockAnnualPlanData = [
  { mes: 'Jan', planejado: 7000, realizado: 6200 },
  { mes: 'Fev', planejado: 7000, realizado: 5800 },
  { mes: 'Mar', planejado: 7200, realizado: 6500 },
  { mes: 'Abr', planejado: 7000, realizado: 7100 },
  { mes: 'Mai', planejado: 7000, realizado: 6000 },
  { mes: 'Jun', planejado: 7500, realizado: 6800 },
  { mes: 'Jul', planejado: 7000, realizado: 0 },
  { mes: 'Ago', planejado: 7000, realizado: 0 },
  { mes: 'Set', planejado: 7200, realizado: 0 },
  { mes: 'Out', planejado: 7000, realizado: 0 },
  { mes: 'Nov', planejado: 7500, realizado: 0 },
  { mes: 'Dez', planejado: 8000, realizado: 0 },
];

/**
 * Monthly plan chart (Planejamento Mensal) — intended for the "Metas do Mês" tab.
 */
interface MonthlyPlanChartProps {
  selectedMonth?: string;
}

export const MonthlyPlanChart: React.FC<MonthlyPlanChartProps> = ({ selectedMonth }) => {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();

  const hiddenData = isHidden
    ? mockMonthlyPlanData.map(d => ({ ...d, planejado: 0, realizado: 0 }))
    : mockMonthlyPlanData;

  const formatCurrency = (v: number) =>
    formatCompactCurrencyUtil(v, isHidden);

  const orcamentoMensal = 7000;
  const gastoMensal = 6200;
  const percentualMensal = Math.round((gastoMensal / orcamentoMensal) * 100);

  const formatPercent = (v: number) => (isHidden ? '••' : `${v}%`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
            <CalendarRange className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Planejamento Mensal</CardTitle>
            <p className="text-sm text-muted-foreground">Comparativo por categoria</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${percentualMensal > 100 ? 'text-expense' : 'text-income'}`}>
            {formatPercent(percentualMensal)}
          </p>
          <p className="text-xs text-muted-foreground">do orçamento</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gasto: {formatCurrency(gastoMensal)}</span>
              <span className="text-muted-foreground">Orçamento: {formatCurrency(orcamentoMensal)}</span>
            </div>
            <Progress value={isHidden ? 0 : percentualMensal} className="h-3" />
          </div>

          <div style={{ height: isMobile ? 160 : 180 }} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiddenData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v: number) => (isHidden ? '••••' : formatCompactCurrencyUtil(v, false))}
                />
                <YAxis dataKey="categoria" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip
                  formatter={(v: number) => (isHidden ? '••••' : `R$ ${v.toLocaleString('pt-BR')}`)}
                  contentStyle={premiumTooltipStyle}
                />
                <Bar dataKey="planejado" fill="hsl(var(--muted))" name="Planejado" radius={[0, 4, 4, 0]} />
                <Bar dataKey="realizado" fill="hsl(var(--income))" name="Realizado" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Charts that were on Dashboard: Evolução Mensal, Despesas por Categoria, Planejamento Anual.
 */
export const DashboardChartsSection: React.FC = () => {
  const { isHidden } = useVisibility();
  const isMobile = useIsMobile();

  const formatCurrency = (v: number) => formatCompactCurrencyUtil(v, isHidden);

  const hiddenChartData = isHidden
    ? mockMonthlyData.map(d => ({ ...d, receitas: 0, despesas: 0 }))
    : mockMonthlyData;
  const hiddenAnnualPlanData = isHidden
    ? mockAnnualPlanData.map(d => ({ ...d, planejado: 0, realizado: 0 }))
    : mockAnnualPlanData;

  const orcamentoAnual = 86400;
  const gastoAnual = 38400;
  const percentualAnual = Math.round((gastoAnual / orcamentoAnual) * 100);
  const formatPercent = (v: number) => (isHidden ? '••' : `${v}%`);

  const chartHeight = isMobile ? 180 : 300;

  return (
    <div className="space-y-6">
      {/* Evolução Mensal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Evolução Mensal</CardTitle>
          <ExpandableChartButton title="Evolução Mensal">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hiddenChartData}>
                <defs>
                  <linearGradient id="colorReceitasExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesasExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...premiumGrid} />
                <XAxis dataKey="month" {...premiumXAxis} />
                <YAxis {...premiumYAxis} tickFormatter={(v: number) => (isHidden ? '••••' : formatCompactCurrencyUtil(v, false))} />
                <Tooltip contentStyle={premiumTooltipStyle} formatter={(v: number) => (isHidden ? '••••' : formatCurrency(v))} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(var(--income))" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitasExp)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="hsl(var(--expense))" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesasExp)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </ExpandableChartButton>
        </CardHeader>
        <CardContent>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hiddenChartData}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...premiumGrid} />
                <XAxis dataKey="month" {...premiumXAxis} />
                <YAxis {...premiumYAxis} tickFormatter={(v: number) => (isHidden ? '••••' : formatCompactCurrencyUtil(v, false))} />
                <Tooltip contentStyle={premiumTooltipStyle} formatter={(v: number) => (isHidden ? '••••' : formatCurrency(v))} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(var(--income))" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="hsl(var(--expense))" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesas)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Planejamento Anual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Planejamento Anual</CardTitle>
              <p className="text-sm text-muted-foreground">2024</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${percentualAnual > 100 ? 'text-expense' : 'text-income'}`}>
              {formatPercent(percentualAnual)}
            </p>
            <p className="text-xs text-muted-foreground">do orçamento anual</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gasto: {formatCurrency(gastoAnual)}</span>
                <span className="text-muted-foreground">Orçamento: {formatCurrency(orcamentoAnual)}</span>
              </div>
              <Progress value={isHidden ? 0 : percentualAnual} className="h-3" />
            </div>

            <div style={{ height: isMobile ? 160 : 180 }} className="mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hiddenAnnualPlanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v: number) => (isHidden ? '••••' : formatCompactCurrencyUtil(v, false))} />
                  <Tooltip formatter={(v: number) => (isHidden ? '••••' : `R$ ${v.toLocaleString('pt-BR')}`)} contentStyle={premiumTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="planejado" fill="hsl(var(--muted))" name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizado" fill="hsl(var(--chart-4))" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
