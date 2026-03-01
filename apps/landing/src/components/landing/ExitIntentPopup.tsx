import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/tracking';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'rxfin_exit_popup_shown';
const LEAD_EMAIL_KEY = 'rxfin_lead_email';

export const ExitIntentPopup: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const isFormValid = EMAIL_REGEX.test(email.trim()) && phoneValid;

  const showPopup = useCallback(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (sessionStorage.getItem(LEAD_EMAIL_KEY)) return;
    setOpen(true);
  }, [enabled]);

  useEffect(() => {
    (supabase.from('app_settings') as any)
      .select('setting_value')
      .eq('setting_key', 'landing_exit_popup_enabled')
      .single()
      .then(({ data }: any) => {
        if (data) setEnabled(data.setting_value === true || data.setting_value === 'true');
      });
  }, []);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) showPopup();
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    const timer = setTimeout(() => {
      if (!/Mobi|Android/i.test(navigator.userAgent)) return;
      showPopup();
    }, 30000);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [showPopup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await (supabase.from('leads') as any).upsert(
        { email: email.trim(), phone: phone.trim() || null, source: 'exit_intent', user_agent: navigator.userAgent },
        { onConflict: 'email' }
      );
      sessionStorage.setItem(LEAD_EMAIL_KEY, email.trim());
      trackEvent('lead_captured', { source: 'exit_intent' });
      toast.success('Obrigado! Você receberá novidades em primeira mão.');
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { sessionStorage.setItem(STORAGE_KEY, 'true'); } setOpen(isOpen); }}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Seu Raio-X ainda está incompleto
          </DialogTitle>
          <DialogDescription>
            Custo de Oportunidade do Carro, Comparativo FIPE, Custo da Sua Hora — avise-me quando abrir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="exit-email">Seu melhor email</Label>
            <Input
              id="exit-email"
              type="email"
              placeholder="seuemail@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit-phone">Seu telefone</Label>
            <PhoneInput
              id="exit-phone"
              value={phone}
              onChange={(fullPhone, isValid) => {
                setPhone(fullPhone);
                setPhoneValid(isValid);
              }}
            />
          </div>
          <Button type="submit" className="w-full gradient-primary text-white" disabled={loading || !isFormValid}>
            {loading ? 'Enviando...' : 'Quero Receber'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Sem spam. Você pode cancelar a qualquer momento.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
