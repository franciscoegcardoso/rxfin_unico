import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building2, Car, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectionLineParams, LineParamKey, ProjectionIndex } from '@/hooks/useProjectionLineParams';
import { LINE_LABELS } from '@/hooks/useProjectionLineParams';
import type { AnnualClosing } from '@/hooks/useAnnualClosings';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Patrimony30YearsTableProps {
  years: number[];
  currentYear: number;
  params: ProjectionLineParams;
  baseIncome: number;
  baseExpense: number;
  basePatrimony: {
    property: number;
    vehicle: number;
    investment: number;
    company: number;
    others: number;
    grandTotal: number;
  };
  indexAverages: Record<ProjectionIndex, number>;
  closings: AnnualClosing[];
  formatCurrency: (value: number) => string;
  isHidden?: boolean;
}

// ─── Cálculo de taxa efetiva ──────────────────────────────────────────────────

function getEffectiveRate(
  param: { index: ProjectionIndex; spread: number; customRate?: number },
  indexAverages: Record<ProjectionIndex, number>
): number {
  const base = param.index === 'custom'
    ? (param.customRate ?? 0)
    : indexAverages[param.index] ?? 0;
  return base + param.spread;
}

function projectValue(base: number, ratePercent: number, years: number): number {
  if (years === 0) return base;
  const rate = ratePercent / 100;
  return Math.round(base * Math.pow(1 + rate, years));
}

// ─── Configuração de linhas ───────────────────────────────────────────────────

const LINE_ORDER: LineParamKey[] = [
  'income', 'expense', 'property', 'vehicle', 'investment', 'company', 'others',
];

const LINE_ICONS: Record<LineParamKey, React.ReactNode> = {
  income:     <TrendingUp className="h-3 w-3 text-income" />,
  expense:    <TrendingDown className="h-3 w-3 text-expense" />,
  property:   <Building2 className="h-3 w-3 text-primary" />,
  vehicle:    <Car className="h-3 w-3 text-amber-500" />,
  investment: <TrendingUp className="h-3 w-3 text-primary" />,
  company:    <Building2 className="h-3 w-3 text-muted-foreground" />,
  others:     <Package className="h-3 w-3 text-muted-foreground" />,
};

const LINE_COLORS: Partial<Record<LineParamKey, string>> = {
  income:     'text-income',
  expense:    'text-expense',
  property:   'text-primary',
  vehicle:    'text-amber-600 dark:text-amber-400',
  investment: 'text-primary',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const Patrimony30YearsTable: React.FC<Patrimony30YearsTableProps> = ({
  years,
  currentYear,
  params,
  baseIncome,
  baseExpense,
  basePatrimony,
  indexAverages,
  closings,
  formatCurrency,
  isHidden = false,
}) => {
  const closingsMap = useMemo(() => {
    const m: Record<number, AnnualClosing> = {};
    closings.forEach(c => { m[c.year] = c; });
    return m;
  }, [closings]);

  const lineBase: Record<LineParamKey, number> = {
    income:     baseIncome,
    expense:    baseExpense,
    property:   basePatrimony.property,
    vehicle:    basePatrimony.vehicle,
    investment: basePatrimony.investment,
    company:    basePatrimony.company,
    others:     basePatrimony.others,
  };

  const getLineValue = (key: LineParamKey, year: number): { value: number; isReal: boolean } => {
    const closing = closingsMap[year];

    if (closing && !closing.isEstimated) {
      if (key === 'income') return { value: closing.totalIncome, isReal: true };
      if (key === 'expense') return { value: closing.totalExpense, isReal: true };
      const breakdown = closing.patrimonyBreakdown;
      if (breakdown && key in breakdown && typeof breakdown[key] === 'number')
        return { value: breakdown[key] as number, isReal: true };
    }

    const yearsFromBase = year - currentYear;
    const rate = getEffectiveRate(params[key], indexAverages);
    return {
      value: projectValue(lineBase[key], rate, yearsFromBase),
      isReal: false,
    };
  };

  const getPatrimonyTotal = (year: number): { value: number; isReal: boolean } => {
    const closing = closingsMap[year];
    if (closing && !closing.isEstimated)
      return { value: closing.totalPatrimony, isReal: true };

    const patrimonyKeys: LineParamKey[] = ['property', 'vehicle', 'investment', 'company', 'others'];
    const total = patrimonyKeys.reduce((sum, key) => sum + getLineValue(key, year).value, 0);
    return { value: total, isReal: false };
  };

  const getBalance = (year: number): number => {
    return getLineValue('income', year).value - getLineValue('expense', year).value;
  };

  const FIXED_COL = 'w-40 min-w-[10rem]';
  const DATA_COL = 'flex-shrink-0 w-[72px] text-right text-xs px-1 py-1.5 flex items-center justify-end';

  return (
    <div className="flex text-xs">
      {/* ── Coluna Fixa ────────────────────────────────────────── */}
      <div className={cn('flex-shrink-0 border-r border-border bg-card z-10', FIXED_COL)}>
        <div className="py-2 px-3 h-9 font-semibold text-muted-foreground border-b border-border flex items-center">
          Linha
        </div>

        <div className="py-1.5 px-3 h-8 font-bold border-b border-border bg-primary/5 flex items-center gap-1.5 text-primary">
          <DollarSign className="h-3 w-3" />
          Patrimônio Total
        </div>

        <div className="py-1.5 px-3 h-8 font-semibold border-b border-border/60 bg-muted/20 flex items-center gap-1.5 text-foreground">
          <TrendingUp className="h-3 w-3" />
          Saldo Anual
        </div>

        {LINE_ORDER.map(key => {
          const rate = getEffectiveRate(params[key], indexAverages);
          return (
            <div
              key={key}
              className="py-1.5 px-3 h-8 border-b border-border/40 flex items-center gap-1.5"
            >
              {LINE_ICONS[key]}
              <span className={cn('flex-1 truncate font-medium', LINE_COLORS[key])}>
                {LINE_LABELS[key]}
              </span>
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Área Scrollável ────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto">
        <div style={{ minWidth: `${years.length * 72}px` }}>
          <div className="flex border-b border-border h-9">
            {years.map(year => {
              const isCurrent = year === currentYear;
              const isFuture = year > currentYear;
              const hasReal = !!closingsMap[year] && !closingsMap[year].isEstimated;
              return (
                <div
                  key={year}
                  className={cn(
                    DATA_COL,
                    'justify-center font-semibold flex-col gap-0',
                    isCurrent && 'bg-accent text-foreground',
                    isFuture && !isCurrent && 'bg-primary/5 text-primary/70',
                    !isFuture && !isCurrent && 'text-muted-foreground',
                  )}
                >
                  <span>{year}</span>
                  {hasReal
                    ? <span className="text-[8px] text-income">✓</span>
                    : isFuture && <span className="text-[8px] text-primary/40">proj</span>}
                </div>
              );
            })}
          </div>

          <div className="flex border-b border-border h-8 bg-primary/5">
            {years.map(year => {
              const { value, isReal } = getPatrimonyTotal(year);
              return (
                <div key={year} className={cn(DATA_COL, 'font-bold text-primary', isReal && 'opacity-100')}>
                  {isHidden ? '••••' : formatCurrency(value)}
                </div>
              );
            })}
          </div>

          <div className="flex border-b border-border/60 h-8 bg-muted/20">
            {years.map(year => {
              const balance = getBalance(year);
              return (
                <div
                  key={year}
                  className={cn(DATA_COL, 'font-semibold', balance >= 0 ? 'text-income' : 'text-expense')}
                >
                  {isHidden ? '••••' : formatCurrency(balance)}
                </div>
              );
            })}
          </div>

          {LINE_ORDER.map(key => (
            <div key={key} className="flex border-b border-border/40 h-8">
              {years.map(year => {
                const { value, isReal } = getLineValue(key, year);
                const isCurrent = year === currentYear;
                const isFuture = year > currentYear;
                return (
                  <div
                    key={year}
                    className={cn(
                      DATA_COL,
                      LINE_COLORS[key] || 'text-foreground',
                      isCurrent && 'bg-accent/30',
                      isFuture && !isCurrent && 'opacity-70',
                      isReal && 'font-medium opacity-100',
                    )}
                  >
                    {isHidden ? '••••' : formatCurrency(value)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
