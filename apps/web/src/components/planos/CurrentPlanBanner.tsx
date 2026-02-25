import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Sparkles, Crown, Table2, X } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { motion } from 'framer-motion';

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star,
  basic: Sparkles,
  pro: Crown,
};

interface CurrentPlanBannerProps {
  currentPlan: SubscriptionPlan | undefined;
  subscriptionRole: string;
  hasPaidSubscription: boolean;
  onCompareClick: () => void;
  onCancelClick: () => void;
}

export const CurrentPlanBanner: React.FC<CurrentPlanBannerProps> = ({
  currentPlan,
  subscriptionRole,
  hasPaidSubscription,
  onCompareClick,
  onCancelClick,
}) => {
  const Icon = PLAN_ICONS[subscriptionRole] || Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Seu plano atual
                </p>
                <p className="text-xl font-bold text-foreground">
                  {currentPlan?.name || 'Free'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onCompareClick}
                className="gap-2"
              >
                <Table2 className="h-4 w-4" />
                Comparar Planos
              </Button>
              {hasPaidSubscription && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onCancelClick}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
