import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SimuladorCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  isPublic: boolean;
  isLoggedIn: boolean;
  badge?: string;
}

export const SimuladorCard: React.FC<SimuladorCardProps> = ({
  title,
  description,
  icon: Icon,
  path,
  isPublic,
  isLoggedIn,
  badge,
}) => {
  const canAccessDirectly = isPublic || isLoggedIn;
  const href = canAccessDirectly ? path : `/signup?redirect=${encodeURIComponent(path)}`;

  return (
    <Card
      className={cn(
        'rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:border-primary/30'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!canAccessDirectly && (
              <Badge variant="secondary" className="text-xs bg-green-600 text-white">
                Grátis com cadastro
              </Badge>
            )}
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        <h2 className="font-semibold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <Button variant="outline" size="sm" className="w-full gap-2 group" asChild>
          <Link to={href}>
            Simular
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
