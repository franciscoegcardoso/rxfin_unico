import React from 'react';
import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyFipeProps {
  className?: string;
}

export const EmptyFipe: React.FC<EmptyFipeProps> = ({ className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}
  >
    <div className="bg-muted rounded-full p-4 mb-4">
      <Car className="h-10 w-10 text-muted-foreground" />
    </div>
    <h2 className="font-syne font-bold text-xl text-foreground mb-2">
      Nenhuma consulta realizada
    </h2>
    <p className="text-sm text-muted-foreground max-w-xs">
      Pesquise um veículo para ver o valor FIPE e histórico de preços.
    </p>
  </div>
);
