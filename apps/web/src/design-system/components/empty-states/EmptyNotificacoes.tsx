import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyNotificacoesProps {
  className?: string;
}

export const EmptyNotificacoes: React.FC<EmptyNotificacoesProps> = ({ className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}
  >
    <div className="bg-muted rounded-full p-4 mb-4">
      <Bell className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="font-syne font-bold text-xl text-foreground mb-2">
      Tudo em dia
    </h2>
    <p className="text-sm text-muted-foreground max-w-xs">
      Você não tem notificações no momento.
    </p>
  </div>
);
