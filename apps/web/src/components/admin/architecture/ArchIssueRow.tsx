import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArchIssueRowProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  onViewAction?: () => void;
  className?: string;
}

const severityMap = {
  critical: { label: 'Crítico', variant: 'destructive' as const },
  high: { label: 'Alto', variant: 'default' as const },
  medium: { label: 'Médio', variant: 'secondary' as const },
  low: { label: 'Baixo', variant: 'outline' as const },
};

export function ArchIssueRow({ severity, description, onViewAction, className }: ArchIssueRowProps) {
  const { label, variant } = severityMap[severity];
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2 px-3 rounded-md border bg-card', className)}>
      <div className="min-w-0 flex-1">
        <Badge variant={variant} className="text-[10px] mb-1">
          {label}
        </Badge>
        <p className="text-sm text-foreground">{description}</p>
      </div>
      {onViewAction && (
        <Button variant="ghost" size="sm" className="shrink-0 gap-1" onClick={onViewAction}>
          Ver Ação
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
