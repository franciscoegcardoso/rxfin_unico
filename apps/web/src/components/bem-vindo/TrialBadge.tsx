import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, CreditCard, CheckCircle2 } from 'lucide-react';

interface TrialBadgeProps {
  variant?: 'default' | 'compact';
}

export const TrialBadge: React.FC<TrialBadgeProps> = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Garantia de 7 dias</p>
            <p className="text-sm text-muted-foreground">
              Se não gostar, cancele sem pagar nada
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-blue-500/5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <CardContent className="py-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-3">
              <Shield className="h-4 w-4" />
              Garantia Total de Satisfação
            </div>
            <h3 className="text-xl font-bold text-foreground">
              7 dias para testar sem compromisso
            </h3>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Experimente todas as funcionalidades. Se não for exatamente o que você precisa, 
              basta cancelar e você não pagará nada.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Teste Completo</p>
                <p className="text-xs text-muted-foreground">7 dias de acesso total</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Sem Cobrança</p>
                <p className="text-xs text-muted-foreground">Cancele antes, pague zero</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Fácil de Cancelar</p>
                <p className="text-xs text-muted-foreground">Sem burocracia</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
