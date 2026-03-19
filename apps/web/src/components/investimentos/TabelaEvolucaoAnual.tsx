import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { PortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import { calcPctCDI } from '@/utils/portfolioChart';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface Props {
  data: PortfolioPerformance;
}

type AnnualRowView = {
  ano: number;
  aportes: number;
  ir_pago: number;
  iof_pago: number;
  cdi_pct: number;
  patrimonio_inicial: number;
  patrimonio_final: number;
  rendimento: number;
  rentabilidade_pct: number;
};

function buildAnnualRows(data: PortfolioPerformance): AnnualRowView[] {
  const years = [...(data.annual_evolution ?? [])].sort((a, b) => a.ano - b.ano);
  if (!years.length) return [];
  return years.map((row, index) => {
    const previousFinal = index === 0 ? 0 : years[index - 1].aportes;
    const patrimonio_inicial = Math.max(previousFinal, 0);
    const patrimonio_final = row.ano === new Date().getFullYear() ? data.summary.patrimonio_atual : patrimonio_inicial + row.aportes;
    const rendimento = patrimonio_final - patrimonio_inicial - row.aportes + row.ir_pago;
    const rentabilidade_pct = patrimonio_inicial > 0 ? (rendimento / patrimonio_inicial) * 100 : 0;
    return { ...row, patrimonio_inicial, patrimonio_final, rendimento, rentabilidade_pct };
  });
}

export function TabelaEvolucaoAnual({ data }: Props) {
  const rows = buildAnnualRows(data);
  if (!rows.length) return null;

  return (
    <div className="border rounded-xl bg-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Evolucao patrimonial por periodo</h3>
          <p className="text-xs text-muted-foreground">Historico, movimentacoes e evolucao da carteira</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Ano', 'Patrimonio inicial', 'Movimentacoes', 'IR pago', 'Patrimonio final', 'Rendimento', 'Rentabilidade', '% CDI'].map((col) => (
                <th key={col} className="px-3 py-2 text-right first:text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ano} className="border-b border-border/50">
                <td className="px-3 py-3 text-left font-semibold">{row.ano}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.patrimonio_inicial)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.aportes)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-red-500">-{formatCurrency(row.ir_pago)}</td>
                <td className="px-3 py-3 text-right tabular-nums font-medium">{formatCurrency(row.patrimonio_final)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${row.rendimento >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {row.rendimento >= 0 ? '+' : ''}{formatCurrency(row.rendimento)}
                </td>
                <td className={`px-3 py-3 text-right tabular-nums ${row.rentabilidade_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {row.rentabilidade_pct >= 0 ? '+' : ''}{row.rentabilidade_pct.toFixed(2).replace('.', ',')}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{calcPctCDI(row.rentabilidade_pct, row.cdi_pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
