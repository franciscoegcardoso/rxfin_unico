import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import logoRxfinWhite from '@/assets/logo-rxfin-white.png';

export interface OnboardingTransitionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose?: () => void;
}

const JOURNEY_STEPS = [
  { icon: '👤', step: '1', label: 'Identidade Financeira', desc: 'Seu perfil e renda' },
  { icon: '🏦', step: '2', label: 'Patrimônio', desc: 'Bens e dívidas' },
  { icon: '💸', step: '3', label: 'Fluxo de Caixa', desc: 'Receitas e despesas' },
  { icon: '👑', step: '4', label: 'Domínio Total', desc: 'Projeção de 30 anos' },
];

export function OnboardingTransitionModal({ isOpen, onConfirm, onClose }: OnboardingTransitionModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0 shadow-xl"
        hideCloseButton
      >
        <div className="relative bg-gradient-to-br from-slate-900 to-green-900 p-8 text-white text-center overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/90 transition-colors duration-150 p-1 rounded-md hover:bg-white/10 z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <img
            src={logoRxfinWhite}
            alt="RXFin"
            width={32}
            height={32}
            className="h-8 w-auto mx-auto mb-4 opacity-90"
          />
          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-0.5">
            Preparando seu RXFin
            <span className="inline-flex gap-0.5 ml-1">
              <span className="animate-bounce [animation-delay:0ms]" style={{ animationDuration: '1.2s' }}>.</span>
              <span className="animate-bounce [animation-delay:200ms]" style={{ animationDuration: '1.2s' }}>.</span>
              <span className="animate-bounce [animation-delay:400ms]" style={{ animationDuration: '1.2s' }}>.</span>
            </span>
          </h2>
          <p className="text-green-300/80 text-sm mt-2">
            Criando seu espaço personalizado...
          </p>
        </div>

        <div className="p-6 space-y-5 bg-background">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden>💡</span>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                  Sua ferramenta começa em branco
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                  Os dados fictícios que você viu eram só para demonstração. Agora você verá{' '}
                  <strong>sua ferramenta real</strong>, pronta para receber seus dados verdadeiros.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sua jornada guiada:
            </p>
            <div className="space-y-2">
              {JOURNEY_STEPS.map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 text-sm">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-base"
            onClick={onConfirm}
          >
            Entendido — Vamos começar! 🚀
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Leva aproximadamente 5 minutos para completar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
