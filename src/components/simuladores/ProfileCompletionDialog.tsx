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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput, extractPhoneDigits } from '@/components/ui/phone-input';
import { User, Loader2 } from 'lucide-react';

interface ProfileCompletionDialogProps {
  open: boolean;
  onComplete: () => void;
  currentName?: string | null;
  currentPhone?: string | null;
}

export const ProfileCompletionDialog: React.FC<ProfileCompletionDialogProps> = ({
  open,
  onComplete,
  currentName,
  currentPhone,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(currentName || '');
  const [phone, setPhone] = useState(currentPhone || '');

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Store only digits in database
      const phoneDigits = extractPhoneDigits(phone);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim(),
          phone: phoneDigits,
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-full'] });
      toast.success('Perfil atualizado com sucesso!');
      onComplete();
    },
    onError: (error: Error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Por favor, preencha seu nome completo');
      return;
    }
    
    if (!phone.trim()) {
      toast.error('Por favor, preencha seu telefone');
      return;
    }
    
    updateProfile.mutate();
  };


  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Complete seu Perfil
          </DialogTitle>
          <DialogDescription>
            Para utilizar os simuladores, precisamos de algumas informações básicas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={setPhone}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Continuar para o Simulador'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
