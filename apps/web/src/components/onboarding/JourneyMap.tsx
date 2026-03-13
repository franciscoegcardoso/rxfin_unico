import React from 'react';
import { Check, Lock, Crown, Fingerprint, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

interface JourneyMapProps {
  currentLevel: number; // 0-4
  currentStepInBlock?: number;
  totalStepsInBlock?: number;
}

const LEVELS = [
  { level: 1, title: 'Identidade', subtitle: 'Receitas & Despesas', icon: Fingerprint, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', ring: 'ring-amber-400' },
  { level: 2, title: 'Patrimônio', subtitle: 'Bens & Dívidas', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/40', ring: 'ring-slate-400' },
  { level: 3, title: 'Fluxo Real', subtitle: 'Fluxo de Caixa', icon: Activity, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', ring: 'ring-yellow-400' },
  { level: 4, title: 'Domínio Total', subtitle: 'Controle Completo', icon: Crown, color: 'text-violet-500', bg: 'bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20', ring: 'ring-violet-400' },
];

export const JourneyMap: React.FC<JourneyMapProps> = ({ currentLevel, currentStepInBlock = 0, totalStepsInBlock = 1 }) => {
  const isMobile = useIsMobile();
  const blockProgress = totalStepsInBlock > 0 ? (currentStepInBlock / totalStepsInBlock) * 100 : 0;

  const renderNode = (lvl: typeof LEVELS[0], index: number) => {
    const isCompleted = currentLevel >= lvl.level;
    const isCurrent = currentLevel === lvl.level - 1 && currentLevel < 4;
    const isLocked = currentLevel < lvl.level - 1;
    const Icon = lvl.icon;

    return (
      <motion.div
        key={lvl.level}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={cn(
          'flex flex-col items-center gap-1.5 relative',
          isMobile ? 'flex-row gap-3 w-full' : ''
        )}
      >
        {/* Node circle */}
        <div className={cn(
          'relative flex items-center justify-center rounded-full border-2 transition-all duration-500',
          isMobile ? 'h-8 w-8 shrink-0' : 'h-12 w-12',
          isCompleted
            ? 'border-primary bg-primary text-primary-foreground shadow-md'
            : isCurrent
              ? `border-primary ${lvl.bg} ${lvl.color} ring-2 ${lvl.ring} ring-offset-2 ring-offset-background animate-pulse`
              : 'border-muted bg-muted/50 text-muted-foreground'
        )}>
          {isCompleted ? (
            <Check className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
          ) : isLocked ? (
            <Lock className={cn(isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          ) : (
            <Icon className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
          )}
        </div>

        {/* Label */}
        <div className={cn(
          isMobile ? 'flex-1' : 'text-center',
        )}>
          <p className={cn(
            'text-xs font-semibold leading-tight',
            isCompleted ? 'text-primary' : isCurrent ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {lvl.title}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {isCompleted ? '✓ Concluído' : isCurrent ? 'Você está aqui' : lvl.subtitle}
          </p>
          {/* Progress bar inside current block */}
          {isCurrent && blockProgress > 0 && (
            <div className="mt-1 h-1 w-full max-w-[60px] bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${blockProgress}%` }} />
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (isMobile) {
    // Vertical layout: Identidade (atual) no topo → Patrimônio → Fluxo Real → Domínio Total
    return (
      <div className="flex flex-col gap-2 py-2 px-2">
        {LEVELS.map((lvl, i) => (
          <React.Fragment key={lvl.level}>
            {renderNode(lvl, i)}
            {i < LEVELS.length - 1 && (
              <div className="ml-5 h-3 w-0.5 bg-border shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Horizontal layout (compact: Identidade → Patrimônio → Fluxo Real → Domínio)
  return (
    <div className="flex items-center justify-between gap-1 px-4 mb-4 py-2">
      {LEVELS.map((lvl, i) => (
        <React.Fragment key={lvl.level}>
          {renderNode(lvl, i)}
          {i < LEVELS.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 max-w-12 transition-colors',
              currentLevel >= lvl.level ? 'bg-primary' : 'bg-border'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
