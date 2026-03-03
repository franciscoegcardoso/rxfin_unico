import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, Target, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VerdictData {
  veredito: string;
  gargalo: string;
  recomendacao: string;
}

interface CarData {
  nome: string;
  valorFipe: number;
  custoMensalTotal: number;
  perda5Anos: number;
  tco5Anos: number;
  depreciacao: number;
  ipva: number;
  seguro: number;
  manutencao: number;
  combustivel: number;
  custoOportunidade: number;
}

interface CarComparisonVerdictProps {
  carroA: CarData;
  carroB: CarData;
  horizonte: number;
  economia: number;
  economiaMensal: number;
  vencedor: 'A' | 'B' | null;
}

export const CarComparisonVerdict: React.FC<CarComparisonVerdictProps> = ({
  carroA,
  carroB,
  horizonte,
  economia,
  economiaMensal,
  vencedor,
}) => {
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateVerdict = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('car-comparison-verdict', {
        body: {
          carroA,
          carroB,
          horizonte,
          economia,
          economiaMensal,
          vencedor,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setVerdict(data);
      setHasGenerated(true);
    } catch (err) {
      console.error('Error generating verdict:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar análise');
    } finally {
      setIsLoading(false);
    }
  };

  // Não mostra o card se os carros não estiverem configurados
  if (!carroA.valorFipe || !carroB.valorFipe) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Análise Inteligente RXFin</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IA</Badge>
          </div>
          {hasGenerated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={generateVerdict}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasGenerated && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Gere uma análise completa com veredito financeiro, pontos de atenção e recomendações personalizadas.
            </p>
            <Button onClick={generateVerdict} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Análise Inteligente
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando dados e gerando veredito...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateVerdict}
              className="mt-3"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {verdict && !isLoading && (
          <div className="space-y-4">
            {/* Veredito Financeiro */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-emerald-500/20">
                  <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                  Veredito Financeiro
                </h4>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {verdict.veredito}
              </p>
            </div>

            {/* Ponto de Atenção */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-amber-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                  Ponto de Atenção
                </h4>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {verdict.gargalo}
              </p>
            </div>

            {/* Recomendação */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                  Recomendação
                </h4>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {verdict.recomendacao}
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Análise gerada por IA com base nos dados da comparação. Valores e projeções são estimativas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
