import React from 'react';
import { useTheme } from 'next-themes';
import logoIcon from '@/assets/logo-rxfin-icon.png';
import logoWhite from '@/assets/logo-rxfin-white.png';

interface ThemedLogoProps {
  className?: string;
  variant?: 'icon' | 'auto';
}

/**
 * Logo component that automatically switches between dark/light versions
 * based on the current theme.
 */
export const ThemedLogo: React.FC<ThemedLogoProps> = ({ 
  className = 'h-16 w-16 object-contain',
  variant = 'auto'
}) => {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'dark' ? logoWhite : logoIcon;

  const extractTailwindSize = (prefix: 'h' | 'w'): number | undefined => {
    const match = className.match(new RegExp(`\\b${prefix}-(\\d+)\\b`));
    return match ? Number(match[1]) * 4 : undefined;
  };

  const h = extractTailwindSize('h');
  const w = extractTailwindSize('w');
  const width = w ?? h ?? 64;
  const height = h ?? w ?? 64;
  
  return (
    <img 
      src={src} 
      alt="RXFin" 
      className={className}
      width={width}
      height={height}
    />
  );
};
