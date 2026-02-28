import { PlansTab } from '@/components/admin/PlansTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminPlanos() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Planos" description="Gerencie os planos de assinatura da plataforma" />
      <PlansTab />
    </div>
  );
}
