import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Rocket, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Gift,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { FeaturesList } from './FeaturesList';
import { TrialBadge } from './TrialBadge';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import confetti from 'canvas-confetti';

interface WelcomeTrialProps {
  plan?: string;
}

export const WelcomeTrial: React.FC<WelcomeTrialProps> = ({ plan = 'pro' }) => {
  const { getFeaturesForPlan, getPlanData, isLoading } = useWelcomeFeatures();
  
  const targetPlan = getPlanData(plan === 'starter' ? 'basic' : 'pro');
  const planFeatures = getFeaturesForPlan(plan === 'starter' ? 'basic' : 'pro');

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#3b82f6', '#06b6d4', '#8b5cf6'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#3b82f6', '#06b6d4', '#8b5cf6'],
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
    <WelcomeLayout planName={targetPlan?.name || 'Trial'} planSlug="trial">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30"
        >
          <Rocket className="h-10 w-10 text-white" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className="mb-2 bg-blue-500/20 text-blue-600 border-blue-500/30">
            <Gift className="h-3 w-3 mr-1" />
            Período de teste ativado!
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Seus 7 dias começaram! 🚀
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Você tem acesso completo ao <strong className="text-foreground">{targetPlan?.name}</strong> por 7 dias. 
            Explore todas as funcionalidades sem compromisso!
          </p>
        </motion.div>
      </div>

      {/* Trial Countdown Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold text-white">7</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  7 dias de acesso total
                </h2>
                <p className="text-muted-foreground">
                  Teste todas as funcionalidades premium. Se não for para você, 
                  basta cancelar antes do fim do período - <strong>sem nenhuma cobrança</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What's Included */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-foreground">
                O que você pode testar
              </h2>
            </div>
            <FeaturesList 
              features={planFeatures}
              title=""
              variant="included"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* How Trial Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-xl font-semibold text-center mb-6">
          Como funciona o período de teste?
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="text-center p-6 border-green-500/20">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">Acesso Imediato</h4>
            <p className="text-sm text-muted-foreground">
              Todas as funcionalidades liberadas agora mesmo
            </p>
          </Card>

          <Card className="text-center p-6 border-amber-500/20">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-6 w-6 text-amber-600" />
            </div>
            <h4 className="font-semibold mb-2">Sem Cobrança</h4>
            <p className="text-sm text-muted-foreground">
              Cancele a qualquer momento nos 7 dias
            </p>
          </Card>

          <Card className="text-center p-6 border-blue-500/20">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-semibold mb-2">Fácil de Cancelar</h4>
            <p className="text-sm text-muted-foreground">
              Sem burocracia ou pegadinhas
            </p>
          </Card>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-bold mb-2">Pronto para experimentar?</h3>
            <p className="text-muted-foreground mb-6">
              Comece a explorar todas as funcionalidades premium agora mesmo.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  <Rocket className="h-4 w-4" />
                  Começar a testar
                </Button>
              </Link>
              <Link to="/minha-conta">
                <Button size="lg" variant="outline" className="gap-2">
                  <Gift className="h-4 w-4" />
                  Configurar conta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Você está no controle. Cancele quando quiser.</span>
        </div>
      </motion.div>
    </WelcomeLayout>
  );
};
