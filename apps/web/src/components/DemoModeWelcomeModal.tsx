import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import logoRxfinWhite from '@/assets/logo-rxfin-white.png';

const SESSION_KEY = 'rxfin_demo_welcome_shown';

export interface DemoModeWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartRaioX: () => void;
  onDismiss: () => void;
}

export const DemoModeWelcomeModal: React.FC<DemoModeWelcomeModalProps> = ({
  open,
  onOpenChange,
  onStartRaioX,
  onDismiss,
}) => {
  const handleStartRaioX = () => {
    onOpenChange(false);
    onStartRaioX();
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {}
    onOpenChange(false);
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[420px] w-[calc(100vw-32px)] mx-auto p-0 overflow-hidden rounded-2xl border-0 shadow-2xl"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* ── HEADER ── */}
        <div className="relative bg-gradient-to-br from-[#0a2a1a] via-[#0d3d22] to-[#1a5c35] px-8 pt-8 pb-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <img
                src={logoRxfinWhite}
                alt="RXFin"
                width={28}
                height={28}
                className="h-7 w-auto object-contain"
              />
              <span className="text-white font-bold text-lg tracking-tight">RXFin</span>
            </div>
            <span className="text-xs font-medium bg-white/15 text-green-200 px-3 py-1 rounded-full border border-white/20">
              Modo Demo
            </span>
          </div>

          <div className="relative">
            <h2 className="text-2xl font-bold text-white leading-tight">
              Bem-vindo ao seu
              <br />
              <span className="text-green-300">Raio-X Financeiro</span>
            </h2>
            <p className="text-green-200/80 text-sm mt-2 leading-relaxed">
              Você está explorando com dados de demonstração
            </p>
          </div>
        </div>

        {/* ── CORPO ── */}
        <div className="px-8 py-6 bg-white space-y-5">
          <p className="text-gray-700 text-sm leading-relaxed">
            Os dados que você vê são <span className="font-semibold text-gray-900">fictícios</span> para
            que você conheça todas as funcionalidades antes de conectar suas informações reais.
          </p>

          <ul className="space-y-3">
            {[
              { icon: '🗺️', text: 'Explore todas as telas livremente' },
              { icon: '👁️', text: 'Veja como será sua experiência real' },
              { icon: '🚀', text: 'Quando estiver pronto, inicie seu Raio-X' },
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                <span className="text-sm text-gray-700 font-medium">{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-gray-100" />

          <div className="space-y-3">
            <Button
              className="w-full h-12 bg-green-700 hover:bg-green-800 active:bg-green-900 text-white font-bold text-[15px] rounded-xl shadow-sm transition-all duration-150 hover:shadow-md"
              onClick={handleStartRaioX}
            >
              Iniciar meu Raio-X Financeiro →
            </Button>

            <button
              type="button"
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors duration-150 py-1 font-medium"
              onClick={handleDismiss}
            >
              Continuar explorando
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            ⏱ Leva aproximadamente 5 minutos para completar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SESSION_KEY as DEMO_WELCOME_SESSION_KEY };
