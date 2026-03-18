import type { AssetClass } from '@/types/allocation';
import { TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CLASS_CONFIG: Record<
  AssetClass,
  { label: string; emoji: string; description: string }
> = {
  renda_fixa: {
    label: 'Renda Fixa',
    emoji: '🏦',
    description: 'CDB, Tesouro, LCI, LCA',
  },
  acoes: {
    label: 'Ações',
    emoji: '📈',
    description: 'Ações brasileiras e BDRs',
  },
  fii: {
    label: 'FIIs',
    emoji: '🏢',
    description: 'Fundos Imobiliários',
  },
  internacional: {
    label: 'Internacional',
    emoji: '🌎',
    description: 'ETFs e ativos em USD',
  },
  cripto: {
    label: 'Cripto',
    emoji: '₿',
    description: 'Criptomoedas',
  },
  alternativo: {
    label: 'Alternativo',
    emoji: '💎',
    description: 'Ouro, commodities',
  },
};

interface Props {
  assetClass: AssetClass;
  currentPct: number;
  targetPct: number;
  driftPct: number;
  currentBrl: number;
  threshold?: number;
  isEmpty?: boolean;
  isLoading?: boolean;
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function DriftCard({
  assetClass,
  currentPct,
  targetPct,
  driftPct,
  currentBrl,
  threshold = 5,
  isEmpty = false,
  isLoading = false,
}: Props) {
  const config = CLASS_CONFIG[assetClass];
  const absDrift = Math.abs(driftPct);
  const isOver = driftPct > 0.05;
  const isUnder = driftPct < -0.05;
  const isOk = absDrift < 1;
  const isWarn = !isOk && absDrift < threshold;
  const isDanger = absDrift >= threshold;

  let barColor = '#00C896';
  if (isWarn) barColor = '#F59E0B';
  if (isDanger) barColor = '#EF4444';

  const driftBadgeClass = isOk
    ? 'text-emerald-600 dark:text-emerald-400'
    : isDanger
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';

  const driftLabel = isOk
    ? 'Alinhado'
    : isOver
      ? `+${driftPct.toFixed(1)}% acima`
      : `${driftPct.toFixed(1)}% abaixo`;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
        <div className="h-2 bg-muted rounded-full" />
        <div className="flex justify-between">
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-8 w-14 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            <span className="text-sm font-semibold text-foreground">{config.label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        {!isEmpty && (
          <div
            className={cn('flex items-center gap-1 text-xs font-semibold shrink-0', driftBadgeClass)}
          >
            {isOver && <TrendingUp className="w-3.5 h-3.5" />}
            {isUnder && <TrendingDown className="w-3.5 h-3.5" />}
            {isOk && <Minus className="w-3.5 h-3.5" />}
            {driftLabel}
          </div>
        )}
      </div>

      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-background ring-1 ring-border z-10"
          style={{ left: `clamp(0%, ${targetPct}%, 100%)` }}
        />
        {!isEmpty && (
          <div
            className="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, currentPct))}%`,
              backgroundColor: barColor,
            }}
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atual</p>
          {isEmpty ? (
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Conecte sua corretora</span>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold tabular-nums" style={{ color: barColor }}>
                {currentPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{formatBrl(currentBrl)}</p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta</p>
          <p className="text-base font-semibold text-muted-foreground tabular-nums">
            {targetPct.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
