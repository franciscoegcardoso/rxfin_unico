import { CalendarDays } from 'lucide-react';
import { differenceInYears, format, parseISO, isValid } from 'date-fns';
import type { PrimaryGoal } from '@/types/allocation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GOAL_EMOJIS: Record<string, string> = {
  aposentadoria: '🏖️',
  casa: '🏠',
  educacao: '🎓',
  reserva: '🛡️',
  viagem: '✈️',
  outro: '🎯',
};

interface GoalCardProps {
  goal: PrimaryGoal;
  currentBrl: number;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getProbabilityBadge(probability: number) {
  const pct = Math.round(probability * 100);
  if (probability >= 0.65) {
    return {
      label: `${pct}% de chance`,
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    };
  }
  if (probability >= 0.45) {
    return {
      label: `${pct}% de chance`,
      className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    };
  }
  return {
    label: `${pct}% de chance`,
    className: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  };
}

export function GoalCard({ goal, currentBrl }: GoalCardProps) {
  const target = Math.max(goal.target_amount_brl, 1);
  const pct = Math.min(100, Math.round((currentBrl / target) * 100));
  const emoji = GOAL_EMOJIS[goal.goal_type?.toLowerCase() ?? ''] ?? GOAL_EMOJIS.outro;
  const date = parseISO(goal.target_date);
  const yearsLeft = isValid(date) ? Math.max(0, differenceInYears(date, new Date())) : null;
  const probabilityBadge =
    goal.success_probability != null ? getProbabilityBadge(goal.success_probability) : null;

  let barClass = 'from-emerald-500 to-teal-500';
  if (pct < 70 && pct >= 40) barClass = 'from-amber-500 to-yellow-500';
  if (pct < 40) barClass = 'from-amber-500 to-orange-500';

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span className="truncate">{goal.name}</span>
          </p>
          {yearsLeft != null && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {yearsLeft === 0 ? 'Meta neste ano' : `${yearsLeft} ano(s) restantes`}
            </p>
          )}
        </div>
        {probabilityBadge && (
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0',
              probabilityBadge.className
            )}
          >
            {probabilityBadge.label}
          </span>
        )}
      </div>

      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm text-foreground">
        <span className="font-semibold">{formatBRL(currentBrl)}</span>
        <span className="text-muted-foreground"> atual · </span>
        <span className="font-medium">{pct}%</span>
        <span className="text-muted-foreground"> · Meta: </span>
        <span className="font-semibold">{formatBRL(goal.target_amount_brl)}</span>
        <span className="text-muted-foreground">
          {' '}
          até {isValid(date) ? format(date, 'MM/yyyy') : '—'}
        </span>
      </p>

      <Button type="button" variant="outline" size="sm" disabled>
        Simular aporte
      </Button>
    </section>
  );
}
