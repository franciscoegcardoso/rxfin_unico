import React from 'react';
import { cn } from '@/lib/utils';
import { normalizeBrandName, APP_LOGOS_BASE } from '@/lib/brand-utils';

export interface LandingBrandLogoProps {
  url?: string;
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

const sizePx = { sm: 24, md: 32 };

export const LandingBrandLogo: React.FC<LandingBrandLogoProps> = ({
  url,
  name,
  size = 'sm',
  className,
}) => {
  const [error, setError] = React.useState(false);
  const px = sizePx[size];
  const src = url ? (url.startsWith('http') ? url : `${APP_LOGOS_BASE}${url}`) : '';

  React.useEffect(() => {
    setError(false);
  }, [src, name]);

  if (!src || error) {
    const normalized = normalizeBrandName(name);
    const letter = normalized?.charAt(0) || name?.charAt(0)?.toUpperCase() || '?';
    return (
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-muted-foreground',
          className
        )}
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
        aria-label={`Logo ${name}`}
        title={name}
      >
        <span className="text-[10px]">{letter}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden',
        className
      )}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      <img
        src={src}
        alt={`Logo ${name}`}
        width={px}
        height={px}
        loading="lazy"
        onError={() => setError(true)}
        className="object-contain"
        style={{ width: px, height: px }}
      />
    </div>
  );
};
