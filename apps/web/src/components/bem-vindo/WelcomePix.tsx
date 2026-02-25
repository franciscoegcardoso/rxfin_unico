import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  QrCode, 
  Copy,
  Clock,
  CheckCircle2,
  Mail, 
  Phone,
  HelpCircle,
  ArrowRight,
  Zap,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { WelcomeLayout } from './WelcomeLayout';
import { useWelcomeFeatures } from '@/hooks/useWelcomeFeatures';
import { toast } from '@/components/ui/use-toast';

interface WelcomePixProps {
  plan?: string;
}

export const WelcomePix: React.FC<WelcomePixProps> = ({ plan = 'pro' }) => {
  const { getPlanData, isLoading } = useWelcomeFeatures();
  
  const targetPlan = getPlanData(plan === 'starter' ? 'basic' : 'pro');

  const handleCopyPix = () => {
    // This would copy the actual PIX code in production
    toast({
      title: "Código PIX copiado!",
      description: "Cole no app do seu banco para pagar.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <WelcomeLayout planName="Pagamento PIX" planSlug="pix">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center mx-auto shadow-xl shadow-green-500/30"
        >
          <QrCode className="h-10 w-10 text-white" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className="mb-2 bg-green-500/20 text-green-600 border-green-500/30">
            <Zap className="h-3 w-3 mr-1" />
            Pagamento instantâneo
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Pague com PIX 💚
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
            Escaneie o QR Code ou copie o código para pagar. 
            Seu acesso será liberado automaticamente após a confirmação.
          </p>
        </motion.div>
      </div>

      {/* PIX QR Code Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-teal-500/5 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-green-500" />
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* QR Code Placeholder */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-white rounded-xl p-3 shadow-lg">
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <QrCode className="h-24 w-24 text-gray-400" />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Escaneie com o app do seu banco
                </p>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {targetPlan?.name}
                </h2>
                <p className="text-3xl font-bold text-green-600 mb-4">
                  R$ {targetPlan?.price_yearly?.toFixed(2).replace('.', ',')}
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>O QR Code expira em 30 minutos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Aprovação instantânea após pagamento</span>
                  </div>
                </div>

                <Button 
                  className="w-full md:w-auto gap-2 bg-green-600 hover:bg-green-700"
                  onClick={handleCopyPix}
                >
                  <Copy className="h-4 w-4" />
                  Copiar código PIX
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xl font-semibold text-center mb-6">
          Como pagar com PIX?
        </h3>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-green-600">1</span>
            </div>
            <h4 className="font-semibold mb-2">Abra o app do banco</h4>
            <p className="text-sm text-muted-foreground">
              Acesse a opção PIX no aplicativo do seu banco
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-green-600">2</span>
            </div>
            <h4 className="font-semibold mb-2">Escaneie ou cole</h4>
            <p className="text-sm text-muted-foreground">
              Use a câmera para ler o QR Code ou cole o código copiado
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">Confirme e pronto!</h4>
            <p className="text-sm text-muted-foreground">
              Seu acesso será liberado automaticamente
            </p>
          </Card>
        </div>
      </motion.div>

      {/* Já pagou */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className="text-muted-foreground mb-4">
          Já fez o pagamento? O acesso é liberado automaticamente em segundos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button className="gap-2">
              Ir para o Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            Verificar pagamento
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
              <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
              <p className="text-muted-foreground">
                Entre em contato caso tenha dificuldades com o pagamento
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

      {/* Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Pagamento seguro via PIX - Banco Central do Brasil</span>
        </div>
      </motion.div>
    </WelcomeLayout>
  );
};
