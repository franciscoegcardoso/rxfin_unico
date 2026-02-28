import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  label: string;
  isComplete: boolean;
  isCurrent: boolean;
}

interface OnboardingProgressProps {
  steps: ProgressStep[];
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ steps }) => {
  return (
    <div className="flex items-center gap-2 mb-8 flex-wrap">
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              step.isComplete
                ? "bg-primary text-primary-foreground"
                : step.isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            )}>
              {step.isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              "text-sm transition-colors",
              step.isCurrent
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "h-0.5 w-8 transition-colors",
              step.isComplete ? "bg-primary" : "bg-border"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
