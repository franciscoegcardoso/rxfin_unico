import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowArrowProps {
  direction?: 'right' | 'down' | 'left' | 'up';
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    arrow: 'text-muted-foreground/40',
    label: 'text-muted-foreground',
    iconBg: 'bg-muted/50',
    iconBorder: 'border-muted-foreground/20'
  },
  success: {
    arrow: 'text-emerald-500',
    label: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/30'
  },
  warning: {
    arrow: 'text-amber-500',
    label: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/30'
  },
  error: {
    arrow: 'text-red-500',
    label: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/10',
    iconBorder: 'border-red-500/30'
  }
};

/**
 * Seta animada para conectar elementos no fluxo
 * Usado para mostrar a direção do fluxo de dinheiro/informação
 */
export const FlowArrow: React.FC<FlowArrowProps> = ({
  direction = 'right',
  label,
  sublabel,
  icon,
  variant = 'default',
  animated = false,
  className
}) => {
  const style = variantStyles[variant];
  const isVertical = direction === 'down' || direction === 'up';
  const ArrowIcon = isVertical ? ArrowDown : ArrowRight;
  const rotation = direction === 'left' ? 'rotate-180' : direction === 'up' ? 'rotate-180' : '';

  return (
    <div className={cn(
      "flex items-center justify-center shrink-0",
      isVertical ? "flex-col py-3" : "flex-row px-3 sm:px-4",
      className
    )}>
      {/* Ícone central (se existir) */}
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "p-2.5 rounded-xl border mb-2",
            style.iconBg,
            style.iconBorder
          )}
        >
          {icon}
        </motion.div>
      )}

      {/* Label principal */}
      {label && (
        <span className={cn(
          "text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1",
          style.label
        )}>
          {label}
        </span>
      )}

      {/* Sublabel */}
      {sublabel && (
        <span className="text-[10px] text-muted-foreground mb-1">
          {sublabel}
        </span>
      )}

      {/* Seta */}
      <motion.div
        className={cn(style.arrow, rotation)}
        animate={animated ? {
          x: isVertical ? 0 : [0, 6, 0],
          y: isVertical ? [0, 6, 0] : 0
        } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowIcon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2} />
      </motion.div>
    </div>
  );
};

interface AnimatedFlowLineProps {
  isActive?: boolean;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Linha de conexão animada entre elementos
 */
export const AnimatedFlowLine: React.FC<AnimatedFlowLineProps> = ({
  isActive = false,
  direction = 'horizontal',
  className
}) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-full",
      direction === 'horizontal' ? "h-1 w-full" : "w-1 h-full",
      className
    )}>
      <div className="absolute inset-0 bg-muted" />
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/50"
          initial={{ 
            x: direction === 'horizontal' ? '-100%' : 0,
            y: direction === 'vertical' ? '-100%' : 0
          }}
          animate={{ 
            x: direction === 'horizontal' ? '100%' : 0,
            y: direction === 'vertical' ? '100%' : 0
          }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
    </div>
  );
};
