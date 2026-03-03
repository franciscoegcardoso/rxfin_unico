import React from 'react';
import { motion } from 'framer-motion';
import { Car, CreditCard, TrendingUp } from 'lucide-react';

const DECISIONS = [
  { id: 'veiculos', icon: Car, label: 'Veículos' },
  { id: 'dividas', icon: CreditCard, label: 'Dívidas' },
  { id: 'planejamento', icon: TrendingUp, label: 'Planejamento' },
] as const;

interface DecisionNavProps {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
}

export const DecisionNav: React.FC<DecisionNavProps> = ({ activeCategory, onCategoryChange }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="space-y-2"
    >
      <p className="text-xs font-medium text-muted-foreground text-center">
        Qual é sua decisão hoje?
      </p>
      <div className="flex items-center gap-2 justify-center">
        {DECISIONS.map(({ id, icon: Icon, label }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => onCategoryChange(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:border-primary/30'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : ''}`} />
              {label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
