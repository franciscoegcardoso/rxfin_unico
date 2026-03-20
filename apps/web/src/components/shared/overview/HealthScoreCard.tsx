import React from 'react';
import { cn } from '@/lib/utils';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';

export interface HealthScoreCardProps {
  score: number | null;
  classification: string | null;
  isLoading?: boolean;
}

const R = 28;
const C = 2 * Math.PI * R;

const CLASS_LABEL: Record<string, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  regular: 'Regular',
  atenção: 'Atenção',
};

function strokeClass(score: number | null): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-destructive';
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ score, classification, isLoading }) => {
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  const dashOffset = C - (pct / 100) * C;
  const label =
    score != null && classification
      ? `Saúde financeira: ${score}/100 — ${classification}`
      : score != null
        ? `Saúde financeira: ${score}/100`
        : 'Saúde financeira: sem dados';

  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-border bg-card flex items-center justify-center min-h-[140px]"
        aria-busy="true"
      >
        <RXFinLoadingSpinner />
      </div>
    );
  }

  if (score == null) {
    return (
      <div
        className="rounded-lg border border-border bg-card text-card-foreground p-4 flex flex-col items-center justify-center min-h-[140px]"
        aria-label={label}
      >
        <p className="text-sm text-muted-foreground text-center">Score indisponível</p>
        {classification && (
          <p className="text-xs text-muted-foreground mt-1">{CLASS_LABEL[classification] ?? classification}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-card text-card-foreground p-4 flex flex-col items-center justify-center gap-1"
      aria-label={label}
    >
      <div className="relative w-[72px] h-[72px]">
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={R} fill="none" className="stroke-muted" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            className={cn(strokeClass(score), 'transition-all duration-300')}
            strokeWidth="6"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 z-10 flex items-center justify-center text-2xl font-semibold text-foreground tabular-nums pointer-events-none">
          {score}
        </span>
      </div>
      {classification && (
        <p className="text-xs text-muted-foreground text-center px-1">
          {CLASS_LABEL[classification] ?? classification}
        </p>
      )}
    </div>
  );
};
