import React, { useEffect, useState } from 'react';
import { fetchSafraAnalysis, type FipeSafraAnual } from '@/core/services/fipeSafra';

function formatBRL(val: number) {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function corVariacao(pct: number): string {
  if (pct < -0.5) return 'text-red-600 dark:text-red-400';
  if (pct > 0.5) return 'text-green-600 dark:text-green-400';
  return 'text-muted-foreground';
}

function SafraTable({ safra }: { safra: FipeSafraAnual[] }) {
  const anosValidos = safra.filter((s) => s.meses_com_dado >= 2);

  if (anosValidos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Dados insuficientes para análise de safra.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase">
            <th className="text-left py-2 pr-4">Ano</th>
            <th className="text-right py-2 px-4">Abertura</th>
            <th className="text-right py-2 px-4">Fechamento</th>
            <th className="text-right py-2 px-4">Variação R$</th>
            <th className="text-right py-2 px-4">Variação %</th>
            <th className="text-center py-2 pl-4">Meses</th>
          </tr>
        </thead>
        <tbody>
          {anosValidos.map((s) => (
            <tr
              key={s.ano}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              <td className="py-2 pr-4 font-medium text-foreground">
                {s.ano}
                {!s.ano_completo && (
                  <span className="ml-1 text-xs text-muted-foreground">(parcial)</span>
                )}
              </td>
              <td className="text-right py-2 px-4 text-muted-foreground">
                {formatBRL(s.preco_abertura)}
              </td>
              <td className="text-right py-2 px-4 text-muted-foreground">
                {formatBRL(s.preco_fechamento)}
              </td>
              <td
                className={`text-right py-2 px-4 font-medium ${corVariacao(s.variacao_pct)}`}
              >
                {s.variacao_abs >= 0 ? '+' : ''}
                {formatBRL(s.variacao_abs)}
              </td>
              <td
                className={`text-right py-2 px-4 font-bold ${corVariacao(s.variacao_pct)}`}
              >
                {s.variacao_pct >= 0 ? '+' : ''}
                {s.variacao_pct.toFixed(2)}%
              </td>
              <td className="text-center py-2 pl-4 text-muted-foreground">
                {s.meses_com_dado}/12
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SafraAnalysisSectionProps {
  fipeCode: string;
  /** Ano modelo: inteiro (ex: 2023) ou year_id (ex: "2023-5"). A RPC recebe só o ano. */
  modelYear: number | string;
}

export const SafraAnalysisSection: React.FC<SafraAnalysisSectionProps> = ({
  fipeCode,
  modelYear,
}) => {
  const [safraData, setSafraData] = useState<FipeSafraAnual[]>([]);
  const [safraLoading, setSafraLoading] = useState(false);

  useEffect(() => {
    if (!fipeCode || (modelYear !== 0 && !modelYear)) return;
    setSafraLoading(true);
    fetchSafraAnalysis(fipeCode, modelYear)
      .then(setSafraData)
      .catch(console.error)
      .finally(() => setSafraLoading(false));
  }, [fipeCode, modelYear]);

  if (safraLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando análise de safra...
      </p>
    );
  }

  return <SafraTable safra={safraData} />;
};
