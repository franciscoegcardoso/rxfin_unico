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
 * Recreates the logo as SVG with the 3 "blades" spinning like a fan
 * (accelerate → cruise → decelerate) while the "$" stays fixed.
 */
export const RXFinLoadingSpinner: React.FC<RXFinLoadingSpinnerProps> = ({
  size = 48,
  message,
  height,
  className,
  variant = 'default',
}) => {
  const spinner = (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="block"
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

        {/* Rotating blades group */}
        <g className="rxfin-blades-spin" style={{ transformOrigin: '50px 50px' }}>
          {/* Blade 1 - top */}
          <path
            d="M50 50 C50 50, 38 18, 50 8 C62 18, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
          {/* Blade 2 - bottom-left */}
          <path
            d="M50 50 C50 50, 18 58, 13 47 C20 36, 50 50, 50 50Z"
            fill="hsl(var(--primary))"
            opacity="0.85"
          />
          {/* Blade 3 - bottom-right */}
          <path
            d="M50 50 C50 50, 82 58, 87 47 C80 36, 50 50, 50 50Z"
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
          fill="hsl(var(--background))"
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
    <div className={cn(
      height || 'h-full min-h-[120px]',
      "flex items-center justify-center",
      className
    )}>
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
