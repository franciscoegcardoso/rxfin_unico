import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationState = 'idle' | 'loading' | 'valid' | 'error' | 'warning';

interface ValidationBadgeProps {
  state: ValidationState;
  message?: string;
  className?: string;
}

/**
 * Badge de validação visual para campos de input
 */
export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ 
  state, 
  message,
  className 
}) => {
  if (state === 'idle') return null;

  const variants = {
    loading: {
      icon: Loader2,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      animate: true,
    },
    valid: {
      icon: CheckCircle2,
      color: 'text-income',
      bgColor: 'bg-income/10',
      animate: false,
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      animate: false,
    },
    warning: {
      icon: Info,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      animate: false,
    },
  };

  const config = variants[state];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
          config.bgColor,
          config.color,
          className
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', config.animate && 'animate-spin')} />
        {message && <span>{message}</span>}
      </motion.div>
    </AnimatePresence>
  );
};

interface FieldWrapperProps {
  label: string;
  state?: ValidationState;
  message?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper para campos com label, validação e mensagem de ajuda
 */
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  state = 'idle',
  message,
  required,
  hint,
  children,
  className,
}) => {
  const borderColor = {
    idle: 'border-transparent',
    loading: 'border-muted-foreground/30',
    valid: 'border-income/30',
    error: 'border-destructive/50',
    warning: 'border-amber-500/30',
  }[state];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
        <ValidationBadge state={state} message={message} />
      </div>
      
      <div className={cn(
        'rounded-lg transition-all duration-200',
        state !== 'idle' && `ring-1 ${borderColor}`
      )}>
        {children}
      </div>

      {/* Mensagem de erro ou dica */}
      <AnimatePresence mode="wait">
        {state === 'error' && message && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {message}
          </motion.p>
        )}
        {state !== 'error' && hint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Helper para determinar estado de validação baseado nas condições
 */
export function getValidationState({
  isLoading,
  hasValue,
  hasError,
  isDisabled,
  isEmpty,
}: {
  isLoading?: boolean;
  hasValue?: boolean;
  hasError?: boolean;
  isDisabled?: boolean;
  isEmpty?: boolean;
}): ValidationState {
  if (isDisabled) return 'idle';
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (isEmpty) return 'warning';
  if (hasValue) return 'valid';
  return 'idle';
}

/**
 * Mensagens de validação amigáveis em português
 */
export const validationMessages = {
  brand: {
    loading: 'Buscando marcas...',
    empty: 'Selecione uma marca para continuar',
    valid: 'Marca selecionada',
    error: 'Erro ao carregar marcas',
  },
  model: {
    loading: 'Carregando modelos...',
    empty: 'Selecione um modelo',
    valid: 'Modelo selecionado',
    error: 'Erro ao carregar modelos',
    disabled: 'Selecione uma marca primeiro',
  },
  year: {
    loading: 'Carregando anos...',
    empty: 'Selecione o ano/modelo',
    valid: 'Ano selecionado',
    error: 'Erro ao carregar anos',
    disabled: 'Selecione um modelo primeiro',
  },
};
