import { RollbacksTab } from '@/components/admin/RollbacksTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminRollbacks() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Rollbacks" description="Gerencie reversões de migrações" />
      <RollbacksTab />
    </div>
  );
}
