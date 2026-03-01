import React from 'react';
import { useTheme } from 'next-themes';

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
  variant = 'auto',
}) => {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'dark' ? '/logo-rxfin-white.png' : '/logo-rxfin-icon.png';
  
  return (
    <img 
      src={src} 
      alt="RXFin" 
      className={className}
    />
  );
};
