import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanComparisonFeatures } from '@/hooks/usePlanComparisonFeatures';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

interface PlanComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeatureIcon = ({ value }: { value: string }) => {
  if (value === 'true') {
    return <Check className="h-5 w-5 text-emerald-500" />;
  }
  if (value === 'false') {
    return <X className="h-5 w-5 text-muted-foreground/40" />;
  }
  if (value === 'partial') {
    return <Minus className="h-5 w-5 text-amber-500" />;
  }
  return <span className="text-sm text-muted-foreground">{value}</span>;
};

export const PlanComparisonDialog: React.FC<PlanComparisonDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: features, isLoading: featuresLoading } = usePlanComparisonFeatures();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();

  const isLoading = featuresLoading || plansLoading;

  // Get prices from plans
  const freePlan = plans?.find(p => p.slug === 'free');
  const starterPlan = plans?.find(p => p.slug === 'basic');
  const proPlan = plans?.find(p => p.slug === 'pro');

  const formatPrice = (price: number | undefined) => {
    if (!price || price === 0) return 'R$ 0';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  // Group features by category
  const groupedFeatures = features?.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Compare os Planos</DialogTitle>
          <DialogDescription>
            Veja as diferenças entre os planos e escolha o ideal para você
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="p-6 pt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-4 bg-muted/50">
                  <div className="p-4 font-medium text-muted-foreground">
                    Funcionalidade
                  </div>
                  <div className="p-4 text-center border-l border-border">
                    <div className="font-semibold text-foreground">{freePlan?.name || 'Free'}</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(freePlan?.price_monthly)}</div>
                  </div>
                  <div className="p-4 text-center border-l border-border bg-primary/5">
                    <div className="font-semibold text-primary">{starterPlan?.name || 'RX Starter'}</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(starterPlan?.price_monthly)}/mês</div>
                  </div>
                  <div className="p-4 text-center border-l border-border bg-amber-500/5">
                    <div className="font-semibold text-amber-600">{proPlan?.name || 'RX Pro'}</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(proPlan?.price_monthly)}/mês</div>
                  </div>
                </div>
                
                {/* Rows grouped by category */}
                {groupedFeatures && Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <div className="grid grid-cols-4 bg-muted/30 border-t border-border">
                      <div className="col-span-4 p-3 px-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </span>
                      </div>
                    </div>
                    
                    {/* Features in category */}
                    {categoryFeatures?.map((feature, index) => (
                      <div 
                        key={feature.id}
                        className={cn(
                          "grid grid-cols-4 border-t border-border",
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        )}
                      >
                        <div className="p-3 px-4 text-sm text-foreground">
                          {feature.feature_name}
                        </div>
                        <div className="p-3 flex justify-center items-center border-l border-border">
                          <FeatureIcon value={feature.free_value} />
                        </div>
                        <div className="p-3 flex justify-center items-center border-l border-border bg-primary/5">
                          <FeatureIcon value={feature.starter_value} />
                        </div>
                        <div className="p-3 flex justify-center items-center border-l border-border bg-amber-500/5">
                          <FeatureIcon value={feature.pro_value} />
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
            
            {/* Legend */}
            <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Incluso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="h-4 w-4 text-amber-500" />
                <span>Parcial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X className="h-4 w-4 text-muted-foreground/40" />
                <span>Não incluso</span>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-6 pt-0 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
