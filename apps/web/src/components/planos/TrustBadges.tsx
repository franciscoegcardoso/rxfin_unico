import React from 'react';
import { Shield, Clock, Zap, CreditCard, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const badges = [
  { icon: Shield, text: 'Pagamento 100% seguro', color: 'text-green-500' },
  { icon: Clock, text: '7 dias de teste grátis', color: 'text-blue-500' },
  { icon: Zap, text: 'Acesso imediato', color: 'text-amber-500' },
  { icon: RefreshCcw, text: 'Cancele quando quiser', color: 'text-purple-500' },
  { icon: CreditCard, text: 'Parcele em até 12x', color: 'text-primary' },
];

export const TrustBadges: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 py-6 px-4 bg-muted/30 rounded-2xl border border-border/50">
      {badges.map((badge, index) => (
        <motion.div 
          key={badge.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <badge.icon className={`h-4 w-4 ${badge.color}`} />
          <span className="font-medium">{badge.text}</span>
        </motion.div>
      ))}
    </div>
  );
};
