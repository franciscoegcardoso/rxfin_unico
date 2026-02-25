import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpgradeModal } from './UpgradeModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LockedFeatureIndicatorProps {
  featureName: string;
  requiredPlan?: string;
  className?: string;
  iconOnly?: boolean;
}

export const LockedFeatureIndicator: React.FC<LockedFeatureIndicatorProps> = ({
  featureName,
  requiredPlan = 'Pro',
  className,
  iconOnly = false,
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUpgradeModal(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
              className
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            {!iconOnly && (
              <span className="sr-only">Recurso bloqueado</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clique para ver como desbloquear</p>
        </TooltipContent>
      </Tooltip>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        featureName={featureName}
        requiredPlan={requiredPlan}
      />
    </>
  );
};
