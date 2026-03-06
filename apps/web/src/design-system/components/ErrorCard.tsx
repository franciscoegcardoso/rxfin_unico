import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorCardProps {
  /** Título do card. Padrão: "Algo deu errado" */
  title?: string;
  /** Mensagem de erro exibida ao usuário */
  message: string;
  /** Callback ao clicar em "Tentar novamente". Se não informado, o botão não é exibido. */
  onRetry?: () => void;
  className?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'Algo deu errado',
  message,
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center',
      className
    )}
  >
    <AlertCircle className="h-10 w-10 text-expense mb-4 shrink-0" />
    <h2 className="font-syne font-bold text-lg text-foreground mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-card border border-border hover:bg-accent rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </button>
    )}
  </div>
);
