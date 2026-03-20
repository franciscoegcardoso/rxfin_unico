import React from 'react';
import { cn } from '@/lib/utils';
import { Fingerprint, Shield, Activity, Crown } from 'lucide-react';

interface LevelBadgeProps {
  currentLevel: number; // 0-4
  currentStepInBlock?: number;
  totalStepsInBlock?: number;
}

const LEVEL_CONFIG = [
  { label: 'Início', icon: Fingerprint, badgeClass: 'bg-muted text-muted-foreground' },
  { label: 'Nível 1', icon: Fingerprint, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { label: 'Nível 2', icon: Shield, badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300' },
  { label: 'Nível 3', icon: Activity, badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { label: 'Nível 4', icon: Crown, badgeClass: 'bg-gradient-to-r from-violet-100 to-amber-100 text-violet-700 dark:from-violet-900/40 dark:to-amber-900/30 dark:text-violet-300' },
];

export const LevelBadge: React.FC<LevelBadgeProps> = ({ currentLevel, currentStepInBlock = 0, totalStepsInBlock = 1 }) => {
  const raw = Number(currentLevel);
  const safeLevel = Number.isFinite(raw) ? Math.min(Math.max(0, raw), LEVEL_CONFIG.length - 1) : 0;
  const config = LEVEL_CONFIG[safeLevel];
  const Icon = config.icon;
  const progress = totalStepsInBlock > 0 ? (currentStepInBlock / totalStepsInBlock) * 100 : 0;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
      config.badgeClass
    )}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      {safeLevel > 0 && safeLevel < 4 && progress > 0 && (
        <div className="h-1.5 w-8 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden ml-1">
          <div className="h-full bg-current rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};
