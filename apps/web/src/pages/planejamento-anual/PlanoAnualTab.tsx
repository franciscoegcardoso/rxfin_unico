import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

/**
 * Guia "Plano 2026–2027"
 * Fase 1 implementará: tabela de patrimônio mensal, receitas/despesas,
 * saldo líquido acumulado e parâmetros de projeção por ativo.
 */
export const PlanoAnualTab: React.FC = () => {
  return (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Construction className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold text-foreground">Plano 2026–2027</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Visão mensal de receitas, despesas e patrimônio — em desenvolvimento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
