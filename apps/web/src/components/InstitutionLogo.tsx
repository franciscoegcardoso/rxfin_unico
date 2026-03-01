import React from 'react';
import { ConnectorLogo } from '@/components/openfinance/ConnectorLogo';

export interface InstitutionLogoProps {
  institutionId: string;
  institutionName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Optional image URL (e.g. from Pluggy connector) */
  imageUrl?: string | null;
  /** Optional primary color hex (e.g. from Pluggy connector or institution color) */
  primaryColor?: string | null;
}

const SIZE_MAP: Record<string, 'xs' | 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  institutionId,
  institutionName,
  size = 'md',
  className,
  imageUrl,
  primaryColor,
}) => {
  const name = institutionName || institutionId || '?';

  return (
    <ConnectorLogo
      imageUrl={imageUrl}
      primaryColor={primaryColor}
      connectorName={name}
      size={SIZE_MAP[size] || 'md'}
      className={className}
    />
  );
};
