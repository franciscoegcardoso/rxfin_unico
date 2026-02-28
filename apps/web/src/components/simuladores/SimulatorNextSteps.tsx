import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimulatorContext, SimulatorVehicleContext } from '@/hooks/useSimulatorContext';

export interface NextStep {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  variant: 'default' | 'secondary' | 'outline';
  /** Optional: data to save before navigating */
  prefillData?: Omit<SimulatorVehicleContext, 'savedAt'>;
}

interface SimulatorNextStepsProps {
  /** Contextual message explaining why these next steps make sense */
  contextMessage: string;
  /** Array of navigation options */
  steps: NextStep[];
  /** Optional: show only when this condition is true */
  show?: boolean;
}

/**
 * Reusable CTA component for navigation between automotive simulators.
 * Displays a card with contextual message and navigation buttons.
 */
export const SimulatorNextSteps: React.FC<SimulatorNextStepsProps> = ({
  contextMessage,
  steps,
  show = true,
}) => {
  const navigate = useNavigate();
  const { save } = useSimulatorContext();

  if (!show) return null;

  const handleClick = (step: NextStep) => {
    // Save context if provided
    if (step.prefillData) {
      save(step.prefillData);
    }
    navigate(step.path);
  };

  return (
    <Card className="mt-8 border border-border/60 bg-muted/10">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5" />
          Próximos passos sugeridos
        </CardTitle>
        <CardDescription className="text-xs">
          {contextMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className={cn(
          "flex flex-col gap-2",
          steps.length > 2 && "sm:flex-row sm:flex-wrap"
        )}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={index}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-full text-left border border-border/80 bg-background hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => handleClick(step)}
              >
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary/70 transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
