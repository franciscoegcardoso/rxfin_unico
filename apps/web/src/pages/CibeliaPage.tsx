import { useEffect } from 'react';
import { openCibeliaChat } from '@/components/ai/RaioXChat';

/**
 * Rota dedicada /cibelia (dentro do AppShell, path relativo `cibelia`).
 * Abre o painel da Cibélia automaticamente; o chat continua sendo o mesmo RaioXChat (Sheet).
 */
export default function CibeliaPage() {
  useEffect(() => {
    openCibeliaChat();
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center text-muted-foreground">
      <p className="text-sm">
        O assistente <strong className="text-foreground">Cibélia</strong> deve abrir automaticamente.
        Se não abrir, use o botão flutuante no canto da tela.
      </p>
    </div>
  );
}
