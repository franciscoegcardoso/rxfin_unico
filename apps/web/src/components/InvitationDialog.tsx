import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, Loader2, Mail, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  name: string;
  role: 'shared_user' | 'driver';
  metadata?: {
    vehicleIds?: string[];
    vehicleNames?: string[];
    defaultIncomeIds?: string[];
  };
  inviterName: string;
}

export const InvitationDialog: React.FC<InvitationDialogProps> = ({
  open,
  onOpenChange,
  email,
  name,
  role,
  metadata,
  inviterName,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendInvite = async () => {
    if (!email || !user) {
      toast.error('Email é obrigatório para enviar convite');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          role,
          invitedByName: inviterName,
          metadata,
        },
      });

      if (error) throw error;

      setInviteLink(data.invitation.inviteLink);
      setEmailSent(true);
      toast.success('Convite enviado por email!');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Erro ao enviar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleWhatsApp = () => {
    if (!inviteLink) return;
    
    const roleText = role === 'shared_user' 
      ? 'compartilhar suas finanças' 
      : 'gerenciar veículos';
    
    const message = encodeURIComponent(
      `Olá ${name}! ${inviterName} convidou você para ${roleText}. Clique no link para aceitar: ${inviteLink}`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const roleDescription = role === 'shared_user'
    ? 'compartilhar finanças'
    : 'gerenciar veículos';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convidar {name}
          </DialogTitle>
          <DialogDescription>
            Envie um convite para {roleDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!inviteLink ? (
            <>
              <div className="space-y-2">
                <Label>Email do convidado</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>

              <Button 
                onClick={handleSendInvite} 
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Convite por Email
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {emailSent && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="text-sm">Email enviado com sucesso!</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Link de Convite</Label>
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink} 
                    readOnly 
                    className="bg-muted text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleWhatsApp}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar por WhatsApp
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.open(inviteLink, '_blank', 'noopener,noreferrer')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Link
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                O convite expira em 7 dias
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
