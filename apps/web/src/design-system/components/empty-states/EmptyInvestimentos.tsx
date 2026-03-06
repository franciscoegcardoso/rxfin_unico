import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyInvestimentosProps {
  className?: string;
  ctaHref?: string;
}

export const EmptyInvestimentos: React.FC<EmptyInvestimentosProps> = ({
  className,
  ctaHref = '/bens-investimentos',
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}
  >
    <div className="bg-muted rounded-full p-4 mb-4">
      <TrendingUp className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="font-syne font-bold text-xl text-foreground mb-2">
      Sua carteira está vazia
    </h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
      Adicione seus investimentos para acompanhar a rentabilidade.
    </p>
    <Link
      to={ctaHref}
      className="bg-primary text-primary-foreground font-syne font-bold rounded-xl px-6 py-3 hover:bg-primary/90 transition-colors"
    >
      Adicionar investimento
    </Link>
  </div>
);
