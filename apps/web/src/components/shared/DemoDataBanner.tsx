import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronUp, Sparkles } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useOnboardingCheckpoint } from '@/hooks/useOnboardingCheckpoint';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'demo-banner-minimized';

/** Altura fixa do banner minimizado (px) — usada para compensar o conteúdo quando inline. */
export const DEMO_BANNER_MINIMIZED_HEIGHT_PX = 32;

/** Altura mínima do banner expandido (px) — para reservar espaço quando inline. */
export const DEMO_BANNER_EXPANDED_MIN_HEIGHT_PX = 48;

interface DemoDataBannerProps {
  /** Quando true, banner fica no fluxo do documento no topo da área de conteúdo (não fixed). O conteúdo é deslocado para baixo exatamente pela altura do banner. */
  inline?: boolean;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ inline = false }) => {
  const { isDemoMode, isLoading } = useDemoMode();
  // Padrão: minimizada para não sobrepor o conteúdo; só expande se o usuário já tiver clicado para expandir
  const [minimized, setMinimized] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) !== 'false'; } catch { return true; }
  });

  const navigate = useNavigate();
  const { currentPhase, advancePhase } = useOnboardingCheckpoint();

  const handleRaioXClick = () => {
    // Navega imediatamente para o usuário não ficar preso se RPC falhar ou travar
    navigate('/onboarding-raio-x');
    if (currentPhase === 'not_started') {
      advancePhase('started').catch(() => {});
    }
  };

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, String(minimized)); } catch {}
  }, [minimized]);

  if (isLoading || !isDemoMode) return null;

  const basePlacement = inline
    ? 'relative z-40 w-full shrink-0'
    : 'fixed top-14 left-0 right-0 z-40 w-full';

  if (minimized) {
    return (
      <div
        className={`${basePlacement} h-8 bg-destructive/90 backdrop-blur-sm flex items-center justify-center cursor-pointer gap-2 text-white text-xs font-medium px-4 md:px-6 lg:px-8`}
        onClick={() => setMinimized(false)}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>DADOS FICTÍCIOS</span>
        <span className="mx-1">•</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleRaioXClick(); }}
          className="underline font-bold hover:opacity-80"
        >
          COMEÇAR RAIO-X →
        </button>
      </div>
    );
  }

  return (
    <div className={`${basePlacement} min-h-[48px] bg-destructive text-white flex items-center`}>
      <div className="max-w-[1800px] mx-auto px-4 py-3 w-full min-h-[48px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 text-white">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium text-left text-white">
            <span className="hidden sm:inline">Estes são dados fictícios para você conhecer a ferramenta. </span>
            <span className="sm:hidden">Dados fictícios — </span>
            <span className="font-normal opacity-90 hidden md:inline">
              Complete o Raio-X para ver seus dados reais.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 min-w-0 ml-auto">
          <Button
            size="sm"
            variant="secondary"
            className="font-bold text-xs sm:text-sm gap-1.5 bg-background text-foreground hover:bg-background/90 shadow-md whitespace-nowrap"
            onClick={handleRaioXClick}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">COMEÇAR SEU RAIO-X FINANCEIRO AGORA!</span>
            <span className="sm:hidden">COMEÇAR RAIO-X!</span>
          </Button>
          <button
            onClick={() => setMinimized(true)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Minimizar banner"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
