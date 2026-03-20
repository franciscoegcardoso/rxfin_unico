import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<LogoSize, { px: number; radius: number; fontSize: string }> = {
  xs: { px: 16, radius: 4, fontSize: 'text-[9px]' },
  sm: { px: 20, radius: 5, fontSize: 'text-[10px]' },
  md: { px: 24, radius: 6, fontSize: 'text-xs' },
  lg: { px: 40, radius: 8, fontSize: 'text-base' },
};

interface ConnectorLogoProps {
  imageUrl?: string | null;
  primaryColor?: string | null;
  connectorName: string;
  size?: LogoSize;
  className?: string;
}

export const ConnectorLogo: React.FC<ConnectorLogoProps> = ({
  imageUrl,
  primaryColor,
  connectorName,
  size = 'lg',
  className,
}) => {
  const [imgError, setImgError] = useState(false);

  const firstLetter = connectorName?.charAt(0)?.toUpperCase() || '?';
  const bgColor = primaryColor ? `#${primaryColor.replace(/^#/, '')}` : undefined;
  const resolvedSize = SIZE_MAP[size] ? size : 'md';
  const { px, radius, fontSize } = SIZE_MAP[resolvedSize];

  const containerClass = cn(
    'shrink-0 flex items-center justify-center overflow-hidden',
    className,
  );

  const style: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    borderRadius: radius,
  };

  if (imageUrl && !imgError) {
    return (
      <div className={containerClass} style={{ ...style, background: '#fff' }}>
        <img
          src={imageUrl}
          alt={connectorName}
          className="h-full w-full object-contain"
          style={{ borderRadius: radius }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: show first letter if we have a name, otherwise a generic bank icon
  const hasName = connectorName && connectorName.trim().length > 0;

  return (
    <div
      className={containerClass}
      style={{
        ...style,
        backgroundColor: bgColor || 'hsl(var(--primary))',
      }}
    >
      {hasName ? (
        <span className={cn('text-white font-bold select-none', fontSize)}>{firstLetter}</span>
      ) : (
        <Building2 className="text-white" style={{ width: px * 0.55, height: px * 0.55 }} />
      )}
    </div>
  );
};
