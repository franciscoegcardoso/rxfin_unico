import React from 'react';
import { FileBarChart } from 'lucide-react';
import IrHistoricoPatrimonial from '@/components/ir/IrHistoricoPatrimonial';

export default function HistoricoIrTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <FileBarChart className="h-5 w-5 text-primary" />
        Histórico IR
      </h2>
      <IrHistoricoPatrimonial />
    </div>
  );
}
