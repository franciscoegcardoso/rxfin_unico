import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, CheckCircle, XCircle, Clock, Eye, MousePointerClick, RefreshCw, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailLog {
  id: string;
  email: string;
  type: 'campaign' | 'verification';
  subject?: string;
  status: string;
  sent_at: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  verified_at?: string | null;
  campaign_title?: string;
}

interface VerificationToken {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  attempts: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  sent: { label: 'Enviado', variant: 'outline', icon: Mail },
  delivered: { label: 'Entregue', variant: 'default', icon: CheckCircle },
  opened: { label: 'Aberto', variant: 'default', icon: Eye },
  clicked: { label: 'Clicado', variant: 'default', icon: MousePointerClick },
  bounced: { label: 'Rejeitado', variant: 'destructive', icon: XCircle },
  failed: { label: 'Falhou', variant: 'destructive', icon: XCircle },
  verified: { label: 'Confirmado', variant: 'default', icon: CheckCircle },
  expired: { label: 'Expirado', variant: 'destructive', icon: Clock },
};

export function EmailLogsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch campaign recipients
  const { data: campaignRecipients, isLoading: campaignLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ['email-logs-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaign_recipients')
        .select(`
          id,
          email,
          status,
          sent_at,
          delivered_at,
          opened_at,
          clicked_at,
          bounced_at,
          error_message,
          campaign_id,
          email_campaigns (
            title,
            subject
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  // Fetch verification emails
  const { data: verificationTokens, isLoading: verificationLoading, refetch: refetchVerifications } = useQuery({
    queryKey: ['email-logs-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as VerificationToken[];
    },
  });

  // Combine and transform data
  const allLogs: EmailLog[] = [
    ...(campaignRecipients?.map((r) => ({
      id: r.id,
      email: r.email,
      type: 'campaign' as const,
      subject: (r.email_campaigns as any)?.subject,
      campaign_title: (r.email_campaigns as any)?.title,
      status: r.clicked_at ? 'clicked' : r.opened_at ? 'opened' : r.delivered_at ? 'delivered' : r.bounced_at ? 'bounced' : r.sent_at ? 'sent' : 'pending',
      sent_at: r.sent_at,
      delivered_at: r.delivered_at,
      opened_at: r.opened_at,
      clicked_at: r.clicked_at,
    })) || []),
    ...(verificationTokens?.map((t) => ({
      id: t.id,
      email: t.email,
      type: 'verification' as const,
      subject: 'Confirmação de E-mail',
      status: t.used_at ? 'verified' : new Date(t.expires_at) < new Date() ? 'expired' : 'sent',
      sent_at: t.created_at,
      verified_at: t.used_at,
    })) || []),
  ].sort((a, b) => {
    const dateA = new Date(a.sent_at || 0);
    const dateB = new Date(b.sent_at || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Filter logs
  const filteredLogs = allLogs.filter((log) => {
    const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.campaign_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'campaigns' && log.type === 'campaign') ||
      (activeTab === 'verifications' && log.type === 'verification');

    return matchesSearch && matchesStatus && matchesTab;
  });

  // Stats
  const stats = {
    total: allLogs.length,
    sent: allLogs.filter(l => l.sent_at).length,
    delivered: allLogs.filter(l => l.status === 'delivered' || l.status === 'opened' || l.status === 'clicked').length,
    opened: allLogs.filter(l => l.status === 'opened' || l.status === 'clicked').length,
    verified: allLogs.filter(l => l.status === 'verified').length,
    failed: allLogs.filter(l => l.status === 'bounced' || l.status === 'failed' || l.status === 'expired').length,
  };

  const isLoading = campaignLoading || verificationLoading;

  const handleRefresh = () => {
    refetchCampaigns();
    refetchVerifications();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{isLoading ? '...' : stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{isLoading ? '...' : stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{isLoading ? '...' : stats.opened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{isLoading ? '...' : stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{isLoading ? '...' : stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por e-mail, assunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="opened">Aberto</SelectItem>
            <SelectItem value="clicked">Clicado</SelectItem>
            <SelectItem value="verified">Confirmado</SelectItem>
            <SelectItem value="bounced">Rejeitado</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos ({allLogs.length})</TabsTrigger>
          <TabsTrigger value="campaigns">
            Campanhas ({allLogs.filter(l => l.type === 'campaign').length})
          </TabsTrigger>
          <TabsTrigger value="verifications">
            Confirmações ({allLogs.filter(l => l.type === 'verification').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum e-mail encontrado.</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const config = statusConfig[log.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={`${log.type}-${log.id}`}>
                        <TableCell>
                          <span className="font-medium">{log.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.type === 'campaign' ? 'Campanha' : 'Confirmação'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {log.campaign_title && (
                              <span className="text-xs text-muted-foreground block">
                                {log.campaign_title}
                              </span>
                            )}
                            <span>{log.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.sent_at
                            ? format(new Date(log.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 text-xs text-muted-foreground">
                            {log.opened_at && (
                              <span title={`Aberto em ${format(new Date(log.opened_at), "dd/MM HH:mm")}`}>
                                <Eye className="h-4 w-4 text-amber-500" />
                              </span>
                            )}
                            {log.clicked_at && (
                              <span title={`Clicado em ${format(new Date(log.clicked_at), "dd/MM HH:mm")}`}>
                                <MousePointerClick className="h-4 w-4 text-green-500" />
                              </span>
                            )}
                            {log.verified_at && (
                              <span title={`Confirmado em ${format(new Date(log.verified_at), "dd/MM HH:mm")}`}>
                                <CheckCircle className="h-4 w-4 text-primary" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
