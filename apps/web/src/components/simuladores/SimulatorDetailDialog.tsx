import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { getIconComponent } from '@/lib/iconMap';
import type { CardConfig, CategoryConfig } from './simulatorCategories';

interface SimulatorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CardConfig;
  iconName?: string | null;
  categoryColor?: CategoryConfig['color'];
  onNavigate?: () => void;
  isComingSoon: boolean;
}

export const SimulatorDetailDialog: React.FC<SimulatorDetailDialogProps> = ({
  open,
  onOpenChange,
  config,
  iconName,
  categoryColor,
  onNavigate,
  isComingSoon,
}) => {
  const IconComponent = getIconComponent(iconName);
  const iconBg = categoryColor?.iconBg || 'bg-primary/10';
  const iconText = categoryColor?.iconText || 'text-primary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <IconComponent className={`h-5 w-5 ${iconText}`} />
            </div>
            <DialogTitle className="text-base">{config.title}</DialogTitle>
          </div>
          {config.tags && config.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-[52px]">
              {config.tags.map((tag, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </DialogHeader>

        {config.bullets && config.bullets.length > 0 && (
          <ul className="space-y-2.5 py-2">
            {config.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CircleCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="pt-2">
          {isComingSoon ? (
            <Button variant="outline" disabled className="w-full">
              Disponível em breve
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                onNavigate?.();
              }}
            >
              {config.buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
