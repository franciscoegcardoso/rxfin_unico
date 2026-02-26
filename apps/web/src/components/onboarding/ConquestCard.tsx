import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Fingerprint, Shield, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ConquestMetric {
  label: string;
  value: string;
}

interface ConquestCardProps {
  level: number; // 1-4
  title: string;
  metrics: ConquestMetric[];
  insight?: string;
  nextLevelPreview?: string;
  onContinue: () => void;
  continueLabel?: string;
}

const LEVEL_THEMES = [
  null, // placeholder for index 0
  { icon: Fingerprint, gradient: 'from-amber-500 to-orange-500', badge: 'Bronze', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { icon: Shield, gradient: 'from-slate-400 to-slate-600', badge: 'Prata', badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300' },
  { icon: Activity, gradient: 'from-yellow-400 to-amber-500', badge: 'Ouro', badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { icon: Crown, gradient: 'from-violet-500 to-purple-600', badge: 'Diamante', badgeColor: 'bg-gradient-to-r from-violet-100 to-amber-100 text-violet-700 dark:from-violet-900/40 dark:to-amber-900/30 dark:text-violet-300' },
];

export const ConquestCard: React.FC<ConquestCardProps> = ({
  level,
  title,
  metrics,
  insight,
  nextLevelPreview,
  onContinue,
  continueLabel = 'Continuar Jornada',
}) => {
  const theme = LEVEL_THEMES[Math.min(level, 4)]!;
  const Icon = theme.icon;

  useEffect(() => {
    // Fire confetti on mount
    const duration = level === 4 ? 3000 : 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: level === 4 ? 5 : 3,
        angle: 60 + Math.random() * 60,
        spread: 55,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: level === 4
          ? ['#8B5CF6', '#F59E0B', '#FFFFFF']
          : ['#10B981', '#3B82F6', '#F59E0B'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [level]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-lg mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Header gradient */}
        <div className={cn('bg-gradient-to-r p-6 text-center text-white', theme.gradient)}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-3"
          >
            <Icon className="h-8 w-8" />
          </motion.div>
          <div className={cn('inline-block px-3 py-0.5 rounded-full text-xs font-bold mb-2', theme.badgeColor)}>
            {theme.badge}
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>

        {/* Metrics */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Insight */}
          {insight && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{insight}</p>
            </div>
          )}

          {/* Next level preview */}
          {nextLevelPreview && level < 4 && (
            <p className="text-xs text-muted-foreground text-center italic">
              Próximo: {nextLevelPreview}
            </p>
          )}

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={onContinue}
          >
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
