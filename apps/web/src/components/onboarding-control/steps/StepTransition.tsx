import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BarChart3, Wallet, CreditCard, Target, Building2, TrendingUp } from 'lucide-react';

interface StepTransitionProps {
  onStart: () => void;
}

const modules = [
  { icon: BarChart3, label: 'Planejamento', color: 'text-blue-500' },
  { icon: Wallet, label: 'Fluxo Financeiro', color: 'text-emerald-500' },
  { icon: CreditCard, label: 'Cartão de Crédito', color: 'text-purple-500' },
  { icon: Target, label: 'Metas', color: 'text-orange-500' },
  { icon: Building2, label: 'Patrimônio', color: 'text-cyan-500' },
  { icon: TrendingUp, label: 'Projeção de Futuro', color: 'text-amber-500' },
];

export const StepTransition: React.FC<StepTransitionProps> = ({ onStart }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-center"
    >
      <div className="space-y-3">
        <p className="text-4xl">🎉</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Parabéns! Seu Raio-X Financeiro está pronto!
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Agora vou te mostrar como usar as ferramentas do dia a dia
          para manter tudo sob controle e alcançar suas metas.
        </p>
        <p className="text-sm text-muted-foreground">
          São 6 módulos rápidos — cada um leva menos de 2 minutos.
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="p-4 space-y-2">
          {modules.map((mod, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <mod.icon className={`h-4 w-4 ${mod.color}`} />
              <span className="text-sm text-foreground">{mod.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button size="lg" onClick={onStart} className="gap-2">
        Vamos começar
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};
