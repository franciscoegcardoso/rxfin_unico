import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Edit, Trash2, Copy, Send, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { CampaignPreview } from './CampaignPreview';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';

interface Campaign {
  id: string;
  title: string;
  subject: string;
  segment: string;
  status: string;
  total_recipients: number;
  opens: number;
  clicks: number;
  created_at: string;
  sent_at: string | null;
  body: string | null;
  html_body: string;
}

interface CampaignsListProps {
  onEditCampaign: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendado', variant: 'outline' },
  processing: { label: 'Processando', variant: 'default' },
  sent: { label: 'Enviado', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const segmentLabels: Record<string, string> = {
  all_users: 'Todos os Usuários',
  beta_users: 'Usuários Beta',
  inactive_users: 'Usuários Inativos',
  pro_users: 'Usuários Pro',
  free_users: 'Usuários Free',
};

export function CampaignsList({ onEditCampaign }: CampaignsListProps) {
  const { deferDeleteCampaign, deferDuplicateCampaign } = useAdminDeferredMutations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });

  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      deferDeleteCampaign(campaignToDelete.id, campaignToDelete.title);
      toast.info('Exclusão adicionada para revisão');
    }
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };

  const handleDuplicate = (campaign: Campaign) => {
    deferDuplicateCampaign(campaign);
    toast.info('Duplicação adicionada para revisão');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!campaigns?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma campanha criada ainda.</p>
        <p className="text-sm">Clique em "Nova Campanha" para começar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Enviados</TableHead>
              <TableHead className="text-right">Aberturas</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const config = statusConfig[campaign.status] || statusConfig.draft;
              return (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {campaign.subject}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {segmentLabels[campaign.segment] || campaign.segment}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {campaign.total_recipients}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {campaign.opens}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.sent_at
                      ? format(new Date(campaign.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                      : format(new Date(campaign.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewCampaign(campaign)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditCampaign(campaign.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(campaign)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewCampaign && (
        <CampaignPreview
          open={!!previewCampaign}
          onOpenChange={(open) => !open && setPreviewCampaign(null)}
          title={previewCampaign.title}
          subject={previewCampaign.subject}
          segment={previewCampaign.segment}
          body={previewCampaign.body || previewCampaign.html_body}
        />
      )}
    </>
  );
}
