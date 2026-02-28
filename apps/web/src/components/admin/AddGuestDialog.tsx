import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';

const emailSchema = z.string().email('Email inválido').max(255);

interface AddGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  principalUserId: string;
  principalUserName: string;
  currentGuestCount: number;
}

export function AddGuestDialog({
  open,
  onOpenChange,
  principalUserId,
  principalUserName,
  currentGuestCount,
}: AddGuestDialogProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const { deferInviteGuest } = useAdminDeferredMutations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }

    deferInviteGuest(email.toLowerCase().trim(), principalUserName);
    toast.info('Convite adicionado para revisão');
    setEmail('');
    onOpenChange(false);
  };

  const remainingSlots = 3 - currentGuestCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Convidado
          </DialogTitle>
          <DialogDescription>
            Convidar um usuário para compartilhar a conta de {principalUserName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {remainingSlots > 0 ? (
            <>
              <Alert className="bg-muted/50">
                <AlertDescription className="text-sm">
                  <span className="font-medium">{remainingSlots}</span> vaga{remainingSlots > 1 ? 's' : ''} disponível{remainingSlots > 1 ? 'is' : ''} de 3
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="guest-email">Email do Convidado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    className="pl-9"
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {emailError}
                  </p>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Se o email já existir, o usuário será vinculado
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Se for novo, ele receberá um convite para criar conta
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Convidado ficará pendente até primeiro acesso
                </p>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Limite de 3 convidados atingido. Remova um convidado para adicionar outro.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={remainingSlots <= 0 || !email}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
