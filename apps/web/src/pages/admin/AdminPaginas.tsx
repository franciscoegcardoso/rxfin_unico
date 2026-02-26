import { PagesTab } from '@/components/admin/PagesTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminPaginas() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Páginas" description="Gerencie as páginas e simuladores da plataforma" />
      <PagesTab />
    </div>
  );
}
