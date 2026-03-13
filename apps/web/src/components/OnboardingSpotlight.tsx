import React, { useEffect, useState } from 'react';

export interface OnboardingSpotlightProps {
  targetRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  isMobile: boolean;
}

const MESSAGE_MOBILE = "Aperte em 'COMEÇAR RAIO-X' para iniciar a sua jornada no RXFin!";
const MESSAGE_DESKTOP = "Clique em 'COMEÇAR SEU RAIO-X FINANCEIRO agora' para iniciar a sua jornada no RXFin!";

export const OnboardingSpotlight: React.FC<OnboardingSpotlightProps> = ({
  targetRef,
  onDismiss,
  isMobile,
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetRef?.current) return;
    const el = targetRef.current;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
    };
  }, [targetRef]);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!rect) return null;

  const padding = 4;
  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - padding,
    left: rect.left,
    width: rect.width,
    height: rect.height + padding * 2,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
    borderRadius: 4,
    zIndex: 9998,
    pointerEvents: 'none',
  };

  const message = isMobile ? MESSAGE_MOBILE : MESSAGE_DESKTOP;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[9997] bg-black/40"
        style={{ pointerEvents: 'auto' }}
        onClick={onDismiss}
        onKeyDown={(e) => e.key === 'Escape' && onDismiss()}
        aria-hidden
      />
      <div style={spotlightStyle} aria-hidden />
      <div
        role="dialog"
        aria-live="polite"
        className="fixed left-1/2 z-[9999] -translate-x-1/2 bg-background rounded-xl p-4 shadow-2xl max-w-xs text-center border border-border"
        style={{ top: rect.bottom + 12 }}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          ×
        </button>
        <div className="text-2xl mb-2 animate-bounce" aria-hidden>☝️</div>
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </>
  );
};
