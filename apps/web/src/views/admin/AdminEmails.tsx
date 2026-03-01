import { EmailCampaignsTab } from '@/components/admin/EmailCampaignsTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminEmails() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="E-mails" description="Campanhas e automações de e-mail" />
      <EmailCampaignsTab />
    </div>
  );
}
