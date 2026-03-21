import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { hasVisibleFundamentals, type AssetFundamentalsRow } from '@/hooks/useAssetFundamentals';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/investimentos';

function fmtRatio(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Metric = { label: string; value: string };

function buildMetrics(f: AssetFundamentalsRow): Metric[] {
  const out: Metric[] = [];
  if (f.dy_12m != null && f.dy_12m > 0) {
    out.push({
      label: 'Dividend Yield (12m)',
      value: `${fmtRatio(f.dy_12m)}%`,
    });
  }
  if (f.p_l != null) {
    out.push({ label: 'P/L', value: fmtRatio(f.p_l) });
  }
  if (f.p_vp != null) {
    out.push({ label: 'P/VP', value: fmtRatio(f.p_vp) });
  }
  if (f.roe != null) {
    out.push({ label: 'ROE', value: `${fmtRatio(f.roe)}%` });
  }
  return out;
}

export interface FundamentalsCardProps {
  fundamentals: AssetFundamentalsRow;
  className?: string;
}

/**
 * Indicadores de mercado (brapi). Só renderizar o bloco quando `hasVisibleFundamentals(fundamentals)`.
 */
export function FundamentalsCard({ fundamentals, className }: FundamentalsCardProps) {
  if (!hasVisibleFundamentals(fundamentals)) return null;

  const metrics = buildMetrics(fundamentals);
  const dateLine =
    fundamentals.last_updated_at != null && fundamentals.last_updated_at !== ''
      ? `Dados de ${formatDate(fundamentals.last_updated_at)}`
      : null;

  return (
    <Card className={cn('rounded-[14px] border border-border/80 overflow-hidden', className)}>
      <CardContent className="p-3 pt-3.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Indicadores</p>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[12px] leading-tight text-muted-foreground">{m.label}</p>
              <p className="text-[20px] font-medium leading-snug tabular-nums mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
        {dateLine && <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">{dateLine}</p>}
      </CardContent>
    </Card>
  );
}
