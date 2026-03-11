import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import cibeliaImg from '@/assets/cibelia.png';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CibeliaFlowChat } from '@/components/landing/CibeliaFlowChat';
import { cn } from '@/lib/utils';

export const CibeliaWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useEffect(() => {
    if (isOpen && !hasBeenOpened) setHasBeenOpened(true);
  }, [isOpen, hasBeenOpened]);

  return (
    <TooltipProvider>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-0">
        {/* Painel de chat */}
        {isOpen && (
          <div
            className="fixed bottom-44 right-6 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
            style={{ maxHeight: 520 }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">Cibélia</p>
                  <p className="text-[11px] text-white/70 leading-tight">
                    Assistente RXFin
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-white hover:bg-white/20 rounded-full"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conteúdo: fluxo estruturado de 7 etapas (nome, dor, solução, e-mail, telefone, lead) */}
            <CibeliaFlowChat />
          </div>
        )}

        {/* Botão flutuante */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen((o) => !o)}
              className={cn(
                'relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110',
                isOpen ? 'rotate-0' : ''
              )}
              aria-label={isOpen ? 'Fechar chat' : 'Abrir chat com Cibélia'}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <img src={cibeliaImg} alt="Cibélia" className="h-8 w-8 rounded-full object-cover" />
              )}
              {/* Badge pulsante: só antes da primeira abertura */}
              {!hasBeenOpened && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-background"
                  title="Oi! 👋"
                />
              )}
            </button>
          </TooltipTrigger>
          {!hasBeenOpened && (
            <TooltipContent side="left">
              <p>Oi! 👋</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
