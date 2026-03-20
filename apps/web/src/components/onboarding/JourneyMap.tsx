import React from 'react';
import { Check, Lock, Crown, Fingerprint, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JourneyMapProps {
  currentLevel: number; // 0-4
  currentStepInBlock?: number;
  totalStepsInBlock?: number;
}

const LEVELS = [
  { level: 1, title: 'Identidade', shortTitle: 'Identidade', subtitle: 'Receitas & Despesas', icon: Fingerprint, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', ring: 'ring-amber-400' },
  { level: 2, title: 'Patrimônio', shortTitle: 'Patrimônio', subtitle: 'Bens & Dívidas', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/40', ring: 'ring-slate-400' },
  { level: 3, title: 'Fluxo Real', shortTitle: 'Fluxo Real', subtitle: 'Fluxo de Caixa', icon: Activity, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', ring: 'ring-yellow-400' },
  { level: 4, title: 'Domínio Total', shortTitle: 'Dom. Total', subtitle: 'Controle Completo', icon: Crown, color: 'text-violet-500', bg: 'bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20', ring: 'ring-violet-400' },
];

type StepStatus = 'completed' | 'active' | 'locked';

function getStatus(currentLevel: number, level: number): StepStatus {
  if (currentLevel >= level) return 'completed';
  if (currentLevel === level - 1) return 'active';
  return 'locked';
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ currentLevel, currentStepInBlock = 0, totalStepsInBlock = 1 }) => {
  const levelNum = Number(currentLevel);
  const safeLevel = Number.isFinite(levelNum) ? levelNum : 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl mb-4">
      {LEVELS.map((step, i) => {
        const status = getStatus(safeLevel, step.level);
        const prevCompleted = i > 0 && getStatus(safeLevel, LEVELS[i - 1].level) === 'completed';
        return (
          <React.Fragment key={step.level}>
            {/* Connector line between steps */}
            {i > 0 && (
              <div
                className={cn(
                  'flex-1 h-px mx-1 min-w-0',
                  prevCompleted ? 'bg-primary' : 'bg-border'
                )}
              />
            )}

            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  'rounded-full flex items-center justify-center border-2 transition-all',
                  'w-7 h-7 min-[380px]:w-8 min-[380px]:h-8',
                  status === 'completed' && 'bg-primary border-primary',
                  status === 'active' && 'border-primary bg-transparent',
                  status === 'locked' && 'border-border bg-transparent opacity-40'
                )}
              >
                {status === 'completed' && <Check className="w-4 h-4 text-white min-[380px]:w-4 min-[380px]:h-4" />}
                {status === 'active' && <div className="w-2 h-2 rounded-full bg-primary" />}
                {status === 'locked' && <Lock className="w-3 h-3 text-muted-foreground" />}
              </div>

              <span
                className={cn(
                  'text-[9px] min-[380px]:text-[10px] leading-tight text-center max-w-[56px]',
                  status === 'active' && 'text-foreground font-medium',
                  status === 'completed' && 'text-primary',
                  status === 'locked' && 'text-muted-foreground opacity-40'
                )}
              >
                {step.shortTitle}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Subtitle for the currently active level (for use below the stepper). currentLevel 0 = level 1 (Identidade), etc. */
export function getActiveLevelSubtitle(currentLevel: number): string | null {
  const n = Number(currentLevel);
  if (!Number.isFinite(n)) return null;
  const level = LEVELS.find((l) => l.level === n + 1);
  return level?.subtitle ?? null;
}

export { LEVELS as JOURNEY_MAP_LEVELS };
