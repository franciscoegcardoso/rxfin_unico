import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Crown, ArrowRight, Check, Zap, Gift, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { FeaturesList } from './FeaturesList';
import { TrialBadge } from './TrialBadge';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import { buildCheckoutUrl } from '@/utils/checkoutUrl';
import { useAuth } from '@/contexts/AuthContext';
import { useTracking } from '@/contexts/TrackingContext';
import confetti from 'canvas-confetti';

export const WelcomeStarter: React.FC = () => {
  const { getFeaturesForPlan, getUpgradeFeatures, getPlanData, isLoading } = useWelcomeFeatures();
  const { user } = useAuth();
  const { trackingParams } = useTracking();
  
  const starterPlan = getPlanData('basic');
  const proPlan = getPlanData('pro');
  
  const starterFeatures = getFeaturesForPlan('basic');
  const includedFeatures = starterFeatures.filter(f => f.included);
  const proUpgrades = getUpgradeFeatures('basic', 'pro');

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#22c55e', '#10b981', '#059669'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#22c55e', '#10b981', '#059669'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName={starterPlan?.name || 'Starter'} planSlug="starter">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-xl shadow-primary/30"
        >
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">
            <Gift className="h-3 w-3 mr-1" />
            Parabéns pela sua compra!
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Bem-vindo ao {starterPlan?.name}! 🚀
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Sua assinatura foi ativada com sucesso. Você agora tem acesso a funcionalidades 
            poderosas para organizar suas finanças.
          </p>
        </motion.div>
      </div>

      {/* Success Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Assinatura ativada com sucesso!
                </h2>
                <p className="text-muted-foreground">
                  Aproveite todas as funcionalidades do seu plano!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trial Guarantee */}
      <TrialBadge />

      {/* What's Included */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Tudo que está liberado para você
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

      {/* Pro Upgrade CTA */}
      {proPlan && proUpgrades.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Crown className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 mb-1">
                        <Star className="h-3 w-3 mr-1" />
                        Plano Premium
                      </Badge>
                      <h3 className="text-xl font-bold">{proPlan.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    Desbloqueie ainda mais funcionalidades e tenha o controle total das suas finanças:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-2 mb-4">
                    {proUpgrades.slice(0, 6).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-amber-600" />
                        </div>
                        <span className="text-foreground">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  {proUpgrades.length > 6 && (
                    <p className="text-sm text-muted-foreground mb-4">
                      E mais {proUpgrades.length - 6} funcionalidades exclusivas...
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 md:min-w-[200px]">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">A partir de</p>
                    <p className="text-3xl font-bold text-foreground">
                      R$ {proPlan.price_monthly.toFixed(2).replace('.', ',')}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                    onClick={() => {
                      if (proPlan.checkout_url) {
                        window.open(buildCheckoutUrl(proPlan.checkout_url, user?.email, trackingParams), '_blank');
                      }
                    }}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Fazer upgrade para Pro
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    7 dias grátis para testar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <p className="text-muted-foreground mb-4">
          Precisa de ajuda para começar?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              Ir para o Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/financeiro/planos">
            <Button variant="ghost" className="gap-2">
              Ver todos os planos
            </Button>
          </Link>
        </div>
      </motion.div>
    </WelcomeLayout>
  );
};
