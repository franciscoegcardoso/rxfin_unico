import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useLancamentosRealizados } from '@/hooks/useLancamentosRealizados';
import { isBillPaymentTransaction } from '@/hooks/useBillPaymentReconciliation';
import { useVisibility } from '@/contexts/VisibilityContext';
import { BarChart2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLOR_INCOME  = 'hsl(var(--color-income))';
const COLOR_EXPENSE = 'hsl(0 65% 40%)'; // vermelho escuro enterprise

const formatCurrency = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
};

const AxisTick: React.FC<{ x?: number; y?: number; payload?: { value: string | number }; isHidden?: boolean; isY?: boolean }> = ({
  x = 0, y = 0, payload, isHidden, isY,
}) => {
  const raw = payload?.value ?? '';
  const text = isY
    ? isHidden ? '•••' : formatCurrency(Number(raw), false).replace(/\s/g, '\u00A0')
    : String(raw);
  return (
    <text
      x={x} y={y} dy={isY ? 4 : 12}
      textAnchor={isY ? 'end' : 'middle'}
      fill="hsl(var(--color-text-tertiary))"
      fontSize={11} fontFamily="var(--font-sans)" fontWeight={400}
    >
      {text}
    </text>
  );
};

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; isHidden: boolean }> = ({
  active, payload, label, isHidden,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'hsl(var(--color-surface-overlay))',
      border: '1px solid hsl(var(--color-border-default))',
      borderRadius: 8, padding: '10px 14px',
      fontFamily: 'var(--font-sans)',
      boxShadow: 'var(--shadow-md)', minWidth: 160,
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--color-text-secondary))', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'hsl(var(--color-text-secondary))' }}>{entry.name}:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--color-text-primary))', fontFamily: 'var(--font-numeric)', letterSpacing: '-0.01em', marginLeft: 'auto', paddingLeft: 8 }}>
            {formatCurrency(entry.value, isHidden)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend: React.FC<{ payload?: Array<{ value: string; color: string }> }> = ({ payload }) => {
  if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4, fontFamily: 'var(--font-sans)' }}>
      {payload.map((entry) => (
        <span key={entry.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'hsl(var(--color-text-secondary))' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
};

export const CashFlowChart: React.FC = () => {
  const { lancamentos } = useLancamentosRealizados();
  const { isHidden } = useVisibility();

  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const monthKey = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'MMM/yy', { locale: ptBR });
      const monthItems = lancamentos.filter(l => l.mes_referencia === monthKey && !isBillPaymentTransaction(l));
      const receitas = monthItems.filter(l => l.tipo === 'receita').reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
      const despesas = monthItems.filter(l => l.tipo === 'despesa').reduce((s, l) => s + (l.valor_realizado ?? 0), 0);
      months.push({ monthKey, monthLabel, receitas, despesas });
    }
    return months;
  }, [lancamentos]);

  return (
    <Card className="rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-raised))]">
      <CardHeader className="pb-2 p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-[hsl(var(--color-text-primary))] flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary" />
          Fluxo de caixa — últimos 6 meses
        </CardTitle>
        <Link to="/movimentacoes" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
          Ver relatório <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border-subtle))" vertical={false} />
              <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={(props) => <AxisTick {...props} isHidden={isHidden} />} />
              <YAxis axisLine={false} tickLine={false} width={72} tick={(props) => <AxisTick {...props} isHidden={isHidden} isY />} />
              <Tooltip cursor={{ fill: 'hsl(var(--color-border-subtle))', radius: 4 }} content={<CustomTooltip isHidden={isHidden} />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="receitas" name="Receitas" fill={COLOR_INCOME} radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill={COLOR_EXPENSE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
