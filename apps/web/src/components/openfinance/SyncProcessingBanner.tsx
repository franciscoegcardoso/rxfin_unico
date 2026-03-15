import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncProcessingBannerProps {
  connectorName: string;
}

const STEPS = [
  { id: 1, label: 'Autenticação confirmada',     delay: 0    },
  { id: 2, label: 'Coletando contas',            delay: 2000 },
  { id: 3, label: 'Importando transações',       delay: 5000 },
  { id: 4, label: 'Organizando dados',           delay: 12000 },
];

export const SyncProcessingBanner: React.FC<SyncProcessingBannerProps> = ({
  connectorName,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step) => {
      if (step.delay === 0) {
        setCompletedSteps([1]);
        setActiveStep(2);
        return;
      }
      const t = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step.id]);
        setActiveStep(step.id + 1);
      }, step.delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
        <p className="text-sm font-medium text-foreground">
          Sincronizando {connectorName}…
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(((completedSteps.length) / STEPS.length) * 100, 92)}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {STEPS.map((step) => {
          const done = completedSteps.includes(step.id);
          const active = activeStep === step.id && !done;
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-2 text-xs transition-all duration-500',
                done
                  ? 'text-foreground'
                  : active
                  ? 'text-primary'
                  : 'text-muted-foreground/40',
              )}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/20 shrink-0" />
              )}
              <span className={cn(done && 'line-through opacity-60')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Isso pode levar até 60 segundos. Pode fechar esta tela — os dados
        aparecem automaticamente quando prontos.
      </p>
    </div>
  );
};
