import { LegalDocumentsTab } from '@/components/admin/LegalDocumentsTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminTermos() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Termos" description="Gerencie documentos legais e políticas" />
      <LegalDocumentsTab />
    </div>
  );
}
