import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyLancamentosProps {
  className?: string;
}

export const EmptyLancamentos: React.FC<EmptyLancamentosProps> = ({ className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}
  >
    <div className="bg-muted rounded-full p-4 mb-4">
      <Receipt className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="font-syne font-bold text-xl text-foreground mb-2">
      Nenhum lançamento ainda
    </h2>
    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
      Registre sua primeira receita ou despesa para começar o controle.
    </p>
    <Link
      to="/movimentacoes/extrato"
      className="bg-primary text-primary-foreground font-syne font-bold rounded-xl px-6 py-3 hover:bg-primary/90 transition-colors"
    >
      Adicionar lançamento
    </Link>
  </div>
);
