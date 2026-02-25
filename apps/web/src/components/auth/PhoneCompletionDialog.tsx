import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput, extractPhoneDigits } from '@/components/ui/phone-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Loader2, AlertTriangle } from 'lucide-react';

interface PhoneCompletionDialogProps {
  open: boolean;
  onComplete: () => void;
  currentEmail?: string | null;
}

export const PhoneCompletionDialog: React.FC<PhoneCompletionDialogProps> = ({
  open,
  onComplete,
  currentEmail,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);

  const updatePhone = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const phoneDigits = extractPhoneDigits(phone);
      if (phoneDigits.length < 10) throw new Error('Número de telefone inválido');

      const { error } = await supabase
        .from('profiles')
        .update({ phone: phoneDigits })
        .eq('id', user.id);

      if (error) {
        // Check for unique constraint violation
        if (
          error.code === '23505' ||
          error.message?.includes('unique_phone_number') ||
          error.message?.includes('duplicate key')
        ) {
          throw new Error('PHONE_DUPLICATE');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-completion-check'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-full'] });
      toast.success('Telefone cadastrado com sucesso!');
      setDuplicateError(false);
      onComplete();
    },
    onError: (error: Error) => {
      if (error.message === 'PHONE_DUPLICATE') {
        setDuplicateError(true);
      } else if (error.message === 'Número de telefone inválido') {
        toast.error(error.message);
      } else {
        console.error('Error updating phone:', error);
        toast.error('Erro ao salvar telefone. Tente novamente.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(false);

    if (!phone.trim()) {
      toast.error('Por favor, preencha seu telefone');
      return;
    }

    updatePhone.mutate();
  };

  const handleLinkAccount = async () => {
    // Try to link identity using Supabase's built-in linking
    // This works when the user has multiple auth providers with the same email
    try {
      const provider = user?.app_metadata?.provider;
      
      if (provider === 'google') {
        const { error } = await supabase.auth.linkIdentity({ provider: 'google' });
        if (error) throw error;
      } else if (provider === 'facebook') {
        const { error } = await supabase.auth.linkIdentity({ provider: 'facebook' });
        if (error) throw error;
      } else {
        // For email provider, suggest the user log in with the original account
        toast.info(
          'Por favor, faça login com sua conta original (Google ou Facebook) associada a este telefone.',
          { duration: 6000 }
        );
        return;
      }

      toast.success('Contas vinculadas com sucesso!');
      onComplete();
    } catch (err) {
      console.error('Error linking identity:', err);
      toast.error(
        'Não foi possível vincular automaticamente. Por favor, entre em contato com o suporte.',
        { duration: 6000 }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Complete seu Cadastro
          </DialogTitle>
          <DialogDescription>
            Para continuar utilizando a plataforma, precisamos do seu número de telefone.
          </DialogDescription>
        </DialogHeader>

        {duplicateError && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>
                Este número já está em uso. Por favor, entre com sua conta original ou
                fale com o suporte.
              </p>
              {currentEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleLinkAccount}
                >
                  Vincular à minha conta existente
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone-completion">Telefone *</Label>
            <PhoneInput
              id="phone-completion"
              value={phone}
              onChange={(val) => {
                setPhone(val);
                setDuplicateError(false);
              }}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updatePhone.isPending}
          >
            {updatePhone.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar e Continuar'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
