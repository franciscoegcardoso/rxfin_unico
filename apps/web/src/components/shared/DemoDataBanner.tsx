import React from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useStartRaioX } from '@/hooks/useStartRaioX';
import { Button } from '@/components/ui/button';

/** Altura mínima do banner (sempre visível, não colapsável). */
export const DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX = 48;

/** @deprecated Banner não é mais colapsável; use DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX */
export const DEMO_BANNER_MINIMIZED_HEIGHT_PX = DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX;

interface DemoDataBannerProps {
  /** Quando true, banner fica no fluxo do documento no topo da área de conteúdo (não fixed). */
  inline?: boolean;
  /** Ref opcional para o wrapper (ex.: para spotlight). */
  innerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ inline = false, innerRef }) => {
  const { isDemoMode, isLoading } = useDemoMode();
  const { handleStartRaioX, isStartingOnboarding } = useStartRaioX();

  if (isLoading || !isDemoMode) return null;

  const basePlacement = inline
    ? 'relative z-40 w-full shrink-0'
    : 'fixed top-14 left-0 right-0 z-40 w-full';

  return (
    <div
      ref={innerRef}
      className={`${basePlacement} min-h-[48px] bg-destructive text-white flex items-center`}
    >
      <div className="w-full max-w-[1800px] mx-auto px-4 py-3 min-h-[48px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 text-white">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-semibold text-left text-white">
            <span className="hidden sm:inline">⚠️ Dados fictícios — Explore a ferramenta. </span>
            <span className="sm:hidden">⚠️ Dados fictícios — Explore a ferramenta</span>
            <span className="font-normal opacity-90 hidden md:inline ml-1">
              Complete o Raio-X para ver seus dados reais.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 min-w-0 ml-auto">
          <Button
            size="sm"
            variant="secondary"
            className="font-bold text-xs sm:text-sm gap-1.5 bg-background text-foreground hover:bg-background/90 shadow-md whitespace-nowrap ring-2 ring-white ring-offset-1 ring-offset-red-600 hover:scale-105 transition-transform btn-onboarding-cta"
            onClick={() => handleStartRaioX('banner')}
            disabled={isStartingOnboarding}
          >
            {isStartingOnboarding ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">COMEÇAR SEU RAIO-X FINANCEIRO AGORA!</span>
            <span className="sm:hidden">COMEÇAR RAIO-X!</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
