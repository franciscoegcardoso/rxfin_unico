import React from 'react';
import { cn } from '@/lib/utils';

interface RXSplitAvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-lg',
};

export const RXSplitAvatar: React.FC<RXSplitAvatarProps> = ({
  name,
  color,
  size = 'md',
  className,
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-bold transition-transform hover:scale-105',
        sizeClasses[size],
        color,
        className
      )}
    >
      {initials}
    </div>
  );
};
