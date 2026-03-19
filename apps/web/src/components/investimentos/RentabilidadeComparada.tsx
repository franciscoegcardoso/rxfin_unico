import React from 'react';
import { CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioPerformance } from '@/hooks/usePortfolioPerformance';

interface Props {
  data: PortfolioPerformance;
}

type PeriodKey = 'no_mes' | 'no_semestre' | 'no_ano' | 'doze_meses' | 'desde_inicio';
type Values = Record<PeriodKey, number | null>;

export function RentabilidadeComparada({ data }: Props) {
  const carteira: Values = {
    no_mes: null,
    no_semestre: null,
    no_ano: null,
    doze_meses: null,
    desde_inicio: data.summary.rendimento_pct,
  };

  const linhas: Array<{ label: string; values: Values; destaque?: boolean; info?: string }> = [
    { label: 'Sua carteira', values: carteira, destaque: true },
    { label: 'CDI', values: data.benchmarks.cdi },
    { label: 'IPCA', values: data.benchmarks.ipca },
    { label: 'IBOVESPA', values: data.benchmarks.ibovespa },
    {
      label: 'Rentabilidade real',
      values: {
        no_mes: null,
        no_semestre: null,
        no_ano: null,
        doze_meses: null,
        desde_inicio: ((1 + data.summary.rendimento_pct / 100) / (1 + data.benchmarks.ipca.desde_inicio / 100) - 1) * 100,
      },
      info: 'Rentabilidade descontada pela inflacao (IPCA).',
    },
  ];

  const periods: PeriodKey[] = ['no_mes', 'no_semestre', 'no_ano', 'doze_meses', 'desde_inicio'];
  const labels: Record<PeriodKey, string> = {
    no_mes: 'No mes',
    no_semestre: 'Semestre',
    no_ano: 'No ano',
    doze_meses: '12 meses',
    desde_inicio: 'Desde o inicio',
  };

  return (
    <div className="border rounded-xl bg-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Rentabilidade comparada</h3>
          <p className="text-xs text-muted-foreground">Performance da carteira comparada a indicadores</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground w-1/3" />
              {periods.map((k) => (
                <th key={k} className="pb-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap px-3">
                  {labels[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.label} className="border-t border-border/40">
                <td className={cn('py-3 text-sm', linha.destaque && 'font-semibold')}>
                  <div className="flex items-center gap-1">
                    {linha.label}
                    {linha.info && <Info className="w-3.5 h-3.5 text-muted-foreground" title={linha.info} />}
                  </div>
                </td>
                {periods.map((k) => {
                  const val = linha.values[k];
                  return (
                    <td key={k} className="py-3 text-right px-3 tabular-nums">
                      {val == null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <span className={cn('text-sm', linha.destaque && val >= 0 && 'text-emerald-600 font-medium', linha.destaque && val < 0 && 'text-red-500 font-medium')}>
                          {val >= 0 ? '+' : ''}{val.toFixed(2).replace('.', ',')}%
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Data de referencia: {new Date(data.summary.data_referencia).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
}
