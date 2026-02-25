import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, TestTube, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from './RichTextEditor';
import { CampaignPreview } from './CampaignPreview';
import { useAdminAudit } from '@/hooks/useAdminAudit';

// Celebration effect for successful campaign send
const triggerConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#22c55e', '#16a34a', '#15803d'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#22c55e', '#16a34a', '#15803d'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};

interface CampaignEditorProps {
  campaignId: string | null;
  onClose: () => void;
}

const SEGMENTS = [
  { value: 'all_users', label: 'Todos os Usuários' },
  { value: 'pro_users', label: 'Usuários Pro' },
  { value: 'free_users', label: 'Usuários Free' },
  { value: 'beta_users', label: 'Usuários Beta' },
  { value: 'inactive_users', label: 'Usuários Inativos (30+ dias)' },
];

export function CampaignEditor({ campaignId, onClose }: CampaignEditorProps) {
  const queryClient = useQueryClient();
  const { logAction } = useAdminAudit();
  const isEditing = !!campaignId;

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all_users');
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch existing campaign if editing
  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['email-campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  // Populate form when campaign loads
  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title || '');
      setSubject(campaign.subject || '');
      setBody(campaign.body || '');
      setSegment(campaign.segment || 'all_users');
    }
  }, [campaign]);

  // Save campaign mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (isEditing) {
        const { error } = await supabase
          .from('email_campaigns')
          .update({ title, subject, body, segment, updated_at: new Date().toISOString() })
          .eq('id', campaignId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_campaigns')
          .insert({
            created_by: user.id,
            name: title,
            title,
            subject,
            html_body: body,
            body,
            segment,
            status: 'draft',
            trigger_type: 'manual',
            days_after_trigger: 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-campaign', campaignId] });
      toast.success(isEditing ? 'Campanha atualizada!' : 'Rascunho salvo!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar campanha');
      console.error(error);
    },
  });

  // Send test email
  const handleSendTest = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Preencha o assunto e o corpo do e-mail');
      return;
    }

    setIsTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          type: 'test',
          email: user.email,
          subject,
          body,
        },
      });

      if (error) throw error;
      toast.success(`E-mail de teste enviado para ${user.email}`);
    } catch (error) {
      console.error('Test email error:', error);
      toast.error('Erro ao enviar e-mail de teste');
    } finally {
      setIsTesting(false);
    }
  };

  // Send campaign to all
  const handleSendCampaign = async () => {
    if (!title.trim() || !subject.trim() || !body.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSending(true);
    try {
      // First save the campaign
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let currentCampaignId = campaignId;

      if (!currentCampaignId) {
        // Create new campaign
        const { data: newCampaign, error: createError } = await supabase
          .from('email_campaigns')
          .insert({
            created_by: user.id,
            name: title,
            title,
            subject,
            html_body: body,
            body,
            segment,
            status: 'processing',
            trigger_type: 'manual',
            days_after_trigger: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentCampaignId = newCampaign.id;
      } else {
        // Update existing campaign
        const { error: updateError } = await supabase
          .from('email_campaigns')
          .update({ title, subject, body, segment, status: 'processing' })
          .eq('id', campaignId);

        if (updateError) throw updateError;
      }

      // Trigger the send function
      const { data, error } = await supabase.functions.invoke('send-campaign-email', {
        body: {
          type: 'campaign',
          campaignId: currentCampaignId,
          segment,
          subject,
          body,
        },
      });

      if (error) throw error;

      // Celebrate success with confetti!
      triggerConfetti();

      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-campaign-stats'] });
      
      const totalSent = data?.totalSent || 0;
      toast.success(`🎉 Campanha enviada para ${totalSent} destinatários!`);
      
      logAction('SEND_CAMPAIGN', 'email_campaigns', currentCampaignId, { segment, title, totalSent });
      
      // Small delay to let user see the confetti before closing
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Send campaign error:', error);
      toast.error('Erro ao enviar campanha. Verifique os logs.');
    } finally {
      setIsSending(false);
      setConfirmSendOpen(false);
    }
  };

  const isFormValid = title.trim() && subject.trim() && body.trim();

  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie e envie e-mails para seus usuários
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={!body.trim()}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !isFormValid}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={isTesting || !subject.trim() || !body.trim()}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            Enviar Teste
          </Button>
          <Button
            onClick={() => setConfirmSendOpen(true)}
            disabled={!isFormValid || isSending}
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Campanha
          </Button>
        </div>
      </div>

      {/* Editor Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes da Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Campanha *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Newsletter de Janeiro"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Usado apenas para identificação interna
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do E-mail *</Label>
                <Input
                  id="subject"
                  placeholder="Ex: 🎉 Novidades do RXFin para você!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Corpo do E-mail *</Label>
                <RichTextEditor
                  content={body}
                  onChange={setBody}
                  placeholder="Escreva o conteúdo do seu e-mail..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Segmento de Usuários</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((seg) => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Escolha quem receberá este e-mail
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <TestTube className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dica</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sempre envie um e-mail de teste para si mesmo antes de disparar para todos os usuários.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da campanha?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a enviar esta campanha para{' '}
                <strong>{SEGMENTS.find((s) => s.value === segment)?.label}</strong>.
              </p>
              <p className="text-amber-600 font-medium">
                ⚠️ Esta ação não pode ser desfeita. Os e-mails serão enviados imediatamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendCampaign}
              disabled={isSending}
              className="gap-2 min-w-[140px]"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Sim, Enviar Agora
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CampaignPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        subject={subject}
        segment={segment}
        body={body}
      />
    </div>
  );
}
