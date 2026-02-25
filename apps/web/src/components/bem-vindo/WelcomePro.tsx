import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, ArrowRight, Check, Zap, Gift, Star, Rocket, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { FeaturesList } from './FeaturesList';
import { TrialBadge } from './TrialBadge';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import confetti from 'canvas-confetti';

export const WelcomePro: React.FC = () => {
  const { getFeaturesForPlan, getPlanData, isLoading } = useWelcomeFeatures();
  
  const proPlan = getPlanData('pro');
  const proFeatures = getFeaturesForPlan('pro');

  // Trigger premium confetti on mount
  useEffect(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Golden confetti burst
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName={proPlan?.name || 'Pro'} planSlug="pro">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="relative"
        >
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/40">
            <Crown className="h-12 w-12 text-white" />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 blur-xl opacity-50 mx-auto -z-10" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Badge className="mb-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Star className="h-3 w-3 mr-1" />
            Plano Premium Ativado!
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
            Você é VIP! 👑
          </h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-xl mx-auto">
            Parabéns! Você agora tem acesso ao <strong className="text-foreground">{proPlan?.name}</strong>, 
            nosso plano mais completo com todas as funcionalidades desbloqueadas.
          </p>
        </motion.div>
      </div>

      {/* Premium Success Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                <Check className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Acesso completo liberado! 🎉
                </h2>
                <p className="text-muted-foreground">
                  Sua assinatura {proPlan?.name} está ativa. Você tem acesso a <strong className="text-amber-600 dark:text-amber-400">todas</strong> as 
                  funcionalidades premium do RXFin. Aproveite ao máximo!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trial Guarantee */}
      <TrialBadge />

      {/* VIP Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid sm:grid-cols-3 gap-4"
      >
        <Card className="text-center p-6 border-primary/20 hover:border-primary/40 transition-colors">
          <Rocket className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Acesso Ilimitado</h3>
          <p className="text-sm text-muted-foreground">
            Todas as funcionalidades sem restrições
          </p>
        </Card>
        <Card className="text-center p-6 border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <Sparkles className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Recursos Premium</h3>
          <p className="text-sm text-muted-foreground">
            IA, relatórios avançados e mais
          </p>
        </Card>
        <Card className="text-center p-6 border-green-500/20 hover:border-green-500/40 transition-colors">
          <Shield className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Suporte Prioritário</h3>
          <p className="text-sm text-muted-foreground">
            Atendimento exclusivo e rápido
          </p>
        </Card>
      </motion.div>

      {/* All Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Tudo que está liberado para você
              </h2>
              <Badge variant="secondary" className="ml-auto">
                {proFeatures.length} funcionalidades
              </Badge>
            </div>
            <FeaturesList 
              features={proFeatures}
              title=""
              variant="included"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Start */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-bold mb-2">Pronto para começar?</h3>
            <p className="text-muted-foreground mb-6">
              Explore todas as funcionalidades e comece a transformar sua gestão financeira agora mesmo.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  <Rocket className="h-4 w-4" />
                  Começar agora
                </Button>
              </Link>
              <Link to="/minha-conta">
                <Button size="lg" variant="outline" className="gap-2">
                  <Gift className="h-4 w-4" />
                  Configurar minha conta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <p className="text-muted-foreground">
          Tem dúvidas? Entre em contato pelo{' '}
          <a href="mailto:contato@rxfin.com.br" className="text-primary hover:underline">
            contato@rxfin.com.br
          </a>
        </p>
      </motion.div>
    </WelcomeLayout>
  );
};
