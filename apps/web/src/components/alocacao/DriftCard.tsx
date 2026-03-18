import type { AssetClass } from '@/types/allocation';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CLASS_CONFIG: Record<AssetClass, { label: string; emoji: string }> = {
  renda_fixa: { label: 'Renda Fixa', emoji: '🏦' },
  acoes: { label: 'Ações', emoji: '📈' },
  fii: { label: 'FIIs', emoji: '🏢' },
  internacional: { label: 'Internacional', emoji: '🌎' },
  cripto: { label: 'Cripto', emoji: '₿' },
  alternativo: { label: 'Alternativo', emoji: '💎' },
};

interface Props {
  assetClass: AssetClass;
  currentPct: number;
  targetPct: number;
  driftPct: number;
  currentBrl: number;
  isEmpty?: boolean;
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
  isEmpty = false,
}: Props) {
  const config = CLASS_CONFIG[assetClass];
  const absDrift = Math.abs(driftPct);
  const isOver = driftPct > 0;
  const isUnder = driftPct < 0;
  const isOk = absDrift < 1;

  const driftColor = isOk
    ? 'text-green-600 dark:text-green-400'
    : absDrift > 5
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700
                    bg-white dark:bg-slate-800/50 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {config.label}
          </span>
        </div>
        {!isEmpty && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${driftColor}`}
          >
            {isOver && <TrendingUp className="w-3.5 h-3.5" />}
            {isUnder && <TrendingDown className="w-3.5 h-3.5" />}
            {isOk && <Minus className="w-3.5 h-3.5" />}
            {isOk ? 'Alinhado' : `${isOver ? '+' : ''}${driftPct.toFixed(1)}%`}
          </div>
        )}
      </div>

      <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
          style={{ left: `${targetPct}%` }}
        />
        {!isEmpty && (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(currentPct, 100)}%`,
              backgroundColor: isOk
                ? '#00C896'
                : absDrift > 5
                  ? '#EF4444'
                  : '#F59E0B',
            }}
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Atual</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            {isEmpty ? '—' : `${currentPct.toFixed(1)}%`}
          </p>
          {!isEmpty && (
            <p className="text-xs text-slate-400">{formatBrl(currentBrl)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Meta</p>
          <p className="text-base font-bold text-slate-600 dark:text-slate-400">
            {targetPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {isEmpty && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          Conecte sua corretora para ver sua posição atual
        </p>
      )}
    </div>
  );
}
