import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0 shadow-xl" hideCloseButton>
        <div className="bg-gradient-to-br from-green-700 to-green-900 p-6 text-white text-center">
          <div className="text-4xl mb-2" aria-hidden>🔬</div>
          <h2 className="text-xl font-bold">Bem-vindo ao RXFin!</h2>
          <p className="text-green-200 text-sm mt-1">Modo demonstração ativo</p>
        </div>

        <div className="p-6 space-y-4 bg-background">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Você está explorando o RXFin com <strong className="text-foreground">dados fictícios</strong>.
            Isso permite que você conheça todas as funcionalidades antes de conectar seus dados reais.
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              Explore todas as telas livremente
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              Veja como será sua experiência real
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              Quando estiver pronto, inicie seu Raio-X
            </li>
          </ul>

          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl"
            onClick={handleStartRaioX}
          >
            🚀 Iniciar meu Raio-X Financeiro
          </Button>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={handleDismiss}
          >
            Continuar explorando →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SESSION_KEY as DEMO_WELCOME_SESSION_KEY };
