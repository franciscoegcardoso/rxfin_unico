import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

/**
 * Guia "Plano 30 Anos"
 * Fase 2 implementará: tabela horizontal com parâmetros por linha,
 * histórico real de fechamentos + projeção paramétrica até 2055.
 */
export const Plano30AnosTab: React.FC = () => {
  return (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Construction className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold text-foreground">Plano 30 Anos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Projeção longitudinal com parâmetros por categoria — em desenvolvimento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
