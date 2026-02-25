import React from 'react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRAND_LOGOS: Record<string, string> = {
  VISA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png',
  MASTERCARD: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png',
  ELO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Cartão_Elo_logo.svg/200px-Cartão_Elo_logo.svg.png',
  AMEX: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png',
  'AMERICAN EXPRESS': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png',
  HIPERCARD: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Hipercard_logo.svg/200px-Hipercard_logo.svg.png',
};

interface CardBrandIconProps {
  brand?: string | null;
  className?: string;
}

export const CardBrandIcon: React.FC<CardBrandIconProps> = ({ brand, className }) => {
  const logoUrl = brand ? BRAND_LOGOS[brand.toUpperCase()] : undefined;
  const [error, setError] = React.useState(false);

  React.useEffect(() => { setError(false); }, [brand]);

  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={brand || 'Card brand'}
        className={cn('object-contain', className)}
        style={{ width: 20, height: 20 }}
        onError={() => setError(true)}
      />
    );
  }

  return <CreditCard className={cn('h-5 w-5 text-muted-foreground', className)} />;
};
