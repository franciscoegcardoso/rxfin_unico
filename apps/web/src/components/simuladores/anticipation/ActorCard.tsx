import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlossaryTooltip } from './GlossaryTooltip';
import { GLOSSARY } from './types';

interface ActorCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  variant: 'consumer' | 'retailer' | 'supplier' | 'bank';
  balance?: number;
  debt?: number;
  credit?: number;
  isHighlighted?: boolean;
  highlightType?: 'success' | 'warning' | 'error';
  className?: string;
  animationDelay?: number;
}

const variantStyles = {
  consumer: {
    border: 'border-l-blue-500',
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
    label: 'Consumidor',
    glow: 'shadow-blue-500/20'
  },
  retailer: {
    border: 'border-l-purple-500',
    iconBg: 'bg-gradient-to-br from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-500',
    label: 'Lojista',
    glow: 'shadow-purple-500/20'
  },
  supplier: {
    border: 'border-l-orange-500',
    iconBg: 'bg-gradient-to-br from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
    label: 'Fornecedor',
    glow: 'shadow-orange-500/20'
  },
  bank: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-500',
    label: 'Financeira',
    glow: 'shadow-emerald-500/20'
  }
};

const highlightStyles = {
  success: 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-background shadow-lg shadow-emerald-500/10',
  warning: 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background shadow-lg shadow-amber-500/10',
  error: 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-background shadow-lg shadow-red-500/10'
};

/**
 * Card que representa um ator/participante do ecossistema de pagamentos
 * Com indicadores visuais de caixa, dívidas e créditos
 */
export const ActorCard: React.FC<ActorCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  variant,
  balance = 0,
  debt = 0,
  credit = 0,
  isHighlighted = false,
  highlightType,
  className,
  animationDelay = 0
}) => {
  const style = variantStyles[variant];
  
  // Determinar tendência do caixa
  const getTrend = (value: number) => {
    if (value > 0) return { icon: TrendingUp, color: 'text-emerald-500' };
    if (value < 0) return { icon: TrendingDown, color: 'text-red-500' };
    return { icon: Minus, color: 'text-muted-foreground' };
  };

  const balanceTrend = getTrend(balance);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animationDelay }}
      className={cn(
        "bg-card p-4 sm:p-5 rounded-xl shadow-sm border border-border border-l-4 transition-all duration-300 w-full sm:w-auto sm:min-w-[200px]",
        style.border,
        isHighlighted && highlightType && highlightStyles[highlightType],
        isHighlighted && style.glow,
        className
      )}
    >
      {/* Header com ícone e título */}
      <div className="flex items-center gap-3 mb-3">
        <motion.div 
          className={cn(
            "p-2.5 sm:p-3 rounded-xl transition-transform duration-300 border border-transparent",
            style.iconBg,
            isHighlighted && "scale-110 border-current/10"
          )}
          animate={isHighlighted ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: isHighlighted ? Infinity : 0 }}
        >
          <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", style.iconColor)} />
        </motion.div>
        <div>
          <h3 className="font-bold text-foreground text-sm sm:text-base">{title}</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {style.label}
          </span>
        </div>
      </div>

      {/* Descrição */}
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 min-h-[36px] leading-relaxed">
        {subtitle}
      </p>

      {/* Indicadores financeiros */}
      <div className="pt-3 border-t border-border/50 space-y-2.5">
        {/* Caixa */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            Caixa
          </span>
          <motion.span
            key={balance}
            initial={{ scale: 1.2, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              balance < 0 ? "text-red-500" : balance > 0 ? "text-emerald-500" : "text-foreground"
            )}
          >
            R$ {balance.toFixed(2)}
          </motion.span>
        </div>

        {/* A Pagar */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/30" />
            A Pagar
          </span>
          <motion.span
            key={debt}
            initial={{ scale: debt > 0 ? 1.2 : 1, opacity: debt > 0 ? 0.5 : 1 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-mono text-sm tabular-nums",
              debt > 0 ? "text-red-500 font-medium" : "text-muted-foreground/50"
            )}
          >
            R$ {debt.toFixed(2)}
          </motion.span>
        </div>

        {/* A Receber */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500/30" />
            A Receber
          </span>
          <motion.span
            key={credit}
            initial={{ scale: credit > 0 ? 1.2 : 1, opacity: credit > 0 ? 0.5 : 1 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "font-mono text-sm tabular-nums",
              credit > 0 ? "text-blue-500 font-medium" : "text-muted-foreground/50"
            )}
          >
            R$ {credit.toFixed(2)}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

interface IntroActorCardProps {
  icon: LucideIcon;
  title: string;
  role: string;
  description: string;
  variant: 'consumer' | 'retailer' | 'supplier' | 'bank';
  animationDelay?: number;
  glossaryTerm?: keyof typeof GLOSSARY;
}

/**
 * Card de introdução para o passo inicial
 * Apresenta cada ator de forma educativa
 */
export const IntroActorCard: React.FC<IntroActorCardProps> = ({
  icon: Icon,
  title,
  role,
  description,
  variant,
  animationDelay = 0,
  glossaryTerm
}) => {
  const style = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animationDelay }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-border hover:shadow-lg hover:border-border/80 transition-all duration-300 flex flex-col items-center text-center h-full group"
    >
      <motion.div 
        className={cn(
          "p-4 sm:p-5 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110",
          style.iconBg
        )}
      >
        <Icon className={cn("w-7 h-7 sm:w-8 sm:h-8", style.iconColor)} />
      </motion.div>
      
      <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">{title}</h3>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-2 py-0.5 bg-muted rounded-full">
        {role}
      </span>
      
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
        {description}
      </p>

      {glossaryTerm && (
        <div className="mt-4 pt-4 border-t border-border/50 w-full">
          <GlossaryTooltip term={glossaryTerm}>
            <span className="text-xs text-primary font-medium hover:underline">Saiba mais →</span>
          </GlossaryTooltip>
        </div>
      )}
    </motion.div>
  );
};
