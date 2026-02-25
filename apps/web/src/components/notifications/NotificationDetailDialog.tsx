import React from 'react';
import { Bell, CreditCard, AlertTriangle, Megaphone, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/hooks/useNotifications';

const typeIcons: Record<string, React.ElementType> = {
  admin: Megaphone,
  system: Bell,
  payment: CreditCard,
  expiration: AlertTriangle,
};

const typeLabels: Record<string, string> = {
  admin: 'Administração',
  system: 'Sistema',
  payment: 'Pagamento',
  expiration: 'Vencimento',
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
  high: { label: 'Alta', className: 'bg-amber-500/10 text-amber-600' },
  urgent: { label: 'Urgente', className: 'bg-destructive/10 text-destructive' },
};

interface NotificationDetailDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (url: string) => void;
}

export const NotificationDetailDialog: React.FC<NotificationDetailDialogProps> = ({
  notification, open, onOpenChange, onNavigate,
}) => {
  if (!notification) return null;

  const Icon = typeIcons[notification.type] || Bell;
  const priority = priorityConfig[notification.priority] || priorityConfig.normal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={priority.className}>
                {priority.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {typeLabels[notification.type] || notification.type}
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-base">{notification.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {notification.message}
          </p>

          <p className="text-xs text-muted-foreground/60">
            {format(new Date(notification.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>

          {notification.action_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                onNavigate?.(notification.action_url!);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
