import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimulatorCTAProps {
  title: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * CTA banner for signup after simulator result. Tracks conversion on click when onClick provided.
 */
export function SimulatorCTA({
  title,
  href = '/signup',
  onClick,
  className,
}: SimulatorCTAProps) {
  const content = (
    <Card className={cn('bg-primary/10 border-primary/30', className)}>
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground text-center sm:text-left">{title}</p>
        {href ? (
          <Link to={href}>
            <Button onClick={onClick} className="gap-2">
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button onClick={onClick} className="gap-2">
            Criar conta grátis
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return content;
}
