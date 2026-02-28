import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Mail, MousePointerClick, Eye, UserMinus, Settings, FileText, MailCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignsList } from './CampaignsList';
import { CampaignEditor } from './CampaignEditor';
import { EmailSettingsCard } from './EmailSettingsCard';
import { EmailTemplatesList } from './EmailTemplatesList';
import { EmailLogsTab } from './EmailLogsTab';

interface DashboardStats {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  totalUnsubscribes: number;
  openRate: number;
  clickRate: number;
}

export function EmailCampaignsDashboard() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Fetch campaign stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['email-campaign-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('email_campaigns')
        .select('total_recipients, opens, clicks')
        .eq('status', 'sent');

      if (campaignsError) throw campaignsError;

      const { count: unsubscribeCount, error: unsubError } = await supabase
        .from('email_unsubscribes')
        .select('*', { count: 'exact', head: true });

      if (unsubError) throw unsubError;

      const totalSent = campaigns?.reduce((sum, c) => sum + (c.total_recipients || 0), 0) || 0;
      const totalOpens = campaigns?.reduce((sum, c) => sum + (c.opens || 0), 0) || 0;
      const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
      
      return {
        totalSent,
        totalOpens,
        totalClicks,
        totalUnsubscribes: unsubscribeCount || 0,
        openRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
      };
    },
  });

  const handleEditCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setIsEditorOpen(true);
  };

  const handleNewCampaign = () => {
    setSelectedCampaignId(null);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedCampaignId(null);
  };

  const statCards = [
    {
      title: 'E-mails Enviados',
      value: stats?.totalSent || 0,
      icon: Mail,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Taxa de Abertura',
      value: `${(stats?.openRate || 0).toFixed(1)}%`,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Taxa de Cliques',
      value: `${(stats?.clickRate || 0).toFixed(1)}%`,
      icon: MousePointerClick,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Descadastros',
      value: stats?.totalUnsubscribes || 0,
      icon: UserMinus,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  if (isEditorOpen) {
    return (
      <CampaignEditor
        campaignId={selectedCampaignId}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <Tabs defaultValue="logs" className="space-y-6">
      <TabsList>
        <TabsTrigger value="logs" className="gap-2">
          <MailCheck className="h-4 w-4" />
          Enviados
        </TabsTrigger>
        <TabsTrigger value="templates" className="gap-2">
          <FileText className="h-4 w-4" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="campaigns" className="gap-2">
          <Mail className="h-4 w-4" />
          Campanhas
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="logs" className="mt-0">
        <EmailLogsTab />
      </TabsContent>

      <TabsContent value="templates" className="mt-0">
        <EmailTemplatesList />
      </TabsContent>

      <TabsContent value="campaigns" className="space-y-6 mt-0">
        {/* Header with button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Campanhas</h3>
          <Button onClick={handleNewCampaign} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`h-8 w-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${statsLoading ? 'animate-pulse' : ''}`}>
                    {statsLoading ? '...' : card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Campaigns List */}
        <CampaignsList onEditCampaign={handleEditCampaign} />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <EmailSettingsCard />
      </TabsContent>
    </Tabs>
  );
}
