import React from 'react';
import { CreditCard, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectorLogo } from './ConnectorLogo';
import { CardBrandIcon } from './CardBrandIcon';

const PREMIUM_LEVELS = ['black', 'infinite', 'nanquim', 'ultravioleta'];

interface CreditCardPlasticProps {
  bankName?: string;
  bankImageUrl?: string | null;
  bankPrimaryColor?: string | null;
  cardBrand?: string | null;
  cardLevel?: string | null;
  lastFourDigits?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export const CreditCardPlastic: React.FC<CreditCardPlasticProps> = ({
  bankName = 'Cartão',
  bankImageUrl,
  bankPrimaryColor,
  cardBrand,
  cardLevel,
  lastFourDigits,
  className,
  size = 'md',
}) => {
  const isPremium = cardLevel
    ? PREMIUM_LEVELS.includes(cardLevel.toLowerCase())
    : false;

  const bgColor = bankPrimaryColor
    ? `#${bankPrimaryColor.replace(/^#/, '')}`
    : 'hsl(var(--primary))';

  const isSm = size === 'sm';

  const gradientStyle: React.CSSProperties = isPremium
    ? {
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, ${bgColor}44 100%)`,
      }
    : {
        background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 60%, ${bgColor}88 100%)`,
      };

  const labelParts: string[] = [];
  if (cardBrand) {
    const formatted = cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1).toLowerCase();
    labelParts.push(formatted);
  }
  if (cardLevel) labelParts.push(cardLevel);

  const digits = lastFourDigits ? lastFourDigits.slice(-4) : null;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden shadow-lg select-none',
        isSm ? 'w-[160px] h-[100px]' : 'w-[220px] h-[138px]',
        className,
      )}
      style={gradientStyle}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Contactless icon */}
      <Wifi
        className={cn(
          'absolute text-white/30 rotate-90',
          isSm ? 'h-3 w-3 top-2 right-2' : 'h-4 w-4 top-3 right-3',
        )}
      />

      {/* Bank logo top-left */}
      <div className={cn('absolute', isSm ? 'top-2 left-2.5' : 'top-3 left-3.5')}>
        <ConnectorLogo
          imageUrl={bankImageUrl}
          primaryColor={bankPrimaryColor}
          connectorName={bankName}
          size={isSm ? 'xs' : 'sm'}
          className="ring-1 ring-white/20"
        />
      </div>

      {/* Bank name */}
      <div className={cn('absolute', isSm ? 'top-2.5 left-8' : 'top-3.5 left-10')}>
        <span
          className={cn(
            'text-white/90 font-semibold tracking-wide',
            isSm ? 'text-[9px]' : 'text-[11px]',
          )}
        >
          {bankName}
        </span>
      </div>

      {/* Chip */}
      <div
        className={cn(
          'absolute rounded-sm',
          isSm ? 'left-2.5 top-[38px] w-[22px] h-[16px]' : 'left-3.5 top-[52px] w-[30px] h-[22px]',
        )}
        style={{
          background: 'linear-gradient(135deg, #d4af37 0%, #f5e6a8 50%, #d4af37 100%)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn('border-[0.5px] border-amber-800/30 rounded-[1px]', isSm ? 'w-3 h-2.5' : 'w-4 h-3.5')}
          />
        </div>
      </div>

      {/* Card number */}
      <div
        className={cn(
          'absolute font-mono text-white/90 tracking-[0.15em]',
          isSm ? 'bottom-[26px] left-2.5 text-[10px]' : 'bottom-[34px] left-3.5 text-xs',
        )}
      >
        {digits ? `•••• •••• •••• ${digits}` : '•••• •••• •••• ••••'}
      </div>

      {/* Bottom row: label + brand icon */}
      <div
        className={cn(
          'absolute flex items-center justify-between',
          isSm ? 'bottom-2 left-2.5 right-2' : 'bottom-3 left-3.5 right-3',
        )}
      >
        <span
          className={cn(
            'text-white/80 font-medium uppercase tracking-wider truncate',
            isSm ? 'text-[7px] max-w-[90px]' : 'text-[9px] max-w-[140px]',
          )}
        >
          {labelParts.length > 0 ? labelParts.join(' ') : bankName}
        </span>

        {cardBrand ? (
          <div className={cn('bg-white/90 rounded-sm flex items-center justify-center', isSm ? 'p-0.5' : 'p-1')}>
            <CardBrandIcon brand={cardBrand} className={isSm ? '!h-3 !w-3' : '!h-4 !w-4'} />
          </div>
        ) : (
          <CreditCard className={cn('text-white/50', isSm ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
      </div>

      {/* Premium shimmer effect */}
      {isPremium && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 55%, transparent 60%)',
          }}
        />
      )}
    </div>
  );
};
