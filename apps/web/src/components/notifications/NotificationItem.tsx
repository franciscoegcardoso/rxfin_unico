import React from 'react';
import {
  Clock,
  Target,
  PieChart,
  Settings,
  User,
  Sparkles,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/hooks/useNotifications';

const categoryIcons: Record<string, React.ElementType> = {
  vencimento: Clock,
  meta: Target,
  orcamento: PieChart,
  sistema: Settings,
  admin: User,
  ai: Sparkles,
};

function getCategoryIcon(category: string | null): React.ElementType {
  if (!category) return Bell;
  const key = (category || '').toLowerCase();
  return categoryIcons[key] ?? Bell;
}

function getPriorityBorderClass(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'alta') return 'border-l-destructive';
  if (p === 'media') return 'border-l-amber-500';
  return '';
}

interface NotificationItemProps {
  notification: Notification;
  /** Clique na linha: marca lida se precisar e delega navegação ao pai */
  onItemClick: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onItemClick,
}) => {
  const isUnread = notification.read_at == null;
  const Icon = getCategoryIcon(notification.category);
  const borderClass = getPriorityBorderClass(notification.priority);

  const handleClick = () => {
    onItemClick(notification);
  };

  const relativeDate = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 border-l-[3px] transition-colors cursor-pointer hover:bg-muted/50',
        borderClass,
        isUnread ? 'bg-primary/5' : 'bg-transparent'
      )}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {isUnread ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : (
        <span className="w-2 shrink-0" aria-hidden />
      )}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm truncate',
            isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {relativeDate}
        </p>
      </div>
    </div>
  );
};
