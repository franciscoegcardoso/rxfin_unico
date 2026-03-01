import { DeployTab } from '@/components/admin/DeployTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminDeploy() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Deploy" description="Histórico de deploys e publicações" />
      <DeployTab />
    </div>
  );
}
