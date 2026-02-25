import React from 'react';
import { cn } from '@/lib/utils';
import { RXFinLoadingSpinner } from './RXFinLoadingSpinner';

interface ChartLoadingSpinnerProps {
  height?: string;
  message?: string;
  className?: string;
  variant?: 'default' | 'minimal';
}

/**
 * Animated loading spinner for charts – delegates to RXFinLoadingSpinner
 */
export const ChartLoadingSpinner: React.FC<ChartLoadingSpinnerProps> = ({
  height = 'h-[250px]',
  message = 'Carregando dados...',
  className,
  variant = 'default',
}) => {
  return (
    <RXFinLoadingSpinner
      height={height}
      message={variant === 'minimal' ? undefined : message}
      size={variant === 'minimal' ? 32 : 48}
      className={className}
    />
  );
};

export default ChartLoadingSpinner;
