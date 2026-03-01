import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCheck, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { NotificationDetailDialog } from './NotificationDetailDialog';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onDismiss, onClose,
}) => {
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const handleNavigate = (url: string) => {
    onClose();
    navigate(url);
  };

  const handleOpenDetail = (notification: Notification) => {
    if (!notification.is_read) onMarkAsRead(notification.id);
    setSelectedNotification(notification);
  };

  return (
    <>
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[380px]">
            <div className="divide-y">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={onMarkAsRead}
                  onDismiss={onDismiss}
                  onNavigate={handleNavigate}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        {/* Ver todas */}
        <div className="border-t px-4 py-2">
          <Link
            to="/notificacoes"
            onClick={() => onClose()}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <NotificationDetailDialog
        notification={selectedNotification}
        open={!!selectedNotification}
        onOpenChange={(open) => { if (!open) setSelectedNotification(null); }}
        onNavigate={handleNavigate}
      />
    </>
  );
};
