import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Sparkles, Crown, ArrowRight, Lock, Check, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { FeaturesList } from './FeaturesList';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import { buildCheckoutUrl } from '@/utils/checkoutUrl';
import { useAuth } from '@/contexts/AuthContext';
import { useTracking } from '@/contexts/TrackingContext';

export const WelcomeFree: React.FC = () => {
  const { getFeaturesForPlan, getUpgradeFeatures, getPlanData, isLoading } = useWelcomeFeatures();
  const { user } = useAuth();
  const { trackingParams } = useTracking();
  
  const freePlan = getPlanData('free');
  const starterPlan = getPlanData('basic');
  const proPlan = getPlanData('pro');
  
  const freeFeatures = getFeaturesForPlan('free');
  const includedFeatures = freeFeatures.filter(f => f.included);
  const excludedFeatures = freeFeatures.filter(f => !f.included);
  
  const starterUpgrades = getUpgradeFeatures('free', 'basic');
  const proUpgrades = getUpgradeFeatures('free', 'pro');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName="Free" planSlug="free">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto shadow-lg"
        >
          <Star className="h-10 w-10 text-slate-600 dark:text-slate-300" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge variant="secondary" className="mb-2">Plano Gratuito</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Bem-vindo ao RXFin! 🎉
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Você está no plano <strong>Free</strong>. Explore as funcionalidades básicas 
            e descubra como o RXFin pode transformar sua gestão financeira.
          </p>
        </motion.div>
      </div>

      {/* What's Included */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-foreground">
                O que você já pode usar
              </h2>
            </div>
            <FeaturesList 
              features={includedFeatures}
              title=""
              variant="included"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* What's Not Included */}
      {excludedFeatures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-semibold text-foreground">
                  Funcionalidades bloqueadas
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upgrade para desbloquear essas funcionalidades premium:
              </p>
              <FeaturesList 
                features={excludedFeatures}
                title=""
                variant="excluded"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upgrade CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Starter Upgrade */}
        {starterPlan && (
          <Card className="relative overflow-hidden border-primary/30 hover:border-primary/50 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/70" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{starterPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    R$ {starterPlan.price_monthly.toFixed(2).replace('.', ',')}/mês
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 mb-4">
                {starterUpgrades.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature.name}</span>
                  </li>
                ))}
                {starterUpgrades.length > 4 && (
                  <li className="text-sm text-muted-foreground">
                    +{starterUpgrades.length - 4} funcionalidades
                  </li>
                )}
              </ul>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if (starterPlan.checkout_url) {
                    window.open(buildCheckoutUrl(starterPlan.checkout_url, user?.email, trackingParams), '_blank');
                  }
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade para Starter
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pro Upgrade */}
        {proPlan && (
          <Card className="relative overflow-hidden border-amber-500/30 hover:border-amber-500/50 transition-colors bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              Recomendado
            </Badge>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{proPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    R$ {proPlan.price_monthly.toFixed(2).replace('.', ',')}/mês
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 mb-4">
                {proUpgrades.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>{feature.name}</span>
                  </li>
                ))}
                {proUpgrades.length > 4 && (
                  <li className="text-sm text-muted-foreground">
                    +{proUpgrades.length - 4} funcionalidades
                  </li>
                )}
              </ul>

              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => {
                  if (proPlan.checkout_url) {
                    window.open(buildCheckoutUrl(proPlan.checkout_url, user?.email, trackingParams), '_blank');
                  }
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade para Pro
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Compare All Plans */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <Link to="/financeiro/planos">
          <Button variant="ghost" className="gap-2">
            Ver comparativo completo dos planos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </WelcomeLayout>
  );
};
