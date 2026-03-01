import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Rocket, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderBoldText } from '@/lib/renderBoldText';

export interface HubItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  path?: string;
  /** Icon container color classes, e.g. "bg-blue-500/10 text-blue-500" */
  color?: string;
  /** Optional badge */
  badge?: {
    label: string;
    className?: string;
  };
  /** If true, item is dimmed */
  disabled?: boolean;
  /** Click handler (for items without a path or with custom behavior) */
  onClick?: (e: React.MouseEvent) => void;
}

interface MobileHubListProps {
  items: HubItem[];
  className?: string;
}

/**
 * Standardized mobile hub/menu list component.
 * Used for hub pages that display a list of navigable items (Configurações, Simuladores, Minha Conta).
 * Renders a grouped card with dividers, consistent spacing, and chevrons.
 */
export const MobileHubList: React.FC<MobileHubListProps> = ({ items, className }) => {
  return (
    <div className={cn("bg-card rounded-xl border overflow-hidden divide-y divide-border", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const colorClasses = item.color || 'bg-primary/10 text-primary';

        const content = (
          <div
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left",
              item.disabled && "opacity-50"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              colorClasses
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
                {item.badge && !item.disabled && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-[10px] px-1.5 py-0 h-4", item.badge.className)}
                  >
                    {item.badge.label}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {renderBoldText(item.description)}
              </p>
              {item.disabled && item.badge && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Rocket className="h-2.5 w-2.5 text-amber-500/70" />
                  <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">{item.badge.label}</span>
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          </div>
        );

        if (item.onClick) {
          return (
            <button key={item.id} onClick={item.onClick} className="w-full">
              {content}
            </button>
          );
        }

        if (item.path && !item.disabled) {
          return (
            <Link key={item.id} to={item.path} className="block">
              {content}
            </Link>
          );
        }

        return (
          <div key={item.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
};
