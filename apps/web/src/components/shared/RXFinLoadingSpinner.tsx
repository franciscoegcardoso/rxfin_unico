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
 * Logo SVG com hélices girando ao redor do $ (anel em um sentido, hélices no outro).
 */
export const RXFinLoadingSpinner: React.FC<RXFinLoadingSpinnerProps> = ({
  size = 48,
  message,
  height,
  className,
  variant = 'default',
}) => {
  const isFullScreen = height === 'h-screen' || className?.includes('h-screen');
  const displayMessage = message ?? (isFullScreen ? 'Carregando...' : undefined);

  const spinner = (
    <div className="relative animate-in fade-in duration-300" style={{ width: size, height: size }} aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="block"
        aria-label="Carregando"
      >
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          opacity="0.3"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          opacity="0.8"
          strokeDasharray="72 217"
          className="rxfin-ring-spin"
        />

        {/* Rotating blades group (hélices girando ao redor do $) */}
        <g className="rxfin-blades-spin">
          {/* Blade 1 - top */}
          <path
            d="M50 50 C50 50, 38 18, 50 8 C62 18, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
          {/* Blade 2 - right */}
          <path
            d="M50 50 C50 50, 82 42, 92 50 C82 58, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
          {/* Blade 3 - bottom */}
          <path
            d="M50 50 C50 50, 62 82, 50 92 C38 82, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
          {/* Blade 4 - left */}
          <path
            d="M50 50 C50 50, 18 58, 8 50 C18 42, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
        </g>

        {/* Center circle (fixed) */}
        <circle
          cx="50"
          cy="50"
          r="14"
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
        />

        {/* Dollar sign (fixed) */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="hsl(var(--primary))"
          fontFamily="Inter, sans-serif"
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
        'flex items-center justify-center bg-background',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={displayMessage || 'Carregando'}
    >
      <div className="flex flex-col items-center gap-4">
        {spinner}
        {displayMessage && (
          <span className="text-sm text-muted-foreground font-medium animate-pulse">
            {displayMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default RXFinLoadingSpinner;
