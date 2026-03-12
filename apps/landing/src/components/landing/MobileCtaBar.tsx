import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function MobileCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      setVisible(scrollY > 500 && scrollY + winH <= docH - 300);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
    >
      <a
        href="https://app.rxfin.com.br/signup"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
      >
        Criar conta gratuita
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="text-center text-[11px] text-muted-foreground mt-1.5">
        Grátis · Sem cartão · Leva menos de 1 minuto
      </p>
    </div>
  );
}
