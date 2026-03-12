import React from 'react';
import { cn } from '@/lib/utils';

interface RXFinLoadingSpinnerProps {
  /** Size in pixels */
  size?: number;
  /** Optional message below the spinner */
  message?: string;
  /** Container height class */
  height?: string;
  /** Additional class */
  className?: string;
  /** Variant: 'default' shows centered in container, 'inline' just the icon */
  variant?: 'default' | 'inline';
}

/**
 * RXFin brand loading spinner.
 * 3 hélices (símbolo de radioatividade) giram; o "$" fica estático no centro.
 * viewBox 200×200 — pás com 60° de abertura angular, matematicamente corretas.
 */
export const RXFinLoadingSpinner: React.FC<RXFinLoadingSpinnerProps> = ({
  size = 48,
  message,
  height,
  className,
  variant = 'default',
}) => {
  const spinner = (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Camada giratória: anel externo + 3 hélices + hub */}
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="block absolute top-0 left-0"
        aria-hidden="true"
      >
        <g
          className="rxfin-blades-spin"
          style={{ transformOrigin: 'center' }}
        >
          {/* Anel externo */}
          <circle
            cx="100" cy="100" r="94"
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            fill="none"
          />
          {/* Pá 1 — centro 90° */}
          <path
            d="M 115.00 125.98 L 142.50 173.61 A 85 85 0 0 1 57.50 173.61 L 85.00 125.98 A 30 30 0 0 0 115.00 125.98 Z"
            fill="hsl(var(--primary))"
          />
          {/* Pá 2 — centro 210° */}
          <path
            d="M 70.00 100.00 L 15.00 100.00 A 85 85 0 0 1 57.50 26.39 L 85.00 74.02 A 30 30 0 0 0 70.00 100.00 Z"
            fill="hsl(var(--primary))"
          />
          {/* Pá 3 — centro 330° */}
          <path
            d="M 115.00 74.02 L 142.50 26.39 A 85 85 0 0 1 185.00 100.00 L 130.00 100.00 A 30 30 0 0 0 115.00 74.02 Z"
            fill="hsl(var(--primary))"
          />
          {/* Hub central */}
          <circle cx="100" cy="100" r="28" fill="hsl(var(--primary))" />
        </g>
      </svg>

      {/* Camada estática: apenas o "$" — nunca gira */}
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="block absolute top-0 left-0"
        aria-label="Carregando"
      >
        <text
          x="100"
          y="109"
          textAnchor="middle"
          fontSize="30"
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
          fill="white"
        >
          $
        </text>
      </svg>
    </div>
  );

  if (variant === 'inline') {
    return spinner;
  }

  return (
    <div
      className={cn(
        height || 'h-full min-h-[120px]',
        'flex items-center justify-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Carregando'}
    >
      <div className="flex flex-col items-center gap-3">
        {spinner}
        {message && (
          <span className="text-sm text-muted-foreground font-medium animate-pulse">
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default RXFinLoadingSpinner;
