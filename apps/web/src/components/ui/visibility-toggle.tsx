import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVisibility } from '@/contexts/VisibilityContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VisibilityToggleProps {
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'ghost' | 'outline';
  showLabel?: boolean;
  className?: string;
}

export const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  size = 'icon',
  variant = 'ghost',
  showLabel = false,
  className = '',
}) => {
  const { isHidden, toggle } = useVisibility();

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={toggle}
      className={className}
      aria-label={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
    >
      {isHidden ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-2">{isHidden ? 'Mostrar' : 'Ocultar'}</span>
      )}
    </Button>
  );

  if (showLabel) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent>
        <p>{isHidden ? 'Mostrar valores' : 'Ocultar valores'}</p>
      </TooltipContent>
    </Tooltip>
  );
};
