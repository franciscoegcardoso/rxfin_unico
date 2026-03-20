import React from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyMetasProps {
  className?: string;
  ctaHref?: string;
}

export const EmptyMetas: React.FC<EmptyMetasProps> = ({
  className,
  ctaHref = '/planejamento-mensal',
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}
  >
    <div className="bg-muted rounded-full p-4 mb-4">
      <Target className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="font-syne font-bold text-xl text-foreground mb-2">
      Nenhuma meta criada
    </h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
      Crie metas de economia para planejar seu futuro financeiro.
    </p>
    <Link
      to={ctaHref}
      className="bg-primary text-primary-foreground font-syne font-bold rounded-xl px-6 py-3 hover:bg-primary/90 transition-colors"
    >
      Criar meta
    </Link>
  </div>
);
