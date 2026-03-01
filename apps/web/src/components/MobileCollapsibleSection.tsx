import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileCollapsibleSectionProps {
  /** Title displayed in the header */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Icon element to show next to title */
  icon?: React.ReactNode;
  /** Optional badge to show (e.g., "IA", "Premium") */
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    className?: string;
    icon?: React.ReactNode;
  };
  /** Content to show in collapsed mobile view (summary/preview) */
  collapsedContent?: React.ReactNode;
  /** Full content to show when expanded (or always on desktop) */
  children: React.ReactNode;
  /** Whether to start expanded on mobile */
  defaultExpanded?: boolean;
  /** Force always expanded (ignores mobile collapsing) */
  forceExpanded?: boolean;
  /** Extra CSS classes for the Card */
  className?: string;
  /** Card variant styling */
  variant?: 'default' | 'primary' | 'success' | 'warning';
  /** ID for anchor links */
  id?: string;
}

const variantStyles = {
  default: '',
  primary: 'border-primary/30 bg-primary/5',
  success: 'border-income/30 bg-income/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
};

export const MobileCollapsibleSection: React.FC<MobileCollapsibleSectionProps> = ({
  title,
  description,
  icon,
  badge,
  collapsedContent,
  children,
  defaultExpanded = false,
  forceExpanded = false,
  className,
  variant = 'default',
  id,
}) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // On desktop or when forced, always show full content
  const shouldCollapse = isMobile && !forceExpanded;
  const showFullContent = !shouldCollapse || isExpanded;

  return (
    <Card id={id} className={cn(variantStyles[variant], className)}>
      <CardHeader 
        className={cn(
          "pb-2",
          shouldCollapse && "cursor-pointer select-none active:bg-muted/50 transition-colors rounded-t-lg"
        )}
        onClick={shouldCollapse ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-1">
            {icon}
            <span className="truncate">{title}</span>
            {badge && (
              <Badge 
                variant={badge.variant || 'secondary'} 
                className={cn("h-5 px-1.5 text-[10px] font-medium shrink-0", badge.className)}
              >
                {badge.icon}
                {badge.label}
              </Badge>
            )}
          </CardTitle>
          
          {shouldCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        {description && (
          <CardDescription className="text-xs sm:text-sm mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          {!showFullContent && collapsedContent && (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {collapsedContent}
              <div className="mt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => setIsExpanded(true)}
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Ver detalhes
                </Button>
              </div>
            </motion.div>
          )}
          
          {showFullContent && (
            <motion.div
              key="expanded"
              initial={shouldCollapse ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {children}
              
              {shouldCollapse && isExpanded && (
                <div className="mt-4 pt-3 border-t text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-3 text-muted-foreground"
                    onClick={() => setIsExpanded(false)}
                  >
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Recolher
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

/**
 * Compact metric card for mobile collapsed view
 */
interface CompactMetricProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const CompactMetric: React.FC<CompactMetricProps> = ({
  label,
  value,
  icon,
  trend,
  className,
}) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className={cn("flex items-center justify-between py-1.5", className)}>
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        trend && trendColors[trend]
      )}>
        {value}
      </span>
    </div>
  );
};

/**
 * Grid of compact metrics for mobile summary view
 */
interface CompactMetricsGridProps {
  metrics: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
  }>;
  columns?: 1 | 2;
}

export const CompactMetricsGrid: React.FC<CompactMetricsGridProps> = ({
  metrics,
  columns = 1,
}) => {
  return (
    <div className={cn(
      "divide-y divide-border/50",
      columns === 2 && "grid grid-cols-2 gap-x-4 divide-y-0"
    )}>
      {metrics.map((metric, idx) => (
        <CompactMetric
          key={idx}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          trend={metric.trend}
        />
      ))}
    </div>
  );
};

export default MobileCollapsibleSection;
