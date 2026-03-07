import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVisibility } from '@/contexts/VisibilityContext';
import { CreditCardBill } from '@/hooks/useCreditCardBills';
import {
  premiumXAxis,
  premiumTooltipStyle,
  formatBRL,
} from '@/components/charts/premiumChartTheme';

interface CardHealthAnalyticsProps {
  bills: CreditCardBill[];
  periodFilter?: React.ReactNode;
}

interface MonthData {
  month: string;
  label: string;
  paid: number;
  remaining: number;
  total: number;
}

function getHealthConfig(score: number) {
  if (score >= 100) return {
    label: 'Pagamento do cartão de crédito em dia',
    icon: ShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60',
  };
  if (score >= 70) return {
    label: 'Atenção ao pagamento parcial das faturas',
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60',
  };
  return {
    label: 'Risco de juros elevados',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    badgeClass: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/60',
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const paid = payload.find((p: any) => p.dataKey === 'paid')?.value || 0;
  const remaining = payload.find((p: any) => p.dataKey === 'remaining')?.value || 0;
  const total = paid + remaining;

  return (
    <div style={premiumTooltipStyle.contentStyle} className="min-w-[180px]">
      <p className="font-semibold text-xs text-foreground capitalize mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Pago</span>
          </div>
          <span className="text-[11px] font-mono font-semibold tabular-nums text-foreground">{formatBRL(paid)}</span>
        </div>
        {remaining > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[11px] text-muted-foreground">Pendente</span>
            </div>
            <span className="text-[11px] font-mono font-semibold tabular-nums text-foreground">{formatBRL(remaining)}</span>
          </div>
        )}
        <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-4">
          <span className="text-[11px] font-medium text-muted-foreground">Total</span>
          <span className="text-[11px] font-mono font-bold tabular-nums text-foreground">{formatBRL(total)}</span>
        </div>
      </div>
    </div>
  );
};

export const CardHealthAnalytics: React.FC<CardHealthAnalyticsProps> = ({ bills, periodFilter }) => {
  const { isHidden } = useVisibility();

  const { monthData, healthScore } = useMemo(() => {
    const monthMap = new Map<string, { paid: number; total: number }>();

    bills.forEach(bill => {
      if (!bill.due_date) return;
      const monthKey = bill.due_date.substring(0, 7);
      const existing = monthMap.get(monthKey) || { paid: 0, total: 0 };
      existing.total += bill.total_value || 0;
      if (bill.status === 'overdue') {
        existing.paid += 0;
      } else {
        existing.paid += bill.paid_amount ?? (bill.status === 'paid' ? bill.total_value : 0);
      }
      monthMap.set(monthKey, existing);
    });

    const sortedMonths = Array.from(monthMap.keys()).sort();

    const data: MonthData[] = sortedMonths.map(m => {
      const { paid, total } = monthMap.get(m)!;
      const remaining = Math.max(0, total - paid);
      return {
        month: m,
        label: format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR }),
        paid: Math.max(0, paid),
        remaining,
        total,
      };
    });

    const totalSum = data.reduce((s, d) => s + d.total, 0);
    const paidSum = data.reduce((s, d) => s + d.paid, 0);
    const score = totalSum > 0 ? Math.round((paidSum / totalSum) * 100) : 100;

    return { monthData: data, healthScore: score };
  }, [bills]);

  const healthConfig = getHealthConfig(healthScore);
  const HealthIcon = healthConfig.icon;

  if (monthData.length === 0) return null;

  return (
    <SectionCard
      title="Saúde do Cartão"
      description="Análise de pagamentos dos últimos meses"
      icon={<Heart className="h-4 w-4 text-primary" />}
      expandable
      headerRight={
        <div className="flex items-center gap-3">
          {periodFilter}
          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-bold font-mono tabular-nums tracking-tight", healthConfig.color)}>
              {isHidden ? '••' : `${healthScore}%`}
            </span>
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium", healthConfig.badgeClass)}>
              <HealthIcon className="h-2.5 w-2.5 mr-0.5" strokeWidth={1.5} />
              Health Score
            </Badge>
          </div>
        </div>
      }
    >
      {/* Chart */}
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthData} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis
              {...premiumXAxis}
              dataKey="label"
              tick={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--chart-axis))', fontFamily: 'Inter, system-ui, sans-serif' }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Bar dataKey="paid" stackId="bill" fill="hsl(152, 60%, 48%)" radius={[0, 0, 0, 0]} name="Pago" />
            <Bar dataKey="remaining" stackId="bill" fill="hsl(0, 70%, 60%)" radius={[6, 6, 0, 0]} name="Pendente" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(152, 60%, 48%)' }} />
          <span className="text-[11px] text-muted-foreground font-medium">Pago</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(0, 70%, 60%)' }} />
          <span className="text-[11px] text-muted-foreground font-medium">Pendente / Rotativo</span>
        </div>
      </div>
    </SectionCard>
  );
};
