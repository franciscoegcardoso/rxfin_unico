import React from 'react';
import { cn } from '@/lib/utils';

interface ArchHealthGaugeProps {
  value: number;
  label?: string;
  className?: string;
  size?: number;
}

export function ArchHealthGauge({ value, label, className, size = 120 }: ArchHealthGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const pct = clamped / 100;
  const strokeDash = 2 * Math.PI * 45 * 0.75;
  const offset = strokeDash * (1 - pct);
  const color =
    clamped >= 80 ? '#22c55e' : clamped >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size * 0.6 + 8} viewBox="0 0 120 80" className="overflow-visible">
        <path
          d="M 15 70 A 45 45 0 0 1 105 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-muted/30"
        />
        <path
          d="M 15 70 A 45 45 0 0 1 105 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
        <text x="60" y="58" textAnchor="middle" className="text-lg font-bold fill-foreground">
          {Math.round(value)}
        </text>
        <text x="60" y="72" textAnchor="middle" className="text-[10px] fill-muted-foreground">
          %
        </text>
      </svg>
      {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
    </div>
  );
}
