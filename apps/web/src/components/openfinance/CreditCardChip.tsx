import React from 'react';
import { cn } from '@/lib/utils';
import { ConnectorLogo } from './ConnectorLogo';
import { CardBrandIcon } from './CardBrandIcon';

/**
 * CreditCardChip — A compact, minimalista CSS card identity component.
 * Shows bank logo, last 4 digits, and brand icon in a pill-like layout.
 * Used in bill headers and compact card references.
 */

const PREMIUM_LEVELS = ['black', 'infinite', 'nanquim', 'ultravioleta'];

interface CreditCardChipProps {
  bankName?: string;
  bankImageUrl?: string | null;
  bankPrimaryColor?: string | null;
  cardBrand?: string | null;
  cardLevel?: string | null;
  lastFourDigits?: string | null;
  className?: string;
}

export const CreditCardChip: React.FC<CreditCardChipProps> = ({
  bankName = 'Cartão',
  bankImageUrl,
  bankPrimaryColor,
  cardBrand,
  cardLevel,
  lastFourDigits,
  className,
}) => {
  const isPremium = cardLevel
    ? PREMIUM_LEVELS.includes(cardLevel.toLowerCase())
    : false;

  const bgColor = bankPrimaryColor
    ? `#${bankPrimaryColor.replace(/^#/, '')}`
    : undefined;

  const digits = lastFourDigits ? lastFourDigits.slice(-4) : null;

  const chipBg: React.CSSProperties = isPremium
    ? { background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)' }
    : bgColor
      ? { background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)` }
      : {};

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 min-w-0',
        !bgColor && !isPremium && 'bg-muted',
        className,
      )}
      style={chipBg}
    >
      {/* Bank logo */}
      <ConnectorLogo
        imageUrl={bankImageUrl}
        primaryColor={(bgColor || isPremium) ? 'ffffff' : bankPrimaryColor}
        connectorName={bankName}
        size="xs"
        className={cn(
          'shrink-0',
          (bgColor || isPremium) && 'ring-1 ring-white/20',
        )}
      />

      {/* Last 4 digits */}
      <span
        className={cn(
          'font-mono text-xs tracking-wider font-semibold tabular-nums shrink-0',
          bgColor || isPremium ? 'text-white/90' : 'text-foreground',
        )}
      >
        •••• {digits || '••••'}
      </span>

      {/* Brand icon */}
      {cardBrand && (
        <div
          className={cn(
            'rounded-sm flex items-center justify-center p-0.5 shrink-0',
            bgColor || isPremium ? 'bg-white/90' : 'bg-muted-foreground/10',
          )}
        >
          <CardBrandIcon brand={cardBrand} className="!h-3.5 !w-3.5" />
        </div>
      )}
    </div>
  );
};
