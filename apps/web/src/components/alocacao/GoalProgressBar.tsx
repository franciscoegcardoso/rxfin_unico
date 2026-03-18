import { CalendarDays } from 'lucide-react';
import type { PrimaryGoal } from '@/types/allocation';
import { differenceInYears, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

const GOAL_EMOJI: Record<string, string> = {
  aposentadoria: '🏖️',
  casa: '🏠',
  educacao: '🎓',
  reserva: '🛡️',
  viagem: '✈️',
  outro: '🎯',
};

interface Props {
  goal: PrimaryGoal;
  currentBrl: number;
}

function formatBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);
}

export function GoalProgressBar({ goal, currentBrl }: Props) {
  const target = Math.max(goal.target_amount_brl, 1);
  const pct = Math.min(100, Math.round((currentBrl / target) * 100));
  const emoji = GOAL_EMOJI[goal.goal_type?.toLowerCase() ?? ''] ?? GOAL_EMOJI.outro;
  const end = parseISO(goal.target_date);
  const yearsLeft = isValid(end) ? Math.max(0, differenceInYears(end, new Date())) : null;
  const prob = goal.success_probability;

  let barClass = 'from-sky-500 to-blue-600';
  if (pct >= 70) barClass = 'from-emerald-500 to-teal-600';
  else if (pct >= 40) barClass = 'from-amber-500 to-orange-500';

  let probBadge = '';
  let probClass = '';
  if (prob != null) {
    if (prob >= 0.65) {
      probBadge = `${Math.round(prob * 100)}% de chance`;
      probClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    } else if (prob >= 0.45) {
      probBadge = `${Math.round(prob * 100)}% de chance`;
      probClass = 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
    } else {
      probBadge = `${Math.round(prob * 100)}% de chance`;
      probClass = 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{emoji}</span>
          <div>
            <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
            {yearsLeft != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <CalendarDays className="w-3.5 h-3.5" />
                {yearsLeft === 0 ? 'Meta neste ano' : `${yearsLeft} ano(s) até a meta`}
              </p>
            )}
          </div>
        </div>
        {prob != null && (
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0',
              probClass
            )}
          >
            {probBadge}
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
        <span className="font-semibold">{formatBrl(currentBrl)}</span>
        <span className="text-muted-foreground"> acumulado · </span>
        <span className="font-medium">{pct}%</span>
        <span className="text-muted-foreground"> da meta · Meta: </span>
        <span className="font-semibold">{formatBrl(goal.target_amount_brl)}</span>
      </p>

      {prob == null && (
        <p className="text-[11px] text-muted-foreground italic">
          Ative o Plano Premium para ver a probabilidade (simulação Monte Carlo).
        </p>
      )}
    </div>
  );
}
