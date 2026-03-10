import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronUp, Sparkles } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'demo-banner-minimized';

export const DemoDataBanner: React.FC = () => {
  const { isDemoMode, isLoading } = useDemoMode();
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, String(minimized)); } catch {}
  }, [minimized]);

  if (isLoading || !isDemoMode) return null;

  if (minimized) {
    return (
      <div
        className="sticky top-0 z-50 w-full h-8 bg-destructive/90 backdrop-blur-sm flex items-center justify-center cursor-pointer gap-2 text-destructive-foreground text-xs font-medium"
        onClick={() => setMinimized(false)}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>DADOS FICTÍCIOS</span>
        <span className="mx-1">•</span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/onboarding'); }}
          className="underline font-bold hover:opacity-80"
        >
          COMEÇAR RAIO-X →
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-destructive text-destructive-foreground">
      <div className="max-w-[1800px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium truncate">
            <span className="hidden sm:inline">Estes são dados fictícios para você conhecer a ferramenta. </span>
            <span className="sm:hidden">Dados fictícios — </span>
            <span className="font-normal opacity-90 hidden md:inline">
              Complete o Raio-X para ver seus dados reais.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="font-bold text-xs sm:text-sm gap-1.5 bg-background text-foreground hover:bg-background/90 shadow-md"
            onClick={() => navigate('/onboarding')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">COMEÇAR SEU RAIO-X FINANCEIRO AGORA!</span>
            <span className="sm:hidden">COMEÇAR RAIO-X!</span>
          </Button>
          <button
            onClick={() => setMinimized(true)}
            className="p-1 rounded hover:bg-destructive-foreground/20 transition-colors"
            aria-label="Minimizar banner"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
