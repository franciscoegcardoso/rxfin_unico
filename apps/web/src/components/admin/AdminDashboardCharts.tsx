import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartData {
  monthly_active: { month: string; value: number }[];
  new_active_daily: { day: string; value: number }[];
  new_active_weekly: { week: string; value: number }[];
  new_active_monthly: { month: string; value: number }[];
  monthly_churn: { month: string; value: number }[];
  monthly_reactivated: { month: string; value: number }[];
}

interface Props {
  data: ChartData | null;
  loading: boolean;
}

const formatMonth = (v: string) => {
  try {
    const d = parse(v, 'yyyy-MM', new Date());
    return format(d, 'MMM/yy', { locale: ptBR });
  } catch { return v; }
};

const formatDay = (v: string) => {
  try {
    const d = parse(v, 'yyyy-MM-dd', new Date());
    return format(d, 'dd/MM', { locale: ptBR });
  } catch { return v; }
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{formatter ? formatter(label) : label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function AdminDashboardCharts({ data, loading }: Props) {
  const [newActiveView, setNewActiveView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  if (loading || !data) return null;

  const newActiveData = newActiveView === 'daily'
    ? (data.new_active_daily ?? []).map(d => ({ label: d.day, value: d.value }))
    : newActiveView === 'weekly'
    ? (data.new_active_weekly ?? []).map(d => ({ label: d.week, value: d.value }))
    : (data.new_active_monthly ?? []).map(d => ({ label: d.month, value: d.value }));

  const newActiveFormatter = newActiveView === 'daily' ? formatDay : newActiveView === 'monthly' ? formatMonth : (v: string) => v;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Monthly Active */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Clientes Ativos (Mensal)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly_active ?? []}>
                <defs>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tickFormatter={formatMonth} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip formatter={formatMonth} />} />
                <Area type="monotone" dataKey="value" name="Ativos" stroke="hsl(var(--primary))" fill="url(#activeGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. New Active with tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Novos Ativos
            </CardTitle>
            <Tabs value={newActiveView} onValueChange={v => setNewActiveView(v as any)}>
              <TabsList className="h-7">
                <TabsTrigger value="daily" className="text-[10px] px-2 h-5">Diário</TabsTrigger>
                <TabsTrigger value="weekly" className="text-[10px] px-2 h-5">Semanal</TabsTrigger>
                <TabsTrigger value="monthly" className="text-[10px] px-2 h-5">Mensal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newActiveData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tickFormatter={newActiveFormatter} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip formatter={newActiveFormatter} />} />
                <Bar dataKey="value" name="Novos" fill="hsl(var(--chart-2, 142 71% 45%))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Monthly Churn */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-muted-foreground" />
            Churn Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_churn ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tickFormatter={formatMonth} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip formatter={formatMonth} />} />
                <Bar dataKey="value" name="Churn" fill="hsl(var(--destructive, 0 84% 60%))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 4. Monthly Reactivated */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Reativados Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_reactivated ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tickFormatter={formatMonth} className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-[10px]" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip formatter={formatMonth} />} />
                <Bar dataKey="value" name="Reativados" fill="hsl(var(--chart-4, 280 65% 60%))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
