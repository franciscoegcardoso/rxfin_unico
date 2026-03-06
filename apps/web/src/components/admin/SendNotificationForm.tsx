import React, { useState } from 'react';
import { Send, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const SendNotificationForm: React.FC = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [actionUrl, setActionUrl] = useState('');
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    setSending(true);
    try {
      const targetEmails = targetMode === 'specific'
        ? emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
        : null;

      if (targetMode === 'specific' && (!targetEmails || targetEmails.length === 0)) {
        toast.error('Informe pelo menos um e-mail');
        setSending(false);
        return;
      }

      const { data, error } = await supabase.rpc('admin_send_notification', {
        p_title: title.trim(),
        p_message: message.trim(),
        p_type: 'admin',
        p_priority: priority,
        p_action_url: actionUrl.trim() || null,
        p_target_emails: targetEmails,
      });

      if (error) throw error;

      const sent = (data as any)?.sent ?? 0;
      toast.success(`Notificação enviada para ${sent} ${sent === 1 ? 'destinatário' : 'destinatários'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-history'] });
      
      // Reset form
      setTitle('');
      setMessage('');
      setPriority('normal');
      setActionUrl('');
      setEmails('');
      setTargetMode('all');
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          Enviar Notificação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Título</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título da notificação"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="notif-priority" aria-label="Prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-message">Mensagem</Label>
            <Textarea
              id="notif-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Corpo da notificação..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-action-url">Link de destino (opcional)</Label>
            <Input
              id="notif-action-url"
              value={actionUrl}
              onChange={e => setActionUrl(e.target.value)}
              placeholder="/planos ou https://..."
            />
          </div>

          <div className="space-y-3">
            <Label>Destinatários</Label>
            <RadioGroup value={targetMode} onValueChange={(v) => setTargetMode(v as 'all' | 'specific')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="target-all" />
                <Label htmlFor="target-all" className="flex items-center gap-1.5 font-normal cursor-pointer">
                  <Users className="h-3.5 w-3.5" />
                  Todos os usuários
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="specific" id="target-specific" />
                <Label htmlFor="target-specific" className="flex items-center gap-1.5 font-normal cursor-pointer">
                  <UserCheck className="h-3.5 w-3.5" />
                  Usuários específicos
                </Label>
              </div>
            </RadioGroup>

            {targetMode === 'specific' && (
              <Textarea
                value={emails}
                onChange={e => setEmails(e.target.value)}
                placeholder="Cole os e-mails (um por linha)"
                rows={4}
              />
            )}
          </div>

          <Button type="submit" disabled={sending} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
