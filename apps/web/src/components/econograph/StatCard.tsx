import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  Icon: LucideIcon;
  colorClass: string;
  label: string;
  value: string;
  delay?: number;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  Icon,
  colorClass,
  label,
  value,
  delay = 0,
  trend,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-semibold tabular-nums">{value}</p>
                {trend && trend !== 'neutral' && (
                  trend === 'up' 
                    ? <TrendingUp className="h-3.5 w-3.5 text-income" />
                    : <TrendingDown className="h-3.5 w-3.5 text-expense" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
