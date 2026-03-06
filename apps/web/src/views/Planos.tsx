import React, { useState } from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useSubscriptionPermissions } from '@/hooks/useSubscriptionPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useTracking } from '@/contexts/TrackingContext';
import { buildCheckoutUrl } from '@/utils/checkoutUrl';
import { PlanComparisonDialog } from '@/components/planos/PlanComparisonDialog';
import { PlanCard, type BillingPeriod } from '@/components/planos/PlanCard';
import { BillingToggle } from '@/components/planos/BillingToggle';
import { TrustBadges } from '@/components/planos/TrustBadges';
import { PlanosFAQ } from '@/components/planos/PlanosFAQ';
import { CurrentPlanBanner } from '@/components/planos/CurrentPlanBanner';
import { motion } from 'framer-motion';

const Planos: React.FC = () => {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { subscriptionRole, loading: permissionsLoading } = useSubscriptionPermissions();
  const { user } = useAuth();
  const { trackingParams } = useTracking();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');

  const handleSelectPlan = (checkoutUrl: string | null, isFree: boolean) => {
    if (isFree) {
      toast.success('Você já está no plano Free!');
      return;
    }
    if (checkoutUrl) {
      const urlWithEmail = buildCheckoutUrl(checkoutUrl, user?.email, trackingParams);
      window.open(urlWithEmail, '_blank');
    } else {
      toast.info('Funcionalidade de contratação em breve!');
    }
  };

  const handleCancelSubscription = () => {
    toast.warning('Para cancelar sua assinatura, entre em contato com nosso suporte.');
  };

  const currentPlan = plans?.find(p => p.slug === subscriptionRole);
  const hasPaidSubscription = subscriptionRole !== 'free';

  if (isLoading || permissionsLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[600px] w-full" />
            ))}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-8 w-full max-w-full min-w-0 mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"

        >
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Escolha o plano ideal para você
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando precisar. Todos os planos incluem 7 dias de teste.
          </p>
        </motion.div>

        {/* Current Plan Banner */}
        <CurrentPlanBanner
          currentPlan={currentPlan}
          subscriptionRole={subscriptionRole}
          hasPaidSubscription={hasPaidSubscription}
          onCompareClick={() => setComparisonOpen(true)}
          onCancelClick={handleCancelSubscription}
        />

        {/* Trust Badges */}
        <TrustBadges />

        {/* Billing Period Toggle */}
        <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch py-4">
          {plans?.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={subscriptionRole === plan.slug}
              onSelect={handleSelectPlan}
              index={index}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>

        {/* Social Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">+500 usuários</span> já estão organizando suas finanças com RXFin
          </p>
        </motion.div>

        {/* Comparison Dialog */}
        <PlanComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />

        {/* FAQ */}
        <PlanosFAQ />

        {/* Final CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8 px-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20"
        >
          <h3 className="text-xl font-bold text-foreground mb-2">
            Ainda tem dúvidas?
          </h3>
          <p className="text-muted-foreground mb-4">
            Entre em contato conosco pelo chat ou envie um e-mail para{' '}
            <a href="mailto:contato@rxfin.com.br" className="text-primary hover:underline font-medium">
              contato@rxfin.com.br
            </a>
          </p>
        </motion.div>
      </div>
    </SettingsLayout>
  );
};

export default Planos;
