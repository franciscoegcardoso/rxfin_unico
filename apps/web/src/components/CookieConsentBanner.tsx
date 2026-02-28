import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserKV } from '@/hooks/useUserKV';

type ConsentStatus = 'accepted' | 'rejected' | null;

export const CookieConsentBanner: React.FC = () => {
  const { value: consentStatus, setValue: setConsentStatus, isLoading } = useUserKV<ConsentStatus>('rxfin_cookie_consent', null);
  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!consentStatus) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [consentStatus, isLoading]);

  const handleAccept = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      setConsentStatus('accepted');
      setVisible(false);
    }, 300);
  };

  const handleReject = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      setConsentStatus('rejected');
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[100] p-4 transition-all duration-300',
        animatingOut ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      )}
    >
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="h-4.5 w-4.5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              Utilizamos cookies
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este site utiliza cookies para melhorar sua experiência de navegação, 
              personalizar conteúdo e analisar o tráfego. Ao clicar em "Aceitar", 
              você consente com o uso de cookies.{' '}
              <Link
                to="/politica-cookies"
                className="text-primary hover:underline font-medium"
              >
                Saiba mais
              </Link>
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleAccept} className="h-8 text-xs px-4">
                Aceitar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="h-8 text-xs px-4"
              >
                Recusar
              </Button>
            </div>
          </div>

          <button
            onClick={handleReject}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
