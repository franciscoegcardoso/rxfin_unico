import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/tracking';
import { toast } from 'sonner';
import { ArrowRight, SkipForward } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_EMAIL_KEY = 'rxfin_lead_email';

interface LeadGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulatorName: string;
  onContinue: () => void;
}

export const LeadGateDialog: React.FC<LeadGateDialogProps> = ({
  open, onOpenChange, simulatorName, onContinue
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid = EMAIL_REGEX.test(email.trim()) && phoneValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const source = `simulator_gate_${simulatorName.toLowerCase().replace(/\s+/g, '_')}`;
      await (supabase.from('leads') as any).upsert(
        { email: email.trim(), phone: phone.trim() || null, source, user_agent: navigator.userAgent },
        { onConflict: 'email' }
      );
      sessionStorage.setItem(LEAD_EMAIL_KEY, email.trim());
      trackEvent('lead_captured', { source });
      toast.success('Dados salvos! Redirecionando...');
    } catch {
      // Continue even on error
    } finally {
      setLoading(false);
      onOpenChange(false);
      onContinue();
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Onde enviamos sua análise?</DialogTitle>
          <DialogDescription>
            Deixe seus dados para receber a análise completa do <strong>{simulatorName}</strong> e ser avisado dos próximos simuladores.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="gate-email">Seu email</Label>
            <Input
              id="gate-email"
              type="email"
              placeholder="seuemail@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gate-phone">Seu telefone</Label>
            <PhoneInput
              id="gate-phone"
              value={phone}
              onChange={(fullPhone, isValid) => {
                setPhone(fullPhone);
                setPhoneValid(isValid);
              }}
            />
          </div>
          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading || !isFormValid}>
            {loading ? 'Enviando...' : 'Enviar e Continuar'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleSkip}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Continuar sem receber minha análise por email
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
