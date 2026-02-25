import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradeModal } from './UpgradeModal';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: string;
  requiredPlan?: string;
  fallback?: React.ReactNode;
  inline?: boolean;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  requiredPlan,
  fallback,
  inline = false,
  children,
}) => {
  const { canAccess, getRequiredPlan, loading } = usePlanAccess();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return (
      <>
        {fallback || (
          <Skeleton className={cn(inline ? 'h-8 w-32' : 'h-32 w-full')} />
        )}
      </>
    );
  }

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  const resolvedPlan = requiredPlan || getRequiredPlan(feature) || 'Pro';

  if (inline) {
    return (
      <>
        <button
          onClick={() => setShowUpgrade(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Lock className="h-3 w-3" />
          <span>Plano {resolvedPlan}</span>
        </button>
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          featureName={feature}
          requiredPlan={resolvedPlan}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Recurso disponível no plano {resolvedPlan}
          </p>
          <p className="text-xs text-muted-foreground">
            Faça upgrade para desbloquear esta funcionalidade.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowUpgrade(true)}>
          Fazer Upgrade
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureName={feature}
        requiredPlan={resolvedPlan}
      />
    </>
  );
};
