import { NotificationsTab } from '@/components/admin/NotificationsTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminNotificacoes() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Notificações" description="Configure notificações e alertas do sistema" />
      <NotificationsTab />
    </div>
  );
}
