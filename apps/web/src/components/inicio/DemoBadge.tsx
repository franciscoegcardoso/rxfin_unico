import React from 'react';
import { Badge } from '@/components/ui/badge';

export const DemoBadge: React.FC = () => (
  <Badge variant="outline" className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
    DEMO
  </Badge>
);
