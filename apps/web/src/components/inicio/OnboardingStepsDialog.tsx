import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  CircleDot,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'done' | 'partial' | 'pending';
  path: string;
  /** Elemento React (ex: <Wallet />) ou componente Lucide — nunca passar como objeto no JSX */
  icon: React.ReactNode | LucideIcon;
}

interface OnboardingStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: OnboardingStep[];
  completedSteps: number;
  progress: number;
}

const OnboardingStepCard: React.FC<{ 
  step: OnboardingStep; 
  index: number;
  onNavigate: (path: string) => void;
}> = ({ step, index, onNavigate }) => {
  const statusIcon = {
    done: <CheckCircle2 className="h-6 w-6 text-income shrink-0" />,
    partial: <CircleDot className="h-6 w-6 text-warning shrink-0" />,
    pending: <Circle className="h-6 w-6 text-muted-foreground shrink-0" />,
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: "easeOut"
      }}
      onClick={() => onNavigate(step.path)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left w-full",
        "hover:scale-[1.01]",
        step.status === 'done' && "bg-income/10 border-income/40 shadow-sm",
        step.status === 'partial' && "bg-warning/10 border-warning/40",
        step.status === 'pending' && "bg-muted/20 border-border hover:bg-muted/40 hover:border-muted-foreground/30"
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-center h-8 w-8 shrink-0">
        {statusIcon[step.status]}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="shrink-0">
            {React.isValidElement(step.icon)
              ? step.icon
              : (() => {
                  const Icon = step.icon as LucideIcon;
                  return <Icon className="h-4 w-4" aria-hidden />;
                })()}
          </span>
          <span className={cn(
            "font-medium text-sm",
            step.status === 'done' && "text-income"
          )}>{step.title}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
      </div>
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0",
        step.status === 'done' ? "text-income" : "text-muted-foreground"
      )} />
    </motion.button>
  );
};

export const OnboardingStepsDialog: React.FC<OnboardingStepsDialogProps> = ({
  open,
  onOpenChange,
  steps,
  completedSteps,
  progress,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Configure sua conta</DialogTitle>
              <Badge variant="secondary" className="text-sm">
                {completedSteps}/{steps.length}
              </Badge>
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ originX: 0 }}
            >
              <Progress value={progress} className="h-2 mt-2" />
            </motion.div>
            <p className="text-sm text-muted-foreground mt-2">
              Complete os passos abaixo para aproveitar ao máximo
            </p>
          </DialogHeader>
          
          <div className="grid gap-2 mt-4">
            {steps.map((step, index) => (
              <OnboardingStepCard 
                key={step.id} 
                step={step} 
                index={index}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
