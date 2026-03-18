import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { getScoreLabel, getScoreColor } from '@/hooks/useAllocationDashboard';
import { cn } from '@/lib/utils';

interface Props {
  score: number;
  size?: number;
  isLoading?: boolean;
}

const DURATION_MS = 900;

function cubicOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function ScoreGauge({ score, size = 180, isLoading = false }: Props) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stroke = 12;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (isLoading) {
      setDisplayScore(0);
      return;
    }
    let start: number | null = null;
    const from = 0;
    const to = Math.min(100, Math.max(0, score));
    const step = (now: number) => {
      if (start == null) start = now;
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION_MS);
      setDisplayScore(Math.round(from + (to - from) * cubicOut(p)));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [score, isLoading]);

  const color = getScoreColor(displayScore);
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const openTooltip = useCallback(() => setShowTooltip(true), []);
  const closeTooltip = useCallback(() => setShowTooltip(false), []);

  if (isLoading) {
    return (
      <div
        className="relative flex flex-col items-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="animate-spin text-slate-200 dark:text-slate-700"
          style={{ animationDuration: '1.2s' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.22} ${circumference * 0.78}`}
            strokeLinecap="round"
            className="opacity-40"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          …
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <button
          type="button"
          className="absolute top-0 right-0 z-20 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Ajuda — faixas do score"
          onClick={() => setShowTooltip((v) => !v)}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <div
          className="relative cursor-help"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          onTouchStart={openTooltip}
          onTouchEnd={() => setTimeout(closeTooltip, 2500)}
        >
          <svg width={size} height={size} className="-rotate-90">
            <defs>
              <filter id="scoreGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              className="text-slate-100 dark:text-slate-800"
              stroke="currentColor"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              filter="url(#scoreGlow)"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold tabular-nums" style={{ color }}>
              {displayScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {showTooltip && (
          <div
            className={cn(
              'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-30',
              'rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2.5 text-xs'
            )}
          >
            <p className="font-semibold mb-2 text-foreground">Faixas do score</p>
            <table className="w-full text-left border-collapse">
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-1 pr-2 text-emerald-600 dark:text-emerald-400 font-medium">75–100</td>
                  <td className="py-1 text-muted-foreground">Alinhado / pequenos ajustes</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1 pr-2 text-amber-600 dark:text-amber-400 font-medium">55–74</td>
                  <td className="py-1 text-muted-foreground">Atenção à alocação</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 text-red-600 dark:text-red-400 font-medium">0–54</td>
                  <td className="py-1 text-muted-foreground">Revisão recomendada</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O score reflete o quanto sua carteira está próxima das metas por classe de ativo.
            </p>
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border"
              aria-hidden
            />
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-foreground text-center max-w-[240px]">
        {getScoreLabel(displayScore)}
      </p>
    </div>
  );
}
