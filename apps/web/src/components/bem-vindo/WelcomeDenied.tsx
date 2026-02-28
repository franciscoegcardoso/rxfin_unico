import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  XCircle, 
  CreditCard, 
  QrCode, 
  Phone, 
  Mail, 
  ArrowRight, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Shield
} from 'lucide-react';
import { WelcomeLayout } from './WelcomeLayout';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import { buildCheckoutUrl } from '@/utils/checkoutUrl';
import { useAuth } from '@/contexts/AuthContext';
import { useTracking } from '@/contexts/TrackingContext';

interface WelcomeDeniedProps {
  plan?: string;
}

export const WelcomeDenied: React.FC<WelcomeDeniedProps> = ({ plan = 'pro' }) => {
  const { getPlanData, isLoading } = useWelcomeFeatures();
  const { user } = useAuth();
  const { trackingParams } = useTracking();
  
  const targetPlan = getPlanData(plan === 'starter' ? 'basic' : 'pro');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName="Pagamento" planSlug="denied">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center mx-auto shadow-lg"
        >
          <XCircle className="h-10 w-10 text-red-500" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge variant="destructive" className="mb-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pagamento não aprovado
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Ops! Algo deu errado 😕
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Infelizmente não conseguimos processar seu pagamento. 
            Mas não se preocupe, isso acontece às vezes e é fácil resolver!
          </p>
        </motion.div>
      </div>

      {/* Main Message Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 to-orange-500/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">
                  O que pode ter acontecido?
                </h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Dados do cartão digitados incorretamente
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Limite insuficiente ou cartão bloqueado
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Problema temporário com a operadora
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Try Again Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-semibold text-center mb-6">
          Tente novamente com outro método de pagamento
        </h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Credit Card Option */}
          <Card className="relative overflow-hidden border-primary/30 hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Cartão de Crédito</h4>
                  <p className="text-sm text-muted-foreground">Tente outro cartão</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Use um cartão diferente ou verifique os dados digitados. 
                Aceitamos Visa, Mastercard, Elo e mais.
              </p>
              <Button 
                className="w-full gap-2"
                onClick={() => {
                  if (targetPlan?.checkout_url) {
                    window.open(buildCheckoutUrl(targetPlan.checkout_url, user?.email, trackingParams), '_blank');
                  }
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Tentar com cartão
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* PIX Option */}
          <Card className="relative overflow-hidden border-green-500/30 hover:border-green-500/50 transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-green-500/5 to-transparent">
            <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0">
              Aprovação Instantânea
            </Badge>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <QrCode className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Pagar com PIX</h4>
                  <p className="text-sm text-muted-foreground">Pagamento imediato</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Com PIX a aprovação é instantânea e sem risco de recusa. 
                Basta escanear o QR Code ou copiar o código.
              </p>
              <Button 
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (targetPlan?.checkout_url) {
                    window.open(buildCheckoutUrl(targetPlan.checkout_url, user?.email, trackingParams), '_blank');
                  }
                }}
              >
                <QrCode className="h-4 w-4" />
                Pagar com PIX
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Contact Support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
          <CardContent className="py-6">
            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
              <p className="text-muted-foreground">
                Nossa equipe está pronta para ajudar você a concluir sua assinatura
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

      {/* Guarantee Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Pagamento seguro e criptografado</span>
        </div>
      </motion.div>
    </WelcomeLayout>
  );
};
