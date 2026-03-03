import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  onNavigate,
}) => {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notificações</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="px-4 py-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[320px]">
          <div className="divide-y">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={onMarkAsRead}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      <div className="border-t px-4 py-2.5">
        <Link
          to="/notificacoes"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Ver todas as notificações
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
