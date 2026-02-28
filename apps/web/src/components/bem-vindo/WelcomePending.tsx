import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Loader2,
  Mail, 
  Phone,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';

interface WelcomePendingProps {
  plan?: string;
}

export const WelcomePending: React.FC<WelcomePendingProps> = ({ plan = 'pro' }) => {
  const { getPlanData, isLoading } = useWelcomeFeatures();
  
  const targetPlan = getPlanData(plan === 'starter' ? 'basic' : 'pro');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName="Pagamento" planSlug="pending">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative"
        >
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center mx-auto shadow-lg">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          {/* Animated pulse */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 h-20 w-20 rounded-2xl bg-amber-500/20 mx-auto"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className="mb-2 bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Aguardando confirmação
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Quase lá! ⏳
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Seu pagamento está sendo processado. Assim que for confirmado, 
            você receberá um e-mail e seu acesso será liberado automaticamente.
          </p>
        </motion.div>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-2">
                  Pagamento em análise
                </h2>
                <p className="text-muted-foreground mb-4">
                  O pagamento está passando pelas verificações de segurança. 
                  Este processo pode levar alguns minutos.
                </p>
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Bell className="h-4 w-4" />
                  <span>Você será notificado por e-mail assim que for aprovado</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What to expect */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-semibold text-center mb-6">
          O que acontece agora?
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-amber-600">1</span>
            </div>
            <h4 className="font-semibold mb-2">Processamento</h4>
            <p className="text-sm text-muted-foreground">
              Seu pagamento está sendo verificado pela operadora
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-blue-600">2</span>
            </div>
            <h4 className="font-semibold mb-2">Confirmação</h4>
            <p className="text-sm text-muted-foreground">
              Você receberá um e-mail de confirmação
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">Acesso Liberado</h4>
            <p className="text-sm text-muted-foreground">
              Seu plano {targetPlan?.name} será ativado automaticamente
            </p>
          </Card>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-muted-foreground mb-4">
          Enquanto isso, você pode explorar a plataforma com as funcionalidades gratuitas
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button className="gap-2">
              Ir para o Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Verificar status
          </Button>
        </div>
      </motion.div>

      {/* Contact Support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
          <CardContent className="py-6">
            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold">Demorou mais que o esperado?</h3>
              <p className="text-muted-foreground">
                Se o pagamento não for confirmado em alguns minutos, entre em contato conosco
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <a 
                href="mailto:contato@rxfin.com.br"
                className="flex items-center gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">E-mail</p>
                  <p className="text-primary hover:underline">contato@rxfin.com.br</p>
                </div>
              </a>

              <a 
                href="tel:+5500000000000"
                className="flex items-center gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Telefone/WhatsApp</p>
                  <p className="text-primary hover:underline">Em breve</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </WelcomeLayout>
  );
};
