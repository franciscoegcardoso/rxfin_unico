import React, { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SendNotificationForm } from './SendNotificationForm';
import { NotificationsHistory } from './NotificationsHistory';
import { NotificationTemplatesManager } from './NotificationTemplatesManager';
import { useAdminPendingChanges } from '@/contexts/AdminPendingChangesContext';
import { toast } from 'sonner';

export const NotificationsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('send');
  const { hasChanges } = useAdminPendingChanges();

  const handleTabChange = (value: string) => {
    if (hasChanges) {
      toast.warning('Salve ou descarte as alterações pendentes antes de trocar de aba.');
      return;
    }
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
...
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Enviar Notificação
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates Automáticos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6 space-y-6">
          <SendNotificationForm />
          <NotificationsHistory />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <NotificationTemplatesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
