import React from 'react';
import { X, Bell, CreditCard, AlertTriangle, Megaphone, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/hooks/useNotifications';

const typeIcons: Record<string, React.ElementType> = {
  admin: Megaphone,
  system: Bell,
  payment: CreditCard,
  expiration: AlertTriangle,
};

const priorityColors: Record<string, string> = {
  low: 'border-l-muted-foreground/30',
  normal: 'border-l-primary/50',
  high: 'border-l-amber-500',
  urgent: 'border-l-destructive',
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate?: (url: string) => void;
  onOpenDetail?: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification, onRead, onDismiss, onNavigate, onOpenDetail,
}) => {
  const Icon = typeIcons[notification.type] || Bell;
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
    if (onOpenDetail) {
      onOpenDetail(notification);
    } else if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 border-l-[3px] transition-colors cursor-pointer hover:bg-muted/50 group",
        priorityColors[notification.priority] || priorityColors.normal,
        isUnread ? "bg-primary/5" : "bg-transparent"
      )}
      onClick={handleClick}
    >
      <div className={cn(
        "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        notification.priority === 'urgent' ? "bg-destructive/10 text-destructive" :
        notification.priority === 'high' ? "bg-accent text-accent-foreground" :
        "bg-primary/10 text-primary"
      )}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate", isUnread ? "font-semibold" : "font-medium text-muted-foreground")}>
            {notification.title}
          </p>
          {notification.action_url && (
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded shrink-0"
        title="Descartar"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {isUnread && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary shrink-0 group-hover:hidden" />
      )}
    </div>
  );
};
